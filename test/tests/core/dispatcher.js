module("one.Dispatcher");

test("one.Dispatcher", function ()
{
	var d1 = new one.Dispatcher("change");
	d1.setProperty = function (name, value)
	{
		this[name] = value;
		this.fire("change", { count: 77 });
	};

	var l1 = {
		onDPropertyChange: function (evt) {
			this.dChanged = true;
			this.dValue = evt.source.testProp;
			this.dCount = evt.data.count;
		}
	};

	d1.on("change", $.proxy(l1.onDPropertyChange, l1));
	d1.setProperty("testProp", "me");

	equal(l1.dChanged, true, "l1.dChanged == true");
	equal(l1.dValue, "me", "l1.dValue == 'me'");
	equal(l1.dCount, 77, "l1.dCount == 77");
});
