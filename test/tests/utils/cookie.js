module("one.cookie");

test("one.cookie", function runTest()
{
	var cookie = one.cookie;

	equal(1, 1, "ok");

	cookie.set("test1", "value1");
	cookie.set("test2", "value2");

	notEqual(document.cookie.indexOf("test1=value1"), -1);
	notEqual(document.cookie.indexOf("test2=value2"), -1);

	equal(cookie.get("test1"), "value1");
	equal(cookie.get("test2"), "value2");

	cookie.remove("test1");
	cookie.remove("test2");

	equal(cookie.get("test1"), undefined);
	equal(cookie.get("test2"), undefined);
});
