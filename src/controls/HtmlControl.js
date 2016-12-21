/**
 * Provides a base class for HTML controls.
 * @param {HTMLElement} element The HTML element that this control wraps.
 * @arguments {String} [1-n] Any events that this control dispatches.
 * @class
 * @constructor
 * @extends {Dispatcher}
 */
var HtmlControl = Dispatcher.extend(function HtmlControl(element)
{
	this.construct($array.fromArguments(arguments, 1));

	/**
	 * @type {jQuery}
	 */
	this.$element = $(element);

	/**
	 * @type {Settings}
	 */
	this.settings = new Settings();
});

/**
 * Gets or sets the id of the element that this control uses.
 * @param {String} [id] The new id top to set on the element.
 * @returns {String} The current id of the element.
 */
HtmlControl.prototype.id = function HtmlControl$id(id)
{
	if ($type.isString(id))
		this.$element.attr("id", id);

	return this.$element.attr("id");
};

HtmlControl.prototype.destroy = function HtmlControl$destroy()
{
	this.base("destroy");
	for (var prop in this)
	{
		if (prop.indexOf("$") == 0)
			delete this[prop];
	}
};

/**
 * Gets the HTML element that this control uses.
 * @returns {jQuery} The element that this control uses.
 */
HtmlControl.prototype.element = function HtmlControl$element()
{
	return this.$element;
};

HtmlControl.prototype.setModel = function HtmlControl$setModel(viewModel)
{
	if (this.viewBinder == null)
	{
		this.viewBinder = new ViewBinder(this.$element);
	}

	this.viewBinder.apply(viewModel);
};

/**
 * Gets a string that represents this element.
 * @returns {String} A string that represents this element.
 */
HtmlControl.prototype.toString = function HtmlControl$toString()
{
	var name = one.func.getName(this.constructor);
	if (this.$element.length == 0)
		return $string.format("{0}(null)", name);

	var attrId = this.id();
	var attrClass = this.$element.attr("class");
	var tagName = String(this.$element.prop("tagName")).toLowerCase();
	return $string.format("{0}(\"{1}{2}{3}\")", name, tagName,
		attrClass ? "." + attrClass.replace(/\s+/, ".") : $string.EMPTY,
		attrId ? "#" + attrId : $string.EMPTY);
};

HtmlControl.prototype.get = function HtmlControl$set(propName)
{
	if (this.settings === undefined)
		return console.warn("Can't get '{0}' because the current control doesn't have an associated settings object.".format(propName));

	return this.settings.get(propName);
};

HtmlControl.prototype.set = function HtmlControl$set(propName, propValue)
{
	if (this.settings === undefined)
		return console.warn("Can't set '{0}' to '{1}' because the current control doesn't have an associated settings object.".format(propName, propValue));

	this.settings.set(propName, propValue);
	return this.settings.get(propName);
};

HtmlControl.PROPS =
{
	VERTICAL:
	{
		scrollSize: "scrollHeight",
		scrollPos: "scrollTop",
		offsetPos: "offsetTop",
		size: "height",
		outerSize: "outerHeight",
		position: "top",
		positionAlt: "bottom",
		scrollPadding: "paddingRight",
		scrollPaddingSize: "width",
		minPos: "minY",
		maxPos: "maxY",
		paddingStart: "paddingTop",
		paddingEnd: "paddingBottom",
		marginStart: "marginTop",
		eventPos: "eventY",
		eventOffsetPos: "offsetY",
		startEventPos: "startEventY"
	},

	HORIZONTAL:
	{
		scrollSize: "scrollWidth",
		scrollPos: "scrollLeft",
		offsetPos: "offsetLeft",
		size: "width",
		outerSize: "outerWidth",
		position: "left",
		positionAlt: "right",
		scrollPadding: "paddingBottom",
		scrollPaddingSize: "height",
		minPos: "minX",
		maxPos: "maxX",
		paddingStart: "paddingLeft",
		paddingEnd: "paddingRight",
		marginStart: "marginLeft",
		eventPos: "eventX",
		eventOffsetPos: "offsetX",
		startEventPos: "startEventX"
	}
};
