/*!
 * one.js  v.2.0
 *
 * Copyright 2012 Igor France
 * Licensed under the MIT License
 *
 */
var one = (function one($)
{
	var one = {};

	/* @include core/Type.js  */
	/* @include core/String.js */
	/* @include core/Number.js */
	/* @include core/Array.js */
	/* @include core/Date.js  */
	/* @include core/Function.js */
	/* @include core/Prototype.js  */
	/* @include core/Dispatcher.js  */
	/* @include core/Property.js  */
	/* @include core/CookieProperty.js  */
	/* @include core/Settings.js  */

	/* @include utils/Css.js  */
	/* @include utils/Dom.js  */
	/* @include utils/Log.js  */
	/* @include utils/Url.js  */
	/* @include utils/Cookie.js  */
	/* @include utils/Initializer.js  */
	/* @include utils/Xml.js  */
	/* @include utils/Constants.js  */
	/* @include utils/Event.js  */
	/* @include utils/Dragger.js  */
	/* @include utils/Easing.js  */

	/* @include controls/ControlTypeInfo.js  */
	/* @include controls/ControlRegistry.js  */
	/* @include controls/HtmlControl.js  */
	/* @include controls/ModelBinder.js  */
	/* @include controls/FastClick.js  */
	/* @include controls/ximage/Image.js  */

	one.Prototype = Prototype;
	one.Property = Property;
	one.CookieProperty = CookieProperty;
	one.Dispatcher = Dispatcher;
	one.Settings = Settings;
	one.Initializer = Initializer;
	one.HtmlControl = HtmlControl;
	one.ModelBinder = ModelBinder;

	one.type = $type;
	one.string = $string;
	one.func = $function;
	one.array = $array;
	one.date = $date;
	one.log = $log;
	one.css = $css;
	one.dom = $dom;
	one.url = $url;
	one.cookie = $cookie;
	one.xml = $xml;
	one.const = $const;
	one.event = $evt;
	one.drag = $drag;
	one.easing = $easing;
	one.number = $number;
	one.image = $image;
	one.controls = new ControlRegistry;
	one.controls.Registry = ControlRegistry;
	one.controls.TypeInfo = ControlTypeInfo;

	one.init = new Initializer;
	one.init.register(one.controls, true);
	one.init.on("done", $.proxy(one.controls.start, one.controls));

	$(window)
		.on("load", one.init.setup)
		.on("unload", one.init.dispose);

	return one;

})(window.jQuery);
