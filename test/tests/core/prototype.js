module("one.Prototype");

test("one.Prototype", function ()
{
	var result = {};

	function storeCall()
	{
		var name = one.func.getName(arguments.callee.caller);
		if (result[name] == undefined)
			result[name] = 0;

		result[name]++;
	}

	var Grandfather = one.Prototype.extend(function Grandfather()
	{
		storeCall();
	});

	Grandfather.prototype.method1 = function Grandfather$method1()
	{
		storeCall();
	};

	var Father = Grandfather.extend(function Father()
	{
		this.construct();
		storeCall();
	});

	Father.prototype.method1 = function Father$method1()
	{
		this.base("method1");
		storeCall();
	};

	Father.prototype.method2 = function Father$method2()
	{
		storeCall();
	};

	var Child = Father.extend(function Child()
	{
		this.construct();
		storeCall();
	});

	Child.prototype.method2 = function Child$method2()
	{
		this.base("method2");
		storeCall();
	};

	Child.prototype.method3 = function Child$method3()
	{
		storeCall();
	};

	var child = new Child();
	child.method2();
	child.method1();

	equal(one.type.isFunction(child.method1), true, "Child should have method1");
	equal(one.type.isFunction(child.method2), true, "Child should have method2");
	equal(one.type.isFunction(child.method3), true, "Child should have method3");

	equal(result.Child, 1, "Child constructor should have been called once");
	equal(result.Father, 1, "Father constructor should have been called once");
	equal(result.Grandfather, 1, "Grandfather constructor should have been called once");

	equal(result["Child.method2"], 1, "Child.method2 should have been called once");
	equal(result["Father.method2"], 1, "Father.method2 should have been called once");
	equal(result["Father.method1"], 1, "Father.method1 should have been called once");
	equal(result["Grandfather.method1"], 1, "Grandfather.method1 should have been called once");
});
