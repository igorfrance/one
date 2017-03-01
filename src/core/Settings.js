/**
 * Implements a class that helps with creating variable number of argument objects in a structured way.
 *
 * <p>When a function accepts a large number of arguments, where each can have a default value and can also be set
 * by the function itself, using, changing and maintaining this function and its usages can be daunting. This objects
 * helps do it in a structured way.</p>
 * <p>By using the class as the container for arguments, the function can than have only one formal argument, because
 * all parameters it operates on are contained within an instance of this class.</p>
 * @example
 * one.controls.SliderSettings = function SliderSettings(data, override)
 * {
 *	this.orientation = this.getString("orientation", data, override, "h");
 * 	this.roundValues = this.getBoolean("roundValues", data, override, true);
 * 	this.minValue = this.getNumber("minValue", data, override, 0);
 * 	this.maxValue = this.getNumber("maxValue", data, override, 100);
 * 	this.value = this.getNumber("value", data, override, 0);
 * 	this.defaultValue = this.getNumber("defaultValue", data, override, 0);
 * 	this.formControl = this.getString("formControl", data, override, null);
 * 	this.textControl = this.getString("textControl", data, override, null);
 * };
 *
 * var elem = document.getElementById("slider1");
 * var settings = new one.controls.SliderSettings({ minValue: 20, maxValue: 50 });
 * var slider = new one.controls.Slider(elem, settings);
 * @class
 */
function Settings()
{
}

Prototype.extend(Settings);

/**
 * Looks up a value with the specified name from one of the specified sources, and returns it.
 * When retrieving the value the lookup goes through the following steps:
 * <ol><li>The <c>data</c> object, if it contains a property with the specified name</li>
 * <li>The <c>override</c> object, if it is an HTML element
 * <ol><li>if it has an attribute with the specified name</li>
 * <li>if it has an attribute with the specified name and an 'data-' prefix</li></ol>
 * <li>The <c>override</c> object, if it's an object
 * <ol><li>if it has a property with the specified name</li></ol></li>
 * <li>The default value, if any</li></ol>
 * @param {String} name2 The name of the value to retrieve.
 * @param {Object} data The object or element with properties in which to look for property with <c>propName</c>.
 * @param {Object} [override] An object or element properties (or attributes) in which to look for property (or attribute)
 * with <c>propName</c>.
 * @param {Object} [defaultValue] The value to return if property or attribute with <c>propName</c> wasn't found in either
 * <c>data</c> or <c>override</c> arguments.
 * @param {Object} [restrictObject] Object that supplied the valid values.
 * @return {Object} A value as discovered in the supplied arguments <c>data</c> or <c>override</c>, or the
 * <c>defaultValue</c> if the value has not been discovered.
 */
Settings.prototype.getValue = function getValue(name, data, override, defaultValue, restrictObject)
{
	var dataObject = data && data.jquery ? data[0] : data;
	var overrideObject = override && override.jquery ? override[0] : override;

	var attrName = name.toLowerCase();
	var result = defaultValue;
	if ($type.isElement(overrideObject))
	{
		if (overrideObject.getAttribute("data-" + attrName))
			result = overrideObject.getAttribute("data-" + attrName);

		else if (overrideObject.getAttribute(attrName))
			result = overrideObject.getAttribute(attrName);
	}
	else if (overrideObject && overrideObject[name] != undefined)
	{
		result = overrideObject[name];
	}
	else if ($type.isElement(dataObject))
	{
		if (dataObject.getAttribute("data-" + attrName))
			result = dataObject.getAttribute("data-" + attrName);

		else if (dataObject.getAttribute(attrName))
			result = dataObject.getAttribute(attrName);
	}
	else if (dataObject && dataObject[name] != undefined)
	{
		result = dataObject[name];
	}

	if (restrictObject != null)
	{
		var valid = false;
		for (var prop in restrictObject)
		{
			if (result == restrictObject[prop])
			{
				valid = true;
				break;
			}
		}

		if (!valid)
			result = defaultValue;
	}

	return result;
};

