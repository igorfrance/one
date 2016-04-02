/**
 * @copyright 2012 Igor France
 * Licensed under the MIT License
 *
 * This file is a part of the one.js
 */

/**
 * Provides a proxy object that can be used across different browsers to log to console.
 * @type {Object}
 */
var $url = new function url()
{
	var url = function makeUrl(value)
	{
		var result = new Url();
		result.parse($type.isString(value) ? value : location.href);
		return result;
	};

	/**
	 * Defines the regular expression that matches different parts of a URL.
	 * The different parts of the URL that this expression matches are:
	 * <ul>
	 * <li>protocol</li>
	 * <li>authority<ul>
	 *    <li>userInfo<ul>
	 *       <li>user</li>
	 *       <li>password</li>
	 *    </ul></li>
	 *    <li>host</li>
	 *    <li>port</li></ul></li>
	 * <li>relative<ul>
	 *    <li>path<ul>
	 *        <li>directory</li>
	 *        <li>file</li></ul></li>
	 *     <li>query</li>
	 *     <li>anchor (fragment)</li>
	 * </ul></li></ul>
	 * @type {RegExp}
	 */
	url.URL_EXPRESSION =
		/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

	/**
	 * The url component names corresponding to the sub-match indexes of the regular expression <c>URL_EXPRESSION</c>.
	 * @type {Array.<String>}
	 */
	url.COMPONENT_NAMES =
		["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "hash"];

	/**
	 * Specifies the protocol separator string ("://").
	 * @type {String}
	 */
	url.PROTOCOL_SEPARATOR = "://";

	/**
	 * Specifies the string to use to indicate an empty hash string and to interpret a hash string as empty.
	 * When manipulating hash parameters of the browser's location object by using <c>Url.setHash</c>, <c>Url.setHashParam</c>
	 * and <c>Url.removeHashParam</c> methods, and the resulting hash is an empty string, the browser's location will contain
	 * a hash character ("#") without any value following. Setting the location hash to '#' will cause the browser to
	 * scroll to the top of the page, which is most of the time not the desired effect. To prevent that, this class uses
	 * the string specified with this constant to indicate an empty string. In other words, if the hash contains just this
	 * character it is considered empty, and similarly, if the resulting hash to set is an empty string, the value that
	 * will be set will be this character.
	 * @type {String}
	 * @constant
	 */
	url.EMPTY_HASH = "!";

	/**
	 * The default character (&) to use as the name/value pair separator within url query strings and hashes.
	 * @type {string}
	 */
	url.DEFAULT_SEPARATOR = "&";

	/**
	 * The default character (=) to use as the names/value separator within url query strings and hashes.
	 * @type {string}
	 */
	url.DEFAULT_EQUALS = "=";

	/**
	 * Provides a wrapper around a url parsed from a string, and a set of static methods for working with the
	 * browser's location object.
	 * @param {String} [value] The url string to use to initialize a new instance with. If omitted, the url of the
	 * browser's current location is used.
	 * @param {Object} [options] The object that specifies the options of this instance.
	 * <dl>
	 *   <dt>separator</dt>
	 *     <dd>the character to use as the name/value pair separator within url query strings and hashes</dd>
	 *   <dt>equals</dt>
	 *     <dd>the character to use as the names/value separator within url query strings and hashes.</dd>
	 * </dl>
	 */
	function Url(value, options)
	{
		options = options || {};

		this.separator = options.separator || url.DEFAULT_SEPARATOR;
		this.equals = options.equals || url.DEFAULT_EQUALS;

		this.init();

		if (value)
			this.parse(value);
	}

	/**
	 * Initializes all url components to blank values.
	 * @return {Url} The current instance.
	 */
	Url.prototype.init = function ()
	{
		this.components = {
			source: $string.EMPTY,
			protocol: $string.EMPTY,
			authority: $string.EMPTY,
			userInfo: $string.EMPTY,
			user: $string.EMPTY,
			password: $string.EMPTY,
			host: $string.EMPTY,
			port: $string.EMPTY,
			relative: $string.EMPTY,
			path: $string.EMPTY,
			directory: $string.EMPTY,
			file: $string.EMPTY,
			query: $string.EMPTY,
			hash: $string.EMPTY
		};

		this.hashParam = {};
		this.queryParam = {};

		return this;
	};

	Url.prototype.qualify = function (value)
	{
		if (!value)
			return $string.EMPTY;

		if (value.indexOf("//") != -1)
			return value;

		if (value.indexOf("/") == 0)
			return [
				this.components.protocol, url.PROTOCOL_SEPARATOR,
				this.components.authority,
				value].join($string.EMPTY);

		return [
			this.components.protocol, url.PROTOCOL_SEPARATOR,
			this.components.authority,
			this.components.directory,
			value].join($string.EMPTY);
	};


	/**
	 * Gets all hash parameters from this <c>Url</c> instance, optionally prefixed with the specified <c>prefix</c>.
	 * @param {String} prefix The character to prefix the resulting  string with
	 * @returns {String}
	 */
	Url.prototype.getHash = function (prefix)
	{
		return url.serializeParams(this.hashParam, { prefix: prefix || $string.EMPTY });
	};

	/**
	 * Gets all query string parameters from this <c>Url</c> instance, optionally prefixed with the specified <c>prefix</c>.
	 * @param {String} prefix The character to prefix the resulting  string with
	 * @returns {String}
	 */
	Url.prototype.getQuery = function (prefix)
	{
		return url.serializeParams(this.queryParam, { prefix: prefix || $string.EMPTY });
	};

	/**
	 * Gets the query string parameter with the specified <c>name</c>.
	 * @param {String} name The name of the parameter to get.
	 * @return {String} The value of the parameter.
	 */
	Url.prototype.getQueryParam = function (name)
	{
		return this.queryParam[name];
	};

	/**
	 * Gets the hash parameter with the specified <c>name</c>.
	 * @param {String} name The name of the parameter to get.
	 * @return {String} The value of the parameter.
	 */
	Url.prototype.getHashParam = function (name)
	{
		return this.hashParam[name];
	};

	/**
	 * Sets the query string parameter with the specified <c>name</c> the value of the specified <c>value</c>.
	 * @param {String} name The name of the parameter to set.
	 * @param {String} value The value to set.
	 * @return {Url} The current instance
	 */
	Url.prototype.setQueryParam = function (name, value)
	{
		this.queryParam[name] = value;
		return this;
	};

	/**
	 * Sets the hash parameter with the specified <c>name</c> the value of the specified <c>value</c>.
	 * @param {String} name The name of the parameter to set.
	 * @param {String} value The value to set.
	 * @return {Url} The current instance
	 */
	Url.prototype.setHashParam = function (name, value)
	{
		this.hashParam[name] = value;
		return this;
	};

	/**
	 * Removes the parameter with the specified <c>name</c> from the query string component of the current object.
	 * @param {String} name The name of the parameter to remove.
	 * @return {Url} The current instance
	 */
	Url.prototype.removeQueryParam = function (name)
	{
		delete this.queryParam[name];
		return this;
	};

	/**
	 * Removes the parameter with the specified <c>name</c> from the hash component of the current object.
	 * @param {String} name The name of the parameter to remove.
	 * @return {Url} The current instance
	 */
	Url.prototype.removeHashParam = function (name)
	{
		delete this.hashParam[name];
		return this;
	};

	/**
	 * Parses the specified <c>value</c> as url components and stores them into the current instance.
	 * @param {String} value
	 * @return {Url} The current instance
	 */
	Url.prototype.parse = function (value)
	{
		if (value == null)
			return this;

		var matches = url.URL_EXPRESSION.exec(value);

		for (var i = url.COMPONENT_NAMES.length - 1; i > 0; i--)
			this.components[url.COMPONENT_NAMES[i]] = matches[i] || $string.EMPTY;

		var hash = this.components.hash;
		var query = this.components.query;

		if (hash.indexOf("!") == 0)
			hash = hash.substring(1);

		this.hashParam = url.parseQuery(hash);
		this.queryParam = url.parseQuery(query);

		return this;
	};

	/**
	 * Creates a complete url string made of all components of this <c>Url</u> instance.
	 * @returns {String}
	 */
	Url.prototype.toString = function ()
	{
		var prefix = this.components.protocol
			? $string.concat(this.components.protocol, url.PROTOCOL_SEPARATOR)
			: $string.EMPTY;

		return $string.concat(
			prefix,
			this.components.authority,
			this.components.path,
			url.serializeParams(this.queryParam, { prefix: "?", encode: true }),
			url.serializeParams(this.hashParam, { prefix: "#", encode: false })
		);
	};

	/**
	 * Combines the parent <c>folderUrl</c> with the child <c>fileUrl</c> into a single URL.
	 * @param {String} folderUrl The parent URL to combine, e.g. <c>my/directory/to/files</c>.
	 * @param {String} fileUrl The child URL to combine, e.g. <c>../file2.txt</c>
	 * @return {String} The combined URL.
	 * @example
	 * // the following returns "my/directory/to/file2.txt":
	 * var combined = combine("my/directory/to/files", "../file2.txt");
	 */
	url.combine = function (folderUrl, fileUrl)
	{
		var filePath = $string.concat(folderUrl, "/", fileUrl);
		while (filePath.match(/[^\/]+\/\.\.\//))
		{
			filePath = filePath.replace(/[^\/]+\/\.\.\//, "");
		}
		return filePath.replace(/\/{2,}/g, "/");
	};

	/**
	 * Gets the parameter with the specified <c>name</c> from the query string component of the current <c>window.location</c>.
	 * @param {String} name The name of the parameter to get
	 * @param {String} defaultValue The value to return in case the current query string doesn't contain the part with the
	 * specified <c>name</c> or if that value is blank.
	 * @returns {String}
	 */
	url.getQueryParam = function (name, defaultValue)
	{
		return url().getQueryParam(name) || defaultValue;
	};

	/**
	 * Gets the parameter with the specified <c>name</c> from the hash component of the current <c>window.location</c>.
	 * @param {String} name The name of the parameter to get
	 * @param {String} defaultValue The value to return in case the current hash doesn't contain the part with the
	 * specified <c>name</c> or if that value is blank.
	 * @returns {String}
	 */
	url.getHashParam = function (name, defaultValue)
	{
		return url().getHashParam(name) || defaultValue;
	};

	/**
	 * Gets the query string component (without the initial hash character) from current <c>window.location</c>.
	 * @returns {String}
	 */
	url.getHash = function ()
	{
		return String(location.hash).substring(1);
	};

	/**
	 * Gets the query string component (without the initial question character) from current <c>window.location</c>.
	 * @returns {String}
	 */
	url.getQuery = function ()
	{
		return String(location.search).substring(1);
	};

	/**
	 * Sets the value of the specified hash parameter of the current <c>window.location</c>.
	 *
	 * If a single argument is passed as an object, it will be treated as a name/value collection. If two values are
	 * passed, they will be treated a single key/value pair.
	 * @example setHashParam("color", "red");
	 * @example setHashParam({ color: "red", size: "xlarge" });
	 */
	url.setHashParam = function ()
	{
		var current = url(location.href);
		if (arguments.length == 2)
		{
			current.setHashParam(arguments[0], arguments[1]);
		}
		else if (arguments.length == 1)
		{
			if ($type.isObject(arguments[0]))
			{
				for (var name in arguments[0])
					if (arguments[0].hasOwnProperty(name))
						current.setHashParam(name, arguments[0][name]);
			}
			else
			{
				current.setHashParam(arguments[0], $string.EMPTY);
			}
		}
		else
		{
			return;
		}

		url.setHash(current.getHash());
	};

	/**
	 * Sets the complete hash of the current <c>window.location</c>.
	 * @param {String} hash The value to set.
	 */
	url.setHash = function (hash)
	{
		// ensure that setting the location hash to empty doesn't cause the page to scroll to the top
		if (hash == $string.EMPTY)
			hash = url.EMPTY_HASH;

		window.location.hash = hash;
	};

	/**
	 * Removes the parameter with the specified <c>name</c> from the hash component of the current <c>window.location</c>.
	 * @param {String} name The name of the parameter to remove.
	 */
	url.removeHashParam = function (name)
	{
		var current = url(location);
		current.removeHashParam(name);

		url.setHash(current.getHash());
	};

	/**
	 * Gets the file extension from the specified <c>path</c>.
	 * @param {String} path
	 * @returns {String}
	 */
	url.getFileExtension = function (path)
	{
		var dotIndex = path ? path.lastIndexOf(".") : -1;
		return (dotIndex > -1 ? path.slice(dotIndex + 1) : "");
	};

	/**
	 * Gets the file name part of the specified <c>path</c>.
	 * @param {String} path
	 * @returns {String}
	 */
	url.getFileName = function (path)
	{
		return String(path).match(/[^\\\/]*$/)[0];
	};

	/**
	 * Gets an object with properties initialized with values as parsed from name/value pairs in the
	 * specified <c>queryString</c>.
	 * @param {String} queryString The string to parse.
	 * @param {Object} options Optional object that specifies the parse options.
	 * <dl>
	 *  <dt>separator</dt>
	 *    <dd>the character to use as the name/value pair separator within url query strings and hashes</dd>
	 *  <dt>equals</dt>
	 *    <dd>the character to use as the names/value separator within url query strings and hashes.</dd>
	 *  <dt>equals</dt>
	 *    <dd>the character to use as the names/value separator within url query strings and hashes.</dd>
	 * </dl>
	 * @returns {Object}
	 */
	url.parseQuery = function (queryString, options)
	{
		if (!queryString)
			return {};

		var opt = $.extend({
				separator: url.DEFAULT_SEPARATOR,
				equals: url.DEFAULT_EQUALS
			},
			options || {});

		var param = String(queryString).split(opt.separator);
		var query = {};
		for (var i = 0; i < param.length; i++)
		{
			if (param[i].length == 0)
				continue;

			var pair = param[i].split(opt.equals);
			var key = pair[0];
			var itemValue = pair[1] || $string.EMPTY;

			if (query[key] != null)
			{
				if (!$type.isArray(query[key]))
					query[key] = [query[key]];

				query[key].push(itemValue);
			}
			else
			{
				query[key] = itemValue;
			}
		}

		return query;
	};

	/**
	 * Serializes the names and values of properties of <c>params</c> into a string of name/value pairs.
	 * @param {Object} params The object to serialize.
	 * @param {Object} [options] Object that specifies the serialization options.
	 * <dl>
	 *  <dt>separator</dt>
	 *    <dd>the character to use as the pair separator</dd>
	 *  <dt>equals</dt>
	 *    <dd>the character to use as the names/value separator</dd>
	 *  <dt>encode</dt>
	 *    <dd>if <c>true</c> the resulting string will be URL encoded.</dd>
	 * </dl>
	 * @return {String}
	 */
	url.serializeParams = function (params, options)
	{
		if (params == null)
			return null;

		var opt = $.extend({
			separator: url.DEFAULT_SEPARATOR,
			equals: url.DEFAULT_EQUALS,
			encode: false
		},
			options || {});

		var result = [];
		for (var name in params)
		{
			if (!params.hasOwnProperty(name))
				continue;

			var itemName = opt.encode ? encodeURIComponent(name) : name;
			var itemValue = opt.encode ? encodeURIComponent(params[name] || $string.EMPTY) : params[name];
			if (itemValue)
				result.push(itemName + opt.equals + itemValue);
			else
				result.push(itemName);
		}

		var value = result.join(opt.separator);
		if (opt.prefix && value.length)
			return $string.concat(opt.prefix, value);

		return value;
	};

	url.qualify = function (value)
	{
		var baseHref = $("base[href]").attr("href") || document.location.href;
		return url(baseHref).qualify(value);
	};

	return url;
};

