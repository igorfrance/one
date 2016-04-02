/**
 * @copyright 2012 Igor France
 * Licensed under the MIT License
 *
 * This file is a part of the one.js
 */

/**
 * Provides xml utilities
 * @type {Function}
 */
var $xml = (function xml()
{
	var parser;
	var parseErrorNs;
	var parserThrows = false;
	var implementation = document.implementation;
	var domcompatible = window.XMLSerializer != null;
	var xhtmlNamespace = "http://www.w3.org/1999/xhtml";
	var ORDERED_NODE_ITERATOR_TYPE = 5;

	var nodeType = {
		ELEMENT: 1,
		ATTRIBUTE: 2,
		TEXT: 3,
		CDATA_SECTION: 4,
		ENTITY_REFERENCE: 5,
		ENTITY: 6,
		PROCESSING_INSTRUCTION: 7,
		COMMENT: 8,
		DOCUMENT: 9,
		DOCUMENT_TYPE: 10,
		DOCUMENT_FRAGMENT: 11,
		NOTATION: 12
	};

	/**
	 * Returns an XML node or XML document, depending on the type of <c>value</c>.
	 * <p>If the specified <c>value</c> is a string, a new document will be created and initialized using the <c>value</c>
	 * as it's XML content. The string <c>value</c> should not be blank and it should start with a '&lt;' to be
	 * considered xml.</p>
	 * <p>If the specified <c>value</c> is an XML node, it will be returned unchanged.</p>
	 * @param {Node|String} value Either the XML node that will be returned, or the string to create a new document with.
	 * @returns {Node} Either the XML node that was specified or an XML document initialized with the specified string.
	 */
	var xml = function xml(value)
	{
		if ($type.isNode(value))
			return value;

		if ($type.isString(value))
		{
			if (value.trim().indexOf("<") == 0)
			{
				return xml.document(value);
			}
		}

		return null;
	};

	/**
	 * Selects the text content from an xml node.
	 * This function can be called in several ways and the position of arguments is flexible.
	 * If the function is called with a single argument <c>subject</c>, the function will simply return the its text content.
	 * If the <c>xpath</c> argument function is used, the xml node(s) specified with the <c>xpath</c> expression are
	 * selected first and their (concatenated) text content is returned. If the function was called without the <c>subject</c>
	 * argument specified the subject against which the <c>xpath</c> expression will be executed will be the current HTML
	 * document.
	 * @param {String} [xpath] Optional xpath to use to select the node(s) whose text content to return.
	 * @param {Node} [subject] Optional node whose text to return, or within which to search for the node(s) specified
	 * with the <c>xpath</c> argument.
	 * @param {Object} [namespaces] Optional object that specifies namespaces and their prefixes. If the xpath argument
	 * uses qualified names in its expression this argument is required (and it must define the namespace prefixes used).
	 * @returns {String} The selected text content
	 */
	xml.text = function (xpath, subject, namespaces)
	{
		var xpath_ = $string.EMPTY;
		var subject_ = null;
		var namespaces_ = {};

		for (var i = 0; i < 3; i++)
		{
			if (arguments.length < i + 1)
				break;

			var arg = arguments[i];
			if ($type.isNode(arg))
				subject_ = arg;
			else if ($type.isString(arg))
				xpath_ = arg;
			else if ($type.isObject(arg))
				namespaces_ = arg;
		}

		var selection = [];

		if (xpath_ == $string.EMPTY && subject_ == null)
			return null;

		if (xpath_ == $string.EMPTY && subject_ != null)
			selection = [subject_];

		else
			selection = xml.select(xpath_, subject_ || document, namespaces_);

		var result = [];
		for (i = 0; i < selection.length; i++)
		{
			var selected = selection[i];
			if (selected.nodeType == nodeType.DOCUMENT)
				selected = selected.documentElement;

			switch (selected.nodeType)
			{
				case nodeType.TEXT:
				case nodeType.COMMENT:
					result.push(selected.nodeValue);
					break;

				default:
					if (selected.value != null)
						result.push(selected.value);
					else if (selected.textContent != null)
						result.push(selected.textContent);
					else if (selected.text != null)
						result.push(selected.text);
					else
						result.push(selected.innerText);
					break;
			}
		}

		return result.join($string.EMPTY);
	};

	/**
	 * Returns the xml text for the specified <c>node</c>.
	 *
	 * The node can be supplied directly or it can be specified as an xpath
	 * expression to the node to select (in which case the selection will happen within the current document).
	 * @param {string|Node} node The node (or xpath of the node) whose xml string to get.
	 * @returns {string} The xml text of the specified <c>node</c>.
	 */
	xml.toXml = function(node)
	{
		if ($type.isString(node))
			node = xml.select(node)[0];

		if ($dom.isIE())
			return node.xml;

		if (node == document || node.ownerDocument == document)
			return xml.serialize(node);

		return new XMLSerializer().serializeToString(Node(node));

	};

	xml.serialize = function (node)
	{
		if (node == null || node.nodeType == null)
			return $string.EMPTY;

		if (node.nodeType == nodeType.DOCUMENT)
			return xml.serialize(node.documentElement);

		var rslt = [];
		var skipNamespace = false;

		if (node.nodeType == nodeType.ELEMENT)
		{
			var nodeName = node.nodeName;
			if (node.namespaceURI == xhtmlNamespace)
			{
				nodeName = nodeName.toLowerCase();
				skipNamespace = true;
			}

			rslt.push("<");
			rslt.push(nodeName);
			for (var i = 0; i < node.attributes.length; i++)
			{
				var attrName = node.attributes[i].name;
				var attrValue = node.getAttribute(attrName);

				if (attrName == "xmlns" && skipNamespace)
					continue;

				rslt.push(" ");
				rslt.push(node.attributes[i].name);
				rslt.push("=\"");
				rslt.push(xml.escape(attrValue, true));
				rslt.push("\"");
			}

			if (node.childNodes.length == 0)
				rslt.push("/>");
			else
			{
				rslt.push(">");
				for (i = 0; i < node.childNodes.length; i++)
				{
					var child = node.childNodes[i];
					if (child.nodeType == nodeType.ELEMENT)
					{
						rslt.push(xml.serialize(child));
					}
					if (child.nodeType == nodeType.COMMENT)
					{
						rslt.push("<!--");
						rslt.push(xml.text(child));
						rslt.push("-->");
					}
					if (child.nodeType == nodeType.CDATA_SECTION)
					{
						rslt.push("<![CDATA[");
						rslt.push(xml.text(child));
						rslt.push("]]>");
					}
					if (child.nodeType == nodeType.TEXT)
					{
						rslt.push(xml.escape(xml.text(child)));
					}
				}
				rslt.push("</");
				rslt.push(nodeName);
				rslt.push(">");
			}
		}

		return rslt.join($string.EMPTY);
	};

	xml.toObject = function(node)
	{
		if (node == null || node.nodeType == null)
			return null;

		var result = {};
		if (node.nodeType == nodeType.DOCUMENT)
		{
			var rootName = node.documentElement.nodeName;
			result[rootName] = xml.toObject(node.documentElement);
		}
		else if (node.nodeType == nodeType.ELEMENT)
		{
			for (var i = 0; i < node.attributes.length; i++)
			{
				result[node.attributes[i].name] =
					node.getAttribute(node.attributes[i].name);
			}
			for (i = 0; i < node.childNodes.length; i++)
			{
				var child = node.childNodes[i];
				if (child.nodeType == nodeType.ELEMENT)
				{
					var parsed = xml.toObject(child);
					if (result[child.nodeName] != null)
					{
						if (!$type.isArray(result[child.nodeName]))
							result[child.nodeName] = [result[child.nodeName]];

						result[child.nodeName].push(parsed);
					}
					else
						result[child.nodeName] = parsed;
				}
				if (child.nodeType == nodeType.TEXT && child.nodeValue.trim() != $string.EMPTY)
					result.$text = child.nodeValue;
			}
		}
		return result;
	};

	xml.resolver = function(namespaces)
	{
		$log.assert($type.isObject(namespaces), "Argument 'namespaces' should be an object");

		return function NsResolver(prefix) /**/
		{
			return namespaces[prefix];
		};
	};

	/**
	 * Selects xml nodes using the specified from <c>xpath</c>, either from the current document or from the specified
	 * <c>subject</c>.
	 * @param {string} xpath The XPath selection string to use.
	 * @param {Node} [subject] Optional xml node from which to select.
	 * @param {object} [namespaces] Optional object that defines the namespaces used by the <c>xpath</c> expression.
	 * The property names should be the namespace prefixes and property values the actual namespace URI's.
	 * @returns {Node[]} An array of nodes that were selected by the <c>xpath</c> expression.
	 */
	xml.select = function(xpath, subject, namespaces)
	{
		if (arguments.length == 2 && $type.isString(arguments[1]))
		{
			xpath = arguments[0];
			namespaces = arguments[1];
		}

		if (!$type.isNode(subject))
			subject = document;

		var ownerDocument = subject.nodeType == nodeType.DOCUMENT ? subject : subject.ownerDocument;
		if ($dom.isIE())
		{
			var nslist = [];
			for (var prefix in namespaces)
				if (namespaces.hasOwnProperty(prefix))
					nslist.push('xmlns:{0}="{1}"'.format(prefix, namespaces[prefix]));

			ownerDocument.setProperty("SelectionNamespaces", nslist.join(" "));
			return subject.selectNodes(xpath);
		}
		else
		{
			var nsResolver = namespaces
				? xml.resolver(namespaces)
				: null;

			var result = ownerDocument.evaluate(xpath, subject, nsResolver, ORDERED_NODE_ITERATOR_TYPE, null);
			var node = result.iterateNext();
			var nodeList = [];
			while (node)
			{
				nodeList.push(node);
				node = result.iterateNext();
			}
			return nodeList;
		}
	};

	/**
	 * Loads the specified <c>url</c>, parses the response as an xml document and calls the <c>onload</c> callback when
	 * the document is loaded and parsed.
	 * @param {string} url The url of the document to load
	 * @param {function(Document)} [onload] The function to call then the document has loaded.
	 * @param {function(Error|string)} [onerror] The function to call if an error occurs during loading or parsing the
	 * specified <c>url</c>.
	 * @returns {XMLHttpRequest} The jquery XMLHttpRequest created for the specified <c>url</c>.
	 */
	xml.load = function(url, onload, onerror)
	{
		$log.assert($type.isString(url), "Argument 'url' is required");

		return $.ajax(url,
		{
			complete: function (request)
			{
				var document;
				try
				{
					document = xml.document(request.responseText);
					if ($type.isFunction(onload))
						onload(document);
				}
				catch(e)
				{
					if ($type.isFunction(onerror))
						onerror(e);
					else
						throw e;
				}
			},
			error: function (request, status, errorThrown)
			{
				if ($type.isFunction(onerror))
					onerror(errorThrown);
			}
		});
	};

	/**
	 * Creates a new Document, optionally initializing it with the specified <c>source</c>.
	 * @param {string|Document} [source] Optional string or document whose html to use to initialize the returned document with.
	 * @returns {Document} A new Document, optionally initialized with the specified <c>source</c>.
	 */
	xml.document = function(source)
	{
		if ($type.isDocument(source))
		{
			source = xml.serialize(source);
		}

		var document = null;
		if ($dom.isIE())
		{
			document = new ActiveXObject("MSXML2.DomDocument");
			if (source)
			{
				document.loadXML(source);
				throwIfParseError(document);
			}
		}
		else if (domcompatible)
		{
			if ($type.isString(source))
			{
				document = getParser().parseFromString(source, "text/xml");
				if (!parserThrows)
					throwIfParseError(document);
			}
			else
			{
				document = implementation.createDocument($string.EMPTY, $string.EMPTY, null);
			}
		}

		return document;
	};

	xml.processor = function(source)
	{
		source = xml(source);
		if (source == null)
			return null;

		var processor = null;
		if ($dom.isIE())
		{
			var ftDocument = xml.document(source.xml);
			var template = new ActiveXObject("MSXML2.XslTemplate");
			template.stylesheet = ftDocument;
			processor = template.createProcessor();
		}
		else
		{
			processor = new XSLTProcessor();
			processor.importStylesheet(source);
		}

		return processor;
	};

	xml.transform = function(document, processor)
	{
		$log.assert($type.isDocument(document), "Argument 'document' should be a document.");
		$log.assert(!$type.isNull(processor), "Argument 'xslProcessor' is required");

		var result = null;
		if ($dom.isIE())
		{
			result = xml.document();
			processor.input = document;
			processor.output = result;
			processor.transform();
		}
		else
		{
			result = processor.transformToDocument(document);
		}

		return result;
	};

	xml.escape = function(value, quotes)
	{
		var result = String(value)
			.replace(/&(?!amp;)/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		if (quotes)
			result = result.replace(/\"/g, "&quot;");

		return result;
	};

	function throwIfParseError(document)
	{
		var info = { name: "XML Parse Error", error: false, data: { line: 1, column: 0 }};
		if ($dom.isIE())
		{
			if (document.parseError != 0)
			{
				info.error = true;
				info.message = document.parseError.reason;

				if (document.parseError.line)
					info.data.line = document.parseError.line;

				if (document.parseError.column)
					info.data.column = document.parseError.column;
			}
		}
		else
		{
			var parseError = document.getElementsByTagNameNS(parseErrorNs, "parsererror")[0];
			if (parseError != null)
			{
				var message = xml.text(parseError).replace(/line(?: number)? (\d+)(?:,)?(?: at)? column (\d+):/i, function replace($0, $1, $2)
				{
					info.line = parseInt($1);
					info.column = parseInt($2);
					return $0 + "\n";
				});

				info.error = true;
				info.message = message;
			}
		}

		if (info.error == true)
			throw error(info);
	}

	function getParser()
	{
		if (parser == null)
		{
			parser = new DOMParser();
			try
			{
				parseErrorNs = parser
					.parseFromString("INVALID XML", "text/xml")
					.getElementsByTagName("*")[0]
					.namespaceURI;
			}
			catch(e)
			{
				parserThrows = true;
			}
		}

		return parser;
	}

	xml.nodeType = nodeType;

	return xml;
	
})();
