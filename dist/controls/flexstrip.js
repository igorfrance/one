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

		this.$element.data("flexstrip", this);
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
	{			this.$element[this.props.position] = position;

		var currPos = parseInt(this.$element.css(this.props.position));

		this.targetPos = position;
		if (direct || currPos == this.targetPos)
		{
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
			return one.log.error("Specify the elements to initialize by using the expression argument");
		}

		var instances = [];
		$(context).each(function (i, element)
		{
			var control = $(element).data("flexstrip") || new FlexStrip(element, settings);
			instances.push(control);
		});

		return instances.length > 1 ? instances : instances[0];
	};

	$.fn.flexstrip = function ()
	{
		var args = Array.prototype.slice.call(arguments);
		this.each(function ()
		{
			var $elem = $(this);
			var instance = $elem.data("flexstrip");

			if (!one.type.instanceOf(instance, FlexStrip))
			{
				var settings = $.isPlainObject(args[0]) ? args.shift() : {};
				instance = flexstrip.create($elem, settings);
			}

			var method = args[0] || "redraw";
			var methodArgs = Array.prototype.slice.call(args, 1);
			if (method && String(method).match(/^redraw|set|prev|next|select|slideIndex$/))
			{
				return instance[method].apply(instance, methodArgs);
			}
		})
	};

	return flexstrip;

})();
