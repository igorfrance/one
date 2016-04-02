module("one.css");

new function testOneCss()
{
	function getScrollerCss()
	{
		return one.string.concat(
			".scrollable",
				"{ overflow: hidden; position: relative; }",
			".scrollable .one-scroller",
				"{ position: absolute; left: 0; top: 0; bottom: 0; right: -30px; padding: 0 30px 0 0; overflow-x: hidden;",
				"	overflow-y: scroll; z-index: 0; }",
			".scrollable.horizontal .one-scroller",
				"{ position: absolute; left: 0; top: 0; right: 0; bottom: -30px; padding: 0 0 30px 0; overflow-y: hidden;",
				"	overflow-x: scroll; }",
			".scrollable .one-scrolltrack",
				"{ position: absolute; left: auto; top: 0; bottom: 0px; right: 0px; width: 16px; height: auto; border: 1px solid #ccc;",
				"	border-width: 0 0 0 1px; background: #fff; }",
			".scrollable.horizontal .one-scrolltrack",
				"{ position: absolute; left: 0; top: auto; left: 0; bottom: 0px; right: 0px; width: auto; height: 16px;",
				"	border-width: 1px 0 0 0; display: none; z-index: 1; }",
			".scrollable .one-scrollgrip",
				"{ position: absolute; left: 1px; top: 1px; right: 1px; bottom: auto; width: 14px; height: 14px; background: #ccc; }",
			".scrollable.horizontal .one-scrollgrip",
				"{ position: absolute; left: 1px; top: 1px; right: auto; bottom: 1px; width: 14px; height: 14px; background: #ccc; }",
			".scrollable .one-scroller > .one-scrollcontent",
				"{ overflow: hidden; }",
			".scrollable.horizontal .one-scroller > .one-scrollcontent",
				"{ width: 5000px; }"
		);
	}

	test("one.css", function ()
	{
		var stylesheet = $("<style/>").text(getScrollerCss()).appendTo("body");
		var parsed = one.css();

		equal(parsed[".scrollable"] != null, true, "Css selection test 1");
		equal(parsed[".scrollable .one-scrolltrack"] != null, true, "Css selection test 2");
		equal(parsed[".scrollable .one-scroller > .one-scrollcontent"] != null, true, "Css selection test 3");

		stylesheet.remove();
	});

	test("one.css.computed", function runTest()
	{
		var stylesheet = $("<style/>").text(getScrollerCss()).appendTo("body");
		var fragment = $("<div class='scrollable horizontal'><div class='one-scrolltrack'></div></div>").appendTo("body");
		var track = fragment.find(".one-scrolltrack");

		equal(parseInt(one.css.computed(track, "bottom")), 0, "Computed css test 1");
		equal(parseInt(one.css.computed(track, "height")), 16, "Computed css test 2");
		equal(parseInt(one.css.computed(track, "borderTopWidth")), 1, "Computed css test 3");
		equal(one.css.computed(track, "top"), "auto", "Computed css test 4");

		stylesheet.remove();
	});

	test("one.css.findRules", function runTest()
	{
		var stylesheet = $("<style/>").text(getScrollerCss()).appendTo("body");

		one.css.reset();
		one.css();

		equal(one.css.findRules("one-scroller").length, 4, "Find rules test 1");
		equal(one.css.findRules("scrollable.horizontal").length, 4, "Find rules test 2");
		equal(one.css.findRules("one-scrollgrip").length, 2, "Find rules test 3");

		stylesheet.remove();
	});
};
