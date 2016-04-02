module("one.array");

test("one.array.fromArguments", function ()
{
	var result;

	result = one.array.fromArguments([1]);
	deepEqual(result, [1]);

	result = one.array.fromArguments([1, 3, 4, 6]);
	deepEqual(result, [1, 3, 4, 6]);

	result = one.array.fromArguments([1, 3, 4, 6], 1, 2);
	deepEqual(result, [3, 4]);

	result = one.array.fromArguments([[1, 3, 4, 6], 2, 3, 4]);
	deepEqual(result, [[1, 3, 4, 6], 2, 3, 4]);

	result = one.array.fromArguments([[1, 3, 4, 6], 2, 3, 4], 0, 0);
	deepEqual(result, [1, 3, 4, 6]);
});

test("one.array.flatten", function ()
{
	var result;

	result = one.array.flatten([1]);
	deepEqual(result, [1]);

	result = one.array.flatten([1, 3, 4, 6]);
	deepEqual(result, [1, 3, 4, 6]);

	result = one.array.flatten([[1, 3, 4, 6], 2, 3, 4]);
	deepEqual(result, [1, 3, 4, 6, 2, 3, 4]);

	result = one.array.flatten([[1, 3, 4, 6], 2, 3, 4], 0, 1);
	deepEqual(result, [1, 3, 4, 6, 2, 3, 4, 0, 1]);
});
