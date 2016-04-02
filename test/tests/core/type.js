﻿module("one.type");

test("type.registerNamespace", function test$registerNamespace()
{
	var type = one.type;

	type.registerNamespace("one.test");
	equal(window.one.test != null, true, "Should create the global namespace");
});

test("type.isArray", function test$isArray()
{
	var type = one.type;

	equal(type.isArray([]), true, "Should properly recognize array");
	equal(type.isArray($("body")), true, "Should properly recognize array");
	equal(type.isArray(1), false, "Should properly reject non-array");
	equal(type.isArray(null), false, "Should properly reject non-array");
	equal(type.isArray(undefined), false, "Should properly reject non-array");
	equal(type.isArray(new Array(4)), true, "Should properly recognize array");
});

test("type.isBoolean", function test$isBoolean()
{
	var type = one.type;
	equal(type.isBoolean(true), true, "Should properly recognize boolean");
	equal(type.isBoolean(new Boolean("a")), true, "Should properly recognize boolean");
	equal(type.isBoolean("a"), false, "Should properly reject non-boolean");
	equal(type.isBoolean(1), false, "Should properly reject non-boolean");
	equal(type.isBoolean(0), false, "Should properly reject non-boolean");
});

test("type.isFunction", function test$isFunction()
{
	var type = one.type;
	equal(type.isFunction(new Function), true, "Should properly recognize function");
	equal(type.isFunction(test), true, "Should properly recognize function");
	equal(type.isFunction([].push), true, "Should properly recognize function");
	equal(type.isFunction(function () {}), true, "Should properly recognize function");
	equal(type.isFunction("p"), false, "Should properly reject non-function");
	equal(type.isFunction(new Object), false, "Should properly reject non-function");
	equal(type.isFunction(null), false, "Should properly reject non-function");
});

test("type.isNull", function test$isNull()
{
	var type = one.type;
	equal(type.isNull(null), true, "Should properly recognize null");
	equal(type.isNull(undefined), true, "Should properly recognize null");
	equal(type.isNull(0), false, "Should properly reject non-null");
	equal(type.isNull(""), false, "Should properly reject non-null");
});

test("type.isNumber", function test$isNumber()
{
	var type = one.type;
	equal(type.isNumber(1), true, "Should properly recognize number");
	equal(type.isNumber(0), true, "Should properly recognize number");
	equal(type.isNumber(new Number(4)), true, "Should properly recognize number");
	equal(type.isNumber("0"), false, "Should properly reject non-number");
	equal(type.isNumber([].length), true, "Should properly recognize number");
});

test("type.isNumeric", function test$isNumeric()
{
	var type = one.type;
	equal(type.isNumeric(1), true, "Should properly recognize numeric values");
	equal(type.isNumeric(0), true, "Should properly recognize numeric values");
	equal(type.isNumeric(new Number(4)), true, "Should properly recognize numeric values");
	equal(type.isNumeric("1"), true, "Should properly recognize numeric values");
	equal(type.isNumeric("45"), true, "Should properly recognize numeric values");
	equal(type.isNumeric([].length), true, "Should properly recognize numeric values");
	equal(type.isNumeric("a1"), false, "Should properly reject non-numeric values");
	equal(type.isNumeric(new Function), false, "Should properly reject non-numeric values");
});

test("type.isDate", function test$isDate()
{
	var type = one.type;
	equal(type.isDate(new Date), true, "Should properly recognize date");
	equal(type.isDate("a1"), false, "Should properly reject non-date");
});

test("type.isObject", function test$isObject()
{
	var type = one.type;
	equal(type.isObject(new Date), true, "Should recognize date as object");
	equal(type.isObject(new Function), true, "Should recognize function as object");
	equal(type.isObject(Object), true, "Should recognize Object as object");
	equal(type.isObject(null), false, "Should reject null");
	equal(type.isObject(undefined), false, "Should reject undefined");
	equal(type.isObject(0), false, "Should reject 0");
	equal(type.isObject("ABC"), false, "Should reject strings");
	equal(type.isObject(123), false, "Should reject numbers");
	equal(type.isObject(new Number("4.7")), false, "Should reject Number objects");
});

test("type.isString", function test$isString()
{
	var type = one.type;
	equal(type.isString(new String), true, "Should recognize String as string");
	equal(type.isString("abc"), true, "Should recognize string as string");
	equal(type.isString(0), false, "Should reject 0");
	equal(type.isString(123), false, "Should reject numbers");
	equal(type.isString(new Number("4.7")), false, "Should reject Number objects");
});

test("type.isNode", function test$isNode()
{
	ok(true);
});

test("type.isDocument", function test$isDocument()
{
	ok(true);
});

test("type.isElement", function test$isElement()
{
	ok(true);
});

test("type.isHtmlElement", function test$isHtmlElement()
{
	ok(true);
});

test("type.instanceOf", function test$instanceOf()
{
	ok(true);
});

test("type.implements", function test$implements()
{
	ok(true);
});

test("type.extend", function test$extend()
{
	ok(true);
});

