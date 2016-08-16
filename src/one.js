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

	/* @include controls/ControlTypeInfo.js  */
	/* @include controls/ControlRegistry.js  */
	/* @include controls/HtmlControl.js  */

	/* @include utils/Css.js  */
	/* @include utils/Dom.js  */
	/* @include utils/Log.js  */
	/* @include utils/Url.js  */
	/* @include utils/Url.js  */
	/* @include utils/Cookie.js  */
	/* @include utils/Initializer.js  */
	/* @include utils/Xml.js  */
	/* @include utils/Constants.js  */
	/* @include utils/Event.js  */
	/* @include utils/FastClick.js  */
	/* @include utils/Dragger.js  */
	/* @include utils/Easing.js  */
	/* @include utils/Image.js  */

	one.Prototype = Prototype;
	one.Property = Property;
	one.CookieProperty = CookieProperty;
	one.Dispatcher = Dispatcher;
	one.Settings = Settings;
	one.Initializer = Initializer;
	one.HtmlControl = HtmlControl;

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

	// if ($.fn.velocity)
	// {
	// 	$.fn.animate = function animate(props, arg2, arg3)
	// 	{
	// 		var options = $.extend({}, arg2, arg3);
	// 		if (one.type.isNumber(arg2))
	// 			options.duration = arg2;
	//
	// 		if (one.type.isFunction(arg3))
	// 			options.complete = arg3;
	// 		if (one.type.isFunction(arg2))
	// 			options.complete = arg2;
	//
	// 		this.each(function (i, element)
	// 		{
	// 			var settings = $.extend({}, options);
	// 			if (one.type.isFunction(settings.step))
	// 			{
	// 				var oldComplete = settings.complete;
	// 				var oldBegin = settings.begin;
	//
	// 				settings.element = element;
	// 				settings.complete = false;
	// 				settings.complete = function complete()
	// 				{
	// 					settings.complete = true;
	// 					settings.step.call(settings.element);
	// 					if (one.type.isFunction(oldComplete))
	// 						oldComplete.call(this, arguments);
	// 				};
	// 				settings.begin = function begin()
	// 				{
	// 					if (one.type.isFunction(oldBegin))
	// 						oldBegin.call(this, arguments);
	//
	// 					one.dom.requestAnimationFrame(step)
	// 				};
	//
	// 				function step()
	// 				{
	// 					settings.step.call(settings.element);
	// 					if (settings.complete != true)
	// 					{
	// 						one.dom.requestAnimationFrame(step)
	// 					}
	// 				}
	// 			}
	//
	// 			$(element).velocity(props, settings);
	// 		});
	// 	};
	// }

	return one;

})(window.jQuery);
