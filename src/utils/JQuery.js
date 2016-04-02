(function jQueryPlugins($)
{
	$.fn.hasAttr = function (attrName)
	{
		if (this.length == 0)
			return false;

		return this[0].attributes[attrName] != undefined;
	};

})(jQuery);
