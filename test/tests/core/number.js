module("one.number");

test("one.number.random()", function ()
{
	var r1 = one.number.random();
	var r2 = one.number.random();
	var r3 = one.number.random();

	notEqual(r1, r2);
	notEqual(r1, r3);
	notEqual(r2, r3);
});

test("one.number.random(10)", function ()
{
	var list = new Array(20);
	for (var i = 0; i < list.length; i++)
		list[i] = one.number.random(10);

	for (var i = 0; i < list.length; i++)
		ok(list[i] <= 10);
});

test("one.number.random(5, 27)", function ()
{
	var list = new Array(20);
	for (var i = 0; i < list.length; i++)
		list[i] = one.number.random(5, 27);

	for (var i = 0; i < list.length; i++)
		ok(list[i] >= 5 && list[i] <= 27);
});
