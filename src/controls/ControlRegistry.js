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
var ControlRegistry = function ControlRegistry()
{
	var types = [];
	var expressions = [];

	var depth = -1;

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
	 * @param {Object} control An object that describes the control.
	 */
	this.register = function register(control)
	{
		$log.assert($type.isObject(control), "Argument 'control' should either be an object that describes the control or the control itself");

		var typeInfo = new ControlTypeInfo(control);
		types.push(typeInfo);
		expressions.push(typeInfo.expression);

		typeInfo.name = $type.isString(control.NAME)
			? control.NAME
			: $type.isFunction(control)
				? one.func.getName(control)
				: one.func.getName(control.constructor);

		$log.info("Registered control {0}", typeInfo.name);

		return control;
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
	 * Provides a method thcat can be called to signal that the outer initialization is
	 * completed and that all controls can ow be started.
	 */
	this.start = function start()
	{
		for (var i = 0; i < types.length; i++)
			types[i].start();
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
			var elements = $(expressions.join(", "), parent || document);

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
	};
};
