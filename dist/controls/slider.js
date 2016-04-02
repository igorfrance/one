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
