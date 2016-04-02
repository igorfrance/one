/**
 * Click handler
 * @param element
 * @param handler
 * @constructor
 * @extends HtmlControl;
 */
function FastClick(element, handler)
{
	this.construct(element);

	this.handler = handler;

	this.eventHandler = $.proxy(this.handleEvent, this);
	this.$element.on("touchstart click", this.eventHandler);
}
FastClick.inherits(HtmlControl);
FastClick.coordinates = [];

FastClick.preventGhostClick = function (x, y)
{
  FastClick.coordinates.push(x, y);
  window.setTimeout(FastClick.pop, 2500);
};

FastClick.pop = function()
{
  FastClick.coordinates.splice(0, 2);
};

FastClick.onDocumentClick = function (e)
{
	for (var i = 0; i < FastClick.coordinates.length; i += 2)
	{
    var x = FastClick.coordinates[i];
    var y = FastClick.coordinates[i + 1];
    if (Math.abs(e.clientX - x) < 25 && Math.abs(e.clientY - y) < 25)
    {
      e.stopPropagation();
      e.preventDefault();
    }
  }
};

/**
 * Routes events to appropriate handlers
 * @param {Event} event
 */
FastClick.prototype.handleEvent = function (event)
{
	switch (event.type)
	{
		case 'touchstart': this.onTouchStart(event); break;
		case 'touchmove': this.onTouchMove(event); break;
		case 'touchend': this.onClick(event); break;
		case 'click': this.onClick(event); break;
  }
};

FastClick.prototype.reset = function()
{
	this.$element.off("touchend", this.eventHandler);
	$(document).off("touchmove", this.eventHandler);
};

FastClick.prototype.onTouchStart = function(e)
{
	var event = e.originalEvent || e;
	event.stopPropagation();

	this.$element.on("touchend", this.eventHandler);
	$(document).on("touchmove", this.eventHandler);

	this.startX = event.touches[0].clientX;
	this.startY = event.touches[0].clientY;
};

FastClick.prototype.onTouchMove = function(e)
{
	var event = e.originalEvent || e;
	if (
		Math.abs(event.touches[0].clientX - this.startX) > 10 ||
		Math.abs(event.touches[0].clientY - this.startY) > 10)
	{
		this.reset();
	}
};

FastClick.prototype.onClick = function(e)
{
  e.stopPropagation();

  this.reset();
  this.handler(e);

  if (e.type == 'touchend')
    FastClick.preventGhostClick(this.startX, this.startY);
};

document.addEventListener("click", FastClick.onDocumentClick, true);

$.fastclick = function (selection, handler)
{
	$(selection).fastclick(handler);
};

$.fn.fastclick = function ()
{
	var handler = arguments[0];

	this.each(function ()
	{
		var $elem = $(this);
		if (!$elem.data("fastclick"))
			$elem.data("fastclick", new FastClick($elem, handler));
	});

	return this;
};
