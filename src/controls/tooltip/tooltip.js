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
