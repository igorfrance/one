function Property(options)
{
	this.get = Property.prototype.get;
	this.set = Property.prototype.set;
	this.default = undefined;
	this.value = null;
	this.restrictTo = null;

	$.extend(this, options);

	this.value = this.default;
}

Property.prototype.get = function get()
{
	return this.getValue.apply(this, arguments);
};

Property.prototype.set = function set(value)
{
	this.setValue(value);
};

Property.prototype.getValue = function getValue()
{
	return this.value;
};

Property.prototype.setValue = function setValue(value)
{
	var newValue;

	switch (this.type)
	{
		case Boolean:
			newValue = String(value).match(/^true|1$/) != null;
			break;

		case Number:
			newValue = parseFloat(value) || 0;
			break;

		default:
			newValue = value == null ? value : String(value);
			break;
	}

	var valid = true;
	if (this.restrictTo != null)
	{
		if ($type.isArray(this.restrictTo))
		{
			valid = [].concat(this.restrictTo).indexOf(newValue) != -1;
		}
		else
		{
			valid = false;
			for (var name in this.restrictTo)
			{
				if (!this.restrictTo.hasOwnProperty(name))
					continue;

				if (this.restrictTo[name] == newValue)
				{
					valid = true;
					break;
				}
			}
		}
	}

	if (valid)
	{
		this.value = newValue;
	}
};

Property.prototype.valueOf = function valueOf()
{
	return this.get();
};

Property.prototype.toString = function toString()
{
	return String(this.get());
};
