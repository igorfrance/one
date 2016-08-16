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

/**
 * Implements a simple slider control.
 * @constructor
 * @param {HtmlElement} elem The HTMLElement that represents this control.
 * @event onchange Occurs when the value is changed, either programmatically or by moving the slider manually.
 * @event onreset Occurs when the value is reset to the default value.
 * @event ondragcomplete Occurs at the end of a drag move operation
 */
one.controls.slider = (function Slider()
{
	var slider = {};
	var orientation = { HORIZONTAL: "HORIZONTAL", VERTICAL: "VERTICAL" };
	var layout = { NORMAL: 0, INVERTED: 1 };

	var SliderSettings = one.Settings.extend(function SliderSettings(element, settings)
	{
		this.orientation = $(element).hasClass("vertical") ? orientation.VERTICAL : orientation.HORIZONTAL;
		this.layout = this.orientation == orientation.VERTICAL ? layout.INVERTED : layout.NORMAL;

		this.roundValues = this.getBoolean("roundValues", element, settings, true);
		this.minValue = this.getNumber("minValue", element, settings, 0);
		this.maxValue = this.getNumber("maxValue", element, settings, 100);
		this.value = this.getNumber("value", element, settings);
		this.defaultValue = this.getNumber("defaultValue", element, settings, this.minValue);
		this.textElement = this.getString("textElement", element, settings, one.string.EMPTY).trim();
		this.controlElement = this.getString("controlElement", element, settings, one.string.EMPTY).trim();

		if (this.maxValue < this.minValue)
		{
			this.maxValue = this.minValue;
		}
	});

	/**
	 * Implements a custom slider control.
	 */
	var SliderControl = one.HtmlControl.extend(function SliderControl(element, settings)
	{
		this.construct(element, "change", "reset");

		this.settings = new SliderSettings(element, settings);
		this.props = one.HtmlControl.PROPS[this.settings.orientation];

		this.ready = false;
		this.$handle = $("<div class='handle'/>");
		this.$element.html(one.string.EMPTY);
		this.$element.append(this.$handle);
		this.$text = findElement(this.$element, this.settings.textElement);
		this.$control = findElement(this.$element, this.settings.controlElement);

		this.$handle.on("mousedown", $.proxy(onHandleMouseDown, this));
		this.$handle.on("dblclick", $.proxy(this.reset, this));

		this.onDragMove = $.proxy(onDragMove, this);
		this.onDragEnd = $.proxy(onDragEnd, this);

		$(window).on("resize", $.proxy(onWindowResize, this));

		this.minPos = 0;
		this.maxPos = 0;
		this.ratio = 0;

		redrawInstance(this);
		// updateControls(this, true);
		//
		// this.initValue = parseFloat(this.$element.attr("data-value")) || 0;
		// this.value(this.initValue);

		this.$element.data("slider", this);
	});

	SliderControl.prototype.reset = function slider$reset()
	{
		this.value(this.settings.defaultValue);
	};

	SliderControl.prototype.value = function slider$value(value)
	{
		if (!this.$element.is(":visible"))
		{
			if (value)
				this._value = value;

			return this._value != null ? this._value : this.initValue;
		}

		var pos = parseFloat(this.$handle.css(this.props.position));
		var current = this.settings.layout == layout.INVERTED
			? this.settings.minValue + ((this.maxPos - pos) * this.ratio)
			: this.settings.minValue + (pos * this.ratio);

		if (one.type.isNumeric(value))
		{
			var newValue = Math.max(Math.min(parseFloat(value), this.settings.maxValue), this.settings.minValue);
			var changed = newValue != this._value;

			this._value = newValue;
			if (this._value != current)
			{
				var converted = this._value - this.settings.minValue;

				pos = converted / this.ratio;
				if (this.settings.layout == layout.INVERTED)
				{
					pos = this.maxPos - pos;
				}

				this.$handle.css(this.props.position, pos);
			}

			updateControls(this);
			if (changed)
				this.fireEvent("change");
		}
		else
		{
			this._value = current;
		}

		if (this.settings.roundValues)
			this._value = Math.round(this._value);

		return this._value;
	};

	function findElement(element, expression)
	{
		if (expression)
		{
			if (expression.indexOf("this::") == 0)
				return element.find(expression.replace(/^this::/, one.string.EMPTY));
			else
				return $(expression);
		}

		return null;
	}

	function redrawInstance(instance)
	{
		if (!instance.$element.is(":visible"))
			return;

		var sizeElement = instance.$element[instance.props.size]();
		var sizeHandle = instance.$handle[instance.props.outerSize]();

		instance.minPos = 0;
		instance.maxPos = sizeElement - sizeHandle;

		var minv = instance.settings.minValue;
		var maxv = instance.settings.maxValue;
		var range = maxv - minv;

		if (minv < 0 && maxv > 0)
			range = maxv + Math.abs(minv);

		instance.ratio = range / instance.maxPos;
		instance.range = range;

		if (!instance.ready)
		{
			instance.value(instance._value);
			instance.ready = true;
		}
	}

	function onHandleMouseDown(e)
	{
		one.drag.on("move", this.onDragMove);
		one.drag.on("stop", this.onDragEnd);

		var specs = {
			moveX: this.settings.orientation == orientation.HORIZONTAL,
			moveY: this.settings.orientation == orientation.VERTICAL,
			minX: this.minPos, maxX: this.maxPos,
			minY: this.minPos, maxY: this.maxPos
		};

		one.drag.start(e, this.$handle, specs);
		return false;
	}

	function onDragMove()
	{
		updateControls(this);
		this.fireEvent("change");
	}

	function onDragEnd()
	{
		one.drag.off("move", this.onDragMove);
		one.drag.off("stop", this.onDragEnd);
	}

	function onWindowResize()
	{
		redrawInstance(this);
	}

	function updateControls(instance)
	{
		if (instance.$text || instance.$control)
		{
			var value = instance.value();

			if (instance.$text)
				instance.$text.text(value);

			if (instance.$control)
				instance.$control.val(value);
		}
	}

	slider.create = function(context, settings)
	{
		if (context == null || context.length == 0)
		{
			return one.log.error("Specify the elements to initialize by using the expression argument");
		}

		var instances = [];
		$(context).each(function (i, element)
		{
			var control = $(element).data("slider") || new SliderControl(element, settings);
			instances.push(control);
		});

		return instances.length > 1 ? instances : instances[0];
	};

	$.fn.slider = function (settings)
	{
		return this.each(function (i, element)
		{
			slider.create(element, settings);
		});
	};

	return slider;
})();

