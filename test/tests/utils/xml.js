module("one.xml");

new function xmlTest()
{
	var xml = one.xml;

	function getDocumentXml(fail)
	{
		return one.string.concat(
			'<root>',
				'<group name="G1">',
					'<child id="A"/>',
					'<child id="B"/>',
					'<child/>',
				'</group>',
				'<group name="G2">',
					'<child id="C"/>',
					'<child id="D"/>',
					'<child>JavaScript</child>',
					'<child id="Z"/>',
				'</group>',
				'<group>',
					'<child id="XYZ"/>',
					(fail ? '' : '</group>'),
			'</root>');
	}

	function getDocumentXslt()
	{
		return one.string.concat(
			'<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
				'<xsl:template match="root">',
					'<hello>',
						'<xsl:apply-templates select="*"/>',
					'</hello>',
				'</xsl:template>',
				'<xsl:template match="group">',
					'<world>!</world>',
				'</xsl:template>',
			'</xsl:stylesheet>');
	}

	function prepare()
	{
		destroy();

		var c1 = document.documentElement.appendChild(document.createComment(getDocumentXml()));
		var c2 = document.documentElement.appendChild(document.createComment(getDocumentXslt()));
		return [c1, c2];
	}

	function isComment()
	{
		return this.nodeType == one.xml.nodeType.COMMENT;
	}

	function destroy()
	{
		$(document).contents().filter(isComment).remove();
		$("html").contents().filter(isComment).remove();
		$("body").contents().filter(isComment).remove();
	}

	test("xml", function test$xml()
	{
		var result = xml("<root/>");
		equal(result.nodeType, xml.nodeType.DOCUMENT,
			"Calling xml() using a valid xml string should produce xml document");

		result = xml(result.documentElement);
		equal(result.nodeType, 1,
			"Calling xml() using an existing xml node should return that node");

		throws(function throwing()	{ xml("<invalid>"); },
			"Calling xml() using an invalid xml string should throw an exception");
	});

	test("xml.document", function test$xml$document()
	{
		var result = xml.document(window.document);
		equal(result.nodeType, xml.nodeType.DOCUMENT,
			"Calling xml.document() using a valid xml string should produce xml document");

		equal(result.childNodes[0].nodeType, xml.nodeType.ELEMENT,
			"Calling xml.document() using a valid xml string should produce xml document");

		equal(xml.text("/html/head/title", result), document.title,
			"The resulting document's title should equal the current document's title");
	});

	test("xml.select", function test$xml$select()
	{
		var comments = prepare();

		var selection = xml.select("//comment()");
		equal(selection.length >= 2 && selection[0].nodeType == xml.nodeType.COMMENT, true,
			"Selecting comments should produce a valid result");

		var subject = xml.document(xml.text(comments[0]));
		var result = xml.select("//root", subject);
		equal(result.length == 1 && result[0].nodeType == xml.nodeType.ELEMENT && result[0].nodeName == "root", true,
			"Selecting using the specified xpath expression should select the appropriate node");

		result = xml.select("//group[1]", subject);
		equal(result.length == 1 && result[0].nodeType == xml.nodeType.ELEMENT && result[0].nodeName == "group", true,
			"Selecting using the specified xpath expression should select the appropriate node");

		result = xml.select("//group[@name='G2']", subject);
		equal(result.length == 1 && result[0].nodeType == xml.nodeType.ELEMENT && result[0].nodeName == "group", true,
			"Selecting using the specified xpath expression should select the appropriate node");

		result = xml.select("//group[2]", subject);
		equal(result.length == 1 && result[0].nodeType == xml.nodeType.ELEMENT && result[0].getAttribute("name") == "G2", true,
			"Selecting using the specified xpath expression should select the appropriate node");

		result = xml.select("//group[not(@name)]", subject);
		equal(result.length == 1 && result[0].nodeType == xml.nodeType.ELEMENT && result[0].nodeName == "group", true,
			"Selecting using the specified xpath expression should select the appropriate node");

		destroy();
	});

	test("xml.text", function test$xml$text()
	{
		var comments = prepare();
		var subject = xml.document(xml.text(comments[0]));

		var currentTitle = document.title;
		document.title = "TEST";

		equal(xml.text("/root/group[2]/child[3]", subject), "JavaScript", "Text of /root/group[2]/child[3] should be 'JavaScript'");
		equal(xml.text("//title"), "TEST", "Text of //title should be 'TEST'");
		equal(xml.text("//xhtml:title", { xhtml: "http://www.w3.org/1999/xhtml" }), "TEST", "Text of //xhtml:title should be 'TEST'");
		equal(xml.text(xml.select("//title")[0]), "TEST", "The selected text should equal page title.");

		destroy();
		document.title = currentTitle;
	});

	test("xml.toXml", function test$xml$toXml()
	{
		var currentTitle = document.title;
		document.title = "TEST";

		var titleElem = xml.select("/html/head/title")[0];

		equal(xml.toXml("/html/head/title"), "<title>TEST</title>",
			"Converting the document's title element to an xml string should generate a valid value");

		equal(xml.toXml(titleElem), "<title>TEST</title>",
			"Converting the document's title element to an xml string should generate a valid value");

		document.title = currentTitle;
	});

	test("xml.toObject", function()
	{
		var comments = prepare();
		var subject = xml.document(xml.text(comments[0]));

		var object = xml.toObject(subject);
		equal(object.root != null, true, "The result object should have the 'root' property.");
		equal(object.root.group != null, true, "The result object should have the 'root.group' property.");
		equal(one.type.isArray(object.root.group), true, "The 'root.group' property of the result object should be an array.");
		equal(object.root.group.length, 3, "The 'root.group' array of the result object should have 3 elements.");
	});

	asyncTest("xml.load.success", 1, function test$xml$load$success()
	{
		$.mockjax(
			{
				url: "document.xml",
				responseTime: 5,
				responseText: getDocumentXml(false)
			});

		xml.load("document.xml", function onload(document)
		{
			equal(document.nodeType, xml.nodeType.DOCUMENT, "The loaded document's nodeType should be nodeType.DOCUMENT");
			start();
		});
	});

	asyncTest("xml.load.fail", 1, function test$xml$load$fail()
	{
		$.mockjax(
			{
				url: "invalid.xml",
				responseTime: 5,
				responseText: getDocumentXml(true)
			});

		xml.load("invalid.xml",
			function onsuccess()
			{
				ok(false, "this function should not be called since the xml text being parsed contains an invalid XML");
				start();
			},
			function onerror(error)
			{
				ok(error, "An invalid document should fail to parse and the loader should call the error callback");
				start();
			}
		);
	});

	test("xml.document", function test$xml$document()
	{
		var comments = prepare();
		var subject = xml.document(xml.text(comments[0]));

		equal(subject.nodeType, xml.nodeType.DOCUMENT,
			"Calling document using a valid xml text fragment should create a valid document");

		destroy();
	});

	test("xml.transform", function test$xml$transform()
	{
		var comments = prepare();
		var subject = xml.document(xml.text(comments[0]));
		var processor = xml.processor(xml.document(xml.text(comments[1])));
		var result = xml.transform(subject, processor);

		notEqual(result, null, "The transform result should not be null");
		equal(xml.select("/*", result)[0].nodeName, "hello",
			"The root node of the transform result should be 'hello'");
	});
};
