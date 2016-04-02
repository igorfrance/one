/**
 * @copyright 2012 Igor France
 * Licensed under the MIT License
 *
 * This file is a part of the one.js
 */

var $function = (function ()
{
	var NAME_EXPR = /^[\s\S$]*?function[\s\n]+(([\w.$]*)[\s\n]*\((.*)\))\W[\s\S]*$/;

	var $function = {};

	/**
	 * An empty function constant.
	 * This constant serves to be used wherever an empty function is needed, without needing to create a new one each time.
	 * @type {Function}
	 */
	$function.EMPTY = function () {};

	/**
	 * Gets the name of the specified function, optionally including the function arguments.
	 * @param {Function} fx The function whose name to get. If omitted, the function used will be the caller of this function.
	 * @param {Boolean} [includeArguments] If <c>true</c>, the resulting name will be appended the function
	 * arguments in function parentheses.
	 * @param {Boolean} [argumentsOnly] If <c>true</c>, the resulting value will only contain the arguments.
	 * @returns {String} The name of the function.
	 */
	$function.getName = function (fx, includeArguments, argumentsOnly)
	{
		if (arguments.length == 0)
		{
			fx = arguments.callee.caller;
			if (!$type.isFunction(fx))
				return null;
		}
		else
		{
			if (fx == null)
				return null;

			if (!$type.isFunction(fx))
			{
				fx = fx.constructor;
				if (!$type.isFunction(fx))
					return null;
			}
		}

		var name = String(fx).replace(NAME_EXPR, function ()
		{
			var fxName = arguments[2] ? arguments[2] : "anonymous";
			var functionDefinition = arguments[2] ? arguments[1] : [fxName, "(", arguments[3], ")"].join($string.EMPTY);

			if (includeArguments && !argumentsOnly)
				return functionDefinition;

			if (includeArguments && argumentsOnly)
				return arguments[3];

			return fxName;
		});

		return name.replace(/([\w\$])\$([\w\$])/g, "$1.$2");
	};

	/**
	 * Gets the name of function that called the function that invokes this function.
	 * @returns {String} The name of the function that called the function that invokes this function.
	 */
	$function.callerName = function ()
	{
		return $function.getName(arguments.callee.caller.caller);
	};

	/**
	 * Gets the stack trace starting at the specified <c>point</c>.
	 * @param {Function} point The function from which to start building the stack trace.
	 * @param {Number} maxIterations The maximum number of iterations to go through.
	 * @returns {Array} The array with stack trace, and an overridden toString method that pretty prints it.
	 */
	$function.stackTrace = function (point, maxIterations)
	{
		// point = arguments.callee.caller
		var fxCaller = point || arguments.callee.caller;
		var callStack = [];
		var functions = [];

		var currentCount = 0;
		while (fxCaller != null)
		{
			if (maxIterations && currentCount >= maxIterations)
				break;

			// prevent infinite loop with recursive calls
			else if (functions.contains(fxCaller))
				break;

			var fxName = $function.getName(fxCaller);
			var fxArgs = [];
			var argValues = fxCaller.arguments;

			for (var i = 0; i < argValues.length; i++)
			{
				if ($type.isFunction(argValues[i]) && $type.isFunction(argValues[i].getName))
					fxArgs.push(argValues[i].getName(true));

				else if ($type.isArray(argValues[i]))
					fxArgs.push("array[{0}]".format(argValues[i].length));

				else if ($type.isObject(argValues[i]))
					fxArgs.push("object{..}");

				else if ($type.isNull(argValues[i]))
					fxArgs.push("null");

				else if ($type.isString(argValues[i]))
					fxArgs.push(argValues[i].length < 200
						? "\"{0}\"".format(argValues[i])
						: "[string({0})]".format(argValues[i].length));

				else if (argValues[i] == undefined)
					fxArgs.push("undefined");

				else
					fxArgs.push(argValues[i]);
			}

			functions.push(fxCaller);
			callStack.unshift($function.getName(fxCaller) + "(" + fxArgs.join(", ") + ")");

			try
			{
				fxCaller = fxCaller.caller;
			}
			catch(e)
			{
				break;
			}
			currentCount++;
		}
		callStack.toString = function (joinString)
		{
			return this.join(joinString || "\n");
		};

		return callStack;
	};

	return $function;

})();
