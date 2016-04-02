module("one.string");

test("one.string.format", function ()
{
	var string = one.string;

	var result = string.format("Hello {0}!", "world");
	equal(result, "Hello world!");

	result = string.format("Colors are {0}, {1}, {2}.", "red", "blue", "purple");
	equal(result, "Colors are red, blue, purple.");

	result = string.format("Colors are {0}, {1}, {2}.", ["red", "blue", "purple"]);
	equal(result, "Colors are red, blue, purple.");

	result = string.format("Colors are {0}, {1}, but not {3}.", ["red", "blue", "purple", "green"]);
	equal(result, "Colors are red, blue, but not green.");

	result = string.format("{0#3-}", 2);
	equal(result, "002");

	result = string.format("Between {0#3-} and {1#3+}", 2, 1);
	equal(result, "Between 002 and 100");

	result = string.format("{0$7-}", "Test");
	equal(result, "   Test");

	result = string.format("Between {0$10-} and {1$10+}", "Failure", "Success");
	equal(result, "Between    Failure and Success   ");
});

test("one.string.trim", function ()
{
	var string = one.string;
	var result = string.trim("  trimmed     ");
	equal(result, "trimmed");

	result = string.trim("		\r\n  trimmed    \t\t ");
	equal(result, "trimmed");

	result = string.trim("ZZZZZtrimmedZZ", "Z");
	equal(result, "trimmed");
});

test("one.string.padLeft", function ()
{
	var string = one.string;
	var result = string.padLeft("1", 10, "0");
	equal(result, "0000000001");
});

test("one.string.padRight", function testStringPadLeft()
{
	var string = one.string;
	var result = string.padRight("1", 10, "0");
	equal(result, "1000000000");
});

test("one.string.isEmpty", function ()
{
	var string = one.string;
	var result = string.isEmpty(null);
	equal(result, true);

	result = string.isEmpty(undefined);
	equal(result, true);

	result = string.isEmpty(String.EMPTY);
	equal(result, true);

	result = string.isEmpty("");
	equal(result, true);

	result = string.isEmpty("      ");
	equal(result, true);

	result = string.isEmpty("\t\t\t\t\r\n");
	equal(result, true);

	result = string.isEmpty("\t\t\t1\t\r\n");
	equal(result, false);
});

