module("one.Settings");

test("one.Settings", function ()
{
	var TestSettings = one.Settings.extend(function TestSettings(element, settings)
	{
		this.orientation = settings.orientation || "HORIZONTAL";
		this.roundValues = this.getBoolean("roundValues", element, settings, true);
		this.minValue = this.getNumber("minValue", element, settings, 0);
		this.maxValue = this.getNumber("maxValue", element, settings, 100);
		this.value = this.getNumber("value", element, settings);
		this.defaultValue = this.getNumber("defaultValue", element, settings, this.minValue);
		this.textElement = this.getString("textElement", element, settings, one.string.EMPTY).trim();
		this.controlElement = this.getString("controlElement", element, settings, one.string.EMPTY).trim();
	});

	var instance1 = new TestSettings(null, {
		roundValues: false,
		minValue: -100,
		value: 4,
		textElement: 'text5',
		controlElement: "CTRLELEMENT"
	});

	equal(instance1.orientation, "HORIZONTAL");
	equal(instance1.roundValues, false);
	equal(instance1.minValue, -100);
	equal(instance1.maxValue, 100);
	equal(instance1.value, 4);
	equal(instance1.defaultValue, -100);
	equal(instance1.textElement, 'text5');
	equal(instance1.controlElement, "CTRLELEMENT");
});
