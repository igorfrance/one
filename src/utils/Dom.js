/**
 * @copyright 2012 Igor France
 * Licensed under the MIT License
 *
 * This file is a part of the one.js
 */

/**
 * Provides several dom-related utilities.
 * @type {Object}
 */
var $dom = new function dom()
{
	var generatedIds = {};
	var hideSpecs = [];
	var listeningToChange = false;

	var has =
	{
		requestAnimationFrame:
			window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame,

		cancelAnimationFrame:
			window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.webkitCancelRequestAnimationFrame ||
			window.mozCancelRequestAnimationFrame ||
			window.oCancelRequestAnimationFrame ||
			window.msCancelRequestAnimationFrame
	};

	var dom = new Dispatcher("selectionchange");

	/**
	 * Registers an element that should be hidden when it loses focus
	 * @param {{ element: Object, [delay]: Number, [hide]: Function, [related]: Object }} specs
	 */
	dom.registerAutoHide = function dom$registerAutoHide(specs)
	{
		if (!specs)
			return;

		var s = { element: null, delay: 0, hide: autoHideElement, related: [] };
		if (specs.jquery)
			s.element = $(specs);
		else
		{
			s.element = specs.element;
			if ($type.isNumber(specs.delay))
				s.delay = specs.delay;
			if ($type.isFunction(specs.hide))
				s.hide = specs.hide;
			if ($type.isArray(specs.related))
				s.related = specs.related;
		}

		hideSpecs.push(s);
		if (!listeningToChange)
		{
			$(document).bind("mousedown touchstart keyup", onDocumentEvent);
			listeningToChange = true;
		}
	};

	dom.isIE = function ()
	{
		return (
			window.navigator.userAgent.indexOf("MSIE") != -1 ||
			window.navigator.userAgent.indexOf("Trident") != -1
		);
	};

	dom.isTouchDevice = function ()
	{
		// feature detection based checks have been failing lately on chrome, as
		// the window.ontouchstart since few versions ago. brute force, stupid but realiable
		return !!navigator.userAgent
			.match(/\b(?:iphone|ipod|ipad|android|iemobile|blackberry|bada)\b/i);
	};

	dom.mouseDownEvent = function ()
	{
		return dom.isTouchDevice() ? "touchstart" : "mousedown";
	};

	dom.mouseUpEvent = function ()
	{
		return dom.isTouchDevice() ? "touchend" : "mouseup";
	};

	dom.mouseMoveEvent = function ()
	{
		return dom.isTouchDevice() ? "touchmove" : "mousemove";
	};

	dom.fastClickEvent = function ()
	{
		return dom.isTouchDevice() ? "touchstart" : "click";
	};

	dom.uniqueID = function dom$uniqueID(element)
	{
		if (element && element.jquery)
			element = element[0];

		if (element == null)
			return null;

		if ($string.isEmpty(element.id))
		{
			var id = $date.time();
			while (generatedIds[id] != null)
				id++;

			generatedIds[id] = id;
			element.id = "u" + id;
		}

		return element.id;
	};

	dom.unselectable = function dom$unselectable(off)
	{
		var selectable = value in { "false": true, "off": true };
		var value = selectable ? $string.EMPTY : "none";

		var elements = $array.fromArguments(arguments);
		for (var i = 0; i < elements.length; i++)
		{
			$(elements[i]).css({
				"user-select": value,
				"-o-user-select": value,
				"-moz-user-select": value,
				"-khtml-user-select": value,
				"-webkit-user-select": value,
				"-ms-user-select": value
			});
		}
	};

	dom.requestAnimationFrame = function (callback)
	{
		return (has.requestAnimationFrame ||
			// if all else fails, use setTimeout
			function () {
				return window.setTimeout(callback, 1000 / 60); // shoot for 60 fps
			}
		)(callback);
	};

	/**
	 * Behaves the same as setInterval except uses dom.requestAnimationFrame for better performance
	 * @param {Function} fn The callback function
	 * @param {Number} delay The delay in milliseconds
	 */
	dom.requestInterval = function (fn, delay)
	{
		if (!has.requestAnimationFrame)
			return window.setInterval(fn, delay);

		var start = new Date().getTime();
		var handle = {};

		function loop()
		{
			var current = new Date().getTime();
			var delta = current - start;
			if (delta >= delay)
			{
				fn.call();
				start = new Date().getTime();
			}

			handle.value = dom.requestAnimationFrame(loop);
		}

		handle.value = dom.requestAnimationFrame(loop);
		return handle;
	};

	/**
	 * Behaves the same as setTimeout except uses dom.requestAnimationFrame for better performance
	 * @param {Function} fn The callback function
	 * @param {Number} delay The delay in milliseconds
	 */
	dom.requestTimeout = function (fn, delay)
	{
		if (!has.requestAnimationFrame)
			return window.setTimeout(fn, delay);

		var start = new Date().getTime();
		var handle = {};

		function loop()
		{
			var current = new Date().getTime();
			var delta = current - start;

			delta >= delay ? fn.call() : handle.value = dom.requestAnimationFrame(loop);
		}

		handle.value = dom.requestAnimationFrame(loop);
		return handle;
	};

	$.fn.unselectable = function unselectable(value)
	{
		return this.each(function unselectable()
		{
			dom.unselectable(value);
    });
	};

	function autoHideElement(element)
	{
		$(element).hide();
	}

	function onDocumentEvent(e)
	{
		for (var i = 0; i < hideSpecs.length; i++)
		{
			var specs = hideSpecs[i];
			for (var j = 0; j < specs.element.length; j++)
			{
				var $el = specs.element.eq(j);
				if (!$el.is(":visible"))
					continue;

				var delay = specs.delay;
				var hideFx = $.proxy(specs.hide, this, $el);

				var isMenuRelated =
					$el.is(e.target) || $el.has(e.target).length != 0;

				if (!isMenuRelated)
				{
					for (var k = 0; k < specs.related.length; k++)
					{
						var $related = $(specs.related[k]);
						isMenuRelated =
							$related.is(e.target) || $related.has(e.target).length != 0;

						if (isMenuRelated)
							break;
					}
				}

				if (!isMenuRelated)
				{
					if (delay)
						specs.delayId = setTimeout(hideFx, delay);
					else
						hideFx();
				}
				else if (delay)
				{
					clearTimeout(specs.delayId);
				}
			}
		}
	}

	return dom;
};