one.controls.flexstrip = (function FlexStripModule()
{
	var MIN_DIFF_MOVE = 30;
	var DEFAULT_SPEED = 400;

	var MODE = { FREE: "free", SLIDE: "slide", PAGE: "page" };
	var DISTRIBUTE = { CONTAIN: "contain", LARGEST: "largest", SMALLEST: "smallest" };

	/**
	 * Defines the settings of the <c>FlexStrip</c> control.
	 * @extends {one.Settings}
	 * @param {Object} data The object with initial settings.
	 * @param {Object} element The object with overriding settings. If a setting exist both in
	 * <c>data</c> and in <c>override</c> objects, the setting from <c>override</c> takes precedence.
	 */
	var FlexStripSettings = one.Settings.extend(function FlexStripSettings(element, settings)
	{
		this.animDuration = this.getNumber("animDuration", element, settings, DEFAULT_SPEED);
		this.alwaysMove = this.getBoolean("alwaysMove", element, settings, false);
		this.arrowsOnHover = this.getBoolean("arrowsOnHover", element, settings, false);
		this.autoScroll = this.getBoolean("autoScroll", element, settings, false);
		this.center = this.getBoolean("center", element, settings, false);
		this.distribute = this.getString("distribute", element, settings, null, DISTRIBUTE);
		this.dropOnMouseOut = this.getBoolean("dropOnMouseOut", element, settings, false);
		this.extraLength = this.getNumber("extraLength", element, settings, 0);
		this.globalKeyReact = this.getBoolean("globalKeyReact", element, settings, false);
		this.mode = this.getString("mode", element, settings, MODE.FREE, MODE);
		this.mouseDraggable = this.getBoolean("mouseDraggable", element, settings, true);
		this.mouseScrollable = this.getBoolean("mouseScrollable", element, settings, true);
		this.minDiffMove = this.getNumber("minDiffMove", element, settings, MIN_DIFF_MOVE);
		this.pageMode = this.getBoolean("pageMode", element, settings, false);
		this.scrollOnClick = this.getBoolean("scrollOnClick", element, settings, false);
		this.scrollThrough = this.getValue("scrollThrough", element, settings, null);
		this.snapDistance = this.getNumber("snapDistance", element, settings, 35);
		this.snapToItems = this.getBoolean("snapToItems", element, settings, false);
		this.snapWhileDragging = this.getBoolean("snapWhileDragging", element, settings, true);
		this.stopPropagation = this.getBoolean("stopPropagation", element, settings, true);
		this.stretch = this.getBoolean("stretch", element, settings, false);
		this.useAnimations = this.getBoolean("useAnimations", element, settings, true);
		this.vertical = this.getBoolean("vertical", element, settings, false);
		this.oneAtATime = this.getBoolean("oneAtATime", element, settings, false);

		this.consolidate();
	});

	FlexStripSettings.prototype.consolidate = function consolidate()
	{
		console.log("consolidate: " + this.mode);
		switch (this.mode)
		{
			case MODE.PAGE:
				this.autoScroll = false;
				this.snapToItems = true;
				break;

			case MODE.SLIDE:
				this.snapToItems = true;
				this.autoScroll = false;
				break;

			case MODE.FREE:
				this.snapToItems = false;
				break;
		}
	};

	/**
	 * Defines the settings of the <c>FlexStrip</c> control.
	 * @extends {one.HtmlControl}
	 */
	var FlexStrip = one.HtmlControl.extend(function FlexStrip(element, settings)
	{
		this.construct(element, "move", "stop", "select", "dragstart", "dragend");
		this.settings = new FlexStripSettings(element, settings);

		this.$slides = this.$element.find("> *");
		this.$container = this.$element.parent();
		this.$scrollThrough = this.$element.closest(this.settings.scrollThrough);

		this.props = this.settings.vertical
			? one.HtmlControl.PROPS.VERTICAL
			: one.HtmlControl.PROPS.HORIZONTAL;

		this.$element.data("init-style", this.$element.attr("style") || "");

		this.$element.css({ overflow: "hidden" });
		if (!(this.$element.css("position") in { absolute: 1, relative: 1 }))
			this.$element.css("position", "relative");

		if (!this.settings.vertical)
			this.$element.css({ whiteSpace: "nowrap" });
		else
			this.$element.addClass("vertical");

		this.ready = false;
		this.mouseWithinRange = false;
		this.animEngaged = false;
		this.dragMode = false;
		this.scrollMode = false;

		this.transitioning = false;
		this.stripLength = 0;
		this.autoIndex = 0;
		this.selectedIndex = 0;
		this.scrollMoveSize = 0;

		this.startPos = 0;
		this.startEventX = 0;
		this.startEventY = 0;

		this.minMouseX = 0;
		this.minMouseY = 0;
		this.maxMouseX = this.$container.outerWidth();
		this.maxMouseY = this.$container.outerHeight();

		this.initPos = this.$element.position()[this.props.position];
		this.targetPos = 0;
		this.targetDir = 0;

		this.wheelMultiplier = 1;
		this.wheelAnimActive = false;
		this.wheelDirection = 0;

		this.enabled = true;

		// this should be false on IOS natural scroll devices
		this.wheelAccellerationOn = true;

		this.animSettings =
		{
			easing: "easeOutExpo",
			step: $.proxy(onAnimationUpdate, this),
			start: $.proxy(onAnimationStart, this),
			complete: $.proxy(onAnimationComplete, this),
			duration: this.settings.animDuration
		};

		this.proxy =
		{
			mouseDown: $.proxy(onMouseDown, this),
			mouseUp: $.proxy(onMouseUp, this),
			slideMouseUp: $.proxy(onSlideMouseUp, this),
			slideClick: $.proxy(onSlideClick, this),
			mouseWheel: $.proxy(onMouseWheel, this),
			dragEnd: $.proxy(onDragEnd, this),
			dragMove: $.proxy(onDragMove, this),
			documentKeyDown: $.proxy(onDocumentKeyDown, this),
			windowResize: $.proxy(onWindowResize, this),
			mouseMove: $.proxy(onDocumentMouseMove, this),
			arrowBackClick: $.proxy(onBackArrowClicked, this),
			arrowNextClick: $.proxy(onNextArrowClicked, this)
		};

		this.$element.on(one.dom.mouseDownEvent(), this.proxy.mouseDown);
		this.$element.on(one.dom.mouseUpEvent(), this.proxy.mouseUp);
		this.$slides.on(one.dom.mouseUpEvent(), this.proxy.slideMouseUp);

		this.$slides.on("click", this.proxy.slideClick);
		this.$container.on("mousewheel DOMMouseScroll", this.proxy.mouseWheel);

		$(document).on("keydown", this.proxy.documentKeyDown);
		$(window).on("resize", this.proxy.windowResize);
		$(document).on(one.dom.mouseMoveEvent(), this.proxy.mouseMove);

		var className = this.settings.vertical ? "vertical" : "";
		this.$arrowBack = $('<div class="flexstrip-arrow prev"></div>')
			.addClass(className)
			.appendTo(this.$container);

		this.$arrowNext = $('<div class="flexstrip-arrow next"></div>')
			.addClass(className)
			.appendTo(this.$container);

		this.$arrowBack.on("click", this.proxy.arrowBackClick);
		this.$arrowNext.on("click", this.proxy.arrowNextClick);

		this.redraw();
		this.$element.addClass("ready");
		this.ready = true;

		this.$element.data("one.flexstrip", this);
	});

	FlexStrip.prototype.dispose = function ()
	{
		this.$arrowBack.off("click").remove();
		this.$arrowNext.off("click").remove();

		this.$element.off("mousedown touchstart", this.proxy.mouseDown);
		this.$element.off("mouseup touchend", this.proxy.mouseUp);
		this.$slides.off("mousemove touchmove", this.proxy.slideMouseUp);
		this.$slides.off("click", this.proxy.slideClick);
		this.$container.off("mousewheel DOMMouseScroll", this.proxy.mouseWheel);

		$(document).off("keydown", this.proxy.documentKeyDown);
		$(window).off("resize", this.proxy.windowResize);
		$(document).off("mousemove touchmove", this.proxy.mouseMove);

		this.$element.attr("style", this.$element.data("init-style")).data(flexstrip.NAME, null);

		for (var i = 0; i < flexstrip.instances.length; i++)
		{
			if (flexstrip.instances[i] == this)
			{
				flexstrip.instances.splice(i, 1);
				break;
			}
		}
	};

	FlexStrip.prototype.redraw = function (options)
	{
		var settings = $.extend({}, options);

		if (this.originalSize == null)
			this.originalSize = this.$element.css(this.props.size);

		this.$element.css(this.props.size, this.originalSize);

		var containerLength = this.$container[this.props.size]();
		if (containerLength == 0)
			return;

		var stripLength =
			(parseInt(this.$element.css(this.props.paddingStart)) || 0) +
			(parseInt(this.$element.css(this.props.paddingEnd)) || 0);

		if (settings.refreshSlides)
			this.$slides.off(one.dom.mouseUpEvent(), this.proxy.slideMouseUp);

		this.$slides = this.$element.find("> *:visible");

		if (settings.refreshSlides)
			this.$slides.on(one.dom.mouseUpEvent(), this.proxy.slideMouseUp);

		if (!this.ready)
		{
			for (var i = 0; i < this.$slides.length; i++)
				this.$slides.eq(i).data("originalSize", this.$slides.eq(i)[this.props.size]());
		}

		if (this.settings.mode == MODE.PAGE)
		{
			var $first = this.$slides.eq(0);
			var model = $first.css("box-sizing");
			if (model == "content-box")
			{
				var itemPadding =
					(parseInt($first.css(this.props.paddingStart)) || 0) +
					(parseInt($first.css(this.props.paddingEnd)) || 0);

				containerLength -= itemPadding;
			}

			this.$slides[this.props.size](containerLength);
		}
		else
		{
			if (this.settings.distribute != null)
			{
				for (var i = 0; i < this.$slides.length; i++)
					this.$slides.eq(i)[this.props.size](this.$slides.eq(i).data("originalSize"));

				if (this.settings.distribute == DISTRIBUTE.CONTAIN)
				{
					var size = Math.floor(containerLength / this.$slides.length);
					var diff = containerLength - (this.$slides.length * size);

					this.$slides[this.props.size](size);
					this.$slides.eq(this.$slides.length - 1)[this.props.size](size + diff);
				}
				else
				{
					var smallestLength = Number.POSITIVE_INFINITY;
					var largestLength = Number.NEGATIVE_INFINITY;

					for (var i = 0; i < this.$slides.length; i++)
					{
						var $slide = this.$slides.eq(i);
						var size = $slide[this.props.outerSize](true);
						if (size < smallestLength)
							smallestLength = size;
						if (size > largestLength)
							largestLength = size;
					}

					if (this.settings.distribute == DISTRIBUTE.LARGEST)
						this.$slides[this.props.size](largestLength);

					if (this.settings.distribute == DISTRIBUTE.SMALLEST)
						this.$slides[this.props.size](smallestLength);
				}
			}
		}

		if (this.$element.css("display") != "table")
			this.$element.css(this.props.size, 20000);

		for (var i = 0; i < this.$slides.length; i++)
		{
			var child = this.$slides.eq(i);
			stripLength += child[this.props.outerSize](true);
			if (child.css("display") == "inline-block")
				stripLength += 3;
		}

		this.minMouseX = 0;
		this.minMouseY = 0;
		this.maxMouseX = this.$container.outerWidth();
		this.maxMouseY = this.$container.outerHeight();

		this.isTouchDevice = one.dom.isTouchDevice();
		this.containerLength = containerLength;
		this.stripLength = stripLength
			+ this.initPos
			+ this.settings.extraLength * 2;

		var trackLength = stripLength - containerLength;

		this.ratio = trackLength / containerLength;

		this.scrollMoveSize = Math.min(
			this.$slides.eq(0).outerWidth(true),
			this.$slides.eq(0).outerHeight(true));

		this.maxX = this.maxY = 0;
		this.minX = this.minY = -trackLength;

		if (this.settings.mode == MODE.SLIDE)
		{
			var lastSlide = this.$slides.eq(this.$slides.length - 1);
			this.minX = this.minY = -this.stripLength + lastSlide[this.props.size]();
		}

		// the extra one pixel ensures there is always enough size for floating children
		this.$element.css(this.props.size, Math.ceil(stripLength) + 1);
		this.snapCoords = getSnapCoords.call(this);

		this.scrollable = stripLength > containerLength;

		if (!this.scrollable)
		{
			this.$element.css(this.props.position, 0);

			if (this.settings.stretch)
			{
				this.$element.css(this.props.size, containerLength);
				this.$element.css(this.props.position, 0);

				stripLength = containerLength;
			}

			if (this.settings.center)
			{
				var center = Math.round(containerLength / 2 - stripLength / 2);
				this.$element.css(this.props.position, center);
			}
		}
		else
		{
			var current = parseInt(this.$element.css(this.props.position)) || 0;
			if (settings.maintainPosition)
			{
				current = -this.snapCoords[this.slideIndex()];
			}

			var minPos = this[this.props.minPos];
			var maxPos = this[this.props.maxPos];

			var target = Math.min(Math.max(current, minPos), maxPos);

			this.$element.css(this.props.position, target);
			this.autoIndex = getNearestIndex.call(this, 0);
		}

		return this;
	};

	FlexStrip.prototype.set = function (propName, propValue)
	{
		this.base("set", propName, propValue);
		this.settings.consolidate();

		switch (propName)
		{
			case "scrollThrough":
				if (propValue.jquery)
					this.$scrollThrough = propValue;
				else
					this.$scrollThrough = this.$element.closest(propValue);

				break;
		}

		this.redraw();
	};

	FlexStrip.prototype.prev = function ()
	{
		return this.select(this.selectedIndex - 1);
	};

	FlexStrip.prototype.next = function ()
	{
		return this.select(this.selectedIndex + 1);
	};

	FlexStrip.prototype.indexOf = function ($item)
	{
		var testElem = $item.length ? $item[0] : $item;
		for (var i = 0; i < this.$slides.length; i++)
			if (this.$slides[i] == testElem)
				return i;

		return -1;
	};

	FlexStrip.prototype.select = function (what, direct)
	{
		if (one.type.isString(what))
		{
			var $slide = this.$slides.filter(what);
			var index = this.indexOf($slide);
		}
		else
			index = what;

		if (index >= 0 && index < this.$slides.length)
			selectSlide.call(this, index, true, direct);

		return this;
	};

	FlexStrip.prototype.slideIndex = function ()
	{
		return this.transitioning ? this.selectedIndex : this.autoIndex;
	};

	FlexStrip.prototype.slide = function (index)
	{
		var slideIndex = index || this.slideIndex();
		return this.$slides.eq(slideIndex);
	};

	FlexStrip.prototype.hideArrows = function ()
	{
		updateArrowVisibility.call(this, true);
	};

	FlexStrip.prototype.isAnimated = function ()
	{
		return this.animEngaged === true;
	};

	FlexStrip.prototype.enable = function ()
	{
		this.enabled = true;
	};

	FlexStrip.prototype.disable = function ()
	{
		if (this.engaged)
		{
			return;
		}

		this.enabled = false;
	};

	function getNearestIndex(accel, isFinal)
	{
		if (accel < 0)
		{
			if (this.autoIndex == this.$slides.length - 1)
				return this.autoIndex;

			if (this.settings.alwaysMove)
				return Math.min(this.selectedIndex + 1, this.autoIndex + 1);
		}

		if (accel > 0)
		{
			if (this.autoIndex == 0)
				return this.autoIndex;

			if (this.settings.alwaysMove)
				return Math.max(this.selectedIndex - 1, this.autoIndex - 1);
		}

		var minDiff = Number.POSITIVE_INFINITY;
		var minPercent;
		var nearestIndex = -1;

		var stripPos = parseInt(this.$element.css(this.props.position)) || 0;
		for (var i = 0; i < this.$slides.length; i++)
		{
			var snapPoint = this.snapCoords[i];
			var snapDiff = Math.abs(stripPos + snapPoint);

			if (snapDiff < minDiff)
			{
				minDiff = snapDiff;
				nearestIndex = i;
				minPercent = snapDiff / (this.$slides.eq(i)[this.props.size]() * 0.01);
			}
		}

		var forceSnapPoint = false;
		if (isFinal)
		{
			forceSnapPoint =
				(minPercent >= 30 && Math.abs(accel) <= 3) ||
				(minPercent <= 15 && Math.abs(accel) <= 4.5);
		}

		if (!forceSnapPoint && !this.settings.oneAtATime)
		{
			if (accel > 0 && nearestIndex >= this.autoIndex)
				nearestIndex = this.autoIndex - 1;

			if (accel < 0 && nearestIndex <= this.autoIndex)
				nearestIndex = this.autoIndex + 1;
		}

		return nearestIndex;
	}

	function getSnapCoords()
	{
		var coords = [];

		var totalWidth = 0;
		var finalPos;
		var offset = parseInt(this.$element.css(this.props.paddingStart));
		for (var i = 0; i < this.$slides.length; i++)
		{
			var $c = this.$slides.eq(i);
			var itemPos = $c.prop(this.props.offsetPos);
			var itemSpacing = parseInt($c.css(this.props.marginStart)) || 0;
			var itemWidth = $c.width();

			finalPos = itemPos - (offset + itemSpacing);
			coords.push(finalPos);

			totalWidth = finalPos + itemWidth;
		}

		if (totalWidth < this.stripLength)
		{
			var diff = this.stripLength - totalWidth;
			var additionalSteps = Math.ceil(diff / this.containerLength);
			var maxLeft = this.stripLength - this.containerLength;
			for (var i = 0; i < additionalSteps; i++)
			{
				var proposedCoord = totalWidth + i * additionalSteps;
				coords.push(Math.max(proposedCoord, maxLeft));
			}
		}

		return coords;
	}

	function getNearestSnapPoint(coordinate)
	{
		var nearest = Number.MAX_VALUE;
		for (var i = 0; i < this.snapCoords.length; i++)
		{
			var point = -this.snapCoords[i];
			if (Math.abs(point - coordinate) < (nearest - coordinate))
				nearest = point;
		}

		return nearest;
	}

	function getPosition(which)
	{
		var coordinates = {
			top: parseInt(this.$element.css("top")) || 0,
			left: parseInt(this.$element.css("left")) || 0
		};

		coordinates.right = coordinates.left + this.$element.width();
		coordinates.bottom = coordinates.top + this.$element.height();

		return which ? coordinates[which] : coordinates;
	}

	function getCoordinateWithinBounds(position)
	{
		var minPos = this[this.props.minPos];
		var maxPos = this[this.props.maxPos];

		return Math.min(Math.max(position, minPos), maxPos);
	}

	function getNormalizedWheelDelta(e)
	{
		var f;
		var o = e.originalEvent || e;
		var d = o.detail;
		var w = o.wheelDelta;
		var n = 225, n1 = n-1;

		// Normalize delta
		d = d ? w && (f = w/d) ? d/f : -d/0.15 : w/120;

		// Quadratic scale if |d| > 1
		d = d < 1 ? d < -1 ? (-Math.pow(d, 2) - n1) / n : d : (Math.pow(d, 2) + n1) / n;

		// Delta *should* not be greater than 2...
		return Math.min(Math.max(d / 2, -1), 1);
	}

	function smoothStop()
	{
		var currPos = parseInt(this.$element.css(this.props.position));
		this.wasThrown = currPos >= this[this.props.minPos] && currPos <= this[this.props.maxPos];

		var targetPos = currPos + (8 * this.accel);
		var nearestSnap = getNearestSnapPoint.call(this, targetPos);

		var snapDiff = Math.abs(nearestSnap - targetPos);
		if (this.settings.snapToItems && snapDiff <= this.settings.snapDistance)
		{
			targetPos = nearestSnap;
		}
		else
		{
			targetPos = getCoordinateWithinBounds.call(this, targetPos);
		}

		moveTo.call(this, targetPos);
	}

	function selectSlide(index, triggerEvent, direct)
	{
		var targetCoord = -this.snapCoords[index];

		// scroll to coordinate of the slide, but don't force that
		// in free mode to keep the control end from going beyond the viewport end
		if (this.settings.mode == MODE.FREE)
			targetCoord = getCoordinateWithinBounds.call(this, targetCoord);

		this.autoIndex = index;
		this.selectedIndex = index;

		moveTo.call(this, targetCoord, null, direct);

		this.$slides.removeClass("selected").eq(this.selectedIndex).addClass("selected");

		if (triggerEvent == false)
			return;

		var event = one.event.create(this, "select",
		{
			index: this.selectedIndex,
			$element: this.$slides.eq(index)
		});

		return this.fireEvent(event);
	}

	function scrollToPrevSlide(fireSelect)
	{
		var slideIndex = this.slideIndex();
		var targetIndex = slideIndex == 0 ? 0 : slideIndex - 1;
		selectSlide.call(this, targetIndex, fireSelect);
	}

	function scrollToNextSlide(fireSelect)
	{
		var slideIndex = this.slideIndex();
		var targetIndex = slideIndex == this.$slides.length - 1 ? slideIndex : slideIndex + 1;

		selectSlide.call(this, targetIndex, fireSelect);
	}

	function updateArrowVisibility(forceHide)
	{
		if (this.isTouchDevice || !this.settings.arrowsOnHover)
			return;

		if (forceHide || !this.mouseWithinRange)
		{
			this.$arrowBack.removeClass("visible");
			this.$arrowNext.removeClass("visible");
		}
		else
		{
			var position = getPosition.call(this)[this.props.position];

			this.$arrowBack.toggleClass("visible", position < this.maxX);
			this.$arrowNext.toggleClass("visible", position > this.minX);
		}
	}

	function getEventInfo(e, debug)
	{
		e = e.originalEvent || e;

		var offset = this.$container.offset();

		var result = {
			eventX: e.pageX || e.clientX || 0,
			eventY: e.pageY || e.clientY || 0
		};

		if (e.touches && e.touches.length)
		{
			result.eventX = e.touches[0].clientX;
			result.eventY = e.touches[0].clientY;
			result.touches = e.touches;
		}

		result.mouseX = (result.eventX - offset.left);// + $document.scrollLeft();
		result.mouseY = (result.eventY - offset.top);// + $document.scrollTop();

		result.inRange =
			result.mouseX >= this.minMouseX && result.mouseX <= this.maxMouseX &&
			result.mouseY >= this.minMouseY && result.mouseY <= this.maxMouseY;

		return result;
	}

	function keepWithinBounds()
	{
		var currentPos = this.$element.position()[this.props.position];
		if (currentPos < this[this.props.minPos] || currentPos > this[this.props.maxPos])
		{
			this.wasCancelled = true;

			var targetPos = currentPos < this[this.props.minPos]
				? this[this.props.minPos]
				: this[this.props.maxPos];

			moveTo.call(this, targetPos,
			{
				duration: this.settings.animDuration / 2
			});
		}
	}

	function snapToNearest()
	{
		if (!this.settings.snapToItems)
			return false;

		var currentPos = this.$element.position()[this.props.position];
		var nearestSnap = getNearestSnapPoint.call(this, currentPos);

		if (Math.abs(nearestSnap - currentPos) <= this.settings.snapDistance)
		{
			if (this.move != null)
			{
				this.move.kill();
				this.move = null;
			}

			this.wasCancelled = true;

			moveTo.call(this, nearestSnap,
			{
				duration: this.settings.animDuration / 2
			});

			return true;
		}

		return false;
	}

	function moveTo(position, options, direct)
	{
		var currPos = parseInt(this.$element.css(this.props.position));

		this.targetPos = position;
		if (direct || currPos == this.targetPos)
		{
			this.$element[this.props.position] = position;
			onAnimationComplete.call(this);
		}
		else
		{
			var animProps = {};
			animProps[this.props.position] = position;
			this.$element.stop().animate(animProps, $.extend({}, this.animSettings, options));
		}
	}

	function onAnimationStart()
	{
		this.animEngaged = true;
	}

	function onAnimationUpdate(now, tween)
	{
		if (tween)
		{
			tween.end = this.targetPos;
		}

		var currentPosition = parseInt(this.$element.css(this.props.position));

		this.autoIndex = getNearestIndex.call(this, 0);
		this.fireEvent("move",
		{
			atStart: currentPosition == this[this.props.maxPos],
			atEnd: currentPosition == this[this.props.minPos]
		});

		if (this.wasCancelled)
			return;
		if (!this.wasThrown && !this.wasScrolled)
			return;

		var snapped = snapToNearest.call(this);
		if (!snapped)
			keepWithinBounds.call(this);
	}

	function onAnimationComplete()
	{
		this.targetDir = 0;
		this.animEngaged = false;
		this.wasThrown = false;
		this.wasScrolled = false;
		this.wasCancelled = false;

		var currentPosition = parseInt(this.$element.css(this.props.position));

		this.fireEvent("stop", {
			position: currentPosition,
			atStart: currentPosition == this[this.props.maxPos],
			atEnd: currentPosition == this[this.props.minPos]
		});

		updateArrowVisibility.call(this);
	}

	function onDocumentMouseMove(e)
	{
		if (!this.enabled || this.dragMode || this.scrollMode)
			return true;

		var outerSize = this.$container[this.props.outerSize]();
		if (outerSize == 0)
			return true;

		var eventInfo = getEventInfo.call(this, e);
		this.mouseWithinRange = (this.stripLength > outerSize) && eventInfo.inRange;

		if (this.mouseWithinRange && this.settings.autoScroll)
		{
			var mousePos = this.settings.vertical ? eventInfo.mouseY : eventInfo.mouseX;
			var targetPos = Math.round(-(mousePos * this.ratio) + this.settings.extraLength);

			var currentPos = parseInt(this.$element.css(this.props.position));
			var animEngaged = Math.abs(currentPos - targetPos) > this.settings.minDiffMove;

			if (this.settings.useAnimations && (animEngaged && !this.animEngaged))
			{
				moveTo.call(this, targetPos);
			}

			if (!this.settings.useAnimations || !this.animEngaged)
			{
				moveTo.call(this, targetPos, null, true);
			}
		}

		updateArrowVisibility.call(this);

		return true;
	}

	function onBackArrowClicked(e)
	{
		scrollToPrevSlide.call(this);
		e.stopPropagation();
		return false;
	}

	function onNextArrowClicked(e)
	{
		scrollToNextSlide.call(this);
		e.stopPropagation();
		return false;
	}

	function onSlideMouseUp(e)
	{
		if (!this.enabled || this.dragMode || this.scrollMode)
			return true;

		if (e.type == "mouseup" && e.which != 1)
			return true;

		// retrieve the first child of slidestrip that is parent of event source
		// so that it's index can be used.
		var $el = $(e.target);
		while (!$el.parent().is(this.$element))
		{
			$el = $el.parent();
			if ($el.length == 0)
				return true;
		}

		var slideIndex = this.$slides.index($el);
		if (slideIndex == this.selectedIndex)
			return true;

		var direct = !(this.scrollable && this.settings.scrollOnClick);
		var event = selectSlide.call(this, slideIndex, true, direct);

		var cancel = event && event.cancel == true;
		if (this.linkTarget && !cancel)
			this.linkTarget.click();

		return cancel;
	}

	function onSlideClick()
	{
		return !this.dragMode && !this.scrollMode;
	}

	function onMouseWheel(e)
	{
		if (!this.settings.mouseScrollable || !this.mouseWithinRange || this.transitioning || !this.scrollable)
			return true;

		var event = e.originalEvent || e;
		var amount = -event.wheelDelta || event.detail;

		var currentPosition = getPosition.call(this, this.props.position);
		if (amount > 0 && currentPosition == this[this.props.minPos])
			return false;

		if (amount < 0 && currentPosition == this[this.props.maxPos])
			return false;

		if (this.settings.snapToItems)
		{
			if (amount > 0)
				scrollToNextSlide.call(this, true);

			else if (amount < 0)
				scrollToPrevSlide.call(this, true);
		}
		else
		{
			var hasWheelDelta = event.wheelDelta != null;

			var delta = getNormalizedWheelDelta(e);

			this.accel = (hasWheelDelta ? delta * 4 : amount);

			// different routines for with and w/o wheel delta
			var nextPos = hasWheelDelta
				? getCoordinateWithinBounds.call(this, currentPosition + (delta * this.scrollMoveSize))
				: getCoordinateWithinBounds.call(this, currentPosition - (amount * (this.scrollMoveSize / 25)));

			// for some reason, in ff the wheel amount goes up and down, causing a jerky, back and forth movement
			// the following construct fixes this problem by allowing movement in one direction only
			if (this.animEngaged && this.targetDir != 0)
			{
				if (this.targetDir == -1 && nextPos < this.targetPos)
					nextPos = this.targetPos;

				if (this.targetDir == 1 && nextPos > this.targetPos)
					nextPos = this.targetPos;
			}

			this.targetPos = nextPos;
			this.targetDir = amount > 0 ? 1 : -1;

			if (this.wheelAccellerationOn)
			{
				if (this.wheelAnimActive)
				{
					// reset multiplier when direction of scrolling changes
					if (this.wheelMultiplier != 1 && this.wheelDirection != this.targetDir)
						this.wheelMultiplier = 1;

					this.wheelMultiplier += .05;
					this.wheelDirection = this.targetDir;
				}

				var diff = (this.targetPos * this.wheelMultiplier) - this.targetPos;

				this.targetPos =
					getCoordinateWithinBounds.call(this, this.targetPos + (this.targetDir * diff));
			}

			var self = this;
			this.wasScrolled = true;
			this.wheelAnimActive = true;

			moveTo.call(this, this.targetPos,
			{
				complete: function ()
				{
					self.wheelAnimActive = false;
					self.wheelMultiplier = 1;
					self.animSettings.complete.apply(this, arguments);
				}
			});
		}

		one.event.cancel(e);
		return false;
	}

	function onWindowResize(e)
	{
		this.redraw(true);
	}

	function onDocumentKeyDown(e)
	{
		if (!this.enabled)
			return true;

		if (e.target.tagName.match(/^textarea|select$/i))
			return true;

		if (e.target.tagName == "INPUT" && !e.target.type.match(/^checkbox|radio|button|submit|reset$/i))
			return true;

		if (!this.settings.globalKeyReact && !this.mouseWithinRange)
			return;

		if (this.settings.vertical)
		{
			if (e.keyCode == one.const.Key.UP)
			{
				scrollToPrevSlide.call(this);
				return false;
			}

			if (e.keyCode == one.const.Key.DOWN)
			{
				scrollToNextSlide.call(this);
				return false;
			}
		}
		else
		{
			if (e.keyCode == one.const.Key.LEFT)
			{
				scrollToPrevSlide.call(this);
				return false;
			}

			if (e.keyCode == one.const.Key.RIGHT)
			{
				scrollToNextSlide.call(this);
				return false;
			}
		}

		return true;
	}

	function onMouseDown(e)
	{
		if (!this.enabled)
			return true;

		this.linkTarget = null;

		if (!this.settings.mouseDraggable || !this.scrollable)
			return true;

		if (e.type == "mousedown" && e.which != 1)
			return true;

		if (this.stripLength <= this.containerLength)
			return true;

		var event = getEventInfo.call(this, e);
		if (event.touches && event.touches.length != 1)
			return true;

		if (this.animEngaged)
			this.$element.stop();

		this.dragMode = false;
		this.engaged = false;
		this.scrollMode = false;

		this.startPos = getPosition.call(this, this.props.position);

		this.startScrollX = this.$scrollThrough.scrollLeft();
		this.startScrollY = this.$scrollThrough.scrollTop();

		this.startEventX = event.eventX;
		this.startEventY = event.eventY;
		this.startEventPos = event[this.props.eventPos];

		// start dragging
		document.addEventListener(one.dom.mouseUpEvent(), this.proxy.dragEnd, true);
		document.addEventListener(one.dom.mouseMoveEvent(), this.proxy.dragMove, true);

		if (e.type == "touchstart" && e.target.tagName == "A")
			this.linkTarget = e.target;

		this.$element.addClass("mousedown");
		this.fireEvent("dragstart");

		if (this.settings.stopPropagation)
		{
			e.originalEvent.stopPropagation();
			e.preventDefault();
		}

		return one.dom.isTouchDevice();
	}

	function onDragMove(e)
	{
		if (!this.enabled)
			return true;

		var eventInfo = getEventInfo.call(this, e, true);
		if (this.settings.dropOnMouseOut && !eventInfo.inRange)
		{
			onDragEnd.call(this, e);
			return true;
		}

		if (this.move != null)
		{
			this.move.kill();
			this.move = null;
		}

		var eventPosX = eventInfo.eventX;
		var eventPosY = eventInfo.eventY;

		var diffX = eventPosX - this.startEventX;
		var diffY = eventPosY - this.startEventY;

		var diffDrag = this.settings.vertical ? diffY : diffX;
		var diffScroll = this.settings.vertical ? diffX : diffY;

		if (!this.scrollMode && this.$scrollThrough.length)
			this.scrollMode = Math.abs(diffScroll) >= this.settings.minDiffMove;

		if (this.scrollMode)
		{
			var startScroll = this.settings.vertical ? this.startScrollX : this.startScrollY;
			var scrollMethod = this.settings.vertical ? "scrollLeft" : "scrollTop";
			this.$scrollThrough[scrollMethod](startScroll - diffScroll);
		}

		var minPos = this[this.props.minPos];
		var maxPos = this[this.props.maxPos];

		var targetPos = this.startPos + diffDrag;
		if (targetPos > maxPos)
		{
			var excess = targetPos - maxPos;
			var ratio = Math.max(0, 1 - excess / (this.containerLength * 2));
			diffDrag = Math.round(diffDrag * ratio);

			targetPos = Math.round(this.startPos + diffDrag);
		}
		else if (targetPos < minPos)
		{
			excess = minPos - targetPos;
			ratio = Math.max(0.5, 1 - excess / (this.containerLength * 2));
			diffDrag = Math.round(diffDrag * ratio);

			targetPos = Math.round(this.startPos + diffDrag);
		}

		if (this.settings.snapToItems && this.settings.snapWhileDragging)
		{
			var snapPoint = getNearestSnapPoint.call(this, targetPos);
			if (Math.abs(snapPoint - targetPos) <= this.settings.snapDistance)
				targetPos = snapPoint;
		}

		var coord1 = getPosition.call(this, this.props.position);
		this.$element.css(this.props.position, targetPos);
		var coord2 = getPosition.call(this, this.props.position);

		if (coord2 - coord1 != 0)
			this.engaged = true;

		this.accel = (coord2 - coord1) * 1.5;
		if (this.accel != 0)
		{
			this.dragMode = true;
		}

		this.autoIndex = getNearestIndex.call(this, 0);
		this.fireEvent("move");

		return one.event.cancel(e);
	}

	function onDragEnd(e)
	{
		if (!this.enabled)
			return true;

		if (this.dragMode)
		{
			if (this.settings.snapToItems)
			{
				var nearestIndex = getNearestIndex.call(this, this.accel, true);
				selectSlide.call(this, nearestIndex, true);
			}
			else
			{
				smoothStop.call(this);
			}
		}

		document.removeEventListener(one.dom.mouseUpEvent(), this.proxy.dragEnd, true);
		document.removeEventListener(one.dom.mouseMoveEvent(), this.proxy.dragMove, true);

		this.engaged = false;
		var instance = this;
		setTimeout(function () { instance.dragMode = false; }, 1);
		this.$element.removeClass("mousedown");
		this.fireEvent("dragend");
	}

	function onMouseUp(e)
	{
		if (!this.enabled)
			return true;

		if (this.settings.mouseDraggable && this.dragMode)
			return one.event.cancel(e);

		return true;
	}

	var flexstrip = {};

	flexstrip.create = function(context, settings)
	{
		if (context == null || context.length == 0)
		{
			one.log.error("Specify the elements to initialize by using the expression argument");
			return null;
		}

		var instances = [];
		$(context).each(function (i, element)
		{
			var control = $(element).data("one.flexstrip") || new FlexStrip(element, settings);
			instances.push(control);
		});

		return instances.length > 1 ? instances : instances[0];
	};

	$.fn.flexstrip = function ()
	{
		var args = Array.prototype.slice.call(arguments);

		var firstResult = undefined; 
		this.each(function ()
		{
			var $elem = $(this);
			var instance = $elem.data("one.flexstrip");

			if (!one.type.instanceOf(instance, FlexStrip))
			{
				var settings = $.isPlainObject(args[0]) ? args.shift() : {};
				instance = flexstrip.create($elem, settings);
			}

			var method = args[0] || "redraw";
			var methodArgs = Array.prototype.slice.call(args, 1);
			if (method && String(method).match(/^redraw|set|prev|next|select|slideIndex$/))
			{
				var result = instance[method].apply(instance, methodArgs);
				if (firstResult == undefined)
					firstResult = result;

				return result;
			}

			if (firstResult == undefined)
				firstResult = instance;
		});

		return firstResult;
	};

	return flexstrip;

})();

