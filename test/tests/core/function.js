module("one.Function");

test("one.func.getName", function testFunction()
{
	function funct1()
	{
	}

	equal(one.func.getName(), "testFunction", "one.func.getName()");
	equal(one.func.getName(funct1), "funct1", "one.func.getName(funct1)");
});

test("one.func.stackTrace", function ()
{
	var stack = null;

	function funct1()
	{
		funct2("g", "p");
	}

	function funct2(a, b)
	{
		funct3(one.string.repeat(a, 2), one.string.repeat(b, 2));
	}

	function funct3(c, d)
	{
		funct4(c + d);
	}

	function funct4(e)
	{
		stack = one.func.stackTrace();
	}

	funct1();

	notEqual(stack.indexOf('funct1()'), -1, "one.func.stackTrace");
	notEqual(stack.indexOf('funct2("g", "p")'), -1, "one.func.stackTrace");
	notEqual(stack.indexOf('funct3("gg", "pp")'), -1, "one.func.stackTrace");
	notEqual(stack.indexOf('funct4("ggpp")'), -1, "one.func.stackTrace");
});

test("one.func.callerName", function ()
{
	var caller = null;

	function funct1()
	{
		funct2();
	}

	function funct2()
	{
		caller = one.func.callerName();
	}

	funct1();

	equal(caller, "funct1", "one.func.callerName");
});
