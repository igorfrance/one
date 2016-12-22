var ModelBinder = (function ()
{
	/**
	 * Placeholder pattern.
	 * Matches
	 * @type {RegExp}
	 */
	var RX_EXPRESSION = /\$\{([^{}]+)}/g;
	var RX_LOOPSTART = /^loopstart_(\d+)$/;
	var RX_LOOPEND = /^loopend$/;
	var RX_EXPRSTART = /^expr:\$\{([^{}]+)}$/;
	var RX_EXPREND = /^exprend$/;

	var initialized = [];

	//noinspection JSUnresolvedVariable
	var nodeType = $xml.nodeType;

	var nodeBinders = {
		"1": [], // ELEMENT
		"2": [], // ATTRIBUTE
		"3": [], // TEXT
		"8": [] // COMMENT
	};

	var ModelBinder = Dispatcher.extend(function ModelBinder(element)
	{
		this.construct();

		this.loops = [];
		this.element = null;
		this.template = null;
		this.model = null;

		if (element)
			this.initialize(element);
	});

	ModelBinder.prototype.initialize = function (element)
	{
		this.loops = [];
		this.element = $(element)[0];

		if (initialized.indexOf(this.element) == -1)
		{
			prepareNode.call(this, this.element);
			this.element.loops = this.loops;
			initialized.push(this.element);
		}
		else
		{
			this.loops = this.element.loops;
		}
	};

	ModelBinder.prototype.setModel = function (model)
	{
		this.model = model;
		bindNode.call(this, this.element, model);
	};

	ModelBinder.registerNodeBinder = function (nodeType, nodeBinderSpec)
	{
		nodeBinders[nodeType].push(nodeBinderSpec);
	};

	function prepareNode(node)
	{
		switch (node.nodeType)
		{
			case nodeType.ELEMENT:
				prepareElementNode.call(this, node);
				break;

			case nodeType.TEXT:
				prepareTextNode.call(this, node);
				break;

			default:
				return;
		}
	}

	function prepareElementNode(node)
	{
		for (var i = 0; i < node.childNodes.length; i++)
				prepareNode.call(this, node.childNodes[i]);

		var foreach = node.getAttribute("data-foreach");
		var visible = node.getAttribute("data-visible");
		var hidden = node.getAttribute("data-hidden");

		if (foreach)
		{
			var index = this.loops.length;
			var commentStart = node.ownerDocument.createComment("loopstart_" + index);
			var commentEnd = node.ownerDocument.createComment("loopend");
			node.parentNode.insertBefore(commentStart, node);
			node.parentNode.insertBefore(commentEnd, node);
			node.parentNode.removeChild(node);

			node.removeAttribute("data-foreach");
			this.loops.push({ element: node, expression: foreach });
		}
		else
		{
			if (visible)
				$(node).hide();

			attachEvents.call(this, node);
		}
	}

	function prepareTextNode(node)
	{
		var text = node.nodeValue;
		if (text.match(RX_EXPRESSION))
		{
			var start = 0;
			var slices = [];
			var keys = [];

			// run greedy RX_EXPRESSION against the node text to find all the placeholders and their insert points
			text.replace(RX_EXPRESSION, function (match, key, index)
			{
				var slice = text.substring(start, index);
				slices.push(slice);
				keys.push(key);
				start = index + match.length;
			});

			// now replace the placeholders with comments
			for (var i = 0; i < slices.length; i++)
			{
				node.parentNode.insertBefore(node.ownerDocument.createTextNode(slices[i]), node);
				node.parentNode.insertBefore(node.ownerDocument.createComment("expr:${" + keys[i] + "}"), node);
				node.parentNode.insertBefore(node.ownerDocument.createComment("exprend"), node);
			}

			node.parentNode.removeChild(node);
		}
	}

	function attachEvents(element)
	{
		for (var i = 0; i < element.childNodes.length; i++)
		{
			if (element.childNodes[i].nodeType == nodeType.ELEMENT)
				attachEvents.call(this, element.childNodes[i]);
		}

		for (i = 0; i < element.attributes.length; i++)
		{
			var attr = element.attributes[i];
			if (attr.name.indexOf("data-emit-") != 0)
				continue;

			var params = [];
			var sourceEventName = attr.name.replace("data-emit-", "");
			var targetEventName = attr.value.replace(/\((.*)\)/, function ($0, $1)
			{
				if ($1)
				{
					params = $1.replace(/\s*,\s*/g, ",").split(",");
					return "";
				}
			});

			attachEvent.call(this, element, sourceEventName, targetEventName, params);
		}
	}

	function attachEvent(element, eventName, emitEventName, eventParams)
	{
		this.registerEvent(emitEventName);

		var $element = $(element);
		$element.data("emit-" + eventName, emitEventName);
		$element.data("emit-params", eventParams);
		$element.off(eventName).on(eventName, $.proxy(viewEventHandler, this));
	}

	function viewEventHandler(e)
	{
		var $element = $(e.target);
		var emitEventName = $element.data("emit-" + e.type);
		var eventParams = $element.data("emit-params");
		var params = [];

		if (eventParams)
		{
			var self = this;
			params = eventParams.map(function (param)
			{
				return evaluateExpression(param, self.model);
			});
		}

		var event = new $evt.Event(this, emitEventName, params);
		event.originalEvent = e;
		this.fire(emitEventName, event);
		console.log("Firing {0} from event {1} with params: {2}".format(emitEventName, e.type, params));

	}

	function bindNode(node, model)
	{
		var type = node.nodeType;
		if (!nodeBinders[type])
			return;

		var nodeBinder = selectNodeBinder(node, nodeBinders[type]);
		if (nodeBinder)
			nodeBinder.call(this, node, model);
	}

	function bindString(template, model)
	{
		return template.replace(RX_EXPRESSION, function (match, expression)
		{
			return evaluateExpression(expression, model);
		});
	}

	function selectNodeBinder(node, handlers)
	{
		for (var i = 0; i < handlers.length; i++)
		{
			if (handlers[i].expression)
			{
				var expressions = handlers[i].expression;
				expressions = $type.isArray(expressions) ? expressions : [expressions];

				for (var j = 0; j < expressions.length; j++)
				{
					var expr = expressions[j];
					if (expr && node.nodeValue.match(expr))
						return handlers[i].handler;
				}
			}
			else
			{
				var match = false;
				var nodeName = node.nodeName;
				var names = handlers[i].name;
				names = $type.isArray(names) ? names : [names];

				for (j = 0; j < names.length; j++)
				{
					var name = names[j];
					if (name.indexOf("*") == name.length - 1) // data-attr-*
						match = node.nodeName.indexOf(name.substring(0, name.indexOf("*"))) == 0;

					else if (name.indexOf("*") == 0) // *-attr
						match = nodeName.substring(nodeName.length - (name.length - 1), nodeName.length) == name.substring(1);

					else
						match = handlers[i].name == node.nodeName;

					if (match)
						return handlers[i].handler;
				}

			}
		}

		if (handlers["*"])
			return handlers["*"].handler;
	}

	function reset(element)
	{
		var comments = [];
		for (var i = 0; i < element.childNodes.length; i++)
		{
			var node = element.childNodes[i];
			if (node.nodeType == nodeType.COMMENT)
			{
				if (node.nodeValue.match(RX_LOOPSTART) || node.nodeValue.match(RX_EXPRSTART))
					comments.push(node);
			}
		}

		for (var j = 0; j < comments.length; j++)
		{
			cleanupGeneratedContent(comments[j]);
		}

		for (var k = 0; k < element.attributes.length; k++)
		{
			var attr = element.attributes[k];
			if (attr.name.indexOf("data-attr-") == 0)
			{
				var attrName = attr.name.substring(10);
				element.removeAttribute(attrName);
			}
		}
	}

	function cleanupGeneratedContent(commentStartNode)
	{
		var endExpression = commentStartNode.nodeValue.match(RX_LOOPSTART) ? RX_LOOPEND : RX_EXPREND;

		var parent = commentStartNode.parentNode;
		var elements = [];
		var capturing = false;
		for (var i = 0; i < parent.childNodes.length; i++)
		{
			var node = parent.childNodes[i];
			if (node == commentStartNode)
			{
				capturing = true;
				continue;
			}

			if (capturing)
			{
				if (node.nodeType == nodeType.COMMENT && node.nodeValue.match(endExpression))
					break;

				elements.push(node);
			}
		}

		for (var i = 0; i < elements.length; i++)
			parent.removeChild(elements[i]);
	}

	function evaluateExpression(expression, model)
	{
		var parts = expression.trim().split(" ");
		for (var i = 0; i < parts.length; i++)
		{
			if (isValidModelProperty(parts[i], model))
			{
				var value = getValue(model, parts[i]);
				if (value == undefined || value == null)
					value = "";

				parts[i] = value;
			}
		}

		expression = parts.join(" ");
		if (parts.length == 1)
			return expression;

		try
		{
			return eval(expression);
		}
		catch(error)
		{
			console.error(expression + ": " + error);
			return error;
		}
	}

	function indexOf(node)
	{
		for (var i = 0; i < node.parentNode.childNodes.length; i++)
		{
			if (node.parentNode.childNodes[i] == node)
				return i;
		}

		return -1;
	}

	function getValue(model, key)
	{
		if (model[key])
			return model[key];

		var parts = key.split(".");

		var index = 0;
		var currentObject = model;
		var result, currentKey;

		while(currentObject != null && index < parts.length)
		{
			currentKey = parts[index++];
			currentObject = currentObject[currentKey];
			result = currentObject;
		}

		return result;
	}

	function isValidModelProperty(name, model)
	{
		var key1 = name.split(".")[0];
		return model[key1] != undefined;
	}

	function attributeParent(attr)
	{
		return attr.parentNode || attr.ownerElement;
	}

	function defaultAttributeBinder(attr, model)
	{
		var attrName = attr.name.substring(10);
		if (attr.value.match(RX_EXPRESSION))
		{
			var processed = bindString(attr.value, model);
			attributeParent(attr).setAttribute(attrName, processed);
		}
	}

	function classAttributeBinder(node, model)
	{
		var element = attributeParent(node);
		var classSpec = element.getAttribute("data-class");
		var classObj = {};
		try
		{
			classObj = JSON.parse(classSpec);
		}
		catch(error)
		{
			console.debug(classSpec);
			console.error(error);
			return;
		}

		var $el = $(element);
		for (var className in classObj)
		{
			var expressionResult = evaluateExpression(classObj[className], model);
			var classOn = (expressionResult == true || expressionResult == "true");
			$el.toggleClass(className, classOn);
		}
	}

	function visibilityAttributeBinder(node, model)
	{
		var attrName = node.nodeName;
		var expressionText = element.getAttribute(attrName);
		var expressionResult = evaluateExpression(bindString(expressionText, model), model);

		var valid = (expressionResult == true || expressionResult == "true");
		var show = attrName == "data-visible";

		$(attributeParent(node)).toggle(show ? valid : !valid);
	}

	function defaultElementBinder(element, model)
	{
		reset(element);

		var i;
		var nodes = [];

		for (i = 0; i < element.attributes.length; i++)
			bindNode.call(this, element.attributes[i], model);

		for (i = 0; i < element.childNodes.length; i++)
			nodes.push(element.childNodes[i]);

		for (i = 0; i < nodes.length; i++)
			bindNode.call(this, nodes[i], model);
	}

	function expressionCommentBinder(node, model)
	{
		cleanupGeneratedContent(node);

		var expression = node.nodeValue.match(RX_EXPRSTART)[1];
		var value = getValue(model, expression);
		var textNode = node.ownerDocument.createTextNode(value);
		node.parentNode.insertBefore(textNode, node.parentNode.childNodes[indexOf(node) + 1]);
	}

	function loopCommentBinder(node, model)
	{
		cleanupGeneratedContent(node);

		var loopIndex = node.nodeValue.match(RX_LOOPSTART)[1];
		var loop = this.loops[loopIndex];
		var collection = getValue(model, loop.expression);
		var following = node.parentNode.childNodes[indexOf(node) + 1];
		var index = 0;
		for (var key in collection)
		{
			if (!collection.hasOwnProperty(key))
				continue;

			var instance = loop.element.cloneNode(true);
			var iterationModel = $.extend({}, model);
			if ($type.isObject(collection[key]))
				iterationModel = $.extend(iterationModel, collection[key]);

			iterationModel = $.extend(iterationModel,
			{
				_: collection[key],
				$index: index,
				$current: collection[key],
				$key: key
			});

			bindNode.call(this, instance, iterationModel);
			attachEvents.call(this, instance);

			node.parentNode.insertBefore(instance, following);
			index += 1;
		}
	}

	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: "data-attr-*", handler: defaultAttributeBinder });
	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: "data-class", handler: classAttributeBinder});
	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: ["data-visible", "data-hidden"], handler: visibilityAttributeBinder});
	ModelBinder.registerNodeBinder(nodeType.ELEMENT, { name: "*", handler: defaultElementBinder });
	ModelBinder.registerNodeBinder(nodeType.COMMENT, { expression: RX_EXPRSTART, handler: expressionCommentBinder });
	ModelBinder.registerNodeBinder(nodeType.COMMENT, { expression: RX_LOOPSTART, handler: loopCommentBinder });

	return (ModelBinder);

}());