/**
 * Implements the tooltip control and all of its public and private code.
 */
one.controls.tooltip = (function Tooltip()
{
	var initialized = false;
	var tooltipHtml =
		'<div class="onetooltippopup">' +
			'<div class="arrow"></div>' +
			'<div class="bg"></div>' +
			'<div class="content"></div>' +
		'</div>';

	var timeoutId;
	var tooltip = {};
	tooltip.instance = null;
	tooltip.$popup = null;
	tooltip.$arrow = null;
	tooltip.document = null;
	tooltip.$content = null;
	tooltip.offset = { left: 0, top: 0 };

	var Tooltip = one.HtmlControl.extend(function (element, settings)
	{
		if (!initialized)
			initializeGlobal();

		this.construct(element);
		this.settings = new TooltipSettings(element, settings);
		this.$element
			.data("tooltip", this)
			.bind("mouseenter", $.proxy(onElementMouseOver, this))
			.bind("mouseleave", $.proxy(onElementMouseOut, this))
			.bind("focus", $.proxy(onElementFocus, this))
			.bind("blur", $.proxy(onElementBlur, this))
			.bind("click", $.proxy(onElementClick, this));

		var title = this.settings.content
			? this.$element.find(this.settings.content).html()
			: this.$element.data("title") || this.$element.attr("title") || this.$element.attr("data-title");

		this.$element.data("title", title);
		this.$element.attr("data-title", title);
		this.$element.attr("title", one.string.EMPTY);

		this.showTooltip = $.proxy(this.show, this);
		this.hideTooltip = $.proxy(this.hide, this);

		$(tooltip.document)
			.on("keydown click", $.proxy(onTooltipDocumentEvent, this))
			.on("scroll", $.proxy(onWindowScroll, this));

		tooltip.$popup
			.on("click", $.proxy(onElementClick, this))
			.on("mouseenter", $.proxy(onTooltipMouseOver, this))
			.on("mouseleave", $.proxy(onTooltipMouseOut, this));
	});

	/**
	 * Hides the tooltip
	 */
	Tooltip.prototype.hide = function ()
	{
		tooltip.$popup.hide();
		tooltip.$popup.removeClass(tooltip.$popup.attr("class-added"));

		tooltip.instance = null;
	};

	/**
	 * Shows the tooltip
	 */
	Tooltip.prototype.show = function ()
	{
		if (this.$element.hasClass("tooltip-suspend") || this.$element.hasClass("disabled"))
			return;

		if (this.settings.obscureOnly)
		{
			var elem = this.$element[0];
			if (elem.scrollWidth <= elem.offsetWidth && elem.scrollHeight <= elem.offsetHeight)
				return;
		}

		var title = this.$element.data("title");
		if (!title)
			return;

		tooltip.$content.html(title);

		var orientation = this.settings.orientation;
		var orientationP = orientation[0].match(/T|L|R|B/) ? orientation[0] : "T";
		var orientationS = orientation[1].match(/T|L|R|B|C/) ? orientation[1] : "L";

		var html = $("html", tooltip.document)[0];
		var body = $("body", tooltip.document)[0];
		var maxWidth = html.offsetWidth || body.offsetWidth;
		var maxHeight = html.offsetHeight || body.offsetHeight;

		tooltip.$popup.css({ left: 0, top: -1000, display: "block" }).removeClass("t l r b -t -l -r -b");
		tooltip.$popup.addClass(this.settings.className).attr("class-added", this.settings.className);
		tooltip.$arrow.toggle(this.settings.showArrow);

		var primary, secondary;

		if (orientationP.match(/T|B/))
		{
			primary = getPrimaryCoord.call(this, orientationP, 0, maxHeight);
			secondary = getSecondaryCoord.call(this, orientationP, orientationS, 0, maxWidth);

			var specs = {
				popupLeft: secondary.left,
				popupTop: primary.top,
				arrowLeft: secondary.arrow.left,
				arrowTop: primary.arrow.top,
				orientation: primary.orientation,
				orientationS: secondary.orientation
			};
		}
		else
		{
			primary = getPrimaryCoord.call(this, orientationP, 0, maxWidth);
			secondary = getSecondaryCoord.call(this, orientationP, orientationS, 0, maxHeight);

			specs = {
				popupLeft: primary.left,
				popupTop: secondary.top,
				arrowLeft: primary.arrow.left,
				arrowTop: secondary.arrow.top,
				orientation: primary.orientation,
				orientationS: secondary.orientation
			};
		}

		tooltip.$popup.css({ left: specs.popupLeft, top: specs.popupTop });
		tooltip.$arrow.css({ left: specs.arrowLeft, top: specs.arrowTop });

		if (this.settings.showArrow)
		{
			switch(orientationP)
			{
				case "T": showArrow.call(this, "B"); break;
				case "B": showArrow.call(this, "T"); break;
				case "L": showArrow.call(this, "R"); break;
				case "R": showArrow.call(this, "L"); break;
			}
		}

		tooltip.$popup.addClass(specs.orientation.toLowerCase());
		tooltip.$popup.addClass("-" + specs.orientationS.toLowerCase());

		tooltip.instance = this;

		tooltip.$popup.css({ display: "block", opacity: 1 });
	};

	/**
	 * Sets on this instance's <c>Settings</c> values.
	 * @param {String} name The name of the setting to set.
	 * @param {Object} value The value of the setting to set.
	 * @returns {Object} The current value of the setting with the specified <c>name</c>.
	 */
	Tooltip.prototype.set = function (name, value)
	{
		if (value && (name == "showOn" || name == "hideOn"))
			value = value.split(/(?:\s*,\s*)|(?:\s+)/);

		if (this.settings[name] != undefined)
			this.settings[name] = value;

		return this.settings[name];
	};

	var TooltipSettings = one.Settings.extend(function Settings(data, override)
	{
		this.construct(data, override);

		this.className = this.getString("className", data, override, null);
		this.followMouse = this.getBoolean("followMouse", data, override, true);
		this.maxWidth = this.getString("maxWidth", data, override, null);
		this.showOn = this.getString("showOn", data, override, "mouseover").split(/(?:\s*,\s*)|(?:\s+)/);
		this.hideOn = this.getString("hideOn", data, override, "mouseout").split(/(?:\s*,\s*)|(?:\s+)/);
		this.orientation = this.getString("orientation", data, override, "TC").toUpperCase();
		this.offset = this.getNumber("offset", data, override, 3);
		this.showDelay = this.getNumber("show-delay", data, override, 200);
		this.hideDelay = this.getNumber("hide-delay", data, override, 0);
		this.obscureOnly = this.getBoolean("obscureOnly", data, override, false);
		this.useFades = this.getBoolean("useFades", data, override, false);
		this.showArrow = this.getBoolean("showArrow", data, override, true);
		this.arrowOffset = this.getNumber("arrow-offset", data, override, 5);
		this.content = this.getString("content", data, override, null);
	});

	function getPrimaryCoord(orientation, edgeA, edgeB)
	{
		var result = { orientation: orientation, arrow: { left: 0, top: 0 } };

		var vertical = orientation.match(/T|B/) != null;
		var orientationRev = "B";
		switch (orientation)
		{
			case "T": orientationRev = "B"; break;
			case "B": orientationRev = "T"; break;
			case "L": orientationRev = "R"; break;
			case "R": orientationRev = "L"; break;
		}
		var props = vertical
			? one.HtmlControl.PROPS.VERTICAL
			: one.HtmlControl.PROPS.HORIZONTAL;

		var otherArrowPos = props.position == "top" ? "bottom" : "right";

		var arrowSize = this.settings.showArrow ? tooltip.$arrow[props.size]() : 0;
		if (vertical)
			arrowSize /= 2;

		var elementOffset = this.$element.offset();
		var scrollPos = $(tooltip.document)[props.scrollPos]();
		var absolutePos = tooltip.offset[props.position] + elementOffset[props.position] - scrollPos;
		var popupSize = tooltip.$popup[props.outerSize]() + arrowSize;
		var elementSize = this.$element[props.outerSize]();

		if (orientation.match(/T|L/))
		{
			result[props.position] = absolutePos - popupSize - this.settings.offset;
			result.arrow[props.position] = "auto";
			result.arrow[otherArrowPos] = 0;
		}
		else
		{
			result[props.position] = absolutePos + elementSize + this.settings.offset;
			result.arrow[props.position] = 0;
			result.arrow[otherArrowPos] = "auto";
		}

		var isOversized = popupSize > (edgeB - edgeA);
		if (!isOversized && result[props.position] < edgeA)
			return getPrimaryCoord.call(this, orientationRev, edgeA, edgeB);

		if (!isOversized && (result[props.position] + popupSize) > edgeB)
			return getPrimaryCoord.call(this, orientationRev, edgeA, edgeB);

		return result;
	}

	function getSecondaryCoord(orientationP, orientationS, edgeA, edgeB)
	{
		var result = { orientation: orientationS, arrow: { left: 1, top: 1 } };

		var vertical = orientationS.match(/T|B/) != null;
		if (orientationS == "C")
			vertical = orientationP.match(/L|R/) != null;

		var orientationRev = "B";
		switch (orientationS)
		{
			case "T": orientationRev = "B"; break;
			case "B": orientationRev = "T"; break;
			case "L": orientationRev = "R"; break;
			case "R": orientationRev = "L"; break;
			default:
				orientationRev = vertical ? "B" : "R"; break;
		}
		var props = vertical
			? one.HtmlControl.PROPS.VERTICAL
			: one.HtmlControl.PROPS.HORIZONTAL;

		var arrowSize = this.settings.showArrow ? tooltip.$arrow[props.size]() : 0;

		var elementOffset = this.$element.offset();

		var scrollPos = $(tooltip.document)[props.scrollPos]();
		var absolutePos = tooltip.offset[props.position] + elementOffset[props.position] - scrollPos;
		var popupSize = tooltip.$popup[props.outerSize]();
		var elementSize = this.$element[props.outerSize]();

		if (orientationS.match(/T|L/))
		{
			result[props.position] = absolutePos;
			result.arrow[props.position] = this.settings.arrowOffset;
//			if (popupSize > elementSize && this.settings.arrowOffset != 0)
//			{
//				result.arrow[props.position] += (elementSize / 2) - (this.settings.arrowOffset + arrowSize / 2);
//			}
		}
		else if (orientationS.match(/B|R/))
		{
			result[props.position] = (absolutePos + elementSize) - popupSize;
			result.arrow[props.position] = popupSize - arrowSize - this.settings.arrowOffset;
//			if (popupSize > elementSize && this.settings.arrowOffset != 0)
//			{
//				result.arrow[props.position] -= (elementSize / 2) - (this.settings.arrowOffset + arrowSize / 2);
//			}
		}
		else
		{
			result[props.position] = absolutePos + ((elementSize / 2) - popupSize / 2);
			result.arrow[props.position] = (popupSize / 2) - (arrowSize / 2);
		}

		result.oversized = popupSize > (edgeB - edgeA);
		result.beyondFirstEdge = result[props.position] < edgeA;
		result.beyondSecondEdge = (result[props.position] + popupSize) > edgeB;
		result.orientationRev = orientationRev;

		if (!result.oversized && arguments.callee.caller != arguments.callee)
		{
			if (result.beyondFirstEdge || result.beyondSecondEdge)
			{
				var result2 = getSecondaryCoord.call(this, orientationP, orientationRev, edgeA, edgeB);

				// when the secondary coordinate is (C)enter we dont know which side
				// would be opposite side, so in that case we make an exception and
				// make one more call if the result fell out of range
				if (orientationS == "C")
				{
					if (result2.beyondFirstEdge || result2.beyondSecondEdge)
						result2 = getSecondaryCoord.call(this, orientationP, result2.orientationRev, edgeA, edgeB);
				}

				return result2;
			}
		}

		return result;
	}

	function onTooltipMouseOver()
	{
		window.clearTimeout(timeoutId);
	}

	function onTooltipMouseOut()
	{
		this.hideTooltip();
	}

	function onElementMouseOver()
	{
		window.clearTimeout(timeoutId);

		if (tooltip.instance && tooltip.instance != this && !tooltip.instance.settings.hideOn.contains("mouseout"))
			return;

		if (!this.settings.showOn.contains("mouseover"))
			return;

		if (this.$element.hasClass("tooltip-suspend"))
			return;

		if (this.settings.showDelay > 0)
			timeoutId = window.setTimeout(this.showTooltip, this.settings.showDelay);
		else
			this.showTooltip();
	}

	function onElementMouseOut()
	{
		window.clearTimeout(timeoutId);

		if (tooltip.instance != this)
			return;

		if (!this.settings.hideOn.contains("mouseout"))
			return;

		if (this.settings.hideDelay > 0)
			timeoutId = window.setTimeout(this.hideTooltip, this.settings.hideDelay);
		else
			this.hideTooltip();
	}

	function onElementFocus()
	{
		if (this.settings.showOn.contains("focus"))
			this.show();
	}

	function onElementBlur()
	{
		if (this.settings.hideOn.contains("blur"))
			this.hide();
	}

	function onElementClick()
	{
		if (tooltip.$popup.is(":visible") && this.settings.hideOn.contains("click"))
			this.hide();

		else if (!tooltip.$popup.is(":visible") && this.settings.showOn.contains("click"))
			this.show();
	}

	function onTooltipDocumentEvent(e)
	{
		if (!tooltip.$popup.is(":visible") || tooltip.instance != this)
			return;

		if (!jQuery.contains(this.$element[0], e.target) && !jQuery.contains(tooltip.$popup[0], e.target))
			this.hide();
	}

	function onWindowScroll()
	{
		this.hide();
	}

	function showArrow(side)
	{
		var tw = tooltip.$arrow.width();
		var th = tooltip.$arrow.height();
		var $bg = tooltip.$popup.find(".bg");

		var borderColor = $bg.css("border-bottom-color");
		var borderWidth = parseInt($bg.css("border-bottom-width"));
		var backgroundColor = $bg.css("background-color");

		switch (side)
		{
			case "L":
				drawArrow(tooltip.cL, backgroundColor, borderColor, borderWidth, function draw(ctx)
				{
				  ctx.moveTo(tw / 2, 0);
					ctx.lineTo(0, th / 2);
					ctx.lineTo(tw / 2, th);
				});
				break;

			case "R":
				drawArrow(tooltip.cR, backgroundColor, borderColor, borderWidth, function draw(ctx)
				{
				  ctx.moveTo(0, 0);
					ctx.lineTo(tw / 2, th / 2);
					ctx.lineTo(0, th);
				});
				break;

			case "B":
				drawArrow(tooltip.cB, backgroundColor, borderColor, borderWidth, function draw(ctx)
				{
				  ctx.moveTo(0, 0);
					ctx.lineTo(tw / 2, th / 2);
					ctx.lineTo(tw, 0);
				});
				break;

			case "T":
				drawArrow(tooltip.cT, backgroundColor, borderColor, borderWidth, function draw(ctx)
				{
				  ctx.moveTo(0, th / 2);
					ctx.lineTo(tw / 2, 0);
					ctx.lineTo(tw, th / 2);
				});
				break;
		}
	}

	function drawArrow(canvas, bgColor, fgColor, stroke, draw)
	{
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	  ctx.fillStyle = bgColor;
	  ctx.strokeStyle = fgColor;
	  ctx.lineWidth = stroke;
	  ctx.beginPath();
		draw(ctx);
	  ctx.fill();

		if (stroke)
		  ctx.stroke();

	}

	function initializeGlobal()
	{
		initializeCoordinates();
		createPopupLayer();

		$(window).resize(initializeCoordinates);

		initialized = true;
	}

	function initializeCoordinates()
	{
		tooltip.offset.top = 0;
		tooltip.offset.left = 0;

		var domainRestricted = false;
		try
		{
			tooltip.document = top.document;
		}
		catch(e)
		{
			tooltip.document = document;
			domainRestricted = true;
		}

		if (domainRestricted)
			return;

		var currentWindow = window;
		if (window != window.parent)
		{
			while (currentWindow != top)
			{
				currentWindow = currentWindow.parent;
				var frames = $("iframe, frame", currentWindow.document);
				var foundFrame = false;

				for (var i = 0; i < frames.length; i++)
				{
					if (frames[i].contentWindow == window)
					{
						tooltip.offset.left += frames.eq(i).offset().left;
						tooltip.offset.top += frames.eq(i).offset().top;
						foundFrame = true;
						break;
					}
				}
			}
		}
	}

	function createPopupLayer()
	{
		tooltip.$popup = $(tooltipHtml);
		tooltip.$popup.appendTo($(tooltip.document.body));

		if (tooltip.document != document)
		{
			var styleElement = $("<style id='tooltipStyles'></style>");
			$(tooltip.document.body).append(styleElement);

			var styleText = [];

			var tooltipRules = one.css.findRules(".onetooltippopup");
			for (var i = 0; i < tooltipRules.length; i++)
			{
				var rule = tooltipRules[i];
				styleText.push(rule.css.cssText);
			}

			styleElement.html(styleText.join("\n"));
		}

		tooltip.$content = tooltip.$popup.find(".content");
		tooltip.$arrow = tooltip.$popup.find(".arrow");

		var tw = tooltip.$arrow.width();
		var th = tooltip.$arrow.height();
		var c1 = $('<canvas class="b" width="{0}" height="{1}"/>'.format(tw, th / 2)).appendTo(tooltip.$arrow)[0];
		var c2 = $('<canvas class="t" width="{0}" height="{1}"/>'.format(tw, th / 2)).appendTo(tooltip.$arrow)[0];
		var c3 = $('<canvas class="l" width="{0}" height="{1}"/>'.format(tw / 2, th)).appendTo(tooltip.$arrow)[0];
		var c4 = $('<canvas class="r" width="{0}" height="{1}"/>'.format(tw / 2, th)).appendTo(tooltip.$arrow)[0];

		tooltip.cB = c1;
		tooltip.cT = c2;
		tooltip.cL = c3;
		tooltip.cR = c4;
	}

	tooltip.create = function(context, settings)
	{
		if (context == null || context.length == 0)
		{
			return one.log.error("Specify the elements to initialize by using the expression argument");
		}

		var instances = [];
		$(context).each(function (i, element)
		{
			var control = $(element).data("tooltip") || new Tooltip(element, settings);
			instances.push(control);
		});

		return instances.length > 1 ? instances : instances[0];
	};

	$.fn.tooltip = function (settings)
	{
		return this.each(function (i, element)
		{
			tooltip.create(element, settings);
		});
	};

	return tooltip;

})();

