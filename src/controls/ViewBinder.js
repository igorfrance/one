var ViewBinder = Dispatcher.extend((function ()
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

	function ViewBinder(element)
	{
		this.loops = [];
		this.element = null;

		if (element)
			this.initialize(element);
	}

	ViewBinder.prototype.initialize = function (element)
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

	ViewBinder.prototype.apply = function (model)
	{
		bindElementNode.call(this, this.element, model);
	};

	function prepareNode(node)
	{
		switch (node.nodeType)
		{
			case $xml.nodeType.ELEMENT:
				prepareElementNode.call(this, node);
				break;

			case $xml.nodeType.TEXT:
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
			if (element.childNodes[i].nodeType == $xml.nodeType.ELEMENT)
				attachEvents.call(this, element.childNodes[i]);
		}

		for (var i = 0; i < element.attributes.length; i++)
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
					params = $1.replace(/\s/g, ",").replace(/,{2,}/,",").split(",");
				}
			});

			attachEvent.call(this, element, sourceEventName, targetEventName, params);
		}
	}

	function attachEvent(element, eventName, emitEventName, params)
	{
		this.registerEvent(emitEventName);

		var self = this;
		element.on(eventName, function (e)
		{
			var event = new one.Event(self, emitEventName, params);
			event.originalEvent = e;
			self.fire(emitEventName, event);
		});
	}

	function bindElementNode(element, model)
	{
		for (var i = 0; i < element.attributes.length; i++)
		{
			var attr = element.attributes[i];

			switch (attr.name)
			{
				case "data-class":
					bindClasses(element, model);
					break;

				case "data-visible":
				case "data-hidden":
					bindVisibility(element, model, attr.name);
					break;

				default:
					if (attr.value.match(RX_EXPRESSION))
					{
						var processed = bindString(attr.value, model);
						element.setAttribute(attr.name, processed);
					}
			}
		}

		var nodes = [];
		for (var i = 0; i < element.childNodes.length; i++)
			nodes.push(element.childNodes[i]);

		for (var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			if (node.nodeType == $xml.nodeType.COMMENT)
			{
				bindCommentNode.call(this, node, model);
			}
			else if (node.nodeType == $xml.nodeType.ELEMENT)
			{
				bindElementNode.call(this, node, model);
			}
		}
	}

	function bindCommentNode(node, model)
	{
		if (node.nodeValue.match(RX_LOOPSTART))
			bindLoopCommentNode.call(this, node, model);

		else if (node.nodeValue.match(RX_EXPRSTART))
			bindTextCommentNode.call(this, node, model);
	}

	function bindLoopCommentNode(node, model)
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

			bindElementNode.call(this, instance, iterationModel);
			attachEvents.call(this, instance);

			node.parentNode.insertBefore(instance, following);
			index += 1;
		}
	}

	function bindTextCommentNode(node, model)
	{
		cleanupGeneratedContent(node);

		var expression = node.nodeValue.match(RX_EXPRSTART)[1];
		var value = getValue(model, expression);
		var textNode = node.ownerDocument.createTextNode(value);
		node.parentNode.insertBefore(textNode, node.parentNode.childNodes[indexOf(node) + 1]);
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
				if (node.nodeType == $xml.nodeType.COMMENT && node.nodeValue.match(endExpression))
					break;

				elements.push(node);
			}
		}

		for (var i = 0; i < elements.length; i++)
			parent.removeChild(elements[i]);
	}

	function bindClasses(element, model)
	{
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

	function bindVisibility(element, model, attrName)
	{
		var expressionText = element.getAttribute(attrName);
		var expressionResult = evaluateExpression(bindString(expressionText, model), model);

		var valid = (expressionResult == true || expressionResult == "true");
		var show = attrName == "data-visible";

		if (show)
			$(element).toggle(valid);
		else
			$(element).toggle(!valid);
	}

	function bindString(template, model)
	{
		return template.replace(RX_EXPRESSION, function (match, expression)
		{
			return evaluateExpression(expression, model);
		});
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

	function onViewEvent()
	{

	}

	return (ViewBinder);

})());