/**
 * Looks up a value with the specified name from one of the specified sources, and returns a <c>Boolean</c>.
 * @param {String} propName The name of the value to retrieve.
 * @param {Object} data The object with properties in which to look for property with <c>propName</c>.
 * @param {Object} [override] An element with attributes or object with properties in which to look for attribute or
 * property with <c>propName</c>.
 * @param {Object} [defaultValue] The value to return if property or attribute with <c>propName</c> wasn't found in either
 * <c>data</c> or <c>override</c> arguments.
 * @return {Boolean} A value as discovered in the supplied arguments <c>data</c> or <c>override</c>, or the
 * <c>defaultValue</c> if the value has not been discovered.
 * @see getValue
 */
Settings.prototype.getBoolean = function getBoolean(propName, data, override, defaultValue)
{
	var value = String(this.getValue(propName, data, override, defaultValue)).toLowerCase();
	return value == "1" || value == "true" || value == "yes";
};

/**
 * Looks up a value with the specified name from one of the specified sources, and returns a <c>Number</c>.
 * @param {String} propName The name of the value to retrieve.
 * @param {Object} data The object with properties in which to look for property with <c>propName</c>.
 * @param {Object} [override] An element with attributes or object with properties in which to look for attribute or
 * property with <c>propName</c>.
 * @param {Object} [defaultValue] The value to return if property or attribute with <c>propName</c> wasn't found in either
 * <c>data</c> or <c>override</c> arguments.
 * @param {Object} [restrictObject] Object that supplied the valid values.
 * @return {Number} A value as discovered in the supplied arguments <c>data</c> or <c>override</c>, or the
 * <c>defaultValue</c> if the value has not been discovered.
 * @see getValue
 */
Settings.prototype.getNumber = function getNumber(propName, data, override, defaultValue, restrictObject)
{
	var value = this.getValue(propName, data, override, defaultValue, restrictObject);
	if (!$type.isNumeric(value))
		return 0;

	return parseFloat(value);
};

/**
 * Looks up a value with the specified name from one of the specified sources, and returns a <c>String</c>.
 * @param {String} propName The name of the value to retrieve.
 * @param {Object} data The object with properties in which to look for property with <c>propName</c>.
 * @param {Object} [override] An element with attributes or object with properties in which to look for attribute or
 * property with <c>propName</c>.
 * @param {Object} [defaultValue] The value to return if property or attribute with <c>propName</c> wasn't found in either
 * <c>data</c> or <c>override</c> arguments.
 * @param {Object} [restrictObject] Object that supplied the valid values.
 * @return {String} A value as discovered in the supplied arguments <c>data</c> or <c>override</c>, or the
 * <c>defaultValue</c> if the value has not been discovered.
 * @see getValue
 */
Settings.prototype.getString = function getString(propName, data, override, defaultValue, restrictObject)
{
	var value = this.getValue(propName, data, override, defaultValue, restrictObject);
	return value == null ? null : String(value);
};

/**
 *
 * @param propName
 * @param data
 * @param override
 * @param [defaultValue]
 * @param [restrictObject]
 * @returns {Array}
 */
Settings.prototype.getArray = function getArray(propName, data, override, defaultValue, restrictObject)
{
	var value = this.getString(propName, data, override, defaultValue, restrictObject);
	if (value == null)
		return [];

	var chunks = value.split(/,/);
	var result = [];
	for (var i = 0; i < chunks.length; i++)
		result.push(chunks[i].trim());

	return result;
};

Settings.prototype.getFunction = function getFunction(propName, data, override, defaultValue)
{
	var fx = this.getValue(propName, data, override, defaultValue);
	return one.type.isFunction(fx) ? fx : null;
};

Settings.prototype.setProperties = function setProperties(data, override)
{
	for (var name in this)
	{
		if (!this.hasOwnProperty(name))
			continue;

		if ($type.instanceOf(this[name], Property))
		{
			var value = this.getValue(name, data, override, undefined);
			if (value != undefined)
				this[name].set(value);
		}
	}
};

Settings.prototype.get = function get(propName)
{
	if ($type.instanceOf(this[propName], Property))
		return this[propName].get();
	else
		return this[propName];
};

Settings.prototype.set = function setProperties(propName, propValue)
{
	if (this[propName] === undefined)
		return console.warn("Current settings don't contain a property with name '{0}'.".format(propName));

	if ($type.instanceOf(this[propName], Property))
		this[propName].set(propValue);
	else
		this[propName] = propValue;

	return this.get(propName);
};
