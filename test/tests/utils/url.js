module("one.url");

test("url (init using custom locations)", function runTest()
{
	var url1 = one.url("http://localhost:63342/one/test/tests/utils.html?module=one.url");
	var url2 = one.url("http://www.nbcnews.com:99/id/21134540/vp/#53399221");
	var url3 = one.url("https://igor.france:p4$$w0rd@www.facebook.com/posts/534650296624196?comment_id=3279283&notif_t=like");

	equal(url1.components.protocol, "http", "Url test 1");
	equal(url1.components.host, "localhost", "Url test 2");
	equal(url1.components.port, "63342", "Url test 3");
	equal(url1.components.directory, "/one/test/tests/", "Url test 4");
	equal(url1.components.query, "module=one.url", "Url test 5");
	equal(url1.components.file, "utils.html", "Url test 6");
	equal(url1.getQueryParam("module"), "one.url", "Url test 7");

	equal(url2.components.authority, "www.nbcnews.com:99", "Url test 8");
	equal(url2.components.hash, "53399221", "Url test 9");

	equal(url3.components.protocol, "https", "Url test 10");
	equal(url3.components.user, "igor.france", "Url test 11");
	equal(url3.components.password, "p4$$w0rd", "Url test 12");
	equal(url3.components.host, "www.facebook.com", "Url test 13");
	equal(url3.getQueryParam("comment_id"), "3279283", "Url test 14");
	equal(url3.getQueryParam("notif_t"), "like", "Url test 15");
});

test("url (init using window.location)", function runTest()
{
	equal(one.url.getQueryParam("not-there-at-all"), null,
		"Fetching a non existing query parameter from the current url should return a null");
	equal(one.url.getHashParam("not-there-at-all"), null,
		"Fetching a non existing hash parameter from the current url should return a null");
});

test("url.serializeParams", function runTest()
{
	var params1 = { v: 1, z: 4, p: [1,2,3] };

	equal(one.url.serializeParams(params1),
		"v=1&z=4&p=1,2,3",
		"Serializing parameters with default options should generate a valid string");

	equal(one.url.serializeParams(params1, { separator: "|", equals: "+" }),
		"v+1|z+4|p+1,2,3",
		"Serializing parameters with default options should generate a valid string");

	equal(one.url.serializeParams(params1, { separator: "|", equals: "", encode: true }),
		"v1|z4|p1%2C2%2C3",
		"Serializing parameters with default options should generate a valid string");

});

test("url.getQuery", function runTest()
{
	var url1 = one.url("index.html?a=5&b=7&c=8");

	equal(url1.getQuery(), "a=5&b=7&c=8");
	equal(url1.getQuery("?"), "?a=5&b=7&c=8");
});


test("url.getHash", function runTest()
{
	var url1 = one.url("index.html#a=5&b=7&c=8");

	equal(url1.getHash(), "a=5&b=7&c=8");
	equal(url1.getHash("#"), "#a=5&b=7&c=8");
});
