module("one.date");

test("one.date", function ()
{
	equal(one.type.isDate(one.date()), true,
		"The result of calling one.date() should be a valid date");

	result = one.date("01-12-2012");
	equal(result.getTime(), new Date(2012, 11, 1).getTime());

	// ambivalent month/date and a slash - should consider first digit to be a month
	result = one.date("01/12/2012");
	equal(result.getTime(), new Date(2012, 0, 12).getTime());

	// ambivalent month/date and no slash - should consider second digit to be a month
	result = one.date("01-12-2012");
	equal(result.getTime(), new Date(2012, 11, 1).getTime());

	result = one.date("01.12 2012");
	equal(result.getTime(), new Date(2012, 11, 1).getTime());

	result = one.date("01.23 2012");
	equal(result.getTime(), new Date(2012, 0, 23).getTime());

	result = one.date("1 Mar 2012");
	equal(result.getTime(), new Date(2012, 2, 1).getTime());

	result = one.date("Mar 1st 2012");
	equal(result.getTime(), new Date(2012, 2, 1).getTime());

	result = one.date("March 29th 1973");
	equal(result.getTime(), new Date(1973, 2, 29).getTime());
});

test("one.date.format", function ()
{
	var result;

	result = one.date.format(new Date(1943, 10, 29), "dd-MM-yyyy");
	equal(result, "29-11-1943");

	result = one.date.format(new Date(1943, 10, 29), "yyyyMMddThhmmss");
	equal(result, "19431129T000000");

	result = one.date.format(new Date(1943, 10, 29), "dd-MMM-yyyy hh:mm:ss");
	equal(result, "29-Nov-1943 00:00:00");

	result = one.date.format(new Date(1943, 10, 29, 12, 45, 31), "hh:mm:ss");
	equal(result, "12:45:31");
});
