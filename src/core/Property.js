var Property = Dispatcher.extend(function Property(options)
{
	this.get = Property.prototype.get;
	this.set = Property.prototype.set;
	this.default = null;
	this.id = null;
	this.type = String;
	this.restrictTo = null;

	$.extend(this, options);

	this.value = this.value || this.default;
});

Property.prototype.get = function ()
{
	return this._get.apply(this, arguments);
};

Property.prototype.set = function (value)
{
	this._set(value);
};

Property.prototype._get = function ()
{
	return this.value;
};

Property.prototype._set = function (value)
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

Property.prototype.valueOf = function ()
{
	return this.get();
};

Property.prototype.toString = function ()
{
	return String(this.get());
};
