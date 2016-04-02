/**
 * @copyright 2012 Igor France
 * Licensed under the MIT License
 *
 * This file is a part of the one.js
 */

/**
 * Provides event-related utilities.
 */
var $evt = new function ()
{
	var lowestDelta;
	var adjustOldDeltas = true;
	var normalizeOffset = true;

	/**
	 * Returns the cross-browser event object.
	 * @param {Event} e The event that was raised. In IE6 and lower this is null and is read from the window object.
	 * @returns {Event} The cross-browser event object.
	 */
	function evt(e)
	{
		return e || window.event;
	}

	/**
	 * Gets the x coordinate of the event
	 * @param e
	 * @returns {Number}
	 */
	evt.x = function x(e)
	{
		e = e.originalEvent || e;

		var result = 0;
		if ($type.isNumber(e.pageX))
			result = e.pageX;
		else if ($type.isNumber(e.clientX))
			result = e.clientX;

		if (e.touches && e.touches.length)
			result = e.touches[0].clientX;

		return result;
	};

	/**
	 * Gets the y coordinate of the event
	 * @param e
	 * @returns {Number}
	 */
	evt.y = function y(e)
	{
		e = e.originalEvent || e;

		var result = 0;
		if ($type.isNumber(e.pageY))
			result = e.pageY;
		else if ($type.isNumber(e.clientY))
			result = e.clientY;

		if (e.touches && e.touches.length)
			result = e.touches[0].clientY;

		return result;
	};

	evt.capture = function (target, event, handler)
	{
		target.addEventListener(event, handler, true);
	};

	evt.release = function (target, event, handler)
	{
		target.removeEventListener(event, handler, true);
	};

	evt.getNormalizedWheelDelta = function (elem, event)
	{
		event = event.originalEvent || event;

		var result = { delta: 0, deltaX: 0, deltaY: 0 };
		var absDelta = 0;

		// Old school scrollwheel delta
		if ('detail' in event)
			result.deltaY = event.detail * -1;
		if ('wheelDelta' in event)
			result.deltaY = event.wheelDelta;
		if ('wheelDeltaY' in event)
			result.deltaY = event.wheelDeltaY;
		if ('wheelDeltaX' in event)
			result.deltaX = event.wheelDeltaX * -1;

		// Firefox < 17 horizontal scrolling related to DOMMouseScroll event
		if ('axis' in event && event.axis === event.HORIZONTAL_AXIS)
		{
			result.deltaX = result.deltaY * -1;
			result.deltaY = 0;
		}

		// Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
		result.delta = result.deltaY === 0 ? result.deltaX : result.deltaY;

		// New school wheel delta (wheel event)
		if ('deltaY' in event)
		{
			result.deltaY = event.deltaY * -1;
			result.delta = result.deltaY;
		}
		if ('deltaX' in event)
		{
			result.deltaX = event.deltaX;
			if (result.deltaY === 0)
				result.delta = result.deltaX * -1;
		}

		// No change actually happened, no reason to go any further
		if (result.deltaY === 0 && result.deltaX === 0)
			return result;

		// Need to convert lines and pages to pixels if we aren't already in pixels
		// There are three delta modes:
		// * deltaMode 0 is by pixels, nothing to do
		// * deltaMode 1 is by lines
		// * deltaMode 2 is by pages
		if (event.deltaMode === 1)
		{
			var lineHeight = parseInt(elem.css("line-height"));
			result.delta *= lineHeight;
			result.deltaY *= lineHeight;
			result.deltaX *= lineHeight;
		}
		else if (event.deltaMode === 2)
		{
			var pageHeight = elem.height();
			result.delta *= pageHeight;
			result.deltaY *= pageHeight;
			result.deltaX *= pageHeight;
		}

		var shouldAdjustOldDeltas =
			adjustOldDeltas && event.type === 'mousewheel' && absDelta % 120 === 0;

		// Store lowest absolute delta to normalize the delta values
		absDelta = Math.max(Math.abs(result.deltaY), Math.abs(result.deltaX));
		if (!lowestDelta || absDelta < lowestDelta)
		{
			lowestDelta = absDelta;
			if (shouldAdjustOldDeltas)
				lowestDelta /= 40;
		}

		if (shouldAdjustOldDeltas)
		{
			result.delta /= 40;
			result.deltaX /= 40;
			result.deltaY /= 40;
		}

		result.delta = Math[result.delta >= 1 ? 'floor' : 'ceil' ](result.delta / lowestDelta);
		result.deltaX = Math[result.deltaX >= 1 ? 'floor' : 'ceil' ](result.deltaX / lowestDelta);
		result.deltaY = Math[result.deltaY >= 1 ? 'floor' : 'ceil' ](result.deltaY / lowestDelta);

		return result;
	};

	$.fn.wheelDelta = function (event)
	{
		return evt.getNormalizedWheelDelta(this, event);
	};

	$.fn.capture = function (event, handler)
	{
		if (!$type.isString(event) || !$type.isFunction(handler))
			return this;

		var events = event.split(/(?:\s+)|,/);
		this.each(function (i, element)
		{
			for (var j = 0; j < events.length; j++)
				evt.capture(element, events[j], handler)
		});

		return this;
	};

	$.fn.release = function (event, handler)
	{
		if (!$type.isString(event) || !$type.isFunction(handler))
			return this;

		var events = event.split(/(?:\s+)|,/);
		this.each(function (i, element)
		{
			for (var j = 0; j < events.length; j++)
				evt.release(element, events[j], handler)
		});

		return this;
	};

	evt.isMouseInRange = function isMouseInRange(e, elem)
	{
		if (one.drag.active)
			return;

		var $elem = $(elem);
		if ($elem.width() == 0 || $elem.height() == 0)
			return false;

		var offset = $elem.offset();
		var mouseX = e.clientX + $(document).scrollLeft();
		var mouseY = e.clientY + $(document).scrollTop();

		return (
			mouseX >= offset.left && mouseX <= (offset.left + $elem.width()) &&
			mouseY >= offset.top && mouseY <= (offset.top + $elem.height())
		);
	};

	/**
	 * Calls the event's <c>preventDefault</c> and <c>stopPropagation</c> methods.
	 * @param {Event} e The event that was raised.
	 * @returns {Boolean} Returns false.
	 */
	evt.cancel = function cancel(e)
	{
		return false;
	};

	evt.preventDefault = function preventDefault(e)
	{
		var e = evt(e);
		if (e != null)
		{
			if (e.preventDefault)
				e.preventDefault();
		}

		return false;
	};

	evt.stopPropagation = function stopPropagation(e)
	{
		var e = evt(e);
		if (e != null)
		{
			e.cancelBubble = true;
			if (e.stopPropagation)
				e.stopPropagation();
		}
	};

	evt.neutralize = function neutralize(e)
	{
		var e = evt(e);
		if (e != null)
		{
			e.cancelBubble = true;
			if (e.preventDefault)
				e.preventDefault();

			if (e.stopPropagation)
				e.stopPropagation();
		}

		return false;
	};

	/**
	 * Creates a new <c>Event</c> object.
	 * @param {Dispatcher} source The object that fired the event.
	 * @param {String} type The event type/name.
	 * @param {Object} [data] Optional object that contain additional event information.
	 * @returns {$evt.Event} A new <c>Event</c> object.
	 */
	evt.create = function createEvent(source, type, data)
	{
		return new evt.Event(source, type, data);
	};

	/**
	 * Implements an object that provides information about events raised by <c>Dispatcher</c> objects.
	 * @constructor
	 * @param {Dispatcher} source The object that fired the event.
	 * @param {String} type The event type/name.
	 * @param {Object} data Optional object that contain additional event information.
	 */
	evt.Event = function Event(source, type, data)
	{
		this.source = source;
		this.type = type;
		this.name = type;
		this.cancel = false;
		this.data = {};

		for (var prop in data)
			if (data.hasOwnProperty(prop))
				this.data[prop] = data[prop];
	};

	evt.transitionEnd = "transitionend webkitTransitionEnd";
	return evt;
};
