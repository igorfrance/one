/**
 * Implements a global control registry.
 *
 * The control registry provides a centralized and streamlined way for controls to be discovered, initialized
 * and made available to the whole window.
 *
 * When a control is registered, it provides information about how it needs to be initialized; if the control need to
 * load resources asynchronously, it will wait on it to complete before signaling readiness.
 *
 * A registered control will be appended several methods that provide it with functionality to create get and create
 * instances, as well as to register custom constructors for specific elements.
 */
var ControlRegistry = Dispatcher.extend(function ControlRegistry()
{
	this.construct();

	this.registerEvent("ready");
	this.registerEvent("update");

	this.started = false;

	var types = [];
	var expressions = [];

	var depth = 0;

	/**
	 * Calls static redraw method on all control types that implement it.
	 *
	 * This provides a single point for redraw synchronization when arbitrary code element change the screen layout in
	 * ways that require controls to be redrawn.
	 */
	this.redraw = function redraw()
	{
		for (var i = 0; i < types.length; i++)
		{
			types[i].redraw();
		}
	};

	/**
	 * Registers a control.
	 * @param {String} expression The css expression string for elements that should be
	 * assigned the control.
	 * @param {Object} control The control factory object.
	 * @param {Object} options Optional contructor options to use when creating elements.
	 */
	this.register = function register(expression, control, options)
	{
		var _expression, _control, _options;
		if (arguments.length == 1)
		{
			_control = arguments[0] || {};
			_options = {};
			_expression = _control.expression;
		}
		if (arguments.length == 2)
		{
			_expression = arguments[0];
			_control = arguments[1] || {};
			_options = {};
		}
		if (arguments.length == 3)
		{
			_expression = arguments[0];
			_control = arguments[1] || {};
			_options = arguments[2] || {};
		}

		if (_expression)
			expressions.push(_expression);

		var typeInfo = new ControlTypeInfo(_control, _options, _expression);
		types.push(typeInfo);

		typeInfo.name = $type.isString(_control.NAME)
			? _control.NAME
			: $type.isFunction(_control)
				? one.func.getName(_control)
				: one.func.getName(_control.constructor);

		$log.info("Registered control {0}", typeInfo.name);

		return _control;
	};

	/**
	 * Searches through the registered controls and find an instance that matches the specification.
	 * @param {Object} element Either the id of an HTML element or the HTML element itself.
	 * @param {Object} type Either the class name associated with a control type, the name of the type or
	 * the control type itself.
	 * @returns {Control} The control associated with the specified element, and optionally $type.
	 */
	this.get = function get(element, type)
	{
		if (element == null)
			return null;

		if (element.jquery)
			element = element[0];

		if ($type.isString(element))
			element = $(element)[0];

		if (element == null)
			return null;

		var result = null;
		for (var i = 0; i < types.length; i++)
		{
			var typeInfo = types[i];
			if (type != null)
			{
				if (typeInfo.checkType(type) || typeInfo.typeName == type || typeInfo.expression.indexOf(type) != -1)
				{
					result = typeInfo.getInstance(element);
					break;
				}
			}
			else
			{
				// if no type has been specified, return the first matching control.
				result = typeInfo.getInstance(element);
				if (result != null)
				{
					break;
				}
			}
		}

		return result;
	};

	/**
	 * Sets up all registered controls.
	 * @param {Function} onSetupReady The function to call when the setup completes.
	 */
	this.setup = function setup(onSetupReady)
	{
		if (types.length == 0)
		{
			if ($type.isFunction(onSetupReady))
				onSetupReady();

			return;
		}

		var self = this;
		var typesReady = 0;
		for (var i = 0; i < types.length; i++)
		{
			var typeInfo = types[i];
			typeInfo.setup(function onTypeInitialized()
			{
				if (++typesReady == types.length)
				{
					self.update();
					if ($type.isFunction(onSetupReady))
						onSetupReady();
				}
			});
		}
	};

	/**
	 * Call <code>dispose</code> method on all registered controls.
	 */
	this.dispose = function dispose()
	{
		for (var i = 0; i < types.length; i++)
			types[i].dispose();
	};

	/**
	 * Provides a method that can be called to signal that the outer initialization is
	 * completed and that all controls can now be started.
	 */
	this.start = function start()
	{
		for (var i = 0; i < types.length; i++)
			types[i].start();

		this.fireEvent("ready");
		this.started = true;
	};

	/**
	 * Discovers and initializes registered controls within the specified <c>parent</c>.
	 *
	 * @param {Object} parent The parent element in which to discover and update controls. If omitted it defaults to
	 * whole document.
	 */
	this.update = function update(parent)
	{
		depth++;

		if (depth < 10)
		{
			var selectControls = expressions.join(", ");
			var elements = $(selectControls, parent || document);
			if (parent)
			{
				elements = elements.add($(parent).filter(selectControls));
			}

			if (elements.length > 0)
			{
				for (var i = 0; i < types.length; i++)
				{
					var count = 0;
					var typeInfo = types[i];
					var matches = elements.filter(typeInfo.expression);

					for (var j = 0; j < matches.length; j++)
					{
						var control = typeInfo.getInstance(matches[j]);
						if (control == null)
						{
							typeInfo.createInstance(matches[j], null, depth);
							count++;
						}
					}

					if (count != 0)
						console.log("Created {0} instance(s) of {1}".format(count, typeInfo.name));
				}
			}
		}
		else
		{
			one.log.warn("An attempt was made to recurse into ControlRegistry.update deeper than 10 levels. Check the code for infinite loops");
		}

		depth--;

		if (depth == 0)
		{
			this.fireEvent("update");
		}
	};

});
