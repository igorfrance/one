var ModelBinder = (function ()
{
	/**
	 * Placeholder pattern.
	 * Matches
	 * @type {RegExp}
	 */
	var RX_SIMPLE_EXPRESSION = /@\.([\w$.]+)/g;
	var RX_EVAL_EXPRESSION = /@\(([^()]+)\)/g;
	var RX_LOOPSTART = /^loopstart_(\d+)$/;
	var RX_LOOPEND = /^loopend$/;
	var RX_EXPR_START = /^expr:(@\(.+\))$/;
	var RX_PLACEHOLDER_START = /^placeholder:@.(.+)$/;
	var RX_EXPR_END = /^exprend$/;
	var RX_MODEL_EVAL_EXPRESSION = /#\.([\w$.]+)/g;

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
		this._model = null;

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
		this._model = model;
		if (this.element)
			bindNode.call(this, this.element, this._model);
	};

	ModelBinder.prototype.model = function (value)
	{
		if (value != undefined)
			this.setModel(value);

		return this.getModel();
	};

	ModelBinder.prototype.getModel = function ()
	{
		return this._model;
	};

	ModelBinder.prototype.update = function (model)
	{
		if (model)
			this.setModel(model);
		else
			bindNode.call(this, this.element, this._model);
	};

	ModelBinder.prototype.evaluateExpression = function (expression)
	{
		return bindString(expression, this._model);
	};

	ModelBinder.prototype.getValue = function (expression)
	{
		return getValue(expression, this._model);
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
		var index, i;
		var foreachChild = node.getAttribute("data-foreach-child");
		if (foreachChild)
		{
			index = -1;
			for (i = 0; i < node.childNodes.length; i++)
			{
				var child = node.childNodes[i];
				if (child.nodeType == nodeType.ELEMENT && child.getAttribute("data-child") == foreachChild)
				{
					index = i + 1;
					break;
				}
			}

			if (index != -1)
			{
				for (i = node.childNodes.length - 1; i >= index; i--)
					node.removeChild(node.childNodes[i]);
			}
		}

		for (i = 0; i < node.childNodes.length; i++)
				prepareNode.call(this, node.childNodes[i]);

		var foreach = node.getAttribute("data-foreach");
		var visible = node.getAttribute("data-visible");
		var hidden = node.getAttribute("data-hidden");

		if (foreach)
		{
			index = this.loops.length;
			var commentStart = node.ownerDocument.createComment("loopstart_" + index);
			var commentEnd = node.ownerDocument.createComment("loopend");
			node.parentNode.insertBefore(commentStart, node);
			node.parentNode.insertBefore(commentEnd, node);
			node.parentNode.removeChild(node);

			node.removeAttribute("data-foreach");
			this.loops.push({ element: node, expression: foreach });

			attachEvents.call(this, node, null, true);
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
		var handled = prepareTextComments(node, RX_EVAL_EXPRESSION, "expr");
		if (!handled)
			prepareTextComments(node, RX_SIMPLE_EXPRESSION, "placeholder");
	}

	function prepareTextComments(node, expression, type)
	{
		var text = node.nodeValue;
		if (text.match(expression))
		{
			var start = 0;
			var slices = [];
			var keys = [];

			// run greedy RX_EXPRESSION against the node text to find all the placeholders and their insert points
			text.replace(expression, function (match, key, index)
			{
				var slice = text.substring(start, index);
				slices.push(slice);
				keys.push(match);
				start = index + match.length;
			});

			// now replace the placeholders with comments
			for (var i = 0; i < slices.length; i++)
			{
				node.parentNode.insertBefore(node.ownerDocument.createTextNode(slices[i]), node);
				node.parentNode.insertBefore(node.ownerDocument.createComment(type + ":" + keys[i]), node);
				node.parentNode.insertBefore(node.ownerDocument.createComment("exprend"), node);
			}

			node.parentNode.removeChild(node);
			return true;
		}

		return false;
	}

	function attachEvents(element, model, registerOnly)
	{
		for (var i = 0; i < element.childNodes.length; i++)
		{
			if (element.childNodes[i].nodeType == nodeType.ELEMENT)
				attachEvents.call(this, element.childNodes[i], model, registerOnly);
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

			this.registerEvent(targetEventName);
			if (registerOnly)
				continue;

			params = params.map(function (param)
			{
				return bindString(param, model);
			});

			var $element = $(element);
			$element.data("emit-" + sourceEventName, targetEventName);
			$element.data("emit-params", params);
			$element.off(sourceEventName).on(sourceEventName, $.proxy(onEventHandler, this));
		}
	}

	function onEventHandler(e)
	{
		var $element = $(e.currentTarget);
		var emitEventName = $element.data("emit-" + e.type);
		var eventParams = $element.data("emit-params") || {};

		var event = new $evt.Event(this, emitEventName, eventParams);
		event.originalEvent = e;

		this.fire(event);
		this.update();
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
						match = name == node.nodeName;

					if (match)
						return handlers[i].handler;
				}

			}
		}

		if (handlers["*"])
			return handlers["*"].handler;
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

	function bindString(value, model)
	{
		return evaluateExpression(
			evaluateExpressions(
				substitutePlaceholders(value, model), model), model);
	}

	function bindAttribute(attr, model)
	{
		var attrName = attr.name.substring(10);
		var processed = bindString(attr.value, model);
		attributeParent(attr).setAttribute(attrName, processed);
	}

	function bindClassAttribute(node, model)
	{
		var element = attributeParent(node);
		var classObj = {};
		try
		{
			classObj = JSON.parse(node.nodeValue);
		}
		catch(error)
		{
			console.debug(node.nodeValue);
			console.error(error);
			return;
		}

		var $el = $(element);
		for (var className in classObj)
		{
			var expressionResult = bindString(classObj[className], model);

			var classOn = (expressionResult == true || expressionResult == "true");
			$el.toggleClass(className, classOn);
		}
	}

	function bindVisibilityAttribute(node, model)
	{
		var attrName = node.nodeName;
		var expressionResult = bindString(node.nodeValue, model);

		var valid = (expressionResult == true || expressionResult == "true");
		var show = attrName == "data-visible";

		$(attributeParent(node)).toggle(show ? valid : !valid);
	}

	function bindBindAttribute(node, model)
	{
		var element = attributeParent(node);
		element.innerHTML = getValue(node.nodeValue, model);
	}

	function bindElement(element, model)
	{
		//reset(element);

		var i;
		var nodes = [];

		for (i = 0; i < element.attributes.length; i++)
			bindNode.call(this, element.attributes[i], model);

		for (i = 0; i < element.childNodes.length; i++)
			nodes.push(element.childNodes[i]);

		var loopWalking = false;
		for (i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];

			if (isLoopStart(node) && !isLoopEnd(nodes[i + 1]))
			{
				bindNode.call(this, node, model);
				loopWalking = true;
			}
			else if (isLoopEnd(node))
			{
				loopWalking = false;
			}

			if (!loopWalking)
				bindNode.call(this, node, model);
		}
	}

	function bindExpressionComment(node, model)
	{
		cleanupGeneratedContent(node);

		var expression = node.nodeValue.match(RX_EXPR_START)[1];
		var value = evaluateExpressions(expression, model);
		var textNode = node.ownerDocument.createTextNode(value);
		node.parentNode.insertBefore(textNode, node.parentNode.childNodes[indexOf(node) + 1]);
	}

	function bindPlaceholderComment(node, model)
	{
		var expression = node.nodeValue.match(RX_PLACEHOLDER_START)[1];
		var currentValue = getCommentText.call(this, node);
		var value = getValue(expression, model);

		if (value != currentValue)
		{
			cleanupGeneratedContent(node);
			var textNode = node.ownerDocument.createTextNode(value);
			node.parentNode.insertBefore(textNode, node.parentNode.childNodes[indexOf(node) + 1]);
		}
	}

	function bindLoopComment(node, model)
	{
		var loopIndex = node.nodeValue.match(RX_LOOPSTART)[1];
		var loop = this.loops[loopIndex];
		var collection = getValue(loop.expression, model);

		if (JSON.stringify(loop.lastCollection) == JSON.stringify(collection))
			return;

		cleanupGeneratedContent(node);

		loop.lastCollection = collection;
		var following = node.parentNode.childNodes[indexOf(node) + 1];
		var index = 0;
		for (var key in collection)
		{
			if (!collection.hasOwnProperty(key))
				continue;

			var iterNode = loop.element.cloneNode(true);
			iterNode._generated = true;
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

			bindNode.call(this, iterNode, iterationModel);
			attachEvents.call(this, iterNode, iterationModel);

			var inserted = node.parentNode.insertBefore(iterNode, following);
			one.controls.update(inserted);

			index += 1;
		}
	}

	function reset(element)
	{
		var comments = [];
		for (var i = 0; i < element.childNodes.length; i++)
		{
			var node = element.childNodes[i];
			if (node.nodeType == nodeType.COMMENT)
			{
				if (node.nodeValue.match(RX_LOOPSTART) || node.nodeValue.match(RX_EXPR_START)  || node.nodeValue.match(RX_PLACEHOLDER_START))
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

	function getCommentText(commentStartNode)
	{
		var nodes = getCommentNodes.call(this, commentStartNode);
		var text = [];
		for (var i = 0; i < nodes.length; i++)
			text.push(nodes[i].textContent);

		return text.join("");
	}

	function getCommentNodes(commentStartNode)
	{
		var endExpression = commentStartNode.nodeValue.match(RX_LOOPSTART) ? RX_LOOPEND : RX_EXPR_END;

		var parent = commentStartNode.parentNode;
		var nodes = [];
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

				nodes.push(node);
			}
		}

		return nodes;
	}

	function cleanupGeneratedContent(commentStartNode)
	{
		var nodes = getCommentNodes.call(this, commentStartNode);
		var parent = commentStartNode.parentNode;

		for (var i = 0; i < nodes.length; i++)
			parent.removeChild(nodes[i]);
	}

	function evaluateExpressions(text, model)
	{
		while (text.match(RX_EVAL_EXPRESSION))
		{
			text = text.replace(RX_EVAL_EXPRESSION, function (match, expression)
			{
				return evaluateExpression(expression, model);
			});
		}

		return text; //evaluateExpression(text, model);
	}

	function substitutePlaceholders(expression, model)
	{
		return expression.replace(RX_SIMPLE_EXPRESSION, function (match, key)
		{
			if (isValidModelProperty(key, model))
			{
				return defaultIfNull(getValue(key, model));
			}
		});
	}

	function evaluateExpression(text, model)
	{
		var expression = substituteExpression(text, model);
		try
		{
			with (model)
			{
				return eval(expression);
			}
		}
		catch(error)
		{
			console.error(expression + ": " + error);
			return error;
		}
	}

	function substituteExpression(text, model)
	{
		var parts = text.split(/\s/);
		parts.map(function ($) { return getValue($, model); });
		return parts.join(" ");
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

	function getValue(text, model)
	{
		if (text.match(RX_EVAL_EXPRESSION))
		{
			return evaluateExpressions(RegExp.$1, model);
		}
		else if (isValidModelProperty(text, model))
		{
			return getModelValue(text, model);
		}

		return null;
	}

	function getModelValue(key, model)
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

		return defaultIfNull(result);
	}

	function defaultIfNull(value, defaultValue)
	{
		if (defaultValue == undefined || defaultValue == null)
			defaultValue = "";

		if (value == undefined || value == null)
			value = defaultValue;

		return value;
	}

	function isValidModelProperty(name, model)
	{
		var key1 = name.split(".")[0];
		return model[key1] != undefined;
	}

	function isLoopStart(node)
	{
		return node.nodeType == nodeType.COMMENT && node.nodeValue.match(RX_LOOPSTART) != null;
	}

	function isLoopEnd(node)
	{
		return node.nodeType == nodeType.COMMENT && node.nodeValue.match(RX_LOOPEND) != null;
	}

	function attributeParent(attr)
	{
		return attr.parentNode || attr.ownerElement;
	}

	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: "data-attr-*", handler: bindAttribute });
	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: "data-class", handler: bindClassAttribute});
	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: "data-bind", handler: bindBindAttribute});
	ModelBinder.registerNodeBinder(nodeType.ATTRIBUTE, { name: ["data-visible", "data-hidden"], handler: bindVisibilityAttribute});
	ModelBinder.registerNodeBinder(nodeType.ELEMENT, { name: "*", handler: bindElement });
	ModelBinder.registerNodeBinder(nodeType.COMMENT, { expression: RX_EXPR_START, handler: bindExpressionComment });
	ModelBinder.registerNodeBinder(nodeType.COMMENT, { expression: RX_PLACEHOLDER_START, handler: bindPlaceholderComment });
	ModelBinder.registerNodeBinder(nodeType.COMMENT, { expression: RX_LOOPSTART, handler: bindLoopComment });

	return (ModelBinder);

}());

