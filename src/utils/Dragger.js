/**
 * Provides an object that coordinates dragging.
 */
var $drag = (function Dragger()
{
	var specs = {};

	var clientX, clientY;
	var startX, startY;

	var $target = null;

	var OVERLAY_CSS = "position: absolute; background: #fff; opacity: .01; z-index:10000;";
	var OVERLAY_CLASS = "drag-overlay-" + $date.time();

	var overlays = [];

	/**
	 * Implements a <c>Dispatcher</c> that controls element dragging.
	 * @event start Fired at the start of the drag.
	 * @event beforemove Fired before right before the element is moved. The event data will contain coordinates to which
	 * the object will be moved; <code>targetX</code> and <code>targetY</code>. This provides listener control over movement
	 * bounds; they can then analyze the target coordinates and set them accordingly prior to object being moved.
	 * @event move Fired right after the element has been moved. The event data will contain coordinates to which the
	 * object has been moved.
	 * @event end Fired at the end of the drag.
	 */
	var dragger = new Dispatcher("start", "beforemove", "move", "stop");
	dragger.active = false;

	/**
	 * Starts the dragging of an element.
	 *
	 * The <c>specifications</c> parameter specifies details about the drag:
	 * <ul><li>horizontal: Boolean (Specifies whether horizontal dragging is allowed. Default is <c>true</c>.)</li>
	 * <li>vertical: Boolean (Specifies whether vertical dragging is allowed. Default is <c>true</c>.)</li>
	 * <li>minX: Number (Specifies the minimum allowed horizontal coordinate.)</li>
	 * <li>maxX: Number (Specifies the minimum allowed horizontal coordinate.)</li>
	 * <li>minY: Number (Specifies the minimum allowed vertical coordinate.)</li>
	 * <li>maxY: Number (Specifies the minimum allowed vertical coordinate.)</li>
	 * </ul>
	 * @param {Event} e The event from which dragging starts; typically <code>mousedown</code>.
	 * @param {HTMLElement} target The element to be dragged.
	 * @param {Object} specifications Object with drag specifications.
	 * @returns {Boolean} <c>false</c> if drag has started, to cancel the original event; or <c>true</c> if the drag is
	 * rejected due to missing or invalid arguments.
	 */
	dragger.start = function start(e, target, specifications)
	{
		var event = e || window.event;
		if (event == null)
			return true;

		if (event.originalEvent)
			event = event.originalEvent;

		$target = $(target);
		if ($target.length == 0)
			return true;

		if (specifications == null)
			specifications = {};

		specs.moveX = specifications.moveX !== false;
		specs.moveY = specifications.moveY !== false;

		specs.accelX = 0;
		specs.accelY = 0;

		if (!specs.moveX && !specs.moveY)
			return true;

		specs.minX = isNaN(specifications.minX) ? Number.NEGATIVE_INFINITY : specifications.minX;
		specs.maxX = isNaN(specifications.maxX) ? Number.POSITIVE_INFINITY : specifications.maxX;
		specs.minY = isNaN(specifications.minY) ? Number.NEGATIVE_INFINITY : specifications.minY;
		specs.maxY = isNaN(specifications.maxY) ? Number.POSITIVE_INFINITY : specifications.maxY;

		clientX = $evt.x(e);
		clientY = $evt.y(e);

		var position = $target.position();
		var offset = $target.offset();

		startX = isNaN(position.left) ? offset.left : position.left;
		startY = isNaN(position.top) ? offset.top : position.top;

		$(document).capture("mouseup touchend", dragger.stop);
		$(document).capture("mousemove touchmove", move);

		overlayFrames();

		dragger.active = true;
		dragger.fire("start");

		return $evt.cancel(e);
	};

	dragger.stop = function stop(e)
	{
		var event = $evt.create(dragger, "stop", { specs: specs });
		event.target = $target[0];
		event.originalEvent = e;

		dragger.active = false;
		dragger.fire(event);

		document.removeEventListener("mousemove", move, true);
		document.removeEventListener("touchmove", move, true);
		document.removeEventListener("mouseup", stop, true);
		document.removeEventListener("touchend", stop, true);

		removeOverlays();

		$target = null;
	};

	function move(e)
	{
		var eventX = $evt.x(e);
		var eventY = $evt.y(e);

		var diffX = eventX - clientX;
		var diffY = eventY - clientY;

		var targetX = Math.max(Math.min(specs.maxX, startX + diffX), specs.minX);
		var targetY = Math.max(Math.min(specs.maxY, startY + diffY), specs.minY);

		if (dragger.__listeners["beforemove"].length)
		{
			var moveEvent = $evt.create(dragger, "beforemove");
			moveEvent.target = $target[0];

			if (specs.moveX)
				moveEvent.data.targetX = targetX;

			if (specs.moveY)
				moveEvent.data.targetY = targetY;

			dragger.fire(moveEvent);

			targetX = moveEvent.data.targetX;
			targetY = moveEvent.data.targetY;
		}

		var position1 = $target.position();
		if (specs.moveX)
			$target.css("left", targetX);
		if (specs.moveY)
			$target.css("top", targetY);

		var position2 = $target.position();
		if (position2.left != position1.left || position2.top != position1.top)
		{
			moveEvent = $evt.create(dragger, "move", position2);
			moveEvent.originalEvent = e;
			moveEvent.target = $target[0];

			dragger.fire(moveEvent);
		}

		specs.accelX = position2.left - position1.left;
		specs.accelY = position2.top - position1.top;

		sizeOverlays();
		return $evt.cancel(e);
	}

	function overlayFrames()
	{
		var iframes = $("iframe");
		if (iframes.length > 0)
		{
			removeOverlays();
			iframes.each(function overlayFrame(i, iframe)
			{
				if (iframe.offsetHeight > 0)
				{
					var overlay = document.createElement("div");
					overlay.iframe = iframe;
					overlay.style.cssText = OVERLAY_CSS;
					overlay.className = OVERLAY_CLASS;

					document.body.appendChild(overlay);

					overlays.push(overlay);
				}
			});

			sizeOverlays();
		}
	}

	function sizeOverlays()
	{
		for (var i = overlays.length - 1; i >= 0; i--)
		{
			var overlay = overlays[i];
			var iframeOffset = $(overlay.iframe).offset();

			overlay.style.left = iframeOffset.left + "px";
			overlay.style.top = iframeOffset.top + "px";
			overlay.style.width = overlay.iframe.offsetWidth + "px";
			overlay.style.height = overlay.iframe.offsetHeight + "px";
		}
	}

	function removeOverlays()
	{
		for (var i = overlays.length - 1; i >= 0; i--)
		{
			overlays[i].parentNode.removeChild(overlays[i]);
			overlays.pop();
		}
	}

	function onDragMouseDown(e)
	{
		var $this = $(this);
		var options = $this.data("options");
		var target = options.target;

		one.drag.start(e, target, options);
	}

	$.fn.draggable = function draggable(options)
	{
		this.each(function (i, instance)
		{
			var myOptions = $.extend({ target: instance }, options);
			var $instance = $(instance);
			var $handle = $instance.find(".handle");
			if ($handle.length == 0)
				$handle = $instance;

			$handle.on("mousedown", onDragMouseDown).data("options", myOptions);
		});

		return this;
	};

	return dragger;

})();
