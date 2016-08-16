var CookieProperty = Property.extend(function CookieProperty(options)
{
	this.construct(options);

	this.id = this.id || this.name;
	var cookie = one.cookie.get(this.id);
	if (cookie != null)
		this.value = cookie;
});

CookieProperty.prototype._set = function (value)
{
	one.cookie.set(this.id, value, null, null, this.path || null);
	console.log("cookie: " + this.id + "=" + value);
	return this.base("_set", value);
};

