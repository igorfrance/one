/**
 * @copyright 2012 Igor France
 * Licensed under the MIT License
 *
 * This file is a part of the one.js
 */
var $number = (function ()
{
	/**
	 * Generates a random integer, optionally limited within a range.
	 * @param {Number} [min] The minimum value of the random number to generate. Default is 0.
	 * @param {Number} [max] The maximum value of the random number to generate. Default is <c>Number.MAX_VALUE</c>.
	 * @param {Boolean} [noRounding] Prevents function from rounding the generated number to the closest integer. Default is false.
	 * @returns {Number}
	 */
	function random(min, max, noRounding)
	{
		var _min = 0;
		var _max = Number.MAX_VALUE;
		var _round = true;

		if (arguments.length == 1)
		{
			if ($type.isBoolean(arguments[0]))
				_round = !arguments[0];
			else if ($type.isNumber(arguments[0]))
				_max = arguments[0];
		}

		if (arguments.length == 2)
		{
			if ($type.isBoolean(arguments[1]))
			{
				_max = parseInt(arguments[0]) || 0;
				_round = !arguments[1];
			}
			else if ($type.isNumber(arguments[1]))
			{
				_min = parseInt(arguments[0]) || 0;
				_max = arguments[1];
			}
		}

		if (arguments.length == 3)
		{
			_min = parseInt(arguments[0]) || 0;
			_max = parseInt(arguments[1]) || 0;
			_round = !arguments[2];
		}

		var random = _min + ((_max - _min) * Math.random());
		return _round ? Math.round(random) : random;
	}

	return {
		random: random
	}
	
})();
