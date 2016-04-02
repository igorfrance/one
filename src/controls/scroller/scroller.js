/**
 * Implements a simple scroller control.
 */
one.controls.scroller = (function Scroller()
{
	var scroller = {};
	var scrollers = [];
	var sizing = { FIXED: 0, PROPORTIONAL: 1 };
	var lineHeight = 20;
	var scrollbarSize = null;

	var orientation = { VERTICAL: "VERTICAL", HORIZONTAL: "HORIZONTAL" };

	var className = {
		HOVER: "hover",
		HOT: "hot",
		ENGAGED: "engaged"
	};

	/**
	 * Defines the settings of the <c>Tooltip</c> control.
	 * @extends {one.Settings}
	 * @param {Object} data The object with initial settings.
	 * @param {Object} element The object with overriding settings. If a setting exist both in
	 * <c>data</c> and in <c>override</c> objects, the setting from <c>override</c> takes precedence.
	 */
	var ScrollerSettings = one.Settings.extend(function ScrollerSettings(element, settings)
	{
		var sizingValue = this.getString("sizing", element, settings, "").toLowerCase();
		this.sizing = sizingValue == "fixed" ? sizing.FIXED : sizing.PROPORTIONAL;
		this.animate = this.getBoolean("animate", element, settings, true);
	});

	/**
	 * Implements a custom scroller control.
	 * @extends {one.HtmlControl}
	 */
	var Scroller = one.HtmlControl.extend(function ScrollerControl(element, settings)
	{
		this.construct(element, "scroll", "dragstart", "dragend");

		this.settings = new ScrollerSettings(element, settings);
		this.mouseInRange = false;

		if (scrollbarSize == null)
			scrollbarSize = measureScrollbarSize();

		// if the target element already has the markup that looks like what we
		// need, assume that the element has already been setup and proceed without
		// creating the wrapping elements. it is up to the author of element's html
		// to ensure that the markup is setup correctly.
		if (this.$element.find("> .one-scroller").length == 0)
		{
			this.$element.html(one.string.format(
				"<div class='one-scroller'><div class='one-scrollcontent'>{0}</div></div>"+
				"<div class='one-scrolltrack vertical'><div class='one-scrollgrip'/></div>" +
				"<div class='one-scrolltrack horizontal'><div class='one-scrollgrip'/></div>",
					this.$element.html()));

		}

		this.$scroller = this.$element.find("> .one-scroller");
		this.$content = this.$scroller.find("> .one-scrollcontent");

		this.$trackVertical = this.$element.find("> .one-scrolltrack.vertical");
		this.$gripVertical = this.$trackVertical.find("> .one-scrollgrip");
		this.$trackHorizontal = this.$element.find("> .one-scrolltrack.horizontal");
		this.$gripHorizontal = this.$trackHorizontal.find("> .one-scrollgrip");
		this.$content.css("padding", this.$element.css("padding"));
		this.$content.data("_paddingRight", parseInt(this.$content.css("paddingRight")) || 0);
		this.$content.data("_paddingBottom", parseInt(this.$content.css("paddingBottom")) || 0);

		this.$scroller.css({
			right: -scrollbarSize.width,
			bottom: -scrollbarSize.height
		});

		this.scrollRatio = {};

		this.$scroller.on("scroll", $.proxy(onScroll, this));

		this.onDragMove = $.proxy(onDragMove, this);
		this.onDragEnd = $.proxy(onDragEnd, this);

		this.offsetVertical = parseInt(this.$gripVertical.css("top")) || 0;
		this.offsetHorizontal = parseInt(this.$gripHorizontal.css("left")) || 0;

		this.scrollOrientation = null;
		this.enabled = true;
		this.overflow = this.$scroller.css("overflow");

		this.switches =
		{
			HOVER: { id: 0, duration: 2000 },
			ENGAGED: { id: 0, duration: 500 },
			HOT: { id: 0, duration: 1500 }
		};

		if (!one.dom.isTouchDevice())
		{
			$(document).on("mousemove", $.proxy(onDocumentMouseMove, this));
		}

		this.$gripVertical
			.data("orientation", orientation.VERTICAL)
			.on("mousedown", $.proxy(onGripMouseDown, this))
			.on("click", one.event.cancel);
		this.$gripHorizontal
			.data("orientation", orientation.HORIZONTAL)
			.on("mousedown", $.proxy(onGripMouseDown, this))
			.on("click", one.event.cancel);

		this.$trackVertical
			.on("mouseenter", $.proxy(onScrollTrackMouseOver, this))
			.on("mouseleave", $.proxy(onScrollTrackMouseOut, this))
			.on("click", $.proxy(onScrollTrackClick, this));

		this.$trackHorizontal
			.on("mouseenter", $.proxy(onScrollTrackMouseOver, this))
			.on("mouseleave", $.proxy(onScrollTrackMouseOut, this))
			.on("click", $.proxy(onScrollTrackClick, this));

		this.$scroller
			.on("mousewheel DOMMouseScroll", $.proxy(onMouseWheel, this));

		this.$element.data("scroller", this);
		this.redraw();
	});

	Scroller.prototype.enable = function ()
	{
		this.enabled = true;
		this.redraw();
		if (this.isScrollable())
		{
			this.$scroller.css("overflow", one.string.EMPTY);
			this.$trackVertical.show();
		}
	};

	Scroller.prototype.disable = function ()
	{
		this.enabled = false;
		this.$trackVertical.hide();
		this.$scroller.css("overflow", "hidden");
	};

	Scroller.prototype.isScrollable = function ()
	{
		return this.isScrollableVertically() || this.isScrollableHorizontally();
	};

	Scroller.prototype.isScrollableVertically = function ()
	{
		var totalLength = this.$scroller.prop("scrollHeight");
		var availableLength = this.$scroller["outerHeight"]();

		return totalLength > availableLength;
	};

	Scroller.prototype.isScrollableHorizontally = function ()
	{
		var totalLength = this.$scroller.prop("scrollWidth");
		var availableLength = this.$scroller["outerWidth"]();

		return totalLength > availableLength;
	};

	Scroller.prototype.scrollLeft = function (value)
	{
		if (!isNaN(value) && value >= 0)
			this.$scroller.prop("scrollLeft", value);

		return this.$scroller.prop("scrollLeft");
	};

	Scroller.prototype.scrollTop = function (value)
	{
		if (!isNaN(value) && value >= 0)
			this.$scroller.prop("scrollTop", value);

		return this.$scroller.prop("scrollTop");
	};

	Scroller.prototype.scrollHeight = function (value)
	{
		if (!isNaN(value) && value > 0)
		{
			this.$content.css("height", value);
			this.redraw();
		}

		return this.$content.prop("scrollHeight");
	};

	Scroller.prototype.scrollWidth = function (value)
	{
		if (!isNaN(value) && value > 0)
		{
			this.$content.css("width", value);
			this.redraw();
		}

		return this.$content.prop("scrollWidth");
	};

	Scroller.prototype.scrollMaxLeft = function ()
	{
		return this.scrollWidth() - this.$content.width();
	};

	Scroller.prototype.scrollMaxTop = function ()
	{
		return this.scrollHeight() - this.$content.height();
	};

	Scroller.prototype.scrollLeft = function (value)
	{
		if (this.enabled && !isNaN(value))
			this.$scroller.prop("scrollLeft", value);

		return this.$scroller.prop("scrollLeft");
	};

	Scroller.prototype.scrollTop = function (value)
	{
		if (this.enabled && !isNaN(value))
			this.$scroller.prop("scrollTop", value);

		return this.$scroller.prop("scrollTop");
	};

	Scroller.prototype.redraw = function ()
	{
		redrawAxis.call(this, orientation.VERTICAL);
		redrawAxis.call(this, orientation.HORIZONTAL);

		updateClasses.call(this);
	};

	function updateClasses()
	{
		if (this.enabled)
		{
			this.$element.toggleClass("one-hscrollable", this.isScrollableHorizontally());
			this.$element.toggleClass("one-vscrollable", this.isScrollableVertically());
		}
		else
		{
			this.$element.removeClass("one-hscrollable one-vscrollable");
		}
	}

	function toggleScrolling()
	{
		this.$trackVertical.toggle();
	}

	function redrawAxis(side)
	{
		var props = one.HtmlControl.PROPS[side];
		var $track = side == orientation.HORIZONTAL ? this.$trackHorizontal : this.$trackVertical;
		var $grip = side == orientation.HORIZONTAL ? this.$gripHorizontal : this.$gripVertical;

		var gripOffset1, gripOffset2;
		if (side == orientation.HORIZONTAL)
		{
			gripOffset1 = parseInt(this.$gripVertical.css("top")) || 0;
			gripOffset2 = parseInt(this.$gripVertical.css("bottom")) || 0;
		}
		else
		{
			gripOffset1 = parseInt(this.$gripVertical.css("left")) || 0;
			gripOffset2 = parseInt(this.$gripVertical.css("right")) || 0;
		}

		var totalLength = this[props.scrollSize]();
		var availableLength = this.$element[props.size]();

		var trackSize = $track[props.size]();
		var gripSize = $grip[props.size]();

		if (totalLength > availableLength)
		{
			var trackPadSize = parseInt($track.css(props.scrollPaddingSize));
			this.$content.css(props.scrollPadding, this.$content.data("_" + props.scrollPadding) + trackPadSize);

			totalLength = this[props.scrollSize]();
			var scrollAreaLength = trackSize - (gripOffset1 + gripOffset2);
			this.scrollRatio[side] = scrollAreaLength / totalLength;

			gripSize = Math.round(availableLength * this.scrollRatio[side]);
			$grip.css(props.size, gripSize);

			$grip.data("minScroll", gripOffset1);
			$grip.data("maxScroll", trackSize - gripSize - gripOffset2);

		}
		else
		{
			this.$content.css(props.scrollPadding, this.$content.data("_" + props.scrollPadding));
		}
	}

	function scrollContentFromGripDrag()
	{
		var $grip = this.$scrollGrip;
		var orientation = $grip.data("orientation");
		var props = one.HtmlControl.PROPS[orientation];
		var gripPos = $grip.position()[props.position];
		var targetPos = Math.round(gripPos / this.scrollRatio[orientation]);
		this.$scroller.prop(props.scrollPos, targetPos);
	}

	function positionGripsFromScrolling()
	{
		var scrollTop = this.$scroller.prop("scrollTop");
		var scrollLeft = this.$scroller.prop("scrollLeft");
		var targetTop = Math.round(scrollTop * this.scrollRatio[orientation.VERTICAL]);
		var targetLeft = Math.round(scrollLeft * this.scrollRatio[orientation.HORIZONTAL]);

		this.$gripVertical.css("top",
			Math.min(
				Math.max(
					this.$gripVertical.data("minScroll"), targetTop),
					this.$gripVertical.data("maxScroll")));

		this.$gripHorizontal.css("left",
			Math.min(
				Math.max(
					this.$gripHorizontal.data("minScroll"), targetLeft),
					this.$gripHorizontal.data("maxScroll")));
	}

	function switchOn(name, autoOff)
	{
		cancelOff.call(this, name);
		this.$element.addClass(className[name]);
		if (autoOff)
		{
			delayOff.call(this, name, true);
		}
	}

	function switchOff(name)
	{
		this.$element.removeClass(className[name]);
	}

	function delayOff(name)
	{
		cancelOff.call(this, name);
		this.switches[name].id = setTimeout($.proxy(switchOff, this, name), this.switches[name].duration);
	}

	function cancelOff(name)
	{
		if (this.switches[name])
			clearTimeout(this.switches[name].id);
	}

	function onGripMouseDown(e)
	{
		var $grip = $(e.currentTarget);
		var $track = $grip.closest(".one-scrolltrack");

		one.drag.on("move", this.onDragMove);
		one.drag.on("stop", this.onDragEnd);

		var vertical = $grip.data("orientation") == orientation.VERTICAL;

		var specs = {
			moveX: !vertical,
			moveY: vertical,
			minX: this.$gripHorizontal.data("minScroll"),
			maxX: this.$gripHorizontal.data("maxScroll"),
			minY: this.$gripVertical.data("minScroll"),
			maxY: this.$gripVertical.data("maxScroll")
		};

		one.drag.start(e, e.currentTarget, specs);
		this.fireEvent("dragstart");
		$track.addClass("active");

		this.$scrollGrip = $grip;
		this.scrollOrientation = vertical ? orientation.VERTICAL : orientation.HORIZONTAL;

		return false;
	}

	function onDragMove()
	{
		scrollContentFromGripDrag.call(this);
	}

	function onDragEnd()
	{
		one.drag.off("move", this.onDragMove);
		one.drag.off("stop", this.onDragEnd);

		var $track = this.$scrollGrip.closest(".one-scrolltrack");
		$track.removeClass("active");

		this.scrollOrientation = null;
		this.fireEvent("dragend");
		this.$trackVertical.removeClass("active");
	}

	function onScroll()
	{
		switchOn.call(this, "ENGAGED", true);
		positionGripsFromScrolling.call(this);
		this.fireEvent("scroll");
	}

	function onScrollTrackMouseOver(e)
	{
		e.stopPropagation();
	}

	function onScrollTrackMouseOut(e)
	{
		e.stopPropagation();
	}

	function onScrollTrackClick(e)
	{
		var $track = $(e.currentTarget);
		var $grip = $track.find(".one-scrollgrip");
		var props = one.HtmlControl.PROPS[$grip.data("orientation")];

		var gripStart = parseInt($grip.css(props.position));
		var gripEnd = parseInt(gripStart + $grip[props.size]());

		var eventPos = e[props.offsetPos];
		if (eventPos < gripStart || eventPos > gripEnd)
		{
			var pageSize = this.$scroller[props.size]();
			var scrollPos = this.$scroller.prop(props.scrollPos);
			if (eventPos < gripStart)
			{
				console.log("Moving from click to: " + (scrollPos - pageSize));
				this.$scroller.prop(props.scrollPos, scrollPos - pageSize);
			}
			else
			{
				console.log("Moving from click to: " + (scrollPos + pageSize));
				this.$scroller.prop(props.scrollPos, scrollPos + pageSize);
			}
		}
	}

	function onDocumentMouseMove(e)
	{
		if (one.event.isMouseInRange(e, this.$element))
		{
			if (!this.mouseInRange)
			{
				switchOn.call(this, "HOVER");
				this.mouseInRange = true;
				onMouseOver.call(this, e);
			}
		}
		if (!one.event.isMouseInRange(e, this.$element))
		{
			if (this.mouseInRange)
			{
				switchOff.call(this, "HOVER");
				this.mouseInRange = false;
				onMouseOut.call(this, e);
			}
		}
	}

	function onMouseOver(e)
	{
		if (!this.isScrollable() || !this.enabled)
			return;

		switchOn.call(this, "HOT", true);
		e.stopPropagation();

		updateClasses.call(this);

		var parent = this.$element.parent();
		while (parent.length != 0)
		{
			var instance = parent.data("scroller");
			if (instance != null)
			{
				toggleScrolling.call(this);
			}

			parent = parent.parent();
		}
	}

	function onMouseOut(e)
	{
		if (!this.isScrollable() || !this.enabled)
			return;

		switchOff.call(this, "HOT");
		var parent = this.$element.parent();
		while (parent.length != 0)
		{
			var instance = parent.data("scroller");
			if (instance != null)
			{
				toggleScrolling.call(this);
			}

			parent = parent.parent();
		}
	}

	/**
	 * Converts a regular scroll to a horizontal scroll automatically as required
	 * @param e
	 * @returns {boolean}
	 */
	function onMouseWheel(e)
	{
		if (!this.enabled || !this.isScrollable())
			return true;

		if (this.isScrollableVertically() || e.shiftKey)
			return true;

		var delta = this.$scroller.wheelDelta(e);
		var scrollLeft = this.scrollLeft();
		this.scrollLeft(scrollLeft - (delta.deltaY * 30));
	}

	function measureScrollbarSize()
	{
		var $c = $("<div style='position: absolute; top:-1000px; left:-1000px; width:100px; height:100px; overflow:scroll;'></div>").appendTo("body");
		return {
			width: $c.width() - $c[0].clientWidth,
			height: $c.height() - $c[0].clientHeight
		};
	}

	scroller.create = function(context, settings)
	{
		if (context == null || context.length == 0)
		{
			return one.log.error("Specify the elements to initialize by using the expression argument");
		}

		var instances = [];
		$(context).each(function (i, element)
		{
			var control = $(element).data("scroller") || new Scroller(element, settings);
			instances.push(control);
		});

		return instances.length > 1 ? instances : instances[0];
	};

	$.fn.scroller = function (settings)
	{
		return this.each(function (i, element)
		{
			scroller.create(element, settings);
		});
	};

	return scroller;

})();
