
(function(window) {'use strict';































function minErr(module, ErrorConstructor) {
  ErrorConstructor = ErrorConstructor || Error;
  return function() {
    var code = arguments[0],
      template = arguments[1],
      message = '[' + (module ? module + ':' : '') + code + '] ',
      templateArgs = sliceArgs(arguments, 2).map(function(arg) {
        return toDebugString(arg, minErrConfig.objectMaxDepth);
      }),
      paramPrefix, i;

    message += template.replace(/\{\d+\}/g, function(match) {
      var index = +match.slice(1, -1);

      if (index < templateArgs.length) {
        return templateArgs[index];
      }

      return match;
    });

    message += '\nhttp://errors.angularjs.org/1.6.4/' +
      (module ? module + '/' : '') + code;

    for (i = 0, paramPrefix = '?'; i < templateArgs.length; i++, paramPrefix = '&') {
      message += paramPrefix + 'p' + i + '=' + encodeURIComponent(templateArgs[i]);
    }

    return new ErrorConstructor(message);
  };
}
var REGEX_STRING_REGEXP = /^\/(.+)\/([a-z]*)$/;

// The name of a form control's ValidityState property.
// This is used so that it's possible for internal tests to create mock ValidityStates.
var VALIDITY_STATE_PROPERTY = 'validity';


var hasOwnProperty = Object.prototype.hasOwnProperty;

var minErrConfig = {
  objectMaxDepth: 5
};

function errorHandlingConfig(config) {
  if (isObject(config)) {
    if (isDefined(config.objectMaxDepth)) {
      minErrConfig.objectMaxDepth = isValidObjectMaxDepth(config.objectMaxDepth) ? config.objectMaxDepth : NaN;
    }
  } else {
    return minErrConfig;
  }
}

function isValidObjectMaxDepth(maxDepth) {
  return isNumber(maxDepth) && maxDepth > 0;
}

var lowercase = function(string) {return isString(string) ? string.toLowerCase() : string;};

var uppercase = function(string) {return isString(string) ? string.toUpperCase() : string;};


var manualLowercase = function(s) {
  /* eslint-disable no-bitwise */
  return isString(s)
      ? s.replace(/[A-Z]/g, function(ch) {return String.fromCharCode(ch.charCodeAt(0) | 32);})
      : s;
  /* eslint-enable */
};
var manualUppercase = function(s) {
  /* eslint-disable no-bitwise */
  return isString(s)
      ? s.replace(/[a-z]/g, function(ch) {return String.fromCharCode(ch.charCodeAt(0) & ~32);})
      : s;
  /* eslint-enable */
};


// String#toLowerCase and String#toUpperCase don't produce correct results in browsers with Turkish
// locale, for this reason we need to detect this case and redefine lowercase/uppercase methods
// with correct but slower alternatives. See https://github.com/angular/angular.js/issues/11387
if ('i' !== 'I'.toLowerCase()) {
  lowercase = manualLowercase;
  uppercase = manualUppercase;
}


var
    msie,             // holds major version number for IE, or NaN if UA is not IE.
    jqLite,           // delay binding since jQuery could be loaded after us.
    jQuery,           // delay binding
    slice             = [].slice,
    splice            = [].splice,
    push              = [].push,
    toString          = Object.prototype.toString,
    getPrototypeOf    = Object.getPrototypeOf,
    ngMinErr          = minErr('ng'),

    /** @name angular */
    angular           = window.angular || (window.angular = {}),
    angularModule,
    uid               = 0;

msie = window.document.documentMode;

function isArrayLike(obj) {

  // `null`, `undefined` and `window` are not array-like
  if (obj == null || isWindow(obj)) return false;

  // arrays, strings and jQuery/jqLite objects are array like
  // * jqLite is either the jQuery or jqLite constructor function
  // * we have to check the existence of jqLite first as this method is called
  //   via the forEach method when constructing the jqLite object in the first place
  if (isArray(obj) || isString(obj) || (jqLite && obj instanceof jqLite)) return true;

  // Support: iOS 8.2 (not reproducible in simulator)
  // "length" in obj used to prevent JIT error (gh-11508)
  var length = 'length' in Object(obj) && obj.length;

  // NodeList objects (with `item` method) and
  // other objects with suitable length characteristics are array-like
  return isNumber(length) &&
    (length >= 0 && ((length - 1) in obj || obj instanceof Array) || typeof obj.item === 'function');

}


function forEach(obj, iterator, context) {
  var key, length;
  if (obj) {
    if (isFunction(obj)) {
      for (key in obj) {
        if (key !== 'prototype' && key !== 'length' && key !== 'name' && obj.hasOwnProperty(key)) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    } else if (isArray(obj) || isArrayLike(obj)) {
      var isPrimitive = typeof obj !== 'object';
      for (key = 0, length = obj.length; key < length; key++) {
        if (isPrimitive || key in obj) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    } else if (obj.forEach && obj.forEach !== forEach) {
        obj.forEach(iterator, context, obj);
    } else if (isBlankObject(obj)) {
      // createMap() fast path --- Safe to avoid hasOwnProperty check because prototype chain is empty
      for (key in obj) {
        iterator.call(context, obj[key], key, obj);
      }
    } else if (typeof obj.hasOwnProperty === 'function') {
      // Slow path for objects inheriting Object.prototype, hasOwnProperty check needed
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    } else {
      // Slow path for objects which do not have a method `hasOwnProperty`
      for (key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    }
  }
  return obj;
}

function forEachSorted(obj, iterator, context) {
  var keys = Object.keys(obj).sort();
  for (var i = 0; i < keys.length; i++) {
    iterator.call(context, obj[keys[i]], keys[i]);
  }
  return keys;
}


/**
 * when using forEach the params are value, key, but it is often useful to have key, value.
 * @param {function(string, *)} iteratorFn
 * @returns {function(*, string)}
 */
function reverseParams(iteratorFn) {
  return function(value, key) {iteratorFn(key, value);};
}

/**
 * A consistent way of creating unique IDs in angular.
 *
 * Using simple numbers allows us to generate 28.6 million unique ids per second for 10 years before
 * we hit number precision issues in JavaScript.
 *
 * Math.pow(2,53) / 60 / 60 / 24 / 365 / 10 = 28.6M
 *
 * @returns {number} an unique alpha-numeric string
 */
function nextUid() {
  return ++uid;
}


/**
 * Set or clear the hashkey for an object.
 * @param obj object
 * @param h the hashkey (!truthy to delete the hashkey)
 */
function setHashKey(obj, h) {
  if (h) {
    obj.$$hashKey = h;
  } else {
    delete obj.$$hashKey;
  }
}


function baseExtend(dst, objs, deep) {
  var h = dst.$$hashKey;

  for (var i = 0, ii = objs.length; i < ii; ++i) {
    var obj = objs[i];
    if (!isObject(obj) && !isFunction(obj)) continue;
    var keys = Object.keys(obj);
    for (var j = 0, jj = keys.length; j < jj; j++) {
      var key = keys[j];
      var src = obj[key];

      if (deep && isObject(src)) {
        if (isDate(src)) {
          dst[key] = new Date(src.valueOf());
        } else if (isRegExp(src)) {
          dst[key] = new RegExp(src);
        } else if (src.nodeName) {
          dst[key] = src.cloneNode(true);
        } else if (isElement(src)) {
          dst[key] = src.clone();
        } else {
          if (!isObject(dst[key])) dst[key] = isArray(src) ? [] : {};
          baseExtend(dst[key], [src], true);
        }
      } else {
        dst[key] = src;
      }
    }
  }

  setHashKey(dst, h);
  return dst;
}

/**
 * @ngdoc function
 * @name angular.extend
 * @module ng
 * @kind function
 *
 * @description
 * Extends the destination object `dst` by copying own enumerable properties from the `src` object(s)
 * to `dst`. You can specify multiple `src` objects. If you want to preserve original objects, you can do so
 * by passing an empty object as the target: `var object = angular.extend({}, object1, object2)`.
 *
 * **Note:** Keep in mind that `angular.extend` does not support recursive merge (deep copy). Use
 * {@link angular.merge} for this.
 *
 * @param {Object} dst Destination object.
 * @param {...Object} src Source object(s).
 * @returns {Object} Reference to `dst`.
 */
function extend(dst) {
  return baseExtend(dst, slice.call(arguments, 1), false);
}


/**
* @ngdoc function
* @name angular.merge
* @module ng
* @kind function
*
* @description
* Deeply extends the destination object `dst` by copying own enumerable properties from the `src` object(s)
* to `dst`. You can specify multiple `src` objects. If you want to preserve original objects, you can do so
* by passing an empty object as the target: `var object = angular.merge({}, object1, object2)`.
*
* Unlike {@link angular.extend extend()}, `merge()` recursively descends into object properties of source
* objects, performing a deep copy.
*
* @param {Object} dst Destination object.
* @param {...Object} src Source object(s).
* @returns {Object} Reference to `dst`.
*/
function merge(dst) {
  return baseExtend(dst, slice.call(arguments, 1), true);
}



function toInt(str) {
  return parseInt(str, 10);
}

var isNumberNaN = Number.isNaN || function isNumberNaN(num) {
  // eslint-disable-next-line no-self-compare
  return num !== num;
};


function inherit(parent, extra) {
  return extend(Object.create(parent), extra);
}

/**
 * @ngdoc function
 * @name angular.noop
 * @module ng
 * @kind function
 *
 * @description
 * A function that performs no operations. This function can be useful when writing code in the
 * functional style.
   ```js
     function foo(callback) {
       var result = calculateResult();
       (callback || angular.noop)(result);
     }
   ```
 */
function noop() {}
noop.$inject = [];


/**
 * @ngdoc function
 * @name angular.identity
 * @module ng
 * @kind function
 *
 * @description
 * A function that returns its first argument. This function is useful when writing code in the
 * functional style.
 *
   ```js
   function transformer(transformationFn, value) {
     return (transformationFn || angular.identity)(value);
   };

   // E.g.
   function getResult(fn, input) {
     return (fn || angular.identity)(input);
   };

   getResult(function(n) { return n * 2; }, 21);   // returns 42
   getResult(null, 21);                            // returns 21
   getResult(undefined, 21);                       // returns 21
   ```
 *
 * @param {*} value to be returned.
 * @returns {*} the value passed in.
 */
function identity($) {return $;}
identity.$inject = [];


function valueFn(value) {return function valueRef() {return value;};}

function hasCustomToString(obj) {
  return isFunction(obj.toString) && obj.toString !== toString;
}


/**
 * @ngdoc function
 * @name angular.isUndefined
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is undefined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is undefined.
 */
function isUndefined(value) {return typeof value === 'undefined';}


/**
 * @ngdoc function
 * @name angular.isDefined
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is defined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is defined.
 */
function isDefined(value) {return typeof value !== 'undefined';}


/**
 * @ngdoc function
 * @name angular.isObject
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
 * considered to be objects. Note that JavaScript arrays are objects.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Object` but not `null`.
 */
function isObject(value) {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === 'object';
}


/**
 * Determine if a value is an object with a null prototype
 *
 * @returns {boolean} True if `value` is an `Object` with a null prototype
 */
function isBlankObject(value) {
  return value !== null && typeof value === 'object' && !getPrototypeOf(value);
}


/**
 * @ngdoc function
 * @name angular.isString
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is a `String`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `String`.
 */
function isString(value) {return typeof value === 'string';}


/**
 * @ngdoc function
 * @name angular.isNumber
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is a `Number`.
 *
 * This includes the "special" numbers `NaN`, `+Infinity` and `-Infinity`.
 *
 * If you wish to exclude these then you can use the native
 * [`isFinite'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite)
 * method.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Number`.
 */
function isNumber(value) {return typeof value === 'number';}


/**
 * @ngdoc function
 * @name angular.isDate
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a value is a date.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Date`.
 */
function isDate(value) {
  return toString.call(value) === '[object Date]';
}


/**
 * @ngdoc function
 * @name angular.isArray
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is an `Array`. Alias of Array.isArray.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Array`.
 */
var isArray = Array.isArray;

/**
 * @ngdoc function
 * @name angular.isFunction
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is a `Function`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Function`.
 */
function isFunction(value) {return typeof value === 'function';}


/**
 * Determines if a value is a regular expression object.
 *
 * @private
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `RegExp`.
 */
function isRegExp(value) {
  return toString.call(value) === '[object RegExp]';
}


/**
 * Checks if `obj` is a window object.
 *
 * @private
 * @param {*} obj Object to check
 * @returns {boolean} True if `obj` is a window obj.
 */
function isWindow(obj) {
  return obj && obj.window === obj;
}


function isScope(obj) {
  return obj && obj.$evalAsync && obj.$watch;
}


function isFile(obj) {
  return toString.call(obj) === '[object File]';
}


function isFormData(obj) {
  return toString.call(obj) === '[object FormData]';
}


function isBlob(obj) {
  return toString.call(obj) === '[object Blob]';
}


function isBoolean(value) {
  return typeof value === 'boolean';
}


function isPromiseLike(obj) {
  return obj && isFunction(obj.then);
}


var TYPED_ARRAY_REGEXP = /^\[object (?:Uint8|Uint8Clamped|Uint16|Uint32|Int8|Int16|Int32|Float32|Float64)Array]$/;
function isTypedArray(value) {
  return value && isNumber(value.length) && TYPED_ARRAY_REGEXP.test(toString.call(value));
}

function isArrayBuffer(obj) {
  return toString.call(obj) === '[object ArrayBuffer]';
}


var trim = function(value) {
  return isString(value) ? value.trim() : value;
};

// Copied from:
// http://docs.closure-library.googlecode.com/git/local_closure_goog_string_string.js.source.html#line1021
// Prereq: s is a string.
var escapeForRegexp = function(s) {
  return s
    .replace(/([-()[\]{}+?*.$^|,:#<!\\])/g, '\\$1')
    // eslint-disable-next-line no-control-regex
    .replace(/\x08/g, '\\x08');
};


/**
 * @ngdoc function
 * @name angular.isElement
 * @module ng
 * @kind function
 *
 * @description
 * Determines if a reference is a DOM element (or wrapped jQuery element).
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a DOM element (or wrapped jQuery element).
 */
function isElement(node) {
  return !!(node &&
    (node.nodeName  // We are a direct element.
    || (node.prop && node.attr && node.find)));  // We have an on and find method part of jQuery API.
}

/**
 * @param str 'key1,key2,...'
 * @returns {object} in the form of {key1:true, key2:true, ...}
 */
function makeMap(str) {
  var obj = {}, items = str.split(','), i;
  for (i = 0; i < items.length; i++) {
    obj[items[i]] = true;
  }
  return obj;
}


function nodeName_(element) {
  return lowercase(element.nodeName || (element[0] && element[0].nodeName));
}

function includes(array, obj) {
  return Array.prototype.indexOf.call(array, obj) !== -1;
}

function arrayRemove(array, value) {
  var index = array.indexOf(value);
  if (index >= 0) {
    array.splice(index, 1);
  }
  return index;
}

/**
 * @ngdoc function
 * @name angular.copy
 * @module ng
 * @kind function
 *
 * @description
 * Creates a deep copy of `source`, which should be an object or an array.
 *
 * * If no destination is supplied, a copy of the object or array is created.
 * * If a destination is provided, all of its elements (for arrays) or properties (for objects)
 *   are deleted and then all elements/properties from the source are copied to it.
 * * If `source` is not an object or array (inc. `null` and `undefined`), `source` is returned.
 * * If `source` is identical to `destination` an exception will be thrown.
 *
 * <br />
 * <div class="alert alert-warning">
 *   Only enumerable properties are taken into account. Non-enumerable properties (both on `source`
 *   and on `destination`) will be ignored.
 * </div>
 *
 * @param {*} source The source that will be used to make a copy.
 *                   Can be any type, including primitives, `null`, and `undefined`.
 * @param {(Object|Array)=} destination Destination into which the source is copied. If
 *     provided, must be of the same type as `source`.
 * @returns {*} The copy or updated `destination`, if `destination` was specified.
 *
 * @example
  <example module="copyExample" name="angular-copy">
    <file name="index.html">
      <div ng-controller="ExampleController">
        <form novalidate class="simple-form">
          <label>Name: <input type="text" ng-model="user.name" /></label><br />
          <label>Age:  <input type="number" ng-model="user.age" /></label><br />
          Gender: <label><input type="radio" ng-model="user.gender" value="male" />male</label>
                  <label><input type="radio" ng-model="user.gender" value="female" />female</label><br />
          <button ng-click="reset()">RESET</button>
          <button ng-click="update(user)">SAVE</button>
        </form>
        <pre>form = {{user | json}}</pre>
        <pre>master = {{master | json}}</pre>
      </div>
    </file>
    <file name="script.js">
      // Module: copyExample
      angular.
        module('copyExample', []).
        controller('ExampleController', ['$scope', function($scope) {
          $scope.master = {};

          $scope.reset = function() {
            // Example with 1 argument
            $scope.user = angular.copy($scope.master);
          };

          $scope.update = function(user) {
            // Example with 2 arguments
            angular.copy(user, $scope.master);
          };

          $scope.reset();
        }]);
    </file>
  </example>
 */
function copy(source, destination, maxDepth) {
  var stackSource = [];
  var stackDest = [];
  maxDepth = isValidObjectMaxDepth(maxDepth) ? maxDepth : NaN;

  if (destination) {
    if (isTypedArray(destination) || isArrayBuffer(destination)) {
      throw ngMinErr('cpta', 'Can\'t copy! TypedArray destination cannot be mutated.');
    }
    if (source === destination) {
      throw ngMinErr('cpi', 'Can\'t copy! Source and destination are identical.');
    }

    // Empty the destination object
    if (isArray(destination)) {
      destination.length = 0;
    } else {
      forEach(destination, function(value, key) {
        if (key !== '$$hashKey') {
          delete destination[key];
        }
      });
    }

    stackSource.push(source);
    stackDest.push(destination);
    return copyRecurse(source, destination, maxDepth);
  }

  return copyElement(source, maxDepth);

  function copyRecurse(source, destination, maxDepth) {
    maxDepth--;
    if (maxDepth < 0) {
      return '...';
    }
    var h = destination.$$hashKey;
    var key;
    if (isArray(source)) {
      for (var i = 0, ii = source.length; i < ii; i++) {
        destination.push(copyElement(source[i], maxDepth));
      }
    } else if (isBlankObject(source)) {
      // createMap() fast path --- Safe to avoid hasOwnProperty check because prototype chain is empty
      for (key in source) {
        destination[key] = copyElement(source[key], maxDepth);
      }
    } else if (source && typeof source.hasOwnProperty === 'function') {
      // Slow path, which must rely on hasOwnProperty
      for (key in source) {
        if (source.hasOwnProperty(key)) {
          destination[key] = copyElement(source[key], maxDepth);
        }
      }
    } else {
      // Slowest path --- hasOwnProperty can't be called as a method
      for (key in source) {
        if (hasOwnProperty.call(source, key)) {
          destination[key] = copyElement(source[key], maxDepth);
        }
      }
    }
    setHashKey(destination, h);
    return destination;
  }

  function copyElement(source, maxDepth) {
    // Simple values
    if (!isObject(source)) {
      return source;
    }

    // Already copied values
    var index = stackSource.indexOf(source);
    if (index !== -1) {
      return stackDest[index];
    }

    if (isWindow(source) || isScope(source)) {
      throw ngMinErr('cpws',
        'Can\'t copy! Making copies of Window or Scope instances is not supported.');
    }

    var needsRecurse = false;
    var destination = copyType(source);

    if (destination === undefined) {
      destination = isArray(source) ? [] : Object.create(getPrototypeOf(source));
      needsRecurse = true;
    }

    stackSource.push(source);
    stackDest.push(destination);

    return needsRecurse
      ? copyRecurse(source, destination, maxDepth)
      : destination;
  }

  function copyType(source) {
    switch (toString.call(source)) {
      case '[object Int8Array]':
      case '[object Int16Array]':
      case '[object Int32Array]':
      case '[object Float32Array]':
      case '[object Float64Array]':
      case '[object Uint8Array]':
      case '[object Uint8ClampedArray]':
      case '[object Uint16Array]':
      case '[object Uint32Array]':
        return new source.constructor(copyElement(source.buffer), source.byteOffset, source.length);

      case '[object ArrayBuffer]':
        // Support: IE10
        if (!source.slice) {
          // If we're in this case we know the environment supports ArrayBuffer
          /* eslint-disable no-undef */
          var copied = new ArrayBuffer(source.byteLength);
          new Uint8Array(copied).set(new Uint8Array(source));
          /* eslint-enable */
          return copied;
        }
        return source.slice(0);

      case '[object Boolean]':
      case '[object Number]':
      case '[object String]':
      case '[object Date]':
        return new source.constructor(source.valueOf());

      case '[object RegExp]':
        var re = new RegExp(source.source, source.toString().match(/[^/]*$/)[0]);
        re.lastIndex = source.lastIndex;
        return re;

      case '[object Blob]':
        return new source.constructor([source], {type: source.type});
    }

    if (isFunction(source.cloneNode)) {
      return source.cloneNode(true);
    }
  }
}


// eslint-disable-next-line no-self-compare
function simpleCompare(a, b) { return a === b || (a !== a && b !== b); }


/**
 * @ngdoc function
 * @name angular.equals
 * @module ng
 * @kind function
 *
 * @description
 * Determines if two objects or two values are equivalent. Supports value types, regular
 * expressions, arrays and objects.
 *
 * Two objects or values are considered equivalent if at least one of the following is true:
 *
 * * Both objects or values pass `===` comparison.
 * * Both objects or values are of the same type and all of their properties are equal by
 *   comparing them with `angular.equals`.
 * * Both values are NaN. (In JavaScript, NaN == NaN => false. But we consider two NaN as equal)
 * * Both values represent the same regular expression (In JavaScript,
 *   /abc/ == /abc/ => false. But we consider two regular expressions as equal when their textual
 *   representation matches).
 *
 * During a property comparison, properties of `function` type and properties with names
 * that begin with `$` are ignored.
 *
 * Scope and DOMWindow objects are being compared only by identify (`===`).
 *
 * @param {*} o1 Object or value to compare.
 * @param {*} o2 Object or value to compare.
 * @returns {boolean} True if arguments are equal.
 *
 * @example
   <example module="equalsExample" name="equalsExample">
     <file name="index.html">
      <div ng-controller="ExampleController">
        <form novalidate>
          <h3>User 1</h3>
          Name: <input type="text" ng-model="user1.name">
          Age: <input type="number" ng-model="user1.age">

          <h3>User 2</h3>
          Name: <input type="text" ng-model="user2.name">
          Age: <input type="number" ng-model="user2.age">

          <div>
            <br/>
            <input type="button" value="Compare" ng-click="compare()">
          </div>
          User 1: <pre>{{user1 | json}}</pre>
          User 2: <pre>{{user2 | json}}</pre>
          Equal: <pre>{{result}}</pre>
        </form>
      </div>
    </file>
    <file name="script.js">
        angular.module('equalsExample', []).controller('ExampleController', ['$scope', function($scope) {
          $scope.user1 = {};
          $scope.user2 = {};
          $scope.compare = function() {
            $scope.result = angular.equals($scope.user1, $scope.user2);
          };
        }]);
    </file>
  </example>
 */
function equals(o1, o2) {
  if (o1 === o2) return true;
  if (o1 === null || o2 === null) return false;
  // eslint-disable-next-line no-self-compare
  if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
  var t1 = typeof o1, t2 = typeof o2, length, key, keySet;
  if (t1 === t2 && t1 === 'object') {
    if (isArray(o1)) {
      if (!isArray(o2)) return false;
      if ((length = o1.length) === o2.length) {
        for (key = 0; key < length; key++) {
          if (!equals(o1[key], o2[key])) return false;
        }
        return true;
      }
    } else if (isDate(o1)) {
      if (!isDate(o2)) return false;
      return simpleCompare(o1.getTime(), o2.getTime());
    } else if (isRegExp(o1)) {
      if (!isRegExp(o2)) return false;
      return o1.toString() === o2.toString();
    } else {
      if (isScope(o1) || isScope(o2) || isWindow(o1) || isWindow(o2) ||
        isArray(o2) || isDate(o2) || isRegExp(o2)) return false;
      keySet = createMap();
      for (key in o1) {
        if (key.charAt(0) === '$' || isFunction(o1[key])) continue;
        if (!equals(o1[key], o2[key])) return false;
        keySet[key] = true;
      }
      for (key in o2) {
        if (!(key in keySet) &&
            key.charAt(0) !== '$' &&
            isDefined(o2[key]) &&
            !isFunction(o2[key])) return false;
      }
      return true;
    }
  }
  return false;
}

var csp = function() {
  if (!isDefined(csp.rules)) {


    var ngCspElement = (window.document.querySelector('[ng-csp]') ||
                    window.document.querySelector('[data-ng-csp]'));

    if (ngCspElement) {
      var ngCspAttribute = ngCspElement.getAttribute('ng-csp') ||
                    ngCspElement.getAttribute('data-ng-csp');
      csp.rules = {
        noUnsafeEval: !ngCspAttribute || (ngCspAttribute.indexOf('no-unsafe-eval') !== -1),
        noInlineStyle: !ngCspAttribute || (ngCspAttribute.indexOf('no-inline-style') !== -1)
      };
    } else {
      csp.rules = {
        noUnsafeEval: noUnsafeEval(),
        noInlineStyle: false
      };
    }
  }

  return csp.rules;

  function noUnsafeEval() {
    try {
      // eslint-disable-next-line no-new, no-new-func
      new Function('');
      return false;
    } catch (e) {
      return true;
    }
  }
};

/**
 * @ngdoc directive
 * @module ng
 * @name ngJq
 *
 * @element ANY
 * @param {string=} ngJq the name of the library available under `window`
 * to be used for angular.element
 * @description
 * Use this directive to force the angular.element library.  This should be
 * used to force either jqLite by leaving ng-jq blank or setting the name of
 * the jquery variable under window (eg. jQuery).
 *
 * Since angular looks for this directive when it is loaded (doesn't wait for the
 * DOMContentLoaded event), it must be placed on an element that comes before the script
 * which loads angular. Also, only the first instance of `ng-jq` will be used and all
 * others ignored.
 *
 * @example
 * This example shows how to force jqLite using the `ngJq` directive to the `html` tag.
 ```html
 <!doctype html>
 <html ng-app ng-jq>
 ...
 ...
 </html>
 ```
 * @example
 * This example shows how to use a jQuery based library of a different name.
 * The library name must be available at the top most 'window'.
 ```html
 <!doctype html>
 <html ng-app ng-jq="jQueryLib">
 ...
 ...
 </html>
 ```
 */
var jq = function() {
  if (isDefined(jq.name_)) return jq.name_;
  var el;
  var i, ii = ngAttrPrefixes.length, prefix, name;
  for (i = 0; i < ii; ++i) {
    prefix = ngAttrPrefixes[i];
    el = window.document.querySelector('[' + prefix.replace(':', '\\:') + 'jq]');
    if (el) {
      name = el.getAttribute(prefix + 'jq');
      break;
    }
  }

  return (jq.name_ = name);
};

function concat(array1, array2, index) {
  return array1.concat(slice.call(array2, index));
}

function sliceArgs(args, startIndex) {
  return slice.call(args, startIndex || 0);
}


/**
 * @ngdoc function
 * @name angular.bind
 * @module ng
 * @kind function
 *
 * @description
 * Returns a function which calls function `fn` bound to `self` (`self` becomes the `this` for
 * `fn`). You can supply optional `args` that are prebound to the function. This feature is also
 * known as [partial application](http://en.wikipedia.org/wiki/Partial_application), as
 * distinguished from [function currying](http://en.wikipedia.org/wiki/Currying#Contrast_with_partial_function_application).
 *
 * @param {Object} self Context which `fn` should be evaluated in.
 * @param {function()} fn Function to be bound.
 * @param {...*} args Optional arguments to be prebound to the `fn` function call.
 * @returns {function()} Function that wraps the `fn` with all the specified bindings.
 */
function bind(self, fn) {
  var curryArgs = arguments.length > 2 ? sliceArgs(arguments, 2) : [];
  if (isFunction(fn) && !(fn instanceof RegExp)) {
    return curryArgs.length
      ? function() {
          return arguments.length
            ? fn.apply(self, concat(curryArgs, arguments, 0))
            : fn.apply(self, curryArgs);
        }
      : function() {
          return arguments.length
            ? fn.apply(self, arguments)
            : fn.call(self);
        };
  } else {
    // In IE, native methods are not functions so they cannot be bound (note: they don't need to be).
    return fn;
  }
}


function toJsonReplacer(key, value) {
  var val = value;

  if (typeof key === 'string' && key.charAt(0) === '$' && key.charAt(1) === '$') {
    val = undefined;
  } else if (isWindow(value)) {
    val = '$WINDOW';
  } else if (value &&  window.document === value) {
    val = '$DOCUMENT';
  } else if (isScope(value)) {
    val = '$SCOPE';
  }

  return val;
}


/**
 * @ngdoc function
 * @name angular.toJson
 * @module ng
 * @kind function
 *
 * @description
 * Serializes input into a JSON-formatted string. Properties with leading $$ characters will be
 * stripped since angular uses this notation internally.
 *
 * @param {Object|Array|Date|string|number|boolean} obj Input to be serialized into JSON.
 * @param {boolean|number} [pretty=2] If set to true, the JSON output will contain newlines and whitespace.
 *    If set to an integer, the JSON output will contain that many spaces per indentation.
 * @returns {string|undefined} JSON-ified string representing `obj`.
 * @knownIssue
 *
 * The Safari browser throws a `RangeError` instead of returning `null` when it tries to stringify a `Date`
 * object with an invalid date value. The only reliable way to prevent this is to monkeypatch the
 * `Date.prototype.toJSON` method as follows:
 *
 * ```
 * var _DatetoJSON = Date.prototype.toJSON;
 * Date.prototype.toJSON = function() {
 *   try {
 *     return _DatetoJSON.call(this);
 *   } catch(e) {
 *     if (e instanceof RangeError) {
 *       return null;
 *     }
 *     throw e;
 *   }
 * };
 * ```
 *
 * See https://github.com/angular/angular.js/pull/14221 for more information.
 */
function toJson(obj, pretty) {
  if (isUndefined(obj)) return undefined;
  if (!isNumber(pretty)) {
    pretty = pretty ? 2 : null;
  }
  return JSON.stringify(obj, toJsonReplacer, pretty);
}


/**
 * @ngdoc function
 * @name angular.fromJson
 * @module ng
 * @kind function
 *
 * @description
 * Deserializes a JSON string.
 *
 * @param {string} json JSON string to deserialize.
 * @returns {Object|Array|string|number} Deserialized JSON string.
 */
function fromJson(json) {
  return isString(json)
      ? JSON.parse(json)
      : json;
}


var ALL_COLONS = /:/g;
function timezoneToOffset(timezone, fallback) {
  // Support: IE 9-11 only, Edge 13-14+
  // IE/Edge do not "understand" colon (`:`) in timezone
  timezone = timezone.replace(ALL_COLONS, '');
  var requestedTimezoneOffset = Date.parse('Jan 01, 1970 00:00:00 ' + timezone) / 60000;
  return isNumberNaN(requestedTimezoneOffset) ? fallback : requestedTimezoneOffset;
}


function addDateMinutes(date, minutes) {
  date = new Date(date.getTime());
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}


function convertTimezoneToLocal(date, timezone, reverse) {
  reverse = reverse ? -1 : 1;
  var dateTimezoneOffset = date.getTimezoneOffset();
  var timezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
  return addDateMinutes(date, reverse * (timezoneOffset - dateTimezoneOffset));
}


/**
 * @returns {string} Returns the string representation of the element.
 */
function startingTag(element) {
  element = jqLite(element).clone();
  try {
    // turns out IE does not let you set .html() on elements which
    // are not allowed to have children. So we just ignore it.
    element.empty();
  } catch (e) { /* empty */ }
  var elemHtml = jqLite('<div>').append(element).html();
  try {
    return element[0].nodeType === NODE_TYPE_TEXT ? lowercase(elemHtml) :
        elemHtml.
          match(/^(<[^>]+>)/)[1].
          replace(/^<([\w-]+)/, function(match, nodeName) {return '<' + lowercase(nodeName);});
  } catch (e) {
    return lowercase(elemHtml);
  }

}


/////////////////////////////////////////////////

/**
 * Tries to decode the URI component without throwing an exception.
 *
 * @private
 * @param str value potential URI component to check.
 * @returns {boolean} True if `value` can be decoded
 * with the decodeURIComponent function.
 */
function tryDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    // Ignore any invalid uri component.
  }
}


/**
 * Parses an escaped url query string into key-value pairs.
 * @returns {Object.<string,boolean|Array>}
 */
function parseKeyValue(/**string*/keyValue) {
  var obj = {};
  forEach((keyValue || '').split('&'), function(keyValue) {
    var splitPoint, key, val;
    if (keyValue) {
      key = keyValue = keyValue.replace(/\+/g,'%20');
      splitPoint = keyValue.indexOf('=');
      if (splitPoint !== -1) {
        key = keyValue.substring(0, splitPoint);
        val = keyValue.substring(splitPoint + 1);
      }
      key = tryDecodeURIComponent(key);
      if (isDefined(key)) {
        val = isDefined(val) ? tryDecodeURIComponent(val) : true;
        if (!hasOwnProperty.call(obj, key)) {
          obj[key] = val;
        } else if (isArray(obj[key])) {
          obj[key].push(val);
        } else {
          obj[key] = [obj[key],val];
        }
      }
    }
  });
  return obj;
}

function toKeyValue(obj) {
  var parts = [];
  forEach(obj, function(value, key) {
    if (isArray(value)) {
      forEach(value, function(arrayValue) {
        parts.push(encodeUriQuery(key, true) +
                   (arrayValue === true ? '' : '=' + encodeUriQuery(arrayValue, true)));
      });
    } else {
    parts.push(encodeUriQuery(key, true) +
               (value === true ? '' : '=' + encodeUriQuery(value, true)));
    }
  });
  return parts.length ? parts.join('&') : '';
}


/**
 * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
 * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
 * segments:
 *    segment       = *pchar
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
function encodeUriSegment(val) {
  return encodeUriQuery(val, true).
             replace(/%26/gi, '&').
             replace(/%3D/gi, '=').
             replace(/%2B/gi, '+');
}


/**
 * This method is intended for encoding *key* or *value* parts of query component. We need a custom
 * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
 * encoded per http://tools.ietf.org/html/rfc3986:
 *    query         = *( pchar / "/" / "?" )
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
function encodeUriQuery(val, pctEncodeSpaces) {
  return encodeURIComponent(val).
             replace(/%40/gi, '@').
             replace(/%3A/gi, ':').
             replace(/%24/g, '$').
             replace(/%2C/gi, ',').
             replace(/%3B/gi, ';').
             replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
}

var ngAttrPrefixes = ['ng-', 'data-ng-', 'ng:', 'x-ng-'];

function getNgAttribute(element, ngAttr) {
  var attr, i, ii = ngAttrPrefixes.length;
  for (i = 0; i < ii; ++i) {
    attr = ngAttrPrefixes[i] + ngAttr;
    if (isString(attr = element.getAttribute(attr))) {
      return attr;
    }
  }
  return null;
}

function allowAutoBootstrap(document) {
  var script = document.currentScript;

  if (!script) {
    // IE does not have `document.currentScript`
    return true;
  }

  // If the `currentScript` property has been clobbered just return false, since this indicates a probable attack
  if (!(script instanceof window.HTMLScriptElement || script instanceof window.SVGScriptElement)) {
    return false;
  }

  var attributes = script.attributes;
  var srcs = [attributes.getNamedItem('src'), attributes.getNamedItem('href'), attributes.getNamedItem('xlink:href')];

  return srcs.every(function(src) {
    if (!src) {
      return true;
    }
    if (!src.value) {
      return false;
    }

    var link = document.createElement('a');
    link.href = src.value;

    if (document.location.origin === link.origin) {
      // Same-origin resources are always allowed, even for non-whitelisted schemes.
      return true;
    }
    // Disabled bootstrapping unless angular.js was loaded from a known scheme used on the web.
    // This is to prevent angular.js bundled with browser extensions from being used to bypass the
    // content security policy in web pages and other browser extensions.
    switch (link.protocol) {
      case 'http:':
      case 'https:':
      case 'ftp:':
      case 'blob:':
      case 'file:':
      case 'data:':
        return true;
      default:
        return false;
    }
  });
}

// Cached as it has to run during loading so that document.currentScript is available.
var isAutoBootstrapAllowed = allowAutoBootstrap(window.document);

/**
 * @ngdoc directive
 * @name ngApp
 * @module ng
 *
 * @element ANY
 * @param {angular.Module} ngApp an optional application
 *   {@link angular.module module} name to load.
 * @param {boolean=} ngStrictDi if this attribute is present on the app element, the injector will be
 *   created in "strict-di" mode. This means that the application will fail to invoke functions which
 *   do not use explicit function annotation (and are thus unsuitable for minification), as described
 *   in {@link guide/di the Dependency Injection guide}, and useful debugging info will assist in
 *   tracking down the root of these bugs.
 *
 * @description
 *
 * Use this directive to **auto-bootstrap** an AngularJS application. The `ngApp` directive
 * designates the **root element** of the application and is typically placed near the root element
 * of the page - e.g. on the `<body>` or `<html>` tags.
 *
 * There are a few things to keep in mind when using `ngApp`:
 * - only one AngularJS application can be auto-bootstrapped per HTML document. The first `ngApp`
 *   found in the document will be used to define the root element to auto-bootstrap as an
 *   application. To run multiple applications in an HTML document you must manually bootstrap them using
 *   {@link angular.bootstrap} instead.
 * - AngularJS applications cannot be nested within each other.
 * - Do not use a directive that uses {@link ng.$compile#transclusion transclusion} on the same element as `ngApp`.
 *   This includes directives such as {@link ng.ngIf `ngIf`}, {@link ng.ngInclude `ngInclude`} and
 *   {@link ngRoute.ngView `ngView`}.
 *   Doing this misplaces the app {@link ng.$rootElement `$rootElement`} and the app's {@link auto.$injector injector},
 *   causing animations to stop working and making the injector inaccessible from outside the app.
 *
 * You can specify an **AngularJS module** to be used as the root module for the application.  This
 * module will be loaded into the {@link auto.$injector} when the application is bootstrapped. It
 * should contain the application code needed or have dependencies on other modules that will
 * contain the code. See {@link angular.module} for more information.
 *
 * In the example below if the `ngApp` directive were not placed on the `html` element then the
 * document would not be compiled, the `AppController` would not be instantiated and the `{{ a+b }}`
 * would not be resolved to `3`.
 *
 * `ngApp` is the easiest, and most common way to bootstrap an application.
 *
 <example module="ngAppDemo" name="ng-app">
   <file name="index.html">
   <div ng-controller="ngAppDemoController">
     I can add: {{a}} + {{b}} =  {{ a+b }}
   </div>
   </file>
   <file name="script.js">
   angular.module('ngAppDemo', []).controller('ngAppDemoController', function($scope) {
     $scope.a = 1;
     $scope.b = 2;
   });
   </file>
 </example>
 *
 * Using `ngStrictDi`, you would see something like this:
 *
 <example ng-app-included="true" name="strict-di">
   <file name="index.html">
   <div ng-app="ngAppStrictDemo" ng-strict-di>
       <div ng-controller="GoodController1">
           I can add: {{a}} + {{b}} =  {{ a+b }}

           <p>This renders because the controller does not fail to
              instantiate, by using explicit annotation style (see
              script.js for details)
           </p>
       </div>

       <div ng-controller="GoodController2">
           Name: <input ng-model="name"><br />
           Hello, {{name}}!

           <p>This renders because the controller does not fail to
              instantiate, by using explicit annotation style
              (see script.js for details)
           </p>
       </div>

       <div ng-controller="BadController">
           I can add: {{a}} + {{b}} =  {{ a+b }}

           <p>The controller could not be instantiated, due to relying
              on automatic function annotations (which are disabled in
              strict mode). As such, the content of this section is not
              interpolated, and there should be an error in your web console.
           </p>
       </div>
   </div>
   </file>
   <file name="script.js">
   angular.module('ngAppStrictDemo', [])
     // BadController will fail to instantiate, due to relying on automatic function annotation,
     // rather than an explicit annotation
     .controller('BadController', function($scope) {
       $scope.a = 1;
       $scope.b = 2;
     })
     // Unlike BadController, GoodController1 and GoodController2 will not fail to be instantiated,
     // due to using explicit annotations using the array style and $inject property, respectively.
     .controller('GoodController1', ['$scope', function($scope) {
       $scope.a = 1;
       $scope.b = 2;
     }])
     .controller('GoodController2', GoodController2);
     function GoodController2($scope) {
       $scope.name = 'World';
     }
     GoodController2.$inject = ['$scope'];
   </file>
   <file name="style.css">
   div[ng-controller] {
       margin-bottom: 1em;
       -webkit-border-radius: 4px;
       border-radius: 4px;
       border: 1px solid;
       padding: .5em;
   }
   div[ng-controller^=Good] {
       border-color: #d6e9c6;
       background-color: #dff0d8;
       color: #3c763d;
   }
   div[ng-controller^=Bad] {
       border-color: #ebccd1;
       background-color: #f2dede;
       color: #a94442;
       margin-bottom: 0;
   }
   </file>
 </example>
 */
function angularInit(element, bootstrap) {
  var appElement,
      module,
      config = {};

  // The element `element` has priority over any other element.
  forEach(ngAttrPrefixes, function(prefix) {

    var name = prefix + 'app';

    if (!appElement && element.hasAttribute && element.hasAttribute(name)) {
      appElement = element;
      module = element.getAttribute(name);
    }
  });


  forEach(ngAttrPrefixes, function(prefix) {
    var name = prefix + 'app';
    var candidate;

    if (!appElement && (candidate = element.querySelector('[' + name.replace(':', '\\:') + ']'))) {
      appElement = candidate;
      module = candidate.getAttribute(name);
    }
  });

  if (appElement) {
    if (!isAutoBootstrapAllowed) {
      window.console.error('Angular: disabling automatic bootstrap. <script> protocol indicates ' +
          'an extension, document.location.href does not match.');
      return;
    }
    config.strictDi = getNgAttribute(appElement, 'strict-di') !== null;
    bootstrap(appElement, module ? [module] : [], config);
  }
}

/**
 * @ngdoc function
 * @name angular.bootstrap
 * @module ng
 * @description
 * Use this function to manually start up angular application.
 *
 * For more information, see the {@link guide/bootstrap Bootstrap guide}.
 *
 * Angular will detect if it has been loaded into the browser more than once and only allow the
 * first loaded script to be bootstrapped and will report a warning to the browser console for
 * each of the subsequent scripts. This prevents strange results in applications, where otherwise
 * multiple instances of Angular try to work on the DOM.
 *
 * <div class="alert alert-warning">
 * **Note:** Protractor based end-to-end tests cannot use this function to bootstrap manually.
 * They must use {@link ng.directive:ngApp ngApp}.
 * </div>
 *
 * <div class="alert alert-warning">
 * **Note:** Do not bootstrap the app on an element with a directive that uses {@link ng.$compile#transclusion transclusion},
 * such as {@link ng.ngIf `ngIf`}, {@link ng.ngInclude `ngInclude`} and {@link ngRoute.ngView `ngView`}.
 * Doing this misplaces the app {@link ng.$rootElement `$rootElement`} and the app's {@link auto.$injector injector},
 * causing animations to stop working and making the injector inaccessible from outside the app.
 * </div>
 *
 * ```html
 * <!doctype html>
 * <html>
 * <body>
 * <div ng-controller="WelcomeController">
 *   {{greeting}}
 * </div>
 *
 * <script src="angular.js"></script>
 * <script>
 *   var app = angular.module('demo', [])
 *   .controller('WelcomeController', function($scope) {
 *       $scope.greeting = 'Welcome!';
 *   });
 *   angular.bootstrap(document, ['demo']);
 * </script>
 * </body>
 * </html>
 * ```
 *
 * @param {DOMElement} element DOM element which is the root of angular application.
 * @param {Array<String|Function|Array>=} modules an array of modules to load into the application.
 *     Each item in the array should be the name of a predefined module or a (DI annotated)
 *     function that will be invoked by the injector as a `config` block.
 *     See: {@link angular.module modules}
 * @param {Object=} config an object for defining configuration options for the application. The
 *     following keys are supported:
 *
 * * `strictDi` - disable automatic function annotation for the application. This is meant to
 *   assist in finding bugs which break minified code. Defaults to `false`.
 *
 * @returns {auto.$injector} Returns the newly created injector for this app.
 */
function bootstrap(element, modules, config) {
  if (!isObject(config)) config = {};
  var defaultConfig = {
    strictDi: false
  };
  config = extend(defaultConfig, config);
  var doBootstrap = function() {
    element = jqLite(element);

    if (element.injector()) {
      var tag = (element[0] === window.document) ? 'document' : startingTag(element);
      // Encode angle brackets to prevent input from being sanitized to empty string #8683.
      throw ngMinErr(
          'btstrpd',
          'App already bootstrapped with this element \'{0}\'',
          tag.replace(/</,'&lt;').replace(/>/,'&gt;'));
    }

    modules = modules || [];
    modules.unshift(['$provide', function($provide) {
      $provide.value('$rootElement', element);
    }]);

    if (config.debugInfoEnabled) {
      // Pushing so that this overrides `debugInfoEnabled` setting defined in user's `modules`.
      modules.push(['$compileProvider', function($compileProvider) {
        $compileProvider.debugInfoEnabled(true);
      }]);
    }

    modules.unshift('ng');
    var injector = createInjector(modules, config.strictDi);
    injector.invoke(['$rootScope', '$rootElement', '$compile', '$injector',
       function bootstrapApply(scope, element, compile, injector) {
        scope.$apply(function() {
          element.data('$injector', injector);
          compile(element)(scope);
        });
      }]
    );
    return injector;
  };

  var NG_ENABLE_DEBUG_INFO = /^NG_ENABLE_DEBUG_INFO!/;
  var NG_DEFER_BOOTSTRAP = /^NG_DEFER_BOOTSTRAP!/;

  if (window && NG_ENABLE_DEBUG_INFO.test(window.name)) {
    config.debugInfoEnabled = true;
    window.name = window.name.replace(NG_ENABLE_DEBUG_INFO, '');
  }

  if (window && !NG_DEFER_BOOTSTRAP.test(window.name)) {
    return doBootstrap();
  }

  window.name = window.name.replace(NG_DEFER_BOOTSTRAP, '');
  angular.resumeBootstrap = function(extraModules) {
    forEach(extraModules, function(module) {
      modules.push(module);
    });
    return doBootstrap();
  };

  if (isFunction(angular.resumeDeferredBootstrap)) {
    angular.resumeDeferredBootstrap();
  }
}

/**
 * @ngdoc function
 * @name angular.reloadWithDebugInfo
 * @module ng
 * @description
 * Use this function to reload the current application with debug information turned on.
 * This takes precedence over a call to `$compileProvider.debugInfoEnabled(false)`.
 *
 * See {@link ng.$compileProvider#debugInfoEnabled} for more.
 */
function reloadWithDebugInfo() {
  window.name = 'NG_ENABLE_DEBUG_INFO!' + window.name;
  window.location.reload();
}

/**
 * @name angular.getTestability
 * @module ng
 * @description
 * Get the testability service for the instance of Angular on the given
 * element.
 * @param {DOMElement} element DOM element which is the root of angular application.
 */
function getTestability(rootElement) {
  var injector = angular.element(rootElement).injector();
  if (!injector) {
    throw ngMinErr('test',
      'no injector found for element argument to getTestability');
  }
  return injector.get('$$testability');
}

var SNAKE_CASE_REGEXP = /[A-Z]/g;
function snake_case(name, separator) {
  separator = separator || '_';
  return name.replace(SNAKE_CASE_REGEXP, function(letter, pos) {
    return (pos ? separator : '') + letter.toLowerCase();
  });
}

var bindJQueryFired = false;
function bindJQuery() {
  var originalCleanData;

  if (bindJQueryFired) {
    return;
  }

  // bind to jQuery if present;
  var jqName = jq();
  jQuery = isUndefined(jqName) ? window.jQuery :   // use jQuery (if present)
           !jqName             ? undefined     :   // use jqLite
                                 window[jqName];   // use jQuery specified by `ngJq`

  // Use jQuery if it exists with proper functionality, otherwise default to us.
  // Angular 1.2+ requires jQuery 1.7+ for on()/off() support.
  // Angular 1.3+ technically requires at least jQuery 2.1+ but it may work with older
  // versions. It will not work for sure with jQuery <1.7, though.
  if (jQuery && jQuery.fn.on) {
    jqLite = jQuery;
    extend(jQuery.fn, {
      scope: JQLitePrototype.scope,
      isolateScope: JQLitePrototype.isolateScope,
      controller: /** @type {?} */ (JQLitePrototype).controller,
      injector: JQLitePrototype.injector,
      inheritedData: JQLitePrototype.inheritedData
    });

    // All nodes removed from the DOM via various jQuery APIs like .remove()
    // are passed through jQuery.cleanData. Monkey-patch this method to fire
    // the $destroy event on all removed nodes.
    originalCleanData = jQuery.cleanData;
    jQuery.cleanData = function(elems) {
      var events;
      for (var i = 0, elem; (elem = elems[i]) != null; i++) {
        events = jQuery._data(elem, 'events');
        if (events && events.$destroy) {
          jQuery(elem).triggerHandler('$destroy');
        }
      }
      originalCleanData(elems);
    };
  } else {
    jqLite = JQLite;
  }

  angular.element = jqLite;

  // Prevent double-proxying.
  bindJQueryFired = true;
}

/**
 * throw error if the argument is falsy.
 */
function assertArg(arg, name, reason) {
  if (!arg) {
    throw ngMinErr('areq', 'Argument \'{0}\' is {1}', (name || '?'), (reason || 'required'));
  }
  return arg;
}

function assertArgFn(arg, name, acceptArrayAnnotation) {
  if (acceptArrayAnnotation && isArray(arg)) {
      arg = arg[arg.length - 1];
  }

  assertArg(isFunction(arg), name, 'not a function, got ' +
      (arg && typeof arg === 'object' ? arg.constructor.name || 'Object' : typeof arg));
  return arg;
}

/**
 * throw error if the name given is hasOwnProperty
 * @param  {String} name    the name to test
 * @param  {String} context the context in which the name is used, such as module or directive
 */
function assertNotHasOwnProperty(name, context) {
  if (name === 'hasOwnProperty') {
    throw ngMinErr('badname', 'hasOwnProperty is not a valid {0} name', context);
  }
}

/**
 * Return the value accessible from the object by path. Any undefined traversals are ignored
 * @param {Object} obj starting object
 * @param {String} path path to traverse
 * @param {boolean} [bindFnToScope=true]
 * @returns {Object} value as accessible by path
 */
//TODO(misko): this function needs to be removed
function getter(obj, path, bindFnToScope) {
  if (!path) return obj;
  var keys = path.split('.');
  var key;
  var lastInstance = obj;
  var len = keys.length;

  for (var i = 0; i < len; i++) {
    key = keys[i];
    if (obj) {
      obj = (lastInstance = obj)[key];
    }
  }
  if (!bindFnToScope && isFunction(obj)) {
    return bind(lastInstance, obj);
  }
  return obj;
}

/**
 * Return the DOM siblings between the first and last node in the given array.
 * @param {Array} array like object
 * @returns {Array} the inputted object or a jqLite collection containing the nodes
 */
function getBlockNodes(nodes) {
  // TODO(perf): update `nodes` instead of creating a new object?
  var node = nodes[0];
  var endNode = nodes[nodes.length - 1];
  var blockNodes;

  for (var i = 1; node !== endNode && (node = node.nextSibling); i++) {
    if (blockNodes || nodes[i] !== node) {
      if (!blockNodes) {
        blockNodes = jqLite(slice.call(nodes, 0, i));
      }
      blockNodes.push(node);
    }
  }

  return blockNodes || nodes;
}


/**
 * Creates a new object without a prototype. This object is useful for lookup without having to
 * guard against prototypically inherited properties via hasOwnProperty.
 *
 * Related micro-benchmarks:
 * - http://jsperf.com/object-create2
 * - http://jsperf.com/proto-map-lookup/2
 * - http://jsperf.com/for-in-vs-object-keys2
 *
 * @returns {Object}
 */
function createMap() {
  return Object.create(null);
}

function stringify(value) {
  if (value == null) { // null || undefined
    return '';
  }
  switch (typeof value) {
    case 'string':
      break;
    case 'number':
      value = '' + value;
      break;
    default:
      if (hasCustomToString(value) && !isArray(value) && !isDate(value)) {
        value = value.toString();
      } else {
        value = toJson(value);
      }
  }

  return value;
}

var NODE_TYPE_ELEMENT = 1;
var NODE_TYPE_ATTRIBUTE = 2;
var NODE_TYPE_TEXT = 3;
var NODE_TYPE_COMMENT = 8;
var NODE_TYPE_DOCUMENT = 9;
var NODE_TYPE_DOCUMENT_FRAGMENT = 11;

/**
 * @ngdoc type
 * @name angular.Module
 * @module ng
 * @description
 *
 * Interface for configuring angular {@link angular.module modules}.
 */

function setupModuleLoader(window) {

  var $injectorMinErr = minErr('$injector');
  var ngMinErr = minErr('ng');

  function ensure(obj, name, factory) {
    return obj[name] || (obj[name] = factory());
  }

  var angular = ensure(window, 'angular', Object);

  // We need to expose `angular.$$minErr` to modules such as `ngResource` that reference it during bootstrap
  angular.$$minErr = angular.$$minErr || minErr;

  return ensure(angular, 'module', function() {
    /** @type {Object.<string, angular.Module>} */
    var modules = {};

    return function module(name, requires, configFn) {

      var info = {};

      var assertNotHasOwnProperty = function(name, context) {
        if (name === 'hasOwnProperty') {
          throw ngMinErr('badname', 'hasOwnProperty is not a valid {0} name', context);
        }
      };

      assertNotHasOwnProperty(name, 'module');
      if (requires && modules.hasOwnProperty(name)) {
        modules[name] = null;
      }
      return ensure(modules, name, function() {
        if (!requires) {
          throw $injectorMinErr('nomod', 'Module \'{0}\' is not available! You either misspelled ' +
             'the module name or forgot to load it. If registering a module ensure that you ' +
             'specify the dependencies as the second argument.', name);
        }

        /** @type {!Array.<Array.<*>>} */
        var invokeQueue = [];

        /** @type {!Array.<Function>} */
        var configBlocks = [];

        /** @type {!Array.<Function>} */
        var runBlocks = [];

        var config = invokeLater('$injector', 'invoke', 'push', configBlocks);

        /** @type {angular.Module} */
        var moduleInstance = {
          // Private state
          _invokeQueue: invokeQueue,
          _configBlocks: configBlocks,
          _runBlocks: runBlocks,

          info: function(value) {
            if (isDefined(value)) {
              if (!isObject(value)) throw ngMinErr('aobj', 'Argument \'{0}\' must be an object', 'value');
              info = value;
              return this;
            }
            return info;
          },

          requires: requires,

          name: name,

          provider: invokeLaterAndSetModuleName('$provide', 'provider'),

          factory: invokeLaterAndSetModuleName('$provide', 'factory'),

          service: invokeLaterAndSetModuleName('$provide', 'service'),

          value: invokeLater('$provide', 'value'),

          constant: invokeLater('$provide', 'constant', 'unshift'),

          decorator: invokeLaterAndSetModuleName('$provide', 'decorator', configBlocks),

          animation: invokeLaterAndSetModuleName('$animateProvider', 'register'),

          filter: invokeLaterAndSetModuleName('$filterProvider', 'register'),

          controller: invokeLaterAndSetModuleName('$controllerProvider', 'register'),

          directive: invokeLaterAndSetModuleName('$compileProvider', 'directive'),

          component: invokeLaterAndSetModuleName('$compileProvider', 'component'),

          config: config,

          run: function(block) {
            runBlocks.push(block);
            return this;
          }
        };

        if (configFn) {
          config(configFn);
        }

        return moduleInstance;

        function invokeLater(provider, method, insertMethod, queue) {
          if (!queue) queue = invokeQueue;
          return function() {
            queue[insertMethod || 'push']([provider, method, arguments]);
            return moduleInstance;
          };
        }

        function invokeLaterAndSetModuleName(provider, method, queue) {
          if (!queue) queue = invokeQueue;
          return function(recipeName, factoryFunction) {
            if (factoryFunction && isFunction(factoryFunction)) factoryFunction.$$moduleName = name;
            queue.push([provider, method, arguments]);
            return moduleInstance;
          };
        }
      });
    };
  });

}

function shallowCopy(src, dst) {
  if (isArray(src)) {
    dst = dst || [];

    for (var i = 0, ii = src.length; i < ii; i++) {
      dst[i] = src[i];
    }
  } else if (isObject(src)) {
    dst = dst || {};

    for (var key in src) {
      if (!(key.charAt(0) === '$' && key.charAt(1) === '$')) {
        dst[key] = src[key];
      }
    }
  }

  return dst || src;
}

/* global toDebugString: true */

function serializeObject(obj, maxDepth) {
  var seen = [];

  // There is no direct way to stringify object until reaching a specific depth
  // and a very deep object can cause a performance issue, so we copy the object
  // based on this specific depth and then stringify it.
  if (isValidObjectMaxDepth(maxDepth)) {
    obj = copy(obj, null, maxDepth);
  }
  return JSON.stringify(obj, function(key, val) {
    val = toJsonReplacer(key, val);
    if (isObject(val)) {

      if (seen.indexOf(val) >= 0) return '...';

      seen.push(val);
    }
    return val;
  });
}

function toDebugString(obj, maxDepth) {
  if (typeof obj === 'function') {
    return obj.toString().replace(/ \{[\s\S]*$/, '');
  } else if (isUndefined(obj)) {
    return 'undefined';
  } else if (typeof obj !== 'string') {
    return serializeObject(obj, maxDepth);
  }
  return obj;
}

var version = {
  // These placeholder strings will be replaced by grunt's `build` task.
  // They need to be double- or single-quoted.
  full: '1.6.4',
  major: 1,
  minor: 6,
  dot: 4,
  codeName: 'phenomenal-footnote'
};


function publishExternalAPI(angular) {
  extend(angular, {
    'errorHandlingConfig': errorHandlingConfig,
    'bootstrap': bootstrap,
    'copy': copy,
    'extend': extend,
    'merge': merge,
    'equals': equals,
    'element': jqLite,
    'forEach': forEach,
    'injector': createInjector,
    'noop': noop,
    'bind': bind,
    'toJson': toJson,
    'fromJson': fromJson,
    'identity': identity,
    'isUndefined': isUndefined,
    'isDefined': isDefined,
    'isString': isString,
    'isFunction': isFunction,
    'isObject': isObject,
    'isNumber': isNumber,
    'isElement': isElement,
    'isArray': isArray,
    'version': version,
    'isDate': isDate,
    'lowercase': lowercase,
    'uppercase': uppercase,
    'callbacks': {$$counter: 0},
    'getTestability': getTestability,
    'reloadWithDebugInfo': reloadWithDebugInfo,
    '$$minErr': minErr,
    '$$csp': csp,
    '$$encodeUriSegment': encodeUriSegment,
    '$$encodeUriQuery': encodeUriQuery,
    '$$stringify': stringify
  });

  angularModule = setupModuleLoader(window);

  angularModule('ng', ['ngLocale'], ['$provide',
    function ngModule($provide) {
      // $$sanitizeUriProvider needs to be before $compileProvider as it is used by it.
      $provide.provider({
        $$sanitizeUri: $$SanitizeUriProvider
      });
      $provide.provider('$compile', $CompileProvider).
        directive({
            a: htmlAnchorDirective,
            input: inputDirective,
            textarea: inputDirective,
            form: formDirective,
            script: scriptDirective,
            select: selectDirective,
            option: optionDirective,
            ngBind: ngBindDirective,
            ngBindHtml: ngBindHtmlDirective,
            ngBindTemplate: ngBindTemplateDirective,
            ngClass: ngClassDirective,
            ngClassEven: ngClassEvenDirective,
            ngClassOdd: ngClassOddDirective,
            ngCloak: ngCloakDirective,
            ngController: ngControllerDirective,
            ngForm: ngFormDirective,
            ngHide: ngHideDirective,
            ngIf: ngIfDirective,
            ngInclude: ngIncludeDirective,
            ngInit: ngInitDirective,
            ngNonBindable: ngNonBindableDirective,
            ngPluralize: ngPluralizeDirective,
            ngRepeat: ngRepeatDirective,
            ngShow: ngShowDirective,
            ngStyle: ngStyleDirective,
            ngSwitch: ngSwitchDirective,
            ngSwitchWhen: ngSwitchWhenDirective,
            ngSwitchDefault: ngSwitchDefaultDirective,
            ngOptions: ngOptionsDirective,
            ngTransclude: ngTranscludeDirective,
            ngModel: ngModelDirective,
            ngList: ngListDirective,
            ngChange: ngChangeDirective,
            pattern: patternDirective,
            ngPattern: patternDirective,
            required: requiredDirective,
            ngRequired: requiredDirective,
            minlength: minlengthDirective,
            ngMinlength: minlengthDirective,
            maxlength: maxlengthDirective,
            ngMaxlength: maxlengthDirective,
            ngValue: ngValueDirective,
            ngModelOptions: ngModelOptionsDirective
        }).
        directive({
          ngInclude: ngIncludeFillContentDirective
        }).
        directive(ngAttributeAliasDirectives).
        directive(ngEventDirectives);
      $provide.provider({
        $anchorScroll: $AnchorScrollProvider,
        $animate: $AnimateProvider,
        $animateCss: $CoreAnimateCssProvider,
        $$animateJs: $$CoreAnimateJsProvider,
        $$animateQueue: $$CoreAnimateQueueProvider,
        $$AnimateRunner: $$AnimateRunnerFactoryProvider,
        $$animateAsyncRun: $$AnimateAsyncRunFactoryProvider,
        $browser: $BrowserProvider,
        $cacheFactory: $CacheFactoryProvider,
        $controller: $ControllerProvider,
        $document: $DocumentProvider,
        $$isDocumentHidden: $$IsDocumentHiddenProvider,
        $exceptionHandler: $ExceptionHandlerProvider,
        $filter: $FilterProvider,
        $$forceReflow: $$ForceReflowProvider,
        $interpolate: $InterpolateProvider,
        $interval: $IntervalProvider,
        $http: $HttpProvider,
        $httpParamSerializer: $HttpParamSerializerProvider,
        $httpParamSerializerJQLike: $HttpParamSerializerJQLikeProvider,
        $httpBackend: $HttpBackendProvider,
        $xhrFactory: $xhrFactoryProvider,
        $jsonpCallbacks: $jsonpCallbacksProvider,
        $location: $LocationProvider,
        $log: $LogProvider,
        $parse: $ParseProvider,
        $rootScope: $RootScopeProvider,
        $q: $QProvider,
        $$q: $$QProvider,
        $sce: $SceProvider,
        $sceDelegate: $SceDelegateProvider,
        $sniffer: $SnifferProvider,
        $templateCache: $TemplateCacheProvider,
        $templateRequest: $TemplateRequestProvider,
        $$testability: $$TestabilityProvider,
        $timeout: $TimeoutProvider,
        $window: $WindowProvider,
        $$rAF: $$RAFProvider,
        $$jqLite: $$jqLiteProvider,
        $$Map: $$MapProvider,
        $$cookieReader: $$CookieReaderProvider
      });
    }
  ])
  .info({ angularVersion: '1.6.4' });
}

JQLite.expando = 'ng339';

var jqCache = JQLite.cache = {},
    jqId = 1;

/*
 * !!! This is an undocumented "private" function !!!
 */
JQLite._data = function(node) {
  //jQuery always returns an object on cache miss
  return this.cache[node[this.expando]] || {};
};

function jqNextId() { return ++jqId; }


var DASH_LOWERCASE_REGEXP = /-([a-z])/g;
var MS_HACK_REGEXP = /^-ms-/;
var MOUSE_EVENT_MAP = { mouseleave: 'mouseout', mouseenter: 'mouseover' };
var jqLiteMinErr = minErr('jqLite');

function cssKebabToCamel(name) {
    return kebabToCamel(name.replace(MS_HACK_REGEXP, 'ms-'));
}

function fnCamelCaseReplace(all, letter) {
  return letter.toUpperCase();
}

function kebabToCamel(name) {
  return name
    .replace(DASH_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

var SINGLE_TAG_REGEXP = /^<([\w-]+)\s*\/?>(?:<\/\1>|)$/;
var HTML_REGEXP = /<|&#?\w+;/;
var TAG_NAME_REGEXP = /<([\w:-]+)/;
var XHTML_TAG_REGEXP = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi;

var wrapMap = {
  'option': [1, '<select multiple="multiple">', '</select>'],

  'thead': [1, '<table>', '</table>'],
  'col': [2, '<table><colgroup>', '</colgroup></table>'],
  'tr': [2, '<table><tbody>', '</tbody></table>'],
  'td': [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  '_default': [0, '', '']
};

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function jqLiteIsTextNode(html) {
  return !HTML_REGEXP.test(html);
}

function jqLiteAcceptsData(node) {
  // The window object can accept data but has no nodeType
  // Otherwise we are only interested in elements (1) and documents (9)
  var nodeType = node.nodeType;
  return nodeType === NODE_TYPE_ELEMENT || !nodeType || nodeType === NODE_TYPE_DOCUMENT;
}

function jqLiteHasData(node) {
  for (var key in jqCache[node.ng339]) {
    return true;
  }
  return false;
}

function jqLiteBuildFragment(html, context) {
  var tmp, tag, wrap,
      fragment = context.createDocumentFragment(),
      nodes = [], i;

  if (jqLiteIsTextNode(html)) {
    // Convert non-html into a text node
    nodes.push(context.createTextNode(html));
  } else {
    // Convert html into DOM nodes
    tmp = fragment.appendChild(context.createElement('div'));
    tag = (TAG_NAME_REGEXP.exec(html) || ['', ''])[1].toLowerCase();
    wrap = wrapMap[tag] || wrapMap._default;
    tmp.innerHTML = wrap[1] + html.replace(XHTML_TAG_REGEXP, '<$1></$2>') + wrap[2];

    // Descend through wrappers to the right content
    i = wrap[0];
    while (i--) {
      tmp = tmp.lastChild;
    }

    nodes = concat(nodes, tmp.childNodes);

    tmp = fragment.firstChild;
    tmp.textContent = '';
  }

  // Remove wrapper from fragment
  fragment.textContent = '';
  fragment.innerHTML = ''; // Clear inner HTML
  forEach(nodes, function(node) {
    fragment.appendChild(node);
  });

  return fragment;
}

function jqLiteParseHTML(html, context) {
  context = context || window.document;
  var parsed;

  if ((parsed = SINGLE_TAG_REGEXP.exec(html))) {
    return [context.createElement(parsed[1])];
  }

  if ((parsed = jqLiteBuildFragment(html, context))) {
    return parsed.childNodes;
  }

  return [];
}

function jqLiteWrapNode(node, wrapper) {
  var parent = node.parentNode;

  if (parent) {
    parent.replaceChild(wrapper, node);
  }

  wrapper.appendChild(node);
}


// IE9-11 has no method "contains" in SVG element and in Node.prototype. Bug #10259.
var jqLiteContains = window.Node.prototype.contains || /** @this */ function(arg) {
  // eslint-disable-next-line no-bitwise
  return !!(this.compareDocumentPosition(arg) & 16);
};

/////////////////////////////////////////////
function JQLite(element) {
  if (element instanceof JQLite) {
    return element;
  }

  var argIsString;

  if (isString(element)) {
    element = trim(element);
    argIsString = true;
  }
  if (!(this instanceof JQLite)) {
    if (argIsString && element.charAt(0) !== '<') {
      throw jqLiteMinErr('nosel', 'Looking up elements via selectors is not supported by jqLite! See: http://docs.angularjs.org/api/angular.element');
    }
    return new JQLite(element);
  }

  if (argIsString) {
    jqLiteAddNodes(this, jqLiteParseHTML(element));
  } else if (isFunction(element)) {

    jqLiteReady(element);
  } else {
    jqLiteAddNodes(this, element);
  }
}

function jqLiteClone(element) {
  return element.cloneNode(true);
}

function jqLiteDealoc(element, onlyDescendants) {
  if (!onlyDescendants && jqLiteAcceptsData(element)) jqLite.cleanData([element]);

  if (element.querySelectorAll) {
    jqLite.cleanData(element.querySelectorAll('*'));
  }
}

function jqLiteOff(element, type, fn, unsupported) {
  if (isDefined(unsupported)) throw jqLiteMinErr('offargs', 'jqLite#off() does not support the `selector` argument');

  var expandoStore = jqLiteExpandoStore(element);
  var events = expandoStore && expandoStore.events;
  var handle = expandoStore && expandoStore.handle;

  if (!handle) return; //no listeners registered

  if (!type) {
    for (type in events) {
      if (type !== '$destroy') {
        element.removeEventListener(type, handle);
      }
      delete events[type];
    }
  } else {

    var removeHandler = function(type) {
      var listenerFns = events[type];
      if (isDefined(fn)) {
        arrayRemove(listenerFns || [], fn);
      }
      if (!(isDefined(fn) && listenerFns && listenerFns.length > 0)) {
        element.removeEventListener(type, handle);
        delete events[type];
      }
    };

    forEach(type.split(' '), function(type) {
      removeHandler(type);
      if (MOUSE_EVENT_MAP[type]) {
        removeHandler(MOUSE_EVENT_MAP[type]);
      }
    });
  }
}

function jqLiteRemoveData(element, name) {
  var expandoId = element.ng339;
  var expandoStore = expandoId && jqCache[expandoId];

  if (expandoStore) {
    if (name) {
      delete expandoStore.data[name];
      return;
    }

    if (expandoStore.handle) {
      if (expandoStore.events.$destroy) {
        expandoStore.handle({}, '$destroy');
      }
      jqLiteOff(element);
    }
    delete jqCache[expandoId];
    element.ng339 = undefined; // don't delete DOM expandos. IE and Chrome don't like it
  }
}


function jqLiteExpandoStore(element, createIfNecessary) {
  var expandoId = element.ng339,
      expandoStore = expandoId && jqCache[expandoId];

  if (createIfNecessary && !expandoStore) {
    element.ng339 = expandoId = jqNextId();
    expandoStore = jqCache[expandoId] = {events: {}, data: {}, handle: undefined};
  }

  return expandoStore;
}


function jqLiteData(element, key, value) {
  if (jqLiteAcceptsData(element)) {
    var prop;

    var isSimpleSetter = isDefined(value);
    var isSimpleGetter = !isSimpleSetter && key && !isObject(key);
    var massGetter = !key;
    var expandoStore = jqLiteExpandoStore(element, !isSimpleGetter);
    var data = expandoStore && expandoStore.data;

    if (isSimpleSetter) { // data('key', value)
      data[kebabToCamel(key)] = value;
    } else {
      if (massGetter) {  // data()
        return data;
      } else {
        if (isSimpleGetter) { // data('key')
          // don't force creation of expandoStore if it doesn't exist yet
          return data && data[kebabToCamel(key)];
        } else { // mass-setter: data({key1: val1, key2: val2})
          for (prop in key) {
            data[kebabToCamel(prop)] = key[prop];
          }
        }
      }
    }
  }
}

function jqLiteHasClass(element, selector) {
  if (!element.getAttribute) return false;
  return ((' ' + (element.getAttribute('class') || '') + ' ').replace(/[\n\t]/g, ' ').
      indexOf(' ' + selector + ' ') > -1);
}

function jqLiteRemoveClass(element, cssClasses) {
  if (cssClasses && element.setAttribute) {
    forEach(cssClasses.split(' '), function(cssClass) {
      element.setAttribute('class', trim(
          (' ' + (element.getAttribute('class') || '') + ' ')
          .replace(/[\n\t]/g, ' ')
          .replace(' ' + trim(cssClass) + ' ', ' '))
      );
    });
  }
}

function jqLiteAddClass(element, cssClasses) {
  if (cssClasses && element.setAttribute) {
    var existingClasses = (' ' + (element.getAttribute('class') || '') + ' ')
                            .replace(/[\n\t]/g, ' ');

    forEach(cssClasses.split(' '), function(cssClass) {
      cssClass = trim(cssClass);
      if (existingClasses.indexOf(' ' + cssClass + ' ') === -1) {
        existingClasses += cssClass + ' ';
      }
    });

    element.setAttribute('class', trim(existingClasses));
  }
}


function jqLiteAddNodes(root, elements) {
  // THIS CODE IS VERY HOT. Don't make changes without benchmarking.

  if (elements) {

    // if a Node (the most common case)
    if (elements.nodeType) {
      root[root.length++] = elements;
    } else {
      var length = elements.length;

      // if an Array or NodeList and not a Window
      if (typeof length === 'number' && elements.window !== elements) {
        if (length) {
          for (var i = 0; i < length; i++) {
            root[root.length++] = elements[i];
          }
        }
      } else {
        root[root.length++] = elements;
      }
    }
  }
}


function jqLiteController(element, name) {
  return jqLiteInheritedData(element, '$' + (name || 'ngController') + 'Controller');
}

function jqLiteInheritedData(element, name, value) {
  // if element is the document object work with the html element instead
  // this makes $(document).scope() possible
  if (element.nodeType === NODE_TYPE_DOCUMENT) {
    element = element.documentElement;
  }
  var names = isArray(name) ? name : [name];

  while (element) {
    for (var i = 0, ii = names.length; i < ii; i++) {
      if (isDefined(value = jqLite.data(element, names[i]))) return value;
    }

    // If dealing with a document fragment node with a host element, and no parent, use the host
    // element as the parent. This enables directives within a Shadow DOM or polyfilled Shadow DOM
    // to lookup parent controllers.
    element = element.parentNode || (element.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT && element.host);
  }
}

function jqLiteEmpty(element) {
  jqLiteDealoc(element, true);
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function jqLiteRemove(element, keepData) {
  if (!keepData) jqLiteDealoc(element);
  var parent = element.parentNode;
  if (parent) parent.removeChild(element);
}


function jqLiteDocumentLoaded(action, win) {
  win = win || window;
  if (win.document.readyState === 'complete') {
    // Force the action to be run async for consistent behavior
    // from the action's point of view
    // i.e. it will definitely not be in a $apply
    win.setTimeout(action);
  } else {
    // No need to unbind this handler as load is only ever called once
    jqLite(win).on('load', action);
  }
}

function jqLiteReady(fn) {
  function trigger() {
    window.document.removeEventListener('DOMContentLoaded', trigger);
    window.removeEventListener('load', trigger);
    fn();
  }

  // check if document is already loaded
  if (window.document.readyState === 'complete') {
    window.setTimeout(fn);
  } else {
    // We can not use jqLite since we are not done loading and jQuery could be loaded later.

    // Works for modern browsers and IE9
    window.document.addEventListener('DOMContentLoaded', trigger);

    // Fallback to window.onload for others
    window.addEventListener('load', trigger);
  }
}

//////////////////////////////////////////
// Functions which are declared directly.
//////////////////////////////////////////
var JQLitePrototype = JQLite.prototype = {
  ready: jqLiteReady,
  toString: function() {
    var value = [];
    forEach(this, function(e) { value.push('' + e);});
    return '[' + value.join(', ') + ']';
  },

  eq: function(index) {
      return (index >= 0) ? jqLite(this[index]) : jqLite(this[this.length + index]);
  },

  length: 0,
  push: push,
  sort: [].sort,
  splice: [].splice
};

//////////////////////////////////////////
// Functions iterating getter/setters.
// these functions return self on setter and
// value on get.
//////////////////////////////////////////
var BOOLEAN_ATTR = {};
forEach('multiple,selected,checked,disabled,readOnly,required,open'.split(','), function(value) {
  BOOLEAN_ATTR[lowercase(value)] = value;
});
var BOOLEAN_ELEMENTS = {};
forEach('input,select,option,textarea,button,form,details'.split(','), function(value) {
  BOOLEAN_ELEMENTS[value] = true;
});
var ALIASED_ATTR = {
  'ngMinlength': 'minlength',
  'ngMaxlength': 'maxlength',
  'ngMin': 'min',
  'ngMax': 'max',
  'ngPattern': 'pattern',
  'ngStep': 'step'
};

function getBooleanAttrName(element, name) {
  // check dom last since we will most likely fail on name
  var booleanAttr = BOOLEAN_ATTR[name.toLowerCase()];

  // booleanAttr is here twice to minimize DOM access
  return booleanAttr && BOOLEAN_ELEMENTS[nodeName_(element)] && booleanAttr;
}

function getAliasedAttrName(name) {
  return ALIASED_ATTR[name];
}

forEach({
  data: jqLiteData,
  removeData: jqLiteRemoveData,
  hasData: jqLiteHasData,
  cleanData: function jqLiteCleanData(nodes) {
    for (var i = 0, ii = nodes.length; i < ii; i++) {
      jqLiteRemoveData(nodes[i]);
    }
  }
}, function(fn, name) {
  JQLite[name] = fn;
});

forEach({
  data: jqLiteData,
  inheritedData: jqLiteInheritedData,

  scope: function(element) {
    // Can't use jqLiteData here directly so we stay compatible with jQuery!
    return jqLite.data(element, '$scope') || jqLiteInheritedData(element.parentNode || element, ['$isolateScope', '$scope']);
  },

  isolateScope: function(element) {
    // Can't use jqLiteData here directly so we stay compatible with jQuery!
    return jqLite.data(element, '$isolateScope') || jqLite.data(element, '$isolateScopeNoTemplate');
  },

  controller: jqLiteController,

  injector: function(element) {
    return jqLiteInheritedData(element, '$injector');
  },

  removeAttr: function(element, name) {
    element.removeAttribute(name);
  },

  hasClass: jqLiteHasClass,

  css: function(element, name, value) {
    name = cssKebabToCamel(name);

    if (isDefined(value)) {
      element.style[name] = value;
    } else {
      return element.style[name];
    }
  },

  attr: function(element, name, value) {
    var ret;
    var nodeType = element.nodeType;
    if (nodeType === NODE_TYPE_TEXT || nodeType === NODE_TYPE_ATTRIBUTE || nodeType === NODE_TYPE_COMMENT ||
      !element.getAttribute) {
      return;
    }

    var lowercasedName = lowercase(name);
    var isBooleanAttr = BOOLEAN_ATTR[lowercasedName];

    if (isDefined(value)) {
      // setter

      if (value === null || (value === false && isBooleanAttr)) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, isBooleanAttr ? lowercasedName : value);
      }
    } else {
      // getter

      ret = element.getAttribute(name);

      if (isBooleanAttr && ret !== null) {
        ret = lowercasedName;
      }
      // Normalize non-existing attributes to undefined (as jQuery).
      return ret === null ? undefined : ret;
    }
  },

  prop: function(element, name, value) {
    if (isDefined(value)) {
      element[name] = value;
    } else {
      return element[name];
    }
  },

  text: (function() {
    getText.$dv = '';
    return getText;

    function getText(element, value) {
      if (isUndefined(value)) {
        var nodeType = element.nodeType;
        return (nodeType === NODE_TYPE_ELEMENT || nodeType === NODE_TYPE_TEXT) ? element.textContent : '';
      }
      element.textContent = value;
    }
  })(),

  val: function(element, value) {
    if (isUndefined(value)) {
      if (element.multiple && nodeName_(element) === 'select') {
        var result = [];
        forEach(element.options, function(option) {
          if (option.selected) {
            result.push(option.value || option.text);
          }
        });
        return result;
      }
      return element.value;
    }
    element.value = value;
  },

  html: function(element, value) {
    if (isUndefined(value)) {
      return element.innerHTML;
    }
    jqLiteDealoc(element, true);
    element.innerHTML = value;
  },

  empty: jqLiteEmpty
}, function(fn, name) {
  /**
   * Properties: writes return selection, reads return first value
   */
  JQLite.prototype[name] = function(arg1, arg2) {
    var i, key;
    var nodeCount = this.length;

    // jqLiteHasClass has only two arguments, but is a getter-only fn, so we need to special-case it
    // in a way that survives minification.
    // jqLiteEmpty takes no arguments but is a setter.
    if (fn !== jqLiteEmpty &&
        (isUndefined((fn.length === 2 && (fn !== jqLiteHasClass && fn !== jqLiteController)) ? arg1 : arg2))) {
      if (isObject(arg1)) {

        // we are a write, but the object properties are the key/values
        for (i = 0; i < nodeCount; i++) {
          if (fn === jqLiteData) {
            // data() takes the whole object in jQuery
            fn(this[i], arg1);
          } else {
            for (key in arg1) {
              fn(this[i], key, arg1[key]);
            }
          }
        }
        // return self for chaining
        return this;
      } else {
        // we are a read, so read the first child.
        // TODO: do we still need this?
        var value = fn.$dv;
        // Only if we have $dv do we iterate over all, otherwise it is just the first element.
        var jj = (isUndefined(value)) ? Math.min(nodeCount, 1) : nodeCount;
        for (var j = 0; j < jj; j++) {
          var nodeValue = fn(this[j], arg1, arg2);
          value = value ? value + nodeValue : nodeValue;
        }
        return value;
      }
    } else {
      // we are a write, so apply to all children
      for (i = 0; i < nodeCount; i++) {
        fn(this[i], arg1, arg2);
      }
      // return self for chaining
      return this;
    }
  };
});

function createEventHandler(element, events) {
  var eventHandler = function(event, type) {
    // jQuery specific api
    event.isDefaultPrevented = function() {
      return event.defaultPrevented;
    };

    var eventFns = events[type || event.type];
    var eventFnsLength = eventFns ? eventFns.length : 0;

    if (!eventFnsLength) return;

    if (isUndefined(event.immediatePropagationStopped)) {
      var originalStopImmediatePropagation = event.stopImmediatePropagation;
      event.stopImmediatePropagation = function() {
        event.immediatePropagationStopped = true;

        if (event.stopPropagation) {
          event.stopPropagation();
        }

        if (originalStopImmediatePropagation) {
          originalStopImmediatePropagation.call(event);
        }
      };
    }

    event.isImmediatePropagationStopped = function() {
      return event.immediatePropagationStopped === true;
    };

    // Some events have special handlers that wrap the real handler
    var handlerWrapper = eventFns.specialHandlerWrapper || defaultHandlerWrapper;

    // Copy event handlers in case event handlers array is modified during execution.
    if ((eventFnsLength > 1)) {
      eventFns = shallowCopy(eventFns);
    }

    for (var i = 0; i < eventFnsLength; i++) {
      if (!event.isImmediatePropagationStopped()) {
        handlerWrapper(element, event, eventFns[i]);
      }
    }
  };

  // TODO: this is a hack for angularMocks/clearDataCache that makes it possible to deregister all
  //       events on `element`
  eventHandler.elem = element;
  return eventHandler;
}

function defaultHandlerWrapper(element, event, handler) {
  handler.call(element, event);
}

function specialMouseHandlerWrapper(target, event, handler) {
  // Refer to jQuery's implementation of mouseenter & mouseleave
  // Read about mouseenter and mouseleave:
  // http://www.quirksmode.org/js/events_mouse.html#link8
  var related = event.relatedTarget;
  // For mousenter/leave call the handler if related is outside the target.
  // NB: No relatedTarget if the mouse left/entered the browser window
  if (!related || (related !== target && !jqLiteContains.call(target, related))) {
    handler.call(target, event);
  }
}

//////////////////////////////////////////
// Functions iterating traversal.
// These functions chain results into a single
// selector.
//////////////////////////////////////////
forEach({
  removeData: jqLiteRemoveData,

  on: function jqLiteOn(element, type, fn, unsupported) {
    if (isDefined(unsupported)) throw jqLiteMinErr('onargs', 'jqLite#on() does not support the `selector` or `eventData` parameters');

    // Do not add event handlers to non-elements because they will not be cleaned up.
    if (!jqLiteAcceptsData(element)) {
      return;
    }

    var expandoStore = jqLiteExpandoStore(element, true);
    var events = expandoStore.events;
    var handle = expandoStore.handle;

    if (!handle) {
      handle = expandoStore.handle = createEventHandler(element, events);
    }

    // http://jsperf.com/string-indexof-vs-split
    var types = type.indexOf(' ') >= 0 ? type.split(' ') : [type];
    var i = types.length;

    var addHandler = function(type, specialHandlerWrapper, noEventListener) {
      var eventFns = events[type];

      if (!eventFns) {
        eventFns = events[type] = [];
        eventFns.specialHandlerWrapper = specialHandlerWrapper;
        if (type !== '$destroy' && !noEventListener) {
          element.addEventListener(type, handle);
        }
      }

      eventFns.push(fn);
    };

    while (i--) {
      type = types[i];
      if (MOUSE_EVENT_MAP[type]) {
        addHandler(MOUSE_EVENT_MAP[type], specialMouseHandlerWrapper);
        addHandler(type, undefined, true);
      } else {
        addHandler(type);
      }
    }
  },

  off: jqLiteOff,

  one: function(element, type, fn) {
    element = jqLite(element);

    //add the listener twice so that when it is called
    //you can remove the original function and still be
    //able to call element.off(ev, fn) normally
    element.on(type, function onFn() {
      element.off(type, fn);
      element.off(type, onFn);
    });
    element.on(type, fn);
  },

  replaceWith: function(element, replaceNode) {
    var index, parent = element.parentNode;
    jqLiteDealoc(element);
    forEach(new JQLite(replaceNode), function(node) {
      if (index) {
        parent.insertBefore(node, index.nextSibling);
      } else {
        parent.replaceChild(node, element);
      }
      index = node;
    });
  },

  children: function(element) {
    var children = [];
    forEach(element.childNodes, function(element) {
      if (element.nodeType === NODE_TYPE_ELEMENT) {
        children.push(element);
      }
    });
    return children;
  },

  contents: function(element) {
    return element.contentDocument || element.childNodes || [];
  },

  append: function(element, node) {
    var nodeType = element.nodeType;
    if (nodeType !== NODE_TYPE_ELEMENT && nodeType !== NODE_TYPE_DOCUMENT_FRAGMENT) return;

    node = new JQLite(node);

    for (var i = 0, ii = node.length; i < ii; i++) {
      var child = node[i];
      element.appendChild(child);
    }
  },

  prepend: function(element, node) {
    if (element.nodeType === NODE_TYPE_ELEMENT) {
      var index = element.firstChild;
      forEach(new JQLite(node), function(child) {
        element.insertBefore(child, index);
      });
    }
  },

  wrap: function(element, wrapNode) {
    jqLiteWrapNode(element, jqLite(wrapNode).eq(0).clone()[0]);
  },

  remove: jqLiteRemove,

  detach: function(element) {
    jqLiteRemove(element, true);
  },

  after: function(element, newElement) {
    var index = element, parent = element.parentNode;

    if (parent) {
      newElement = new JQLite(newElement);

      for (var i = 0, ii = newElement.length; i < ii; i++) {
        var node = newElement[i];
        parent.insertBefore(node, index.nextSibling);
        index = node;
      }
    }
  },

  addClass: jqLiteAddClass,
  removeClass: jqLiteRemoveClass,

  toggleClass: function(element, selector, condition) {
    if (selector) {
      forEach(selector.split(' '), function(className) {
        var classCondition = condition;
        if (isUndefined(classCondition)) {
          classCondition = !jqLiteHasClass(element, className);
        }
        (classCondition ? jqLiteAddClass : jqLiteRemoveClass)(element, className);
      });
    }
  },

  parent: function(element) {
    var parent = element.parentNode;
    return parent && parent.nodeType !== NODE_TYPE_DOCUMENT_FRAGMENT ? parent : null;
  },

  next: function(element) {
    return element.nextElementSibling;
  },

  find: function(element, selector) {
    if (element.getElementsByTagName) {
      return element.getElementsByTagName(selector);
    } else {
      return [];
    }
  },

  clone: jqLiteClone,

  triggerHandler: function(element, event, extraParameters) {

    var dummyEvent, eventFnsCopy, handlerArgs;
    var eventName = event.type || event;
    var expandoStore = jqLiteExpandoStore(element);
    var events = expandoStore && expandoStore.events;
    var eventFns = events && events[eventName];

    if (eventFns) {
      // Create a dummy event to pass to the handlers
      dummyEvent = {
        preventDefault: function() { this.defaultPrevented = true; },
        isDefaultPrevented: function() { return this.defaultPrevented === true; },
        stopImmediatePropagation: function() { this.immediatePropagationStopped = true; },
        isImmediatePropagationStopped: function() { return this.immediatePropagationStopped === true; },
        stopPropagation: noop,
        type: eventName,
        target: element
      };

      // If a custom event was provided then extend our dummy event with it
      if (event.type) {
        dummyEvent = extend(dummyEvent, event);
      }

      // Copy event handlers in case event handlers array is modified during execution.
      eventFnsCopy = shallowCopy(eventFns);
      handlerArgs = extraParameters ? [dummyEvent].concat(extraParameters) : [dummyEvent];

      forEach(eventFnsCopy, function(fn) {
        if (!dummyEvent.isImmediatePropagationStopped()) {
          fn.apply(element, handlerArgs);
        }
      });
    }
  }
}, function(fn, name) {
  /**
   * chaining functions
   */
  JQLite.prototype[name] = function(arg1, arg2, arg3) {
    var value;

    for (var i = 0, ii = this.length; i < ii; i++) {
      if (isUndefined(value)) {
        value = fn(this[i], arg1, arg2, arg3);
        if (isDefined(value)) {
          // any function which returns a value needs to be wrapped
          value = jqLite(value);
        }
      } else {
        jqLiteAddNodes(value, fn(this[i], arg1, arg2, arg3));
      }
    }
    return isDefined(value) ? value : this;
  };
});

// bind legacy bind/unbind to on/off
JQLite.prototype.bind = JQLite.prototype.on;
JQLite.prototype.unbind = JQLite.prototype.off;


// Provider for private $$jqLite service
/** @this */
function $$jqLiteProvider() {
  this.$get = function $$jqLite() {
    return extend(JQLite, {
      hasClass: function(node, classes) {
        if (node.attr) node = node[0];
        return jqLiteHasClass(node, classes);
      },
      addClass: function(node, classes) {
        if (node.attr) node = node[0];
        return jqLiteAddClass(node, classes);
      },
      removeClass: function(node, classes) {
        if (node.attr) node = node[0];
        return jqLiteRemoveClass(node, classes);
      }
    });
  };
}

/**
 * Computes a hash of an 'obj'.
 * Hash of a:
 *  string is string
 *  number is number as string
 *  object is either result of calling $$hashKey function on the object or uniquely generated id,
 *         that is also assigned to the $$hashKey property of the object.
 *
 * @param obj
 * @returns {string} hash string such that the same input will have the same hash string.
 *         The resulting string key is in 'type:hashKey' format.
 */
function hashKey(obj, nextUidFn) {
  var key = obj && obj.$$hashKey;

  if (key) {
    if (typeof key === 'function') {
      key = obj.$$hashKey();
    }
    return key;
  }

  var objType = typeof obj;
  if (objType === 'function' || (objType === 'object' && obj !== null)) {
    key = obj.$$hashKey = objType + ':' + (nextUidFn || nextUid)();
  } else {
    key = objType + ':' + obj;
  }

  return key;
}

// A minimal ES2015 Map implementation.
// Should be bug/feature equivalent to the native implementations of supported browsers
// (for the features required in Angular).
// See https://kangax.github.io/compat-table/es6/#test-Map
var nanKey = Object.create(null);
function NgMapShim() {
  this._keys = [];
  this._values = [];
  this._lastKey = NaN;
  this._lastIndex = -1;
}
NgMapShim.prototype = {
  _idx: function(key) {
    if (key === this._lastKey) {
      return this._lastIndex;
    }
    this._lastKey = key;
    this._lastIndex = this._keys.indexOf(key);
    return this._lastIndex;
  },
  _transformKey: function(key) {
    return isNumberNaN(key) ? nanKey : key;
  },
  get: function(key) {
    key = this._transformKey(key);
    var idx = this._idx(key);
    if (idx !== -1) {
      return this._values[idx];
    }
  },
  set: function(key, value) {
    key = this._transformKey(key);
    var idx = this._idx(key);
    if (idx === -1) {
      idx = this._lastIndex = this._keys.length;
    }
    this._keys[idx] = key;
    this._values[idx] = value;

    // Support: IE11
    // Do not `return this` to simulate the partial IE11 implementation
  },
  delete: function(key) {
    key = this._transformKey(key);
    var idx = this._idx(key);
    if (idx === -1) {
      return false;
    }
    this._keys.splice(idx, 1);
    this._values.splice(idx, 1);
    this._lastKey = NaN;
    this._lastIndex = -1;
    return true;
  }
};

// For now, always use `NgMapShim`, even if `window.Map` is available. Some native implementations
// are still buggy (often in subtle ways) and can cause hard-to-debug failures. When native `Map`
// implementations get more stable, we can reconsider switching to `window.Map` (when available).
var NgMap = NgMapShim;

var $$MapProvider = [/** @this */function() {
  this.$get = [function() {
    return NgMap;
  }];
}];

/**
 * @ngdoc function
 * @module ng
 * @name angular.injector
 * @kind function
 *
 * @description
 * Creates an injector object that can be used for retrieving services as well as for
 * dependency injection (see {@link guide/di dependency injection}).
 *
 * @param {Array.<string|Function>} modules A list of module functions or their aliases. See
 *     {@link angular.module}. The `ng` module must be explicitly added.
 * @param {boolean=} [strictDi=false] Whether the injector should be in strict mode, which
 *     disallows argument name annotation inference.
 * @returns {injector} Injector object. See {@link auto.$injector $injector}.
 *
 * @example
 * Typical usage
 * ```js
 *   // create an injector
 *   var $injector = angular.injector(['ng']);
 *
 *   // use the injector to kick off your application
 *   // use the type inference to auto inject arguments, or use implicit injection
 *   $injector.invoke(function($rootScope, $compile, $document) {
 *     $compile($document)($rootScope);
 *     $rootScope.$digest();
 *   });
 * ```
 *
 * Sometimes you want to get access to the injector of a currently running Angular app
 * from outside Angular. Perhaps, you want to inject and compile some markup after the
 * application has been bootstrapped. You can do this using the extra `injector()` added
 * to JQuery/jqLite elements. See {@link angular.element}.
 *
 * *This is fairly rare but could be the case if a third party library is injecting the
 * markup.*
 *
 * In the following example a new block of HTML containing a `ng-controller`
 * directive is added to the end of the document body by JQuery. We then compile and link
 * it into the current AngularJS scope.
 *
 * ```js
 * var $div = $('<div ng-controller="MyCtrl">{{content.label}}</div>');
 * $(document.body).append($div);
 *
 * angular.element(document).injector().invoke(function($compile) {
 *   var scope = angular.element($div).scope();
 *   $compile($div)(scope);
 * });
 * ```
 */


/**
 * @ngdoc module
 * @name auto
 * @installation
 * @description
 *
 * Implicit module which gets automatically added to each {@link auto.$injector $injector}.
 */

var ARROW_ARG = /^([^(]+?)=>/;
var FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var $injectorMinErr = minErr('$injector');

function stringifyFn(fn) {
  return Function.prototype.toString.call(fn);
}

function extractArgs(fn) {
  var fnText = stringifyFn(fn).replace(STRIP_COMMENTS, ''),
      args = fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
  return args;
}

function anonFn(fn) {
  // For anonymous functions, showing at the very least the function signature can help in
  // debugging.
  var args = extractArgs(fn);
  if (args) {
    return 'function(' + (args[1] || '').replace(/[\s\r\n]+/, ' ') + ')';
  }
  return 'fn';
}

function annotate(fn, strictDi, name) {
  var $inject,
      argDecl,
      last;

  if (typeof fn === 'function') {
    if (!($inject = fn.$inject)) {
      $inject = [];
      if (fn.length) {
        if (strictDi) {
          if (!isString(name) || !name) {
            name = fn.name || anonFn(fn);
          }
          throw $injectorMinErr('strictdi',
            '{0} is not using explicit annotation and cannot be invoked in strict mode', name);
        }
        argDecl = extractArgs(fn);
        forEach(argDecl[1].split(FN_ARG_SPLIT), function(arg) {
          arg.replace(FN_ARG, function(all, underscore, name) {
            $inject.push(name);
          });
        });
      }
      fn.$inject = $inject;
    }
  } else if (isArray(fn)) {
    last = fn.length - 1;
    assertArgFn(fn[last], 'fn');
    $inject = fn.slice(0, last);
  } else {
    assertArgFn(fn, 'fn', true);
  }
  return $inject;
}

///////////////////////////////////////

/**
 * @ngdoc service
 * @name $injector
 *
 * @description
 *
 * `$injector` is used to retrieve object instances as defined by
 * {@link auto.$provide provider}, instantiate types, invoke methods,
 * and load modules.
 *
 * The following always holds true:
 *
 * ```js
 *   var $injector = angular.injector();
 *   expect($injector.get('$injector')).toBe($injector);
 *   expect($injector.invoke(function($injector) {
 *     return $injector;
 *   })).toBe($injector);
 * ```
 *
 * # Injection Function Annotation
 *
 * JavaScript does not have annotations, and annotations are needed for dependency injection. The
 * following are all valid ways of annotating function with injection arguments and are equivalent.
 *
 * ```js
 *   // inferred (only works if code not minified/obfuscated)
 *   $injector.invoke(function(serviceA){});
 *
 *   // annotated
 *   function explicit(serviceA) {};
 *   explicit.$inject = ['serviceA'];
 *   $injector.invoke(explicit);
 *
 *   // inline
 *   $injector.invoke(['serviceA', function(serviceA){}]);
 * ```
 *
 * ## Inference
 *
 * In JavaScript calling `toString()` on a function returns the function definition. The definition
 * can then be parsed and the function arguments can be extracted. This method of discovering
 * annotations is disallowed when the injector is in strict mode.
 * *NOTE:* This does not work with minification, and obfuscation tools since these tools change the
 * argument names.
 *
 * ## `$inject` Annotation
 * By adding an `$inject` property onto a function the injection parameters can be specified.
 *
 * ## Inline
 * As an array of injection names, where the last item in the array is the function to call.
 */

/**
 * @ngdoc property
 * @name $injector#modules
 * @type {Object}
 * @description
 * A hash containing all the modules that have been loaded into the
 * $injector.
 *
 * You can use this property to find out information about a module via the
 * {@link angular.Module#info `myModule.info(...)`} method.
 *
 * For example:
 *
 * ```
 * var info = $injector.modules['ngAnimate'].info();
 * ```
 *
 * **Do not use this property to attempt to modify the modules after the application
 * has been bootstrapped.**
 */


/**
 * @ngdoc method
 * @name $injector#get
 *
 * @description
 * Return an instance of the service.
 *
 * @param {string} name The name of the instance to retrieve.
 * @param {string=} caller An optional string to provide the origin of the function call for error messages.
 * @return {*} The instance.
 */

/**
 * @ngdoc method
 * @name $injector#invoke
 *
 * @description
 * Invoke the method and supply the method arguments from the `$injector`.
 *
 * @param {Function|Array.<string|Function>} fn The injectable function to invoke. Function parameters are
 *   injected according to the {@link guide/di $inject Annotation} rules.
 * @param {Object=} self The `this` for the invoked method.
 * @param {Object=} locals Optional object. If preset then any argument names are read from this
 *                         object first, before the `$injector` is consulted.
 * @returns {*} the value returned by the invoked `fn` function.
 */

/**
 * @ngdoc method
 * @name $injector#has
 *
 * @description
 * Allows the user to query if the particular service exists.
 *
 * @param {string} name Name of the service to query.
 * @returns {boolean} `true` if injector has given service.
 */

/**
 * @ngdoc method
 * @name $injector#instantiate
 * @description
 * Create a new instance of JS type. The method takes a constructor function, invokes the new
 * operator, and supplies all of the arguments to the constructor function as specified by the
 * constructor annotation.
 *
 * @param {Function} Type Annotated constructor function.
 * @param {Object=} locals Optional object. If preset then any argument names are read from this
 * object first, before the `$injector` is consulted.
 * @returns {Object} new instance of `Type`.
 */

/**
 * @ngdoc method
 * @name $injector#annotate
 *
 * @description
 * Returns an array of service names which the function is requesting for injection. This API is
 * used by the injector to determine which services need to be injected into the function when the
 * function is invoked. There are three ways in which the function can be annotated with the needed
 * dependencies.
 *
 * # Argument names
 *
 * The simplest form is to extract the dependencies from the arguments of the function. This is done
 * by converting the function into a string using `toString()` method and extracting the argument
 * names.
 * ```js
 *   // Given
 *   function MyController($scope, $route) {
 *     // ...
 *   }
 *
 *   // Then
 *   expect(injector.annotate(MyController)).toEqual(['$scope', '$route']);
 * ```
 *
 * You can disallow this method by using strict injection mode.
 *
 * This method does not work with code minification / obfuscation. For this reason the following
 * annotation strategies are supported.
 *
 * # The `$inject` property
 *
 * If a function has an `$inject` property and its value is an array of strings, then the strings
 * represent names of services to be injected into the function.
 * ```js
 *   // Given
 *   var MyController = function(obfuscatedScope, obfuscatedRoute) {
 *     // ...
 *   }
 *   // Define function dependencies
 *   MyController['$inject'] = ['$scope', '$route'];
 *
 *   // Then
 *   expect(injector.annotate(MyController)).toEqual(['$scope', '$route']);
 * ```
 *
 * # The array notation
 *
 * It is often desirable to inline Injected functions and that's when setting the `$inject` property
 * is very inconvenient. In these situations using the array notation to specify the dependencies in
 * a way that survives minification is a better choice:
 *
 * ```js
 *   // We wish to write this (not minification / obfuscation safe)
 *   injector.invoke(function($compile, $rootScope) {
 *     // ...
 *   });
 *
 *   // We are forced to write break inlining
 *   var tmpFn = function(obfuscatedCompile, obfuscatedRootScope) {
 *     // ...
 *   };
 *   tmpFn.$inject = ['$compile', '$rootScope'];
 *   injector.invoke(tmpFn);
 *
 *   // To better support inline function the inline annotation is supported
 *   injector.invoke(['$compile', '$rootScope', function(obfCompile, obfRootScope) {
 *     // ...
 *   }]);
 *
 *   // Therefore
 *   expect(injector.annotate(
 *      ['$compile', '$rootScope', function(obfus_$compile, obfus_$rootScope) {}])
 *    ).toEqual(['$compile', '$rootScope']);
 * ```
 *
 * @param {Function|Array.<string|Function>} fn Function for which dependent service names need to
 * be retrieved as described above.
 *
 * @param {boolean=} [strictDi=false] Disallow argument name annotation inference.
 *
 * @returns {Array.<string>} The names of the services which the function requires.
 */



/**
 * @ngdoc service
 * @name $provide
 *
 * @description
 *
 * The {@link auto.$provide $provide} service has a number of methods for registering components
 * with the {@link auto.$injector $injector}. Many of these functions are also exposed on
 * {@link angular.Module}.
 *
 * An Angular **service** is a singleton object created by a **service factory**.  These **service
 * factories** are functions which, in turn, are created by a **service provider**.
 * The **service providers** are constructor functions. When instantiated they must contain a
 * property called `$get`, which holds the **service factory** function.
 *
 * When you request a service, the {@link auto.$injector $injector} is responsible for finding the
 * correct **service provider**, instantiating it and then calling its `$get` **service factory**
 * function to get the instance of the **service**.
 *
 * Often services have no configuration options and there is no need to add methods to the service
 * provider.  The provider will be no more than a constructor function with a `$get` property. For
 * these cases the {@link auto.$provide $provide} service has additional helper methods to register
 * services without specifying a provider.
 *
 * * {@link auto.$provide#provider provider(name, provider)} - registers a **service provider** with the
 *     {@link auto.$injector $injector}
 * * {@link auto.$provide#constant constant(name, obj)} - registers a value/object that can be accessed by
 *     providers and services.
 * * {@link auto.$provide#value value(name, obj)} - registers a value/object that can only be accessed by
 *     services, not providers.
 * * {@link auto.$provide#factory factory(name, fn)} - registers a service **factory function**
 *     that will be wrapped in a **service provider** object, whose `$get` property will contain the
 *     given factory function.
 * * {@link auto.$provide#service service(name, Fn)} - registers a **constructor function**
 *     that will be wrapped in a **service provider** object, whose `$get` property will instantiate
 *      a new object using the given constructor function.
 * * {@link auto.$provide#decorator decorator(name, decorFn)} - registers a **decorator function** that
 *      will be able to modify or replace the implementation of another service.
 *
 * See the individual methods for more information and examples.
 */

/**
 * @ngdoc method
 * @name $provide#provider
 * @description
 *
 * Register a **provider function** with the {@link auto.$injector $injector}. Provider functions
 * are constructor functions, whose instances are responsible for "providing" a factory for a
 * service.
 *
 * Service provider names start with the name of the service they provide followed by `Provider`.
 * For example, the {@link ng.$log $log} service has a provider called
 * {@link ng.$logProvider $logProvider}.
 *
 * Service provider objects can have additional methods which allow configuration of the provider
 * and its service. Importantly, you can configure what kind of service is created by the `$get`
 * method, or how that service will act. For example, the {@link ng.$logProvider $logProvider} has a
 * method {@link ng.$logProvider#debugEnabled debugEnabled}
 * which lets you specify whether the {@link ng.$log $log} service will log debug messages to the
 * console or not.
 *
 * @param {string} name The name of the instance. NOTE: the provider will be available under `name +
                        'Provider'` key.
 * @param {(Object|function())} provider If the provider is:
 *
 *   - `Object`: then it should have a `$get` method. The `$get` method will be invoked using
 *     {@link auto.$injector#invoke $injector.invoke()} when an instance needs to be created.
 *   - `Constructor`: a new instance of the provider will be created using
 *     {@link auto.$injector#instantiate $injector.instantiate()}, then treated as `object`.
 *
 * @returns {Object} registered provider instance

 * @example
 *
 * The following example shows how to create a simple event tracking service and register it using
 * {@link auto.$provide#provider $provide.provider()}.
 *
 * ```js
 *  // Define the eventTracker provider
 *  function EventTrackerProvider() {
 *    var trackingUrl = '/track';
 *
 *    // A provider method for configuring where the tracked events should been saved
 *    this.setTrackingUrl = function(url) {
 *      trackingUrl = url;
 *    };
 *
 *    // The service factory function
 *    this.$get = ['$http', function($http) {
 *      var trackedEvents = {};
 *      return {
 *        // Call this to track an event
 *        event: function(event) {
 *          var count = trackedEvents[event] || 0;
 *          count += 1;
 *          trackedEvents[event] = count;
 *          return count;
 *        },
 *        // Call this to save the tracked events to the trackingUrl
 *        save: function() {
 *          $http.post(trackingUrl, trackedEvents);
 *        }
 *      };
 *    }];
 *  }
 *
 *  describe('eventTracker', function() {
 *    var postSpy;
 *
 *    beforeEach(module(function($provide) {
 *      // Register the eventTracker provider
 *      $provide.provider('eventTracker', EventTrackerProvider);
 *    }));
 *
 *    beforeEach(module(function(eventTrackerProvider) {
 *      // Configure eventTracker provider
 *      eventTrackerProvider.setTrackingUrl('/custom-track');
 *    }));
 *
 *    it('tracks events', inject(function(eventTracker) {
 *      expect(eventTracker.event('login')).toEqual(1);
 *      expect(eventTracker.event('login')).toEqual(2);
 *    }));
 *
 *    it('saves to the tracking url', inject(function(eventTracker, $http) {
 *      postSpy = spyOn($http, 'post');
 *      eventTracker.event('login');
 *      eventTracker.save();
 *      expect(postSpy).toHaveBeenCalled();
 *      expect(postSpy.mostRecentCall.args[0]).not.toEqual('/track');
 *      expect(postSpy.mostRecentCall.args[0]).toEqual('/custom-track');
 *      expect(postSpy.mostRecentCall.args[1]).toEqual({ 'login': 1 });
 *    }));
 *  });
 * ```
 */

/**
 * @ngdoc method
 * @name $provide#factory
 * @description
 *
 * Register a **service factory**, which will be called to return the service instance.
 * This is short for registering a service where its provider consists of only a `$get` property,
 * which is the given service factory function.
 * You should use {@link auto.$provide#factory $provide.factory(getFn)} if you do not need to
 * configure your service in a provider.
 *
 * @param {string} name The name of the instance.
 * @param {Function|Array.<string|Function>} $getFn The injectable $getFn for the instance creation.
 *                      Internally this is a short hand for `$provide.provider(name, {$get: $getFn})`.
 * @returns {Object} registered provider instance
 *
 * @example
 * Here is an example of registering a service
 * ```js
 *   $provide.factory('ping', ['$http', function($http) {
 *     return function ping() {
 *       return $http.send('/ping');
 *     };
 *   }]);
 * ```
 * You would then inject and use this service like this:
 * ```js
 *   someModule.controller('Ctrl', ['ping', function(ping) {
 *     ping();
 *   }]);
 * ```
 */


/**
 * @ngdoc method
 * @name $provide#service
 * @description
 *
 * Register a **service constructor**, which will be invoked with `new` to create the service
 * instance.
 * This is short for registering a service where its provider's `$get` property is a factory
 * function that returns an instance instantiated by the injector from the service constructor
 * function.
 *
 * Internally it looks a bit like this:
 *
 * ```
 * {
 *   $get: function() {
 *     return $injector.instantiate(constructor);
 *   }
 * }
 * ```
 *
 *
 * You should use {@link auto.$provide#service $provide.service(class)} if you define your service
 * as a type/class.
 *
 * @param {string} name The name of the instance.
 * @param {Function|Array.<string|Function>} constructor An injectable class (constructor function)
 *     that will be instantiated.
 * @returns {Object} registered provider instance
 *
 * @example
 * Here is an example of registering a service using
 * {@link auto.$provide#service $provide.service(class)}.
 * ```js
 *   var Ping = function($http) {
 *     this.$http = $http;
 *   };
 *
 *   Ping.$inject = ['$http'];
 *
 *   Ping.prototype.send = function() {
 *     return this.$http.get('/ping');
 *   };
 *   $provide.service('ping', Ping);
 * ```
 * You would then inject and use this service like this:
 * ```js
 *   someModule.controller('Ctrl', ['ping', function(ping) {
 *     ping.send();
 *   }]);
 * ```
 */


/**
 * @ngdoc method
 * @name $provide#value
 * @description
 *
 * Register a **value service** with the {@link auto.$injector $injector}, such as a string, a
 * number, an array, an object or a function. This is short for registering a service where its
 * provider's `$get` property is a factory function that takes no arguments and returns the **value
 * service**. That also means it is not possible to inject other services into a value service.
 *
 * Value services are similar to constant services, except that they cannot be injected into a
 * module configuration function (see {@link angular.Module#config}) but they can be overridden by
 * an Angular {@link auto.$provide#decorator decorator}.
 *
 * @param {string} name The name of the instance.
 * @param {*} value The value.
 * @returns {Object} registered provider instance
 *
 * @example
 * Here are some examples of creating value services.
 * ```js
 *   $provide.value('ADMIN_USER', 'admin');
 *
 *   $provide.value('RoleLookup', { admin: 0, writer: 1, reader: 2 });
 *
 *   $provide.value('halfOf', function(value) {
 *     return value / 2;
 *   });
 * ```
 */


/**
 * @ngdoc method
 * @name $provide#constant
 * @description
 *
 * Register a **constant service** with the {@link auto.$injector $injector}, such as a string,
 * a number, an array, an object or a function. Like the {@link auto.$provide#value value}, it is not
 * possible to inject other services into a constant.
 *
 * But unlike {@link auto.$provide#value value}, a constant can be
 * injected into a module configuration function (see {@link angular.Module#config}) and it cannot
 * be overridden by an Angular {@link auto.$provide#decorator decorator}.
 *
 * @param {string} name The name of the constant.
 * @param {*} value The constant value.
 * @returns {Object} registered instance
 *
 * @example
 * Here a some examples of creating constants:
 * ```js
 *   $provide.constant('SHARD_HEIGHT', 306);
 *
 *   $provide.constant('MY_COLOURS', ['red', 'blue', 'grey']);
 *
 *   $provide.constant('double', function(value) {
 *     return value * 2;
 *   });
 * ```
 */


/**
 * @ngdoc method
 * @name $provide#decorator
 * @description
 *
 * Register a **decorator function** with the {@link auto.$injector $injector}. A decorator function
 * intercepts the creation of a service, allowing it to override or modify the behavior of the
 * service. The return value of the decorator function may be the original service, or a new service
 * that replaces (or wraps and delegates to) the original service.
 *
 * You can find out more about using decorators in the {@link guide/decorators} guide.
 *
 * @param {string} name The name of the service to decorate.
 * @param {Function|Array.<string|Function>} decorator This function will be invoked when the service needs to be
 *    provided and should return the decorated service instance. The function is called using
 *    the {@link auto.$injector#invoke injector.invoke} method and is therefore fully injectable.
 *    Local injection arguments:
 *
 *    * `$delegate` - The original service instance, which can be replaced, monkey patched, configured,
 *      decorated or delegated to.
 *
 * @example
 * Here we decorate the {@link ng.$log $log} service to convert warnings to errors by intercepting
 * calls to {@link ng.$log#error $log.warn()}.
 * ```js
 *   $provide.decorator('$log', ['$delegate', function($delegate) {
 *     $delegate.warn = $delegate.error;
 *     return $delegate;
 *   }]);
 * ```
 */


function createInjector(modulesToLoad, strictDi) {
  strictDi = (strictDi === true);
  var INSTANTIATING = {},
      providerSuffix = 'Provider',
      path = [],
      loadedModules = new NgMap(),
      providerCache = {
        $provide: {
            provider: supportObject(provider),
            factory: supportObject(factory),
            service: supportObject(service),
            value: supportObject(value),
            constant: supportObject(constant),
            decorator: decorator
          }
      },
      providerInjector = (providerCache.$injector =
          createInternalInjector(providerCache, function(serviceName, caller) {
            if (angular.isString(caller)) {
              path.push(caller);
            }
            throw $injectorMinErr('unpr', 'Unknown provider: {0}', path.join(' <- '));
          })),
      instanceCache = {},
      protoInstanceInjector =
          createInternalInjector(instanceCache, function(serviceName, caller) {
            var provider = providerInjector.get(serviceName + providerSuffix, caller);
            return instanceInjector.invoke(
                provider.$get, provider, undefined, serviceName);
          }),
      instanceInjector = protoInstanceInjector;

  providerCache['$injector' + providerSuffix] = { $get: valueFn(protoInstanceInjector) };
  instanceInjector.modules = providerInjector.modules = createMap();
  var runBlocks = loadModules(modulesToLoad);
  instanceInjector = protoInstanceInjector.get('$injector');
  instanceInjector.strictDi = strictDi;
  forEach(runBlocks, function(fn) { if (fn) instanceInjector.invoke(fn); });

  return instanceInjector;

  ////////////////////////////////////
  // $provider
  ////////////////////////////////////

  function supportObject(delegate) {
    return function(key, value) {
      if (isObject(key)) {
        forEach(key, reverseParams(delegate));
      } else {
        return delegate(key, value);
      }
    };
  }

  function provider(name, provider_) {
    assertNotHasOwnProperty(name, 'service');
    if (isFunction(provider_) || isArray(provider_)) {
      provider_ = providerInjector.instantiate(provider_);
    }
    if (!provider_.$get) {
      throw $injectorMinErr('pget', 'Provider \'{0}\' must define $get factory method.', name);
    }
    return (providerCache[name + providerSuffix] = provider_);
  }

  function enforceReturnValue(name, factory) {
    return /** @this */ function enforcedReturnValue() {
      var result = instanceInjector.invoke(factory, this);
      if (isUndefined(result)) {
        throw $injectorMinErr('undef', 'Provider \'{0}\' must return a value from $get factory method.', name);
      }
      return result;
    };
  }

  function factory(name, factoryFn, enforce) {
    return provider(name, {
      $get: enforce !== false ? enforceReturnValue(name, factoryFn) : factoryFn
    });
  }

  function service(name, constructor) {
    return factory(name, ['$injector', function($injector) {
      return $injector.instantiate(constructor);
    }]);
  }

  function value(name, val) { return factory(name, valueFn(val), false); }

  function constant(name, value) {
    assertNotHasOwnProperty(name, 'constant');
    providerCache[name] = value;
    instanceCache[name] = value;
  }

  function decorator(serviceName, decorFn) {
    var origProvider = providerInjector.get(serviceName + providerSuffix),
        orig$get = origProvider.$get;

    origProvider.$get = function() {
      var origInstance = instanceInjector.invoke(orig$get, origProvider);
      return instanceInjector.invoke(decorFn, null, {$delegate: origInstance});
    };
  }

  ////////////////////////////////////
  // Module Loading
  ////////////////////////////////////
  function loadModules(modulesToLoad) {
    assertArg(isUndefined(modulesToLoad) || isArray(modulesToLoad), 'modulesToLoad', 'not an array');
    var runBlocks = [], moduleFn;
    forEach(modulesToLoad, function(module) {
      if (loadedModules.get(module)) return;
      loadedModules.set(module, true);

      function runInvokeQueue(queue) {
        var i, ii;
        for (i = 0, ii = queue.length; i < ii; i++) {
          var invokeArgs = queue[i],
              provider = providerInjector.get(invokeArgs[0]);

          provider[invokeArgs[1]].apply(provider, invokeArgs[2]);
        }
      }

      try {
        if (isString(module)) {
          moduleFn = angularModule(module);
          instanceInjector.modules[module] = moduleFn;
          runBlocks = runBlocks.concat(loadModules(moduleFn.requires)).concat(moduleFn._runBlocks);
          runInvokeQueue(moduleFn._invokeQueue);
          runInvokeQueue(moduleFn._configBlocks);
        } else if (isFunction(module)) {
            runBlocks.push(providerInjector.invoke(module));
        } else if (isArray(module)) {
            runBlocks.push(providerInjector.invoke(module));
        } else {
          assertArgFn(module, 'module');
        }
      } catch (e) {
        if (isArray(module)) {
          module = module[module.length - 1];
        }
        if (e.message && e.stack && e.stack.indexOf(e.message) === -1) {
          // Safari & FF's stack traces don't contain error.message content
          // unlike those of Chrome and IE
          // So if stack doesn't contain message, we create a new string that contains both.
          // Since error.stack is read-only in Safari, I'm overriding e and not e.stack here.
          // eslint-disable-next-line no-ex-assign
          e = e.message + '\n' + e.stack;
        }
        throw $injectorMinErr('modulerr', 'Failed to instantiate module {0} due to:\n{1}',
                  module, e.stack || e.message || e);
      }
    });
    return runBlocks;
  }

  ////////////////////////////////////
  // internal Injector
  ////////////////////////////////////

  function createInternalInjector(cache, factory) {

    function getService(serviceName, caller) {
      if (cache.hasOwnProperty(serviceName)) {
        if (cache[serviceName] === INSTANTIATING) {
          throw $injectorMinErr('cdep', 'Circular dependency found: {0}',
                    serviceName + ' <- ' + path.join(' <- '));
        }
        return cache[serviceName];
      } else {
        try {
          path.unshift(serviceName);
          cache[serviceName] = INSTANTIATING;
          cache[serviceName] = factory(serviceName, caller);
          return cache[serviceName];
        } catch (err) {
          if (cache[serviceName] === INSTANTIATING) {
            delete cache[serviceName];
          }
          throw err;
        } finally {
          path.shift();
        }
      }
    }


    function injectionArgs(fn, locals, serviceName) {
      var args = [],
          $inject = createInjector.$$annotate(fn, strictDi, serviceName);

      for (var i = 0, length = $inject.length; i < length; i++) {
        var key = $inject[i];
        if (typeof key !== 'string') {
          throw $injectorMinErr('itkn',
                  'Incorrect injection token! Expected service name as string, got {0}', key);
        }
        args.push(locals && locals.hasOwnProperty(key) ? locals[key] :
                                                         getService(key, serviceName));
      }
      return args;
    }

    function isClass(func) {
      // Support: IE 9-11 only
      // IE 9-11 do not support classes and IE9 leaks with the code below.
      if (msie || typeof func !== 'function') {
        return false;
      }
      var result = func.$$ngIsClass;
      if (!isBoolean(result)) {
        // Support: Edge 12-13 only
        // See: https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/6156135/
        result = func.$$ngIsClass = /^(?:class\b|constructor\()/.test(stringifyFn(func));
      }
      return result;
    }

    function invoke(fn, self, locals, serviceName) {

      if (typeof locals === 'string') {
        serviceName = locals;
        locals = null;
      }

      var args = injectionArgs(fn, locals, serviceName);
      if (isArray(fn)) {
        fn = fn[fn.length - 1];
      }

      if (!isClass(fn)) {
        // http://jsperf.com/angularjs-invoke-apply-vs-switch
        // #5388
        return fn.apply(self, args);
      } else {
        args.unshift(null);
        return new (Function.prototype.bind.apply(fn, args))();
      }
    }


    function instantiate(Type, locals, serviceName) {
      // Check if Type is annotated and use just the given function at n-1 as parameter
      // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
      var ctor = (isArray(Type) ? Type[Type.length - 1] : Type);
      var args = injectionArgs(Type, locals, serviceName);
      // Empty object at position 0 is ignored for invocation with `new`, but required.
      args.unshift(null);
      return new (Function.prototype.bind.apply(ctor, args))();
    }


    return {
      invoke: invoke,
      instantiate: instantiate,
      get: getService,
      annotate: createInjector.$$annotate,
      has: function(name) {
        return providerCache.hasOwnProperty(name + providerSuffix) || cache.hasOwnProperty(name);
      }
    };
  }
}

createInjector.$$annotate = annotate;

/**
 * @ngdoc provider
 * @name $anchorScrollProvider
 * @this
 *
 * @description
 * Use `$anchorScrollProvider` to disable automatic scrolling whenever
 * {@link ng.$location#hash $location.hash()} changes.
 */
function $AnchorScrollProvider() {

  var autoScrollingEnabled = true;

  /**
   * @ngdoc method
   * @name $anchorScrollProvider#disableAutoScrolling
   *
   * @description
   * By default, {@link ng.$anchorScroll $anchorScroll()} will automatically detect changes to
   * {@link ng.$location#hash $location.hash()} and scroll to the element matching the new hash.<br />
   * Use this method to disable automatic scrolling.
   *
   * If automatic scrolling is disabled, one must explicitly call
   * {@link ng.$anchorScroll $anchorScroll()} in order to scroll to the element related to the
   * current hash.
   */
  this.disableAutoScrolling = function() {
    autoScrollingEnabled = false;
  };

  /**
   * @ngdoc service
   * @name $anchorScroll
   * @kind function
   * @requires $window
   * @requires $location
   * @requires $rootScope
   *
   * @description
   * When called, it scrolls to the element related to the specified `hash` or (if omitted) to the
   * current value of {@link ng.$location#hash $location.hash()}, according to the rules specified
   * in the
   * [HTML5 spec](http://www.w3.org/html/wg/drafts/html/master/browsers.html#an-indicated-part-of-the-document).
   *
   * It also watches the {@link ng.$location#hash $location.hash()} and automatically scrolls to
   * match any anchor whenever it changes. This can be disabled by calling
   * {@link ng.$anchorScrollProvider#disableAutoScrolling $anchorScrollProvider.disableAutoScrolling()}.
   *
   * Additionally, you can use its {@link ng.$anchorScroll#yOffset yOffset} property to specify a
   * vertical scroll-offset (either fixed or dynamic).
   *
   * @param {string=} hash The hash specifying the element to scroll to. If omitted, the value of
   *                       {@link ng.$location#hash $location.hash()} will be used.
   *
   * @property {(number|function|jqLite)} yOffset
   * If set, specifies a vertical scroll-offset. This is often useful when there are fixed
   * positioned elements at the top of the page, such as navbars, headers etc.
   *
   * `yOffset` can be specified in various ways:
   * - **number**: A fixed number of pixels to be used as offset.<br /><br />
   * - **function**: A getter function called everytime `$anchorScroll()` is executed. Must return
   *   a number representing the offset (in pixels).<br /><br />
   * - **jqLite**: A jqLite/jQuery element to be used for specifying the offset. The distance from
   *   the top of the page to the element's bottom will be used as offset.<br />
   *   **Note**: The element will be taken into account only as long as its `position` is set to
   *   `fixed`. This option is useful, when dealing with responsive navbars/headers that adjust
   *   their height and/or positioning according to the viewport's size.
   *
   * <br />
   * <div class="alert alert-warning">
   * In order for `yOffset` to work properly, scrolling should take place on the document's root and
   * not some child element.
   * </div>
   *
   * @example
     <example module="anchorScrollExample" name="anchor-scroll">
       <file name="index.html">
         <div id="scrollArea" ng-controller="ScrollController">
           <a ng-click="gotoBottom()">Go to bottom</a>
           <a id="bottom"></a> You're at the bottom!
         </div>
       </file>
       <file name="script.js">
         angular.module('anchorScrollExample', [])
           .controller('ScrollController', ['$scope', '$location', '$anchorScroll',
             function($scope, $location, $anchorScroll) {
               $scope.gotoBottom = function() {
                 // set the location.hash to the id of
                 // the element you wish to scroll to.
                 $location.hash('bottom');

                 // call $anchorScroll()
                 $anchorScroll();
               };
             }]);
       </file>
       <file name="style.css">
         #scrollArea {
           height: 280px;
           overflow: auto;
         }

         #bottom {
           display: block;
           margin-top: 2000px;
         }
       </file>
     </example>
   *
   * <hr />
   * The example below illustrates the use of a vertical scroll-offset (specified as a fixed value).
   * See {@link ng.$anchorScroll#yOffset $anchorScroll.yOffset} for more details.
   *
   * @example
     <example module="anchorScrollOffsetExample" name="anchor-scroll-offset">
       <file name="index.html">
         <div class="fixed-header" ng-controller="headerCtrl">
           <a href="" ng-click="gotoAnchor(x)" ng-repeat="x in [1,2,3,4,5]">
             Go to anchor {{x}}
           </a>
         </div>
         <div id="anchor{{x}}" class="anchor" ng-repeat="x in [1,2,3,4,5]">
           Anchor {{x}} of 5
         </div>
       </file>
       <file name="script.js">
         angular.module('anchorScrollOffsetExample', [])
           .run(['$anchorScroll', function($anchorScroll) {
             $anchorScroll.yOffset = 50;   // always scroll by 50 extra pixels
           }])
           .controller('headerCtrl', ['$anchorScroll', '$location', '$scope',
             function($anchorScroll, $location, $scope) {
               $scope.gotoAnchor = function(x) {
                 var newHash = 'anchor' + x;
                 if ($location.hash() !== newHash) {
                   // set the $location.hash to `newHash` and
                   // $anchorScroll will automatically scroll to it
                   $location.hash('anchor' + x);
                 } else {
                   // call $anchorScroll() explicitly,
                   // since $location.hash hasn't changed
                   $anchorScroll();
                 }
               };
             }
           ]);
       </file>
       <file name="style.css">
         body {
           padding-top: 50px;
         }

         .anchor {
           border: 2px dashed DarkOrchid;
           padding: 10px 10px 200px 10px;
         }

         .fixed-header {
           background-color: rgba(0, 0, 0, 0.2);
           height: 50px;
           position: fixed;
           top: 0; left: 0; right: 0;
         }

         .fixed-header > a {
           display: inline-block;
           margin: 5px 15px;
         }
       </file>
     </example>
   */
  this.$get = ['$window', '$location', '$rootScope', function($window, $location, $rootScope) {
    var document = $window.document;

    // Helper function to get first anchor from a NodeList
    // (using `Array#some()` instead of `angular#forEach()` since it's more performant
    //  and working in all supported browsers.)
    function getFirstAnchor(list) {
      var result = null;
      Array.prototype.some.call(list, function(element) {
        if (nodeName_(element) === 'a') {
          result = element;
          return true;
        }
      });
      return result;
    }

    function getYOffset() {

      var offset = scroll.yOffset;

      if (isFunction(offset)) {
        offset = offset();
      } else if (isElement(offset)) {
        var elem = offset[0];
        var style = $window.getComputedStyle(elem);
        if (style.position !== 'fixed') {
          offset = 0;
        } else {
          offset = elem.getBoundingClientRect().bottom;
        }
      } else if (!isNumber(offset)) {
        offset = 0;
      }

      return offset;
    }

    function scrollTo(elem) {
      if (elem) {
        elem.scrollIntoView();

        var offset = getYOffset();

        if (offset) {
          // `offset` is the number of pixels we should scroll UP in order to align `elem` properly.
          // This is true ONLY if the call to `elem.scrollIntoView()` initially aligns `elem` at the
          // top of the viewport.
          //
          // IF the number of pixels from the top of `elem` to the end of the page's content is less
          // than the height of the viewport, then `elem.scrollIntoView()` will align the `elem` some
          // way down the page.
          //
          // This is often the case for elements near the bottom of the page.
          //
          // In such cases we do not need to scroll the whole `offset` up, just the difference between
          // the top of the element and the offset, which is enough to align the top of `elem` at the
          // desired position.
          var elemTop = elem.getBoundingClientRect().top;
          $window.scrollBy(0, elemTop - offset);
        }
      } else {
        $window.scrollTo(0, 0);
      }
    }

    function scroll(hash) {
      // Allow numeric hashes
      hash = isString(hash) ? hash : isNumber(hash) ? hash.toString() : $location.hash();
      var elm;

      // empty hash, scroll to the top of the page
      if (!hash) scrollTo(null);

      // element with given id
      else if ((elm = document.getElementById(hash))) scrollTo(elm);

      // first anchor with given name :-D
      else if ((elm = getFirstAnchor(document.getElementsByName(hash)))) scrollTo(elm);

      // no element and hash === 'top', scroll to the top of the page
      else if (hash === 'top') scrollTo(null);
    }

    // does not scroll when user clicks on anchor link that is currently on
    // (no url change, no $location.hash() change), browser native does scroll
    if (autoScrollingEnabled) {
      $rootScope.$watch(function autoScrollWatch() {return $location.hash();},
        function autoScrollWatchAction(newVal, oldVal) {
          // skip the initial scroll if $location.hash is empty
          if (newVal === oldVal && newVal === '') return;

          jqLiteDocumentLoaded(function() {
            $rootScope.$evalAsync(scroll);
          });
        });
    }

    return scroll;
  }];
}

var $animateMinErr = minErr('$animate');
var ELEMENT_NODE = 1;
var NG_ANIMATE_CLASSNAME = 'ng-animate';

function mergeClasses(a,b) {
  if (!a && !b) return '';
  if (!a) return b;
  if (!b) return a;
  if (isArray(a)) a = a.join(' ');
  if (isArray(b)) b = b.join(' ');
  return a + ' ' + b;
}

function extractElementNode(element) {
  for (var i = 0; i < element.length; i++) {
    var elm = element[i];
    if (elm.nodeType === ELEMENT_NODE) {
      return elm;
    }
  }
}

function splitClasses(classes) {
  if (isString(classes)) {
    classes = classes.split(' ');
  }

  // Use createMap() to prevent class assumptions involving property names in
  // Object.prototype
  var obj = createMap();
  forEach(classes, function(klass) {
    // sometimes the split leaves empty string values
    // incase extra spaces were applied to the options
    if (klass.length) {
      obj[klass] = true;
    }
  });
  return obj;
}

// if any other type of options value besides an Object value is
// passed into the $animate.method() animation then this helper code
// will be run which will ignore it. While this patch is not the
// greatest solution to this, a lot of existing plugins depend on
// $animate to either call the callback (< 1.2) or return a promise
// that can be changed. This helper function ensures that the options
// are wiped clean incase a callback function is provided.
function prepareAnimateOptions(options) {
  return isObject(options)
      ? options
      : {};
}

var $$CoreAnimateJsProvider = /** @this */ function() {
  this.$get = noop;
};

// this is prefixed with Core since it conflicts with
// the animateQueueProvider defined in ngAnimate/animateQueue.js
var $$CoreAnimateQueueProvider = /** @this */ function() {
  var postDigestQueue = new NgMap();
  var postDigestElements = [];

  this.$get = ['$$AnimateRunner', '$rootScope',
       function($$AnimateRunner,   $rootScope) {
    return {
      enabled: noop,
      on: noop,
      off: noop,
      pin: noop,

      push: function(element, event, options, domOperation) {
        if (domOperation) {
          domOperation();
        }

        options = options || {};
        if (options.from) {
          element.css(options.from);
        }
        if (options.to) {
          element.css(options.to);
        }

        if (options.addClass || options.removeClass) {
          addRemoveClassesPostDigest(element, options.addClass, options.removeClass);
        }

        var runner = new $$AnimateRunner();

        // since there are no animations to run the runner needs to be
        // notified that the animation call is complete.
        runner.complete();
        return runner;
      }
    };


    function updateData(data, classes, value) {
      var changed = false;
      if (classes) {
        classes = isString(classes) ? classes.split(' ') :
                  isArray(classes) ? classes : [];
        forEach(classes, function(className) {
          if (className) {
            changed = true;
            data[className] = value;
          }
        });
      }
      return changed;
    }

    function handleCSSClassChanges() {
      forEach(postDigestElements, function(element) {
        var data = postDigestQueue.get(element);
        if (data) {
          var existing = splitClasses(element.attr('class'));
          var toAdd = '';
          var toRemove = '';
          forEach(data, function(status, className) {
            var hasClass = !!existing[className];
            if (status !== hasClass) {
              if (status) {
                toAdd += (toAdd.length ? ' ' : '') + className;
              } else {
                toRemove += (toRemove.length ? ' ' : '') + className;
              }
            }
          });

          forEach(element, function(elm) {
            if (toAdd) {
              jqLiteAddClass(elm, toAdd);
            }
            if (toRemove) {
              jqLiteRemoveClass(elm, toRemove);
            }
          });
          postDigestQueue.delete(element);
        }
      });
      postDigestElements.length = 0;
    }


    function addRemoveClassesPostDigest(element, add, remove) {
      var data = postDigestQueue.get(element) || {};

      var classesAdded = updateData(data, add, true);
      var classesRemoved = updateData(data, remove, false);

      if (classesAdded || classesRemoved) {

        postDigestQueue.set(element, data);
        postDigestElements.push(element);

        if (postDigestElements.length === 1) {
          $rootScope.$$postDigest(handleCSSClassChanges);
        }
      }
    }
  }];
};

/**
 * @ngdoc provider
 * @name $animateProvider
 *
 * @description
 * Default implementation of $animate that doesn't perform any animations, instead just
 * synchronously performs DOM updates and resolves the returned runner promise.
 *
 * In order to enable animations the `ngAnimate` module has to be loaded.
 *
 * To see the functional implementation check out `src/ngAnimate/animate.js`.
 */
var $AnimateProvider = ['$provide', /** @this */ function($provide) {
  var provider = this;
  var classNameFilter = null;

  this.$$registeredAnimations = Object.create(null);

   /**
   * @ngdoc method
   * @name $animateProvider#register
   *
   * @description
   * Registers a new injectable animation factory function. The factory function produces the
   * animation object which contains callback functions for each event that is expected to be
   * animated.
   *
   *   * `eventFn`: `function(element, ... , doneFunction, options)`
   *   The element to animate, the `doneFunction` and the options fed into the animation. Depending
   *   on the type of animation additional arguments will be injected into the animation function. The
   *   list below explains the function signatures for the different animation methods:
   *
   *   - setClass: function(element, addedClasses, removedClasses, doneFunction, options)
   *   - addClass: function(element, addedClasses, doneFunction, options)
   *   - removeClass: function(element, removedClasses, doneFunction, options)
   *   - enter, leave, move: function(element, doneFunction, options)
   *   - animate: function(element, fromStyles, toStyles, doneFunction, options)
   *
   *   Make sure to trigger the `doneFunction` once the animation is fully complete.
   *
   * ```js
   *   return {
   *     //enter, leave, move signature
   *     eventFn : function(element, done, options) {
   *       //code to run the animation
   *       //once complete, then run done()
   *       return function endFunction(wasCancelled) {
   *         //code to cancel the animation
   *       }
   *     }
   *   }
   * ```
   *
   * @param {string} name The name of the animation (this is what the class-based CSS value will be compared to).
   * @param {Function} factory The factory function that will be executed to return the animation
   *                           object.
   */
  this.register = function(name, factory) {
    if (name && name.charAt(0) !== '.') {
      throw $animateMinErr('notcsel', 'Expecting class selector starting with \'.\' got \'{0}\'.', name);
    }

    var key = name + '-animation';
    provider.$$registeredAnimations[name.substr(1)] = key;
    $provide.factory(key, factory);
  };

  /**
   * @ngdoc method
   * @name $animateProvider#classNameFilter
   *
   * @description
   * Sets and/or returns the CSS class regular expression that is checked when performing
   * an animation. Upon bootstrap the classNameFilter value is not set at all and will
   * therefore enable $animate to attempt to perform an animation on any element that is triggered.
   * When setting the `classNameFilter` value, animations will only be performed on elements
   * that successfully match the filter expression. This in turn can boost performance
   * for low-powered devices as well as applications containing a lot of structural operations.
   * @param {RegExp=} expression The className expression which will be checked against all animations
   * @return {RegExp} The current CSS className expression value. If null then there is no expression value
   */
  this.classNameFilter = function(expression) {
    if (arguments.length === 1) {
      classNameFilter = (expression instanceof RegExp) ? expression : null;
      if (classNameFilter) {
        var reservedRegex = new RegExp('[(\\s|\\/)]' + NG_ANIMATE_CLASSNAME + '[(\\s|\\/)]');
        if (reservedRegex.test(classNameFilter.toString())) {
          classNameFilter = null;
          throw $animateMinErr('nongcls', '$animateProvider.classNameFilter(regex) prohibits accepting a regex value which matches/contains the "{0}" CSS class.', NG_ANIMATE_CLASSNAME);
        }
      }
    }
    return classNameFilter;
  };

  this.$get = ['$$animateQueue', function($$animateQueue) {
    function domInsert(element, parentElement, afterElement) {
      // if for some reason the previous element was removed
      // from the dom sometime before this code runs then let's
      // just stick to using the parent element as the anchor
      if (afterElement) {
        var afterNode = extractElementNode(afterElement);
        if (afterNode && !afterNode.parentNode && !afterNode.previousElementSibling) {
          afterElement = null;
        }
      }
      if (afterElement) {
        afterElement.after(element);
      } else {
        parentElement.prepend(element);
      }
    }

    /**
     * @ngdoc service
     * @name $animate
     * @description The $animate service exposes a series of DOM utility methods that provide support
     * for animation hooks. The default behavior is the application of DOM operations, however,
     * when an animation is detected (and animations are enabled), $animate will do the heavy lifting
     * to ensure that animation runs with the triggered DOM operation.
     *
     * By default $animate doesn't trigger any animations. This is because the `ngAnimate` module isn't
     * included and only when it is active then the animation hooks that `$animate` triggers will be
     * functional. Once active then all structural `ng-` directives will trigger animations as they perform
     * their DOM-related operations (enter, leave and move). Other directives such as `ngClass`,
     * `ngShow`, `ngHide` and `ngMessages` also provide support for animations.
     *
     * It is recommended that the`$animate` service is always used when executing DOM-related procedures within directives.
     *
     * To learn more about enabling animation support, click here to visit the
     * {@link ngAnimate ngAnimate module page}.
     */
    return {
      // we don't call it directly since non-existant arguments may
      // be interpreted as null within the sub enabled function

      /**
       *
       * @ngdoc method
       * @name $animate#on
       * @kind function
       * @description Sets up an event listener to fire whenever the animation event (enter, leave, move, etc...)
       *    has fired on the given element or among any of its children. Once the listener is fired, the provided callback
       *    is fired with the following params:
       *
       * ```js
       * $animate.on('enter', container,
       *    function callback(element, phase) {
       *      // cool we detected an enter animation within the container
       *    }
       * );
       * ```
       *
       * @param {string} event the animation event that will be captured (e.g. enter, leave, move, addClass, removeClass, etc...)
       * @param {DOMElement} container the container element that will capture each of the animation events that are fired on itself
       *     as well as among its children
       * @param {Function} callback the callback function that will be fired when the listener is triggered
       *
       * The arguments present in the callback function are:
       * * `element` - The captured DOM element that the animation was fired on.
       * * `phase` - The phase of the animation. The two possible phases are **start** (when the animation starts) and **close** (when it ends).
       */
      on: $$animateQueue.on,

      /**
       *
       * @ngdoc method
       * @name $animate#off
       * @kind function
       * @description Deregisters an event listener based on the event which has been associated with the provided element. This method
       * can be used in three different ways depending on the arguments:
       *
       * ```js
       * // remove all the animation event listeners listening for `enter`
       * $animate.off('enter');
       *
       * // remove listeners for all animation events from the container element
       * $animate.off(container);
       *
       * // remove all the animation event listeners listening for `enter` on the given element and its children
       * $animate.off('enter', container);
       *
       * // remove the event listener function provided by `callback` that is set
       * // to listen for `enter` on the given `container` as well as its children
       * $animate.off('enter', container, callback);
       * ```
       *
       * @param {string|DOMElement} event|container the animation event (e.g. enter, leave, move,
       * addClass, removeClass, etc...), or the container element. If it is the element, all other
       * arguments are ignored.
       * @param {DOMElement=} container the container element the event listener was placed on
       * @param {Function=} callback the callback function that was registered as the listener
       */
      off: $$animateQueue.off,

      /**
       * @ngdoc method
       * @name $animate#pin
       * @kind function
       * @description Associates the provided element with a host parent element to allow the element to be animated even if it exists
       *    outside of the DOM structure of the Angular application. By doing so, any animation triggered via `$animate` can be issued on the
       *    element despite being outside the realm of the application or within another application. Say for example if the application
       *    was bootstrapped on an element that is somewhere inside of the `<body>` tag, but we wanted to allow for an element to be situated
       *    as a direct child of `document.body`, then this can be achieved by pinning the element via `$animate.pin(element)`. Keep in mind
       *    that calling `$animate.pin(element, parentElement)` will not actually insert into the DOM anywhere; it will just create the association.
       *
       *    Note that this feature is only active when the `ngAnimate` module is used.
       *
       * @param {DOMElement} element the external element that will be pinned
       * @param {DOMElement} parentElement the host parent element that will be associated with the external element
       */
      pin: $$animateQueue.pin,

      /**
       *
       * @ngdoc method
       * @name $animate#enabled
       * @kind function
       * @description Used to get and set whether animations are enabled or not on the entire application or on an element and its children. This
       * function can be called in four ways:
       *
       * ```js
       * // returns true or false
       * $animate.enabled();
       *
       * // changes the enabled state for all animations
       * $animate.enabled(false);
       * $animate.enabled(true);
       *
       * // returns true or false if animations are enabled for an element
       * $animate.enabled(element);
       *
       * // changes the enabled state for an element and its children
       * $animate.enabled(element, true);
       * $animate.enabled(element, false);
       * ```
       *
       * @param {DOMElement=} element the element that will be considered for checking/setting the enabled state
       * @param {boolean=} enabled whether or not the animations will be enabled for the element
       *
       * @return {boolean} whether or not animations are enabled
       */
      enabled: $$animateQueue.enabled,

      /**
       * @ngdoc method
       * @name $animate#cancel
       * @kind function
       * @description Cancels the provided animation.
       *
       * @param {Promise} animationPromise The animation promise that is returned when an animation is started.
       */
      cancel: function(runner) {
        if (runner.end) {
          runner.end();
        }
      },

      /**
       *
       * @ngdoc method
       * @name $animate#enter
       * @kind function
       * @description Inserts the element into the DOM either after the `after` element (if provided) or
       *   as the first child within the `parent` element and then triggers an animation.
       *   A promise is returned that will be resolved during the next digest once the animation
       *   has completed.
       *
       * @param {DOMElement} element the element which will be inserted into the DOM
       * @param {DOMElement} parent the parent element which will append the element as
       *   a child (so long as the after element is not present)
       * @param {DOMElement=} after the sibling element after which the element will be appended
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      enter: function(element, parent, after, options) {
        parent = parent && jqLite(parent);
        after = after && jqLite(after);
        parent = parent || after.parent();
        domInsert(element, parent, after);
        return $$animateQueue.push(element, 'enter', prepareAnimateOptions(options));
      },

      /**
       *
       * @ngdoc method
       * @name $animate#move
       * @kind function
       * @description Inserts (moves) the element into its new position in the DOM either after
       *   the `after` element (if provided) or as the first child within the `parent` element
       *   and then triggers an animation. A promise is returned that will be resolved
       *   during the next digest once the animation has completed.
       *
       * @param {DOMElement} element the element which will be moved into the new DOM position
       * @param {DOMElement} parent the parent element which will append the element as
       *   a child (so long as the after element is not present)
       * @param {DOMElement=} after the sibling element after which the element will be appended
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      move: function(element, parent, after, options) {
        parent = parent && jqLite(parent);
        after = after && jqLite(after);
        parent = parent || after.parent();
        domInsert(element, parent, after);
        return $$animateQueue.push(element, 'move', prepareAnimateOptions(options));
      },

      /**
       * @ngdoc method
       * @name $animate#leave
       * @kind function
       * @description Triggers an animation and then removes the element from the DOM.
       * When the function is called a promise is returned that will be resolved during the next
       * digest once the animation has completed.
       *
       * @param {DOMElement} element the element which will be removed from the DOM
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      leave: function(element, options) {
        return $$animateQueue.push(element, 'leave', prepareAnimateOptions(options), function() {
          element.remove();
        });
      },

      /**
       * @ngdoc method
       * @name $animate#addClass
       * @kind function
       *
       * @description Triggers an addClass animation surrounding the addition of the provided CSS class(es). Upon
       *   execution, the addClass operation will only be handled after the next digest and it will not trigger an
       *   animation if element already contains the CSS class or if the class is removed at a later step.
       *   Note that class-based animations are treated differently compared to structural animations
       *   (like enter, move and leave) since the CSS classes may be added/removed at different points
       *   depending if CSS or JavaScript animations are used.
       *
       * @param {DOMElement} element the element which the CSS classes will be applied to
       * @param {string} className the CSS class(es) that will be added (multiple classes are separated via spaces)
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      addClass: function(element, className, options) {
        options = prepareAnimateOptions(options);
        options.addClass = mergeClasses(options.addclass, className);
        return $$animateQueue.push(element, 'addClass', options);
      },

      /**
       * @ngdoc method
       * @name $animate#removeClass
       * @kind function
       *
       * @description Triggers a removeClass animation surrounding the removal of the provided CSS class(es). Upon
       *   execution, the removeClass operation will only be handled after the next digest and it will not trigger an
       *   animation if element does not contain the CSS class or if the class is added at a later step.
       *   Note that class-based animations are treated differently compared to structural animations
       *   (like enter, move and leave) since the CSS classes may be added/removed at different points
       *   depending if CSS or JavaScript animations are used.
       *
       * @param {DOMElement} element the element which the CSS classes will be applied to
       * @param {string} className the CSS class(es) that will be removed (multiple classes are separated via spaces)
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      removeClass: function(element, className, options) {
        options = prepareAnimateOptions(options);
        options.removeClass = mergeClasses(options.removeClass, className);
        return $$animateQueue.push(element, 'removeClass', options);
      },

      /**
       * @ngdoc method
       * @name $animate#setClass
       * @kind function
       *
       * @description Performs both the addition and removal of a CSS classes on an element and (during the process)
       *    triggers an animation surrounding the class addition/removal. Much like `$animate.addClass` and
       *    `$animate.removeClass`, `setClass` will only evaluate the classes being added/removed once a digest has
       *    passed. Note that class-based animations are treated differently compared to structural animations
       *    (like enter, move and leave) since the CSS classes may be added/removed at different points
       *    depending if CSS or JavaScript animations are used.
       *
       * @param {DOMElement} element the element which the CSS classes will be applied to
       * @param {string} add the CSS class(es) that will be added (multiple classes are separated via spaces)
       * @param {string} remove the CSS class(es) that will be removed (multiple classes are separated via spaces)
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      setClass: function(element, add, remove, options) {
        options = prepareAnimateOptions(options);
        options.addClass = mergeClasses(options.addClass, add);
        options.removeClass = mergeClasses(options.removeClass, remove);
        return $$animateQueue.push(element, 'setClass', options);
      },

      /**
       * @ngdoc method
       * @name $animate#animate
       * @kind function
       *
       * @description Performs an inline animation on the element which applies the provided to and from CSS styles to the element.
       * If any detected CSS transition, keyframe or JavaScript matches the provided className value, then the animation will take
       * on the provided styles. For example, if a transition animation is set for the given className, then the provided `from` and
       * `to` styles will be applied alongside the given transition. If the CSS style provided in `from` does not have a corresponding
       * style in `to`, the style in `from` is applied immediately, and no animation is run.
       * If a JavaScript animation is detected then the provided styles will be given in as function parameters into the `animate`
       * method (or as part of the `options` parameter):
       *
       * ```js
       * ngModule.animation('.my-inline-animation', function() {
       *   return {
       *     animate : function(element, from, to, done, options) {
       *       //animation
       *       done();
       *     }
       *   }
       * });
       * ```
       *
       * @param {DOMElement} element the element which the CSS styles will be applied to
       * @param {object} from the from (starting) CSS styles that will be applied to the element and across the animation.
       * @param {object} to the to (destination) CSS styles that will be applied to the element and across the animation.
       * @param {string=} className an optional CSS class that will be applied to the element for the duration of the animation. If
       *    this value is left as empty then a CSS class of `ng-inline-animate` will be applied to the element.
       *    (Note that if no animation is detected then this value will not be applied to the element.)
       * @param {object=} options an optional collection of options/styles that will be applied to the element.
       *   The object can have the following properties:
       *
       *   - **addClass** - `{string}` - space-separated CSS classes to add to element
       *   - **from** - `{Object}` - CSS properties & values at the beginning of animation. Must have matching `to`
       *   - **removeClass** - `{string}` - space-separated CSS classes to remove from element
       *   - **to** - `{Object}` - CSS properties & values at end of animation. Must have matching `from`
       *
       * @return {Promise} the animation callback promise
       */
      animate: function(element, from, to, className, options) {
        options = prepareAnimateOptions(options);
        options.from = options.from ? extend(options.from, from) : from;
        options.to   = options.to   ? extend(options.to, to)     : to;

        className = className || 'ng-inline-animate';
        options.tempClasses = mergeClasses(options.tempClasses, className);
        return $$animateQueue.push(element, 'animate', options);
      }
    };
  }];
}];

var $$AnimateAsyncRunFactoryProvider = /** @this */ function() {
  this.$get = ['$$rAF', function($$rAF) {
    var waitQueue = [];

    function waitForTick(fn) {
      waitQueue.push(fn);
      if (waitQueue.length > 1) return;
      $$rAF(function() {
        for (var i = 0; i < waitQueue.length; i++) {
          waitQueue[i]();
        }
        waitQueue = [];
      });
    }

    return function() {
      var passed = false;
      waitForTick(function() {
        passed = true;
      });
      return function(callback) {
        if (passed) {
          callback();
        } else {
          waitForTick(callback);
        }
      };
    };
  }];
};

var $$AnimateRunnerFactoryProvider = /** @this */ function() {
  this.$get = ['$q', '$sniffer', '$$animateAsyncRun', '$$isDocumentHidden', '$timeout',
       function($q,   $sniffer,   $$animateAsyncRun,   $$isDocumentHidden,   $timeout) {

    var INITIAL_STATE = 0;
    var DONE_PENDING_STATE = 1;
    var DONE_COMPLETE_STATE = 2;

    AnimateRunner.chain = function(chain, callback) {
      var index = 0;

      next();
      function next() {
        if (index === chain.length) {
          callback(true);
          return;
        }

        chain[index](function(response) {
          if (response === false) {
            callback(false);
            return;
          }
          index++;
          next();
        });
      }
    };

    AnimateRunner.all = function(runners, callback) {
      var count = 0;
      var status = true;
      forEach(runners, function(runner) {
        runner.done(onProgress);
      });

      function onProgress(response) {
        status = status && response;
        if (++count === runners.length) {
          callback(status);
        }
      }
    };

    function AnimateRunner(host) {
      this.setHost(host);

      var rafTick = $$animateAsyncRun();
      var timeoutTick = function(fn) {
        $timeout(fn, 0, false);
      };

      this._doneCallbacks = [];
      this._tick = function(fn) {
        if ($$isDocumentHidden()) {
          timeoutTick(fn);
        } else {
          rafTick(fn);
        }
      };
      this._state = 0;
    }

    AnimateRunner.prototype = {
      setHost: function(host) {
        this.host = host || {};
      },

      done: function(fn) {
        if (this._state === DONE_COMPLETE_STATE) {
          fn();
        } else {
          this._doneCallbacks.push(fn);
        }
      },

      progress: noop,

      getPromise: function() {
        if (!this.promise) {
          var self = this;
          this.promise = $q(function(resolve, reject) {
            self.done(function(status) {
              if (status === false) {
                reject();
              } else {
                resolve();
              }
            });
          });
        }
        return this.promise;
      },

      then: function(resolveHandler, rejectHandler) {
        return this.getPromise().then(resolveHandler, rejectHandler);
      },

      'catch': function(handler) {
        return this.getPromise()['catch'](handler);
      },

      'finally': function(handler) {
        return this.getPromise()['finally'](handler);
      },

      pause: function() {
        if (this.host.pause) {
          this.host.pause();
        }
      },

      resume: function() {
        if (this.host.resume) {
          this.host.resume();
        }
      },

      end: function() {
        if (this.host.end) {
          this.host.end();
        }
        this._resolve(true);
      },

      cancel: function() {
        if (this.host.cancel) {
          this.host.cancel();
        }
        this._resolve(false);
      },

      complete: function(response) {
        var self = this;
        if (self._state === INITIAL_STATE) {
          self._state = DONE_PENDING_STATE;
          self._tick(function() {
            self._resolve(response);
          });
        }
      },

      _resolve: function(response) {
        if (this._state !== DONE_COMPLETE_STATE) {
          forEach(this._doneCallbacks, function(fn) {
            fn(response);
          });
          this._doneCallbacks.length = 0;
          this._state = DONE_COMPLETE_STATE;
        }
      }
    };

    return AnimateRunner;
  }];
};

/* exported $CoreAnimateCssProvider */

/**
 * @ngdoc service
 * @name $animateCss
 * @kind object
 * @this
 *
 * @description
 * This is the core version of `$animateCss`. By default, only when the `ngAnimate` is included,
 * then the `$animateCss` service will actually perform animations.
 *
 * Click here {@link ngAnimate.$animateCss to read the documentation for $animateCss}.
 */
var $CoreAnimateCssProvider = function() {
  this.$get = ['$$rAF', '$q', '$$AnimateRunner', function($$rAF, $q, $$AnimateRunner) {

    return function(element, initialOptions) {
      // all of the animation functions should create
      // a copy of the options data, however, if a
      // parent service has already created a copy then
      // we should stick to using that
      var options = initialOptions || {};
      if (!options.$$prepared) {
        options = copy(options);
      }

      // there is no point in applying the styles since
      // there is no animation that goes on at all in
      // this version of $animateCss.
      if (options.cleanupStyles) {
        options.from = options.to = null;
      }

      if (options.from) {
        element.css(options.from);
        options.from = null;
      }

      var closed, runner = new $$AnimateRunner();
      return {
        start: run,
        end: run
      };

      function run() {
        $$rAF(function() {
          applyAnimationContents();
          if (!closed) {
            runner.complete();
          }
          closed = true;
        });
        return runner;
      }

      function applyAnimationContents() {
        if (options.addClass) {
          element.addClass(options.addClass);
          options.addClass = null;
        }
        if (options.removeClass) {
          element.removeClass(options.removeClass);
          options.removeClass = null;
        }
        if (options.to) {
          element.css(options.to);
          options.to = null;
        }
      }
    };
  }];
};

/* global stripHash: true */

/**
 * ! This is a private undocumented service !
 *
 * @name $browser
 * @requires $log
 * @description
 * This object has two goals:
 *
 * - hide all the global state in the browser caused by the window object
 * - abstract away all the browser specific features and inconsistencies
 *
 * For tests we provide {@link ngMock.$browser mock implementation} of the `$browser`
 * service, which can be used for convenient testing of the application without the interaction with
 * the real browser apis.
 */
/**
 * @param {object} window The global window object.
 * @param {object} document jQuery wrapped document.
 * @param {object} $log window.console or an object with the same interface.
 * @param {object} $sniffer $sniffer service
 */
function Browser(window, document, $log, $sniffer) {
  var self = this,
      location = window.location,
      history = window.history,
      setTimeout = window.setTimeout,
      clearTimeout = window.clearTimeout,
      pendingDeferIds = {};

  self.isMock = false;

  var outstandingRequestCount = 0;
  var outstandingRequestCallbacks = [];

  // TODO(vojta): remove this temporary api
  self.$$completeOutstandingRequest = completeOutstandingRequest;
  self.$$incOutstandingRequestCount = function() { outstandingRequestCount++; };

  /**
   * Executes the `fn` function(supports currying) and decrements the `outstandingRequestCallbacks`
   * counter. If the counter reaches 0, all the `outstandingRequestCallbacks` are executed.
   */
  function completeOutstandingRequest(fn) {
    try {
      fn.apply(null, sliceArgs(arguments, 1));
    } finally {
      outstandingRequestCount--;
      if (outstandingRequestCount === 0) {
        while (outstandingRequestCallbacks.length) {
          try {
            outstandingRequestCallbacks.pop()();
          } catch (e) {
            $log.error(e);
          }
        }
      }
    }
  }

  function getHash(url) {
    var index = url.indexOf('#');
    return index === -1 ? '' : url.substr(index);
  }

  /**
   * @private
   * Note: this method is used only by scenario runner
   * TODO(vojta): prefix this method with $$ ?
   * @param {function()} callback Function that will be called when no outstanding request
   */
  self.notifyWhenNoOutstandingRequests = function(callback) {
    if (outstandingRequestCount === 0) {
      callback();
    } else {
      outstandingRequestCallbacks.push(callback);
    }
  };

  //////////////////////////////////////////////////////////////
  // URL API
  //////////////////////////////////////////////////////////////

  var cachedState, lastHistoryState,
      lastBrowserUrl = location.href,
      baseElement = document.find('base'),
      pendingLocation = null,
      getCurrentState = !$sniffer.history ? noop : function getCurrentState() {
        try {
          return history.state;
        } catch (e) {
          // MSIE can reportedly throw when there is no state (UNCONFIRMED).
        }
      };

  cacheState();

  /**
   * @name $browser#url
   *
   * @description
   * GETTER:
   * Without any argument, this method just returns current value of location.href.
   *
   * SETTER:
   * With at least one argument, this method sets url to new value.
   * If html5 history api supported, pushState/replaceState is used, otherwise
   * location.href/location.replace is used.
   * Returns its own instance to allow chaining
   *
   * NOTE: this api is intended for use only by the $location service. Please use the
   * {@link ng.$location $location service} to change url.
   *
   * @param {string} url New url (when used as setter)
   * @param {boolean=} replace Should new url replace current history record?
   * @param {object=} state object to use with pushState/replaceState
   */
  self.url = function(url, replace, state) {
    // In modern browsers `history.state` is `null` by default; treating it separately
    // from `undefined` would cause `$browser.url('/foo')` to change `history.state`
    // to undefined via `pushState`. Instead, let's change `undefined` to `null` here.
    if (isUndefined(state)) {
      state = null;
    }

    // Android Browser BFCache causes location, history reference to become stale.
    if (location !== window.location) location = window.location;
    if (history !== window.history) history = window.history;

    // setter
    if (url) {
      var sameState = lastHistoryState === state;

      // Don't change anything if previous and current URLs and states match. This also prevents
      // IE<10 from getting into redirect loop when in LocationHashbangInHtml5Url mode.
      // See https://github.com/angular/angular.js/commit/ffb2701
      if (lastBrowserUrl === url && (!$sniffer.history || sameState)) {
        return self;
      }
      var sameBase = lastBrowserUrl && stripHash(lastBrowserUrl) === stripHash(url);
      lastBrowserUrl = url;
      lastHistoryState = state;
      // Don't use history API if only the hash changed
      // due to a bug in IE10/IE11 which leads
      // to not firing a `hashchange` nor `popstate` event
      // in some cases (see #9143).
      if ($sniffer.history && (!sameBase || !sameState)) {
        history[replace ? 'replaceState' : 'pushState'](state, '', url);
        cacheState();
      } else {
        if (!sameBase) {
          pendingLocation = url;
        }
        if (replace) {
          location.replace(url);
        } else if (!sameBase) {
          location.href = url;
        } else {
          location.hash = getHash(url);
        }
        if (location.href !== url) {
          pendingLocation = url;
        }
      }
      if (pendingLocation) {
        pendingLocation = url;
      }
      return self;
    // getter
    } else {
      // - pendingLocation is needed as browsers don't allow to read out
      //   the new location.href if a reload happened or if there is a bug like in iOS 9 (see
      //   https://openradar.appspot.com/22186109).
      // - the replacement is a workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=407172
      return pendingLocation || location.href.replace(/%27/g,'\'');
    }
  };

  /**
   * @name $browser#state
   *
   * @description
   * This method is a getter.
   *
   * Return history.state or null if history.state is undefined.
   *
   * @returns {object} state
   */
  self.state = function() {
    return cachedState;
  };

  var urlChangeListeners = [],
      urlChangeInit = false;

  function cacheStateAndFireUrlChange() {
    pendingLocation = null;
    fireStateOrUrlChange();
  }

  // This variable should be used *only* inside the cacheState function.
  var lastCachedState = null;
  function cacheState() {
    // This should be the only place in $browser where `history.state` is read.
    cachedState = getCurrentState();
    cachedState = isUndefined(cachedState) ? null : cachedState;

    // Prevent callbacks fo fire twice if both hashchange & popstate were fired.
    if (equals(cachedState, lastCachedState)) {
      cachedState = lastCachedState;
    }

    lastCachedState = cachedState;
    lastHistoryState = cachedState;
  }

  function fireStateOrUrlChange() {
    var prevLastHistoryState = lastHistoryState;
    cacheState();

    if (lastBrowserUrl === self.url() && prevLastHistoryState === cachedState) {
      return;
    }

    lastBrowserUrl = self.url();
    lastHistoryState = cachedState;
    forEach(urlChangeListeners, function(listener) {
      listener(self.url(), cachedState);
    });
  }

  /**
   * @name $browser#onUrlChange
   *
   * @description
   * Register callback function that will be called, when url changes.
   *
   * It's only called when the url is changed from outside of angular:
   * - user types different url into address bar
   * - user clicks on history (forward/back) button
   * - user clicks on a link
   *
   * It's not called when url is changed by $browser.url() method
   *
   * The listener gets called with new url as parameter.
   *
   * NOTE: this api is intended for use only by the $location service. Please use the
   * {@link ng.$location $location service} to monitor url changes in angular apps.
   *
   * @param {function(string)} listener Listener function to be called when url changes.
   * @return {function(string)} Returns the registered listener fn - handy if the fn is anonymous.
   */
  self.onUrlChange = function(callback) {
    // TODO(vojta): refactor to use node's syntax for events
    if (!urlChangeInit) {
      // We listen on both (hashchange/popstate) when available, as some browsers don't
      // fire popstate when user changes the address bar and don't fire hashchange when url
      // changed by push/replaceState

      // html5 history api - popstate event
      if ($sniffer.history) jqLite(window).on('popstate', cacheStateAndFireUrlChange);
      // hashchange event
      jqLite(window).on('hashchange', cacheStateAndFireUrlChange);

      urlChangeInit = true;
    }

    urlChangeListeners.push(callback);
    return callback;
  };

  /**
   * @private
   * Remove popstate and hashchange handler from window.
   *
   * NOTE: this api is intended for use only by $rootScope.
   */
  self.$$applicationDestroyed = function() {
    jqLite(window).off('hashchange popstate', cacheStateAndFireUrlChange);
  };

  /**
   * Checks whether the url has changed outside of Angular.
   * Needs to be exported to be able to check for changes that have been done in sync,
   * as hashchange/popstate events fire in async.
   */
  self.$$checkUrlChange = fireStateOrUrlChange;

  //////////////////////////////////////////////////////////////
  // Misc API
  //////////////////////////////////////////////////////////////

  /**
   * @name $browser#baseHref
   *
   * @description
   * Returns current <base href>
   * (always relative - without domain)
   *
   * @returns {string} The current base href
   */
  self.baseHref = function() {
    var href = baseElement.attr('href');
    return href ? href.replace(/^(https?:)?\/\/[^/]*/, '') : '';
  };

  /**
   * @name $browser#defer
   * @param {function()} fn A function, who's execution should be deferred.
   * @param {number=} [delay=0] of milliseconds to defer the function execution.
   * @returns {*} DeferId that can be used to cancel the task via `$browser.defer.cancel()`.
   *
   * @description
   * Executes a fn asynchronously via `setTimeout(fn, delay)`.
   *
   * Unlike when calling `setTimeout` directly, in test this function is mocked and instead of using
   * `setTimeout` in tests, the fns are queued in an array, which can be programmatically flushed
   * via `$browser.defer.flush()`.
   *
   */
  self.defer = function(fn, delay) {
    var timeoutId;
    outstandingRequestCount++;
    timeoutId = setTimeout(function() {
      delete pendingDeferIds[timeoutId];
      completeOutstandingRequest(fn);
    }, delay || 0);
    pendingDeferIds[timeoutId] = true;
    return timeoutId;
  };


  /**
   * @name $browser#defer.cancel
   *
   * @description
   * Cancels a deferred task identified with `deferId`.
   *
   * @param {*} deferId Token returned by the `$browser.defer` function.
   * @returns {boolean} Returns `true` if the task hasn't executed yet and was successfully
   *                    canceled.
   */
  self.defer.cancel = function(deferId) {
    if (pendingDeferIds[deferId]) {
      delete pendingDeferIds[deferId];
      clearTimeout(deferId);
      completeOutstandingRequest(noop);
      return true;
    }
    return false;
  };

}

/** @this */
function $BrowserProvider() {
  this.$get = ['$window', '$log', '$sniffer', '$document',
      function($window, $log, $sniffer, $document) {
        return new Browser($window, $document, $log, $sniffer);
      }];
}

function $CacheFactoryProvider() {

  this.$get = function() {
    var caches = {};

    function cacheFactory(cacheId, options) {
      if (cacheId in caches) {
        throw minErr('$cacheFactory')('iid', 'CacheId \'{0}\' is already taken!', cacheId);
      }

      var size = 0,
          stats = extend({}, options, {id: cacheId}),
          data = createMap(),
          capacity = (options && options.capacity) || Number.MAX_VALUE,
          lruHash = createMap(),
          freshEnd = null,
          staleEnd = null;

      return (caches[cacheId] = {

        put: function(key, value) {
          if (isUndefined(value)) return;
          if (capacity < Number.MAX_VALUE) {
            var lruEntry = lruHash[key] || (lruHash[key] = {key: key});

            refresh(lruEntry);
          }

          if (!(key in data)) size++;
          data[key] = value;

          if (size > capacity) {
            this.remove(staleEnd.key);
          }

          return value;
        },

        get: function(key) {
          if (capacity < Number.MAX_VALUE) {
            var lruEntry = lruHash[key];

            if (!lruEntry) return;

            refresh(lruEntry);
          }

          return data[key];
        },


        remove: function(key) {
          if (capacity < Number.MAX_VALUE) {
            var lruEntry = lruHash[key];

            if (!lruEntry) return;

            if (lruEntry === freshEnd) freshEnd = lruEntry.p;
            if (lruEntry === staleEnd) staleEnd = lruEntry.n;
            link(lruEntry.n,lruEntry.p);

            delete lruHash[key];
          }

          if (!(key in data)) return;

          delete data[key];
          size--;
        },


        removeAll: function() {
          data = createMap();
          size = 0;
          lruHash = createMap();
          freshEnd = staleEnd = null;
        },


        destroy: function() {
          data = null;
          stats = null;
          lruHash = null;
          delete caches[cacheId];
        },

        info: function() {
          return extend({}, stats, {size: size});
        }
      });

      function refresh(entry) {
        if (entry !== freshEnd) {
          if (!staleEnd) {
            staleEnd = entry;
          } else if (staleEnd === entry) {
            staleEnd = entry.n;
          }

          link(entry.n, entry.p);
          link(entry, freshEnd);
          freshEnd = entry;
          freshEnd.n = null;
        }
      }


      function link(nextEntry, prevEntry) {
        if (nextEntry !== prevEntry) {
          if (nextEntry) nextEntry.p = prevEntry; //p stands for previous, 'prev' didn't minify
          if (prevEntry) prevEntry.n = nextEntry; //n stands for next, 'next' didn't minify
        }
      }
    }


    cacheFactory.info = function() {
      var info = {};
      forEach(caches, function(cache, cacheId) {
        info[cacheId] = cache.info();
      });
      return info;
    };


  /**
   * @ngdoc method
   * @name $cacheFactory#get
   *
   * @description
   * Get access to a cache object by the `cacheId` used when it was created.
   *
   * @param {string} cacheId Name or id of a cache to access.
   * @returns {object} Cache object identified by the cacheId or undefined if no such cache.
   */
    cacheFactory.get = function(cacheId) {
      return caches[cacheId];
    };


    return cacheFactory;
  };
}

/**
 * @ngdoc service
 * @name $templateCache
 * @this
 *
 * @description
 * The first time a template is used, it is loaded in the template cache for quick retrieval. You
 * can load templates directly into the cache in a `script` tag, or by consuming the
 * `$templateCache` service directly.
 *
 * Adding via the `script` tag:
 *
 * ```html
 *   <script type="text/ng-template" id="templateId.html">
 *     <p>This is the content of the template</p>
 *   </script>
 * ```
 *
 * **Note:** the `script` tag containing the template does not need to be included in the `head` of
 * the document, but it must be a descendent of the {@link ng.$rootElement $rootElement} (IE,
 * element with ng-app attribute), otherwise the template will be ignored.
 *
 * Adding via the `$templateCache` service:
 *
 * ```js
 * var myApp = angular.module('myApp', []);
 * myApp.run(function($templateCache) {
 *   $templateCache.put('templateId.html', 'This is the content of the template');
 * });
 * ```
 *
 * To retrieve the template later, simply use it in your component:
 * ```js
 * myApp.component('myComponent', {
 *    templateUrl: 'templateId.html'
 * });
 * ```
 *
 * or get it via the `$templateCache` service:
 * ```js
 * $templateCache.get('templateId.html')
 * ```
 *
 * See {@link ng.$cacheFactory $cacheFactory}.
 *
 */
function $TemplateCacheProvider() {
  this.$get = ['$cacheFactory', function($cacheFactory) {
    return $cacheFactory('templates');
  }];
}


var $compileMinErr = minErr('$compile');

function UNINITIALIZED_VALUE() {}
var _UNINITIALIZED_VALUE = new UNINITIALIZED_VALUE();

/**
 * @ngdoc provider
 * @name $compileProvider
 *
 * @description
 */
$CompileProvider.$inject = ['$provide', '$$sanitizeUriProvider'];
/** @this */
function $CompileProvider($provide, $$sanitizeUriProvider) {
  var hasDirectives = {},
      Suffix = 'Directive',
      COMMENT_DIRECTIVE_REGEXP = /^\s*directive:\s*([\w-]+)\s+(.*)$/,
      CLASS_DIRECTIVE_REGEXP = /(([\w-]+)(?::([^;]+))?;?)/,
      ALL_OR_NOTHING_ATTRS = makeMap('ngSrc,ngSrcset,src,srcset'),
      REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;

  // Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
  // The assumption is that future DOM event attribute names will begin with
  // 'on' and be composed of only English letters.
  var EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;
  var bindingCache = createMap();

  function parseIsolateBindings(scope, directiveName, isController) {
    var LOCAL_REGEXP = /^\s*([@&<]|=(\*?))(\??)\s*([\w$]*)\s*$/;

    var bindings = createMap();

    forEach(scope, function(definition, scopeName) {
      if (definition in bindingCache) {
        bindings[scopeName] = bindingCache[definition];
        return;
      }
      var match = definition.match(LOCAL_REGEXP);

      if (!match) {
        throw $compileMinErr('iscp',
            'Invalid {3} for directive \'{0}\'.' +
            ' Definition: {... {1}: \'{2}\' ...}',
            directiveName, scopeName, definition,
            (isController ? 'controller bindings definition' :
            'isolate scope definition'));
      }

      bindings[scopeName] = {
        mode: match[1][0],
        collection: match[2] === '*',
        optional: match[3] === '?',
        attrName: match[4] || scopeName
      };
      if (match[4]) {
        bindingCache[definition] = bindings[scopeName];
      }
    });

    return bindings;
  }

  function parseDirectiveBindings(directive, directiveName) {
    var bindings = {
      isolateScope: null,
      bindToController: null
    };
    if (isObject(directive.scope)) {
      if (directive.bindToController === true) {
        bindings.bindToController = parseIsolateBindings(directive.scope,
                                                         directiveName, true);
        bindings.isolateScope = {};
      } else {
        bindings.isolateScope = parseIsolateBindings(directive.scope,
                                                     directiveName, false);
      }
    }
    if (isObject(directive.bindToController)) {
      bindings.bindToController =
          parseIsolateBindings(directive.bindToController, directiveName, true);
    }
    if (bindings.bindToController && !directive.controller) {
      // There is no controller
      throw $compileMinErr('noctrl',
            'Cannot bind to controller without directive \'{0}\'s controller.',
            directiveName);
    }
    return bindings;
  }

  function assertValidDirectiveName(name) {
    var letter = name.charAt(0);
    if (!letter || letter !== lowercase(letter)) {
      throw $compileMinErr('baddir', 'Directive/Component name \'{0}\' is invalid. The first character must be a lowercase letter', name);
    }
    if (name !== name.trim()) {
      throw $compileMinErr('baddir',
            'Directive/Component name \'{0}\' is invalid. The name should not contain leading or trailing whitespaces',
            name);
    }
  }

  function getDirectiveRequire(directive) {
    var require = directive.require || (directive.controller && directive.name);

    if (!isArray(require) && isObject(require)) {
      forEach(require, function(value, key) {
        var match = value.match(REQUIRE_PREFIX_REGEXP);
        var name = value.substring(match[0].length);
        if (!name) require[key] = match[0] + key;
      });
    }

    return require;
  }

  function getDirectiveRestrict(restrict, name) {
    if (restrict && !(isString(restrict) && /[EACM]/.test(restrict))) {
      throw $compileMinErr('badrestrict',
          'Restrict property \'{0}\' of directive \'{1}\' is invalid',
          restrict,
          name);
    }

    return restrict || 'EA';
  }

  this.directive = function registerDirective(name, directiveFactory) {
    assertArg(name, 'name');
    assertNotHasOwnProperty(name, 'directive');
    if (isString(name)) {
      assertValidDirectiveName(name);
      assertArg(directiveFactory, 'directiveFactory');
      if (!hasDirectives.hasOwnProperty(name)) {
        hasDirectives[name] = [];
        $provide.factory(name + Suffix, ['$injector', '$exceptionHandler',
          function($injector, $exceptionHandler) {
            var directives = [];
            forEach(hasDirectives[name], function(directiveFactory, index) {
              try {
                var directive = $injector.invoke(directiveFactory);
                if (isFunction(directive)) {
                  directive = { compile: valueFn(directive) };
                } else if (!directive.compile && directive.link) {
                  directive.compile = valueFn(directive.link);
                }
                directive.priority = directive.priority || 0;
                directive.index = index;
                directive.name = directive.name || name;
                directive.require = getDirectiveRequire(directive);
                directive.restrict = getDirectiveRestrict(directive.restrict, name);
                directive.$$moduleName = directiveFactory.$$moduleName;
                directives.push(directive);
              } catch (e) {
                $exceptionHandler(e);
              }
            });
            return directives;
          }]);
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      forEach(name, reverseParams(registerDirective));
    }
    return this;
  };

  this.component = function registerComponent(name, options) {
    var controller = options.controller || function() {};

    function factory($injector) {
      function makeInjectable(fn) {
        if (isFunction(fn) || isArray(fn)) {
          return /** @this */ function(tElement, tAttrs) {
            return $injector.invoke(fn, this, {$element: tElement, $attrs: tAttrs});
          };
        } else {
          return fn;
        }
      }

      var template = (!options.template && !options.templateUrl ? '' : options.template);
      var ddo = {
        controller: controller,
        controllerAs: identifierForController(options.controller) || options.controllerAs || '$ctrl',
        template: makeInjectable(template),
        templateUrl: makeInjectable(options.templateUrl),
        transclude: options.transclude,
        scope: {},
        bindToController: options.bindings || {},
        restrict: 'E',
        require: options.require
      };

      // Copy annotations (starting with $) over to the DDO
      forEach(options, function(val, key) {
        if (key.charAt(0) === '$') ddo[key] = val;
      });

      return ddo;
    }

    // TODO(pete) remove the following `forEach` before we release 1.6.0
    // The component-router@0.2.0 looks for the annotations on the controller constructor
    // Nothing in Angular looks for annotations on the factory function but we can't remove
    // it from 1.5.x yet.

    // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
    // These could be used by libraries such as the new component router
    forEach(options, function(val, key) {
      if (key.charAt(0) === '$') {
        factory[key] = val;
        // Don't try to copy over annotations to named controller
        if (isFunction(controller)) controller[key] = val;
      }
    });

    factory.$inject = ['$injector'];

    return this.directive(name, factory);
  };


  /**
   * @ngdoc method
   * @name $compileProvider#aHrefSanitizationWhitelist
   * @kind function
   *
   * @description
   * Retrieves or overrides the default regular expression that is used for whitelisting of safe
   * urls during a[href] sanitization.
   *
   * The sanitization is a security measure aimed at preventing XSS attacks via html links.
   *
   * Any url about to be assigned to a[href] via data-binding is first normalized and turned into
   * an absolute url. Afterwards, the url is matched against the `aHrefSanitizationWhitelist`
   * regular expression. If a match is found, the original url is written into the dom. Otherwise,
   * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
   *
   * @param {RegExp=} regexp New regexp to whitelist urls with.
   * @returns {RegExp|ng.$compileProvider} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  this.aHrefSanitizationWhitelist = function(regexp) {
    if (isDefined(regexp)) {
      $$sanitizeUriProvider.aHrefSanitizationWhitelist(regexp);
      return this;
    } else {
      return $$sanitizeUriProvider.aHrefSanitizationWhitelist();
    }
  };


  /**
   * @ngdoc method
   * @name $compileProvider#imgSrcSanitizationWhitelist
   * @kind function
   *
   * @description
   * Retrieves or overrides the default regular expression that is used for whitelisting of safe
   * urls during img[src] sanitization.
   *
   * The sanitization is a security measure aimed at prevent XSS attacks via html links.
   *
   * Any url about to be assigned to img[src] via data-binding is first normalized and turned into
   * an absolute url. Afterwards, the url is matched against the `imgSrcSanitizationWhitelist`
   * regular expression. If a match is found, the original url is written into the dom. Otherwise,
   * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
   *
   * @param {RegExp=} regexp New regexp to whitelist urls with.
   * @returns {RegExp|ng.$compileProvider} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  this.imgSrcSanitizationWhitelist = function(regexp) {
    if (isDefined(regexp)) {
      $$sanitizeUriProvider.imgSrcSanitizationWhitelist(regexp);
      return this;
    } else {
      return $$sanitizeUriProvider.imgSrcSanitizationWhitelist();
    }
  };

  /**
   * @ngdoc method
   * @name  $compileProvider#debugInfoEnabled
   *
   * @param {boolean=} enabled update the debugInfoEnabled state if provided, otherwise just return the
   * current debugInfoEnabled state
   * @returns {*} current value if used as getter or itself (chaining) if used as setter
   *
   * @kind function
   *
   * @description
   * Call this method to enable/disable various debug runtime information in the compiler such as adding
   * binding information and a reference to the current scope on to DOM elements.
   * If enabled, the compiler will add the following to DOM elements that have been bound to the scope
   * * `ng-binding` CSS class
   * * `$binding` data property containing an array of the binding expressions
   *
   * You may want to disable this in production for a significant performance boost. See
   * {@link guide/production#disabling-debug-data Disabling Debug Data} for more.
   *
   * The default value is true.
   */
  var debugInfoEnabled = true;
  this.debugInfoEnabled = function(enabled) {
    if (isDefined(enabled)) {
      debugInfoEnabled = enabled;
      return this;
    }
    return debugInfoEnabled;
  };

  /**
   * @ngdoc method
   * @name  $compileProvider#preAssignBindingsEnabled
   *
   * @param {boolean=} enabled update the preAssignBindingsEnabled state if provided, otherwise just return the
   * current preAssignBindingsEnabled state
   * @returns {*} current value if used as getter or itself (chaining) if used as setter
   *
   * @kind function
   *
   * @description
   * Call this method to enable/disable whether directive controllers are assigned bindings before
   * calling the controller's constructor.
   * If enabled (true), the compiler assigns the value of each of the bindings to the
   * properties of the controller object before the constructor of this object is called.
   *
   * If disabled (false), the compiler calls the constructor first before assigning bindings.
   *
   * The default value is false.
   *
   * @deprecated
   * sinceVersion="1.6.0"
   * removeVersion="1.7.0"
   *
   * This method and the option to assign the bindings before calling the controller's constructor
   * will be removed in v1.7.0.
   */
  var preAssignBindingsEnabled = false;
  this.preAssignBindingsEnabled = function(enabled) {
    if (isDefined(enabled)) {
      preAssignBindingsEnabled = enabled;
      return this;
    }
    return preAssignBindingsEnabled;
  };


  var TTL = 10;
  /**
   * @ngdoc method
   * @name $compileProvider#onChangesTtl
   * @description
   *
   * Sets the number of times `$onChanges` hooks can trigger new changes before giving up and
   * assuming that the model is unstable.
   *
   * The current default is 10 iterations.
   *
   * In complex applications it's possible that dependencies between `$onChanges` hooks and bindings will result
   * in several iterations of calls to these hooks. However if an application needs more than the default 10
   * iterations to stabilize then you should investigate what is causing the model to continuously change during
   * the `$onChanges` hook execution.
   *
   * Increasing the TTL could have performance implications, so you should not change it without proper justification.
   *
   * @param {number} limit The number of `$onChanges` hook iterations.
   * @returns {number|object} the current limit (or `this` if called as a setter for chaining)
   */
  this.onChangesTtl = function(value) {
    if (arguments.length) {
      TTL = value;
      return this;
    }
    return TTL;
  };

  var commentDirectivesEnabledConfig = true;
  /**
   * @ngdoc method
   * @name $compileProvider#commentDirectivesEnabled
   * @description
   *
   * It indicates to the compiler
   * whether or not directives on comments should be compiled.
   * Defaults to `true`.
   *
   * Calling this function with false disables the compilation of directives
   * on comments for the whole application.
   * This results in a compilation performance gain,
   * as the compiler doesn't have to check comments when looking for directives.
   * This should however only be used if you are sure that no comment directives are used in
   * the application (including any 3rd party directives).
   *
   * @param {boolean} enabled `false` if the compiler may ignore directives on comments
   * @returns {boolean|object} the current value (or `this` if called as a setter for chaining)
   */
  this.commentDirectivesEnabled = function(value) {
    if (arguments.length) {
      commentDirectivesEnabledConfig = value;
      return this;
    }
    return commentDirectivesEnabledConfig;
  };


  var cssClassDirectivesEnabledConfig = true;
  /**
   * @ngdoc method
   * @name $compileProvider#cssClassDirectivesEnabled
   * @description
   *
   * It indicates to the compiler
   * whether or not directives on element classes should be compiled.
   * Defaults to `true`.
   *
   * Calling this function with false disables the compilation of directives
   * on element classes for the whole application.
   * This results in a compilation performance gain,
   * as the compiler doesn't have to check element classes when looking for directives.
   * This should however only be used if you are sure that no class directives are used in
   * the application (including any 3rd party directives).
   *
   * @param {boolean} enabled `false` if the compiler may ignore directives on element classes
   * @returns {boolean|object} the current value (or `this` if called as a setter for chaining)
   */
  this.cssClassDirectivesEnabled = function(value) {
    if (arguments.length) {
      cssClassDirectivesEnabledConfig = value;
      return this;
    }
    return cssClassDirectivesEnabledConfig;
  };

  this.$get = [
            '$injector', '$interpolate', '$exceptionHandler', '$templateRequest', '$parse',
            '$controller', '$rootScope', '$sce', '$animate', '$$sanitizeUri',
    function($injector,   $interpolate,   $exceptionHandler,   $templateRequest,   $parse,
             $controller,   $rootScope,   $sce,   $animate,   $$sanitizeUri) {

    var SIMPLE_ATTR_NAME = /^\w/;
    var specialAttrHolder = window.document.createElement('div');


    var commentDirectivesEnabled = commentDirectivesEnabledConfig;
    var cssClassDirectivesEnabled = cssClassDirectivesEnabledConfig;


    var onChangesTtl = TTL;
    // The onChanges hooks should all be run together in a single digest
    // When changes occur, the call to trigger their hooks will be added to this queue
    var onChangesQueue;

    // This function is called in a $$postDigest to trigger all the onChanges hooks in a single digest
    function flushOnChangesQueue() {
      try {
        if (!(--onChangesTtl)) {
          // We have hit the TTL limit so reset everything
          onChangesQueue = undefined;
          throw $compileMinErr('infchng', '{0} $onChanges() iterations reached. Aborting!\n', TTL);
        }
        // We must run this hook in an apply since the $$postDigest runs outside apply
        $rootScope.$apply(function() {
          var errors = [];
          for (var i = 0, ii = onChangesQueue.length; i < ii; ++i) {
            try {
              onChangesQueue[i]();
            } catch (e) {
              errors.push(e);
            }
          }
          // Reset the queue to trigger a new schedule next time there is a change
          onChangesQueue = undefined;
          if (errors.length) {
            throw errors;
          }
        });
      } finally {
        onChangesTtl++;
      }
    }


    function Attributes(element, attributesToCopy) {
      if (attributesToCopy) {
        var keys = Object.keys(attributesToCopy);
        var i, l, key;

        for (i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          this[key] = attributesToCopy[key];
        }
      } else {
        this.$attr = {};
      }

      this.$$element = element;
    }

    Attributes.prototype = {
      /**
       * @ngdoc method
       * @name $compile.directive.Attributes#$normalize
       * @kind function
       *
       * @description
       * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `x-` or
       * `data-`) to its normalized, camelCase form.
       *
       * Also there is special case for Moz prefix starting with upper case letter.
       *
       * For further information check out the guide on {@link guide/directive#matching-directives Matching Directives}
       *
       * @param {string} name Name to normalize
       */
      $normalize: directiveNormalize,


      /**
       * @ngdoc method
       * @name $compile.directive.Attributes#$addClass
       * @kind function
       *
       * @description
       * Adds the CSS class value specified by the classVal parameter to the element. If animations
       * are enabled then an animation will be triggered for the class addition.
       *
       * @param {string} classVal The className value that will be added to the element
       */
      $addClass: function(classVal) {
        if (classVal && classVal.length > 0) {
          $animate.addClass(this.$$element, classVal);
        }
      },

      /**
       * @ngdoc method
       * @name $compile.directive.Attributes#$removeClass
       * @kind function
       *
       * @description
       * Removes the CSS class value specified by the classVal parameter from the element. If
       * animations are enabled then an animation will be triggered for the class removal.
       *
       * @param {string} classVal The className value that will be removed from the element
       */
      $removeClass: function(classVal) {
        if (classVal && classVal.length > 0) {
          $animate.removeClass(this.$$element, classVal);
        }
      },

      /**
       * @ngdoc method
       * @name $compile.directive.Attributes#$updateClass
       * @kind function
       *
       * @description
       * Adds and removes the appropriate CSS class values to the element based on the difference
       * between the new and old CSS class values (specified as newClasses and oldClasses).
       *
       * @param {string} newClasses The current CSS className value
       * @param {string} oldClasses The former CSS className value
       */
      $updateClass: function(newClasses, oldClasses) {
        var toAdd = tokenDifference(newClasses, oldClasses);
        if (toAdd && toAdd.length) {
          $animate.addClass(this.$$element, toAdd);
        }

        var toRemove = tokenDifference(oldClasses, newClasses);
        if (toRemove && toRemove.length) {
          $animate.removeClass(this.$$element, toRemove);
        }
      },

      /**
       * Set a normalized attribute on the element in a way such that all directives
       * can share the attribute. This function properly handles boolean attributes.
       * @param {string} key Normalized key. (ie ngAttribute)
       * @param {string|boolean} value The value to set. If `null` attribute will be deleted.
       * @param {boolean=} writeAttr If false, does not write the value to DOM element attribute.
       *     Defaults to true.
       * @param {string=} attrName Optional none normalized name. Defaults to key.
       */
      $set: function(key, value, writeAttr, attrName) {
        // TODO: decide whether or not to throw an error if "class"
        //is set through this function since it may cause $updateClass to
        //become unstable.

        var node = this.$$element[0],
            booleanKey = getBooleanAttrName(node, key),
            aliasedKey = getAliasedAttrName(key),
            observer = key,
            nodeName;

        if (booleanKey) {
          this.$$element.prop(key, value);
          attrName = booleanKey;
        } else if (aliasedKey) {
          this[aliasedKey] = value;
          observer = aliasedKey;
        }

        this[key] = value;

        // translate normalized key to actual key
        if (attrName) {
          this.$attr[key] = attrName;
        } else {
          attrName = this.$attr[key];
          if (!attrName) {
            this.$attr[key] = attrName = snake_case(key, '-');
          }
        }

        nodeName = nodeName_(this.$$element);

        if ((nodeName === 'a' && (key === 'href' || key === 'xlinkHref')) ||
            (nodeName === 'img' && key === 'src')) {
          // sanitize a[href] and img[src] values
          this[key] = value = $$sanitizeUri(value, key === 'src');
        } else if (nodeName === 'img' && key === 'srcset' && isDefined(value)) {
          // sanitize img[srcset] values
          var result = '';

          // first check if there are spaces because it's not the same pattern
          var trimmedSrcset = trim(value);
          //                (   999x   ,|   999w   ,|   ,|,   )
          var srcPattern = /(\s+\d+x\s*,|\s+\d+w\s*,|\s+,|,\s+)/;
          var pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

          // split srcset into tuple of uri and descriptor except for the last item
          var rawUris = trimmedSrcset.split(pattern);

          // for each tuples
          var nbrUrisWith2parts = Math.floor(rawUris.length / 2);
          for (var i = 0; i < nbrUrisWith2parts; i++) {
            var innerIdx = i * 2;
            // sanitize the uri
            result += $$sanitizeUri(trim(rawUris[innerIdx]), true);
            // add the descriptor
            result += (' ' + trim(rawUris[innerIdx + 1]));
          }

          // split the last item into uri and descriptor
          var lastTuple = trim(rawUris[i * 2]).split(/\s/);

          // sanitize the last uri
          result += $$sanitizeUri(trim(lastTuple[0]), true);

          // and add the last descriptor if any
          if (lastTuple.length === 2) {
            result += (' ' + trim(lastTuple[1]));
          }
          this[key] = value = result;
        }

        if (writeAttr !== false) {
          if (value === null || isUndefined(value)) {
            this.$$element.removeAttr(attrName);
          } else {
            if (SIMPLE_ATTR_NAME.test(attrName)) {
              this.$$element.attr(attrName, value);
            } else {
              setSpecialAttr(this.$$element[0], attrName, value);
            }
          }
        }

        // fire observers
        var $$observers = this.$$observers;
        if ($$observers) {
          forEach($$observers[observer], function(fn) {
            try {
              fn(value);
            } catch (e) {
              $exceptionHandler(e);
            }
          });
        }
      },


      /**
       * @ngdoc method
       * @name $compile.directive.Attributes#$observe
       * @kind function
       *
       * @description
       * Observes an interpolated attribute.
       *
       * The observer function will be invoked once during the next `$digest` following
       * compilation. The observer is then invoked whenever the interpolated value
       * changes.
       *
       * @param {string} key Normalized key. (ie ngAttribute) .
       * @param {function(interpolatedValue)} fn Function that will be called whenever
                the interpolated value of the attribute changes.
       *        See the {@link guide/interpolation#how-text-and-attribute-bindings-work Interpolation
       *        guide} for more info.
       * @returns {function()} Returns a deregistration function for this observer.
       */
      $observe: function(key, fn) {
        var attrs = this,
            $$observers = (attrs.$$observers || (attrs.$$observers = createMap())),
            listeners = ($$observers[key] || ($$observers[key] = []));

        listeners.push(fn);
        $rootScope.$evalAsync(function() {
          if (!listeners.$$inter && attrs.hasOwnProperty(key) && !isUndefined(attrs[key])) {
            // no one registered attribute interpolation function, so lets call it manually
            fn(attrs[key]);
          }
        });

        return function() {
          arrayRemove(listeners, fn);
        };
      }
    };

    function setSpecialAttr(element, attrName, value) {
      // Attributes names that do not start with letters (such as `(click)`) cannot be set using `setAttribute`
      // so we have to jump through some hoops to get such an attribute
      // https://github.com/angular/angular.js/pull/13318
      specialAttrHolder.innerHTML = '<span ' + attrName + '>';
      var attributes = specialAttrHolder.firstChild.attributes;
      var attribute = attributes[0];
      // We have to remove the attribute from its container element before we can add it to the destination element
      attributes.removeNamedItem(attribute.name);
      attribute.value = value;
      element.attributes.setNamedItem(attribute);
    }

    function safeAddClass($element, className) {
      try {
        $element.addClass(className);
      } catch (e) {
        // ignore, since it means that we are trying to set class on
        // SVG element, where class name is read-only.
      }
    }


    var startSymbol = $interpolate.startSymbol(),
        endSymbol = $interpolate.endSymbol(),
        denormalizeTemplate = (startSymbol === '{{' && endSymbol  === '}}')
            ? identity
            : function denormalizeTemplate(template) {
              return template.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);
        },
        NG_ATTR_BINDING = /^ngAttr[A-Z]/;
    var MULTI_ELEMENT_DIR_RE = /^(.+)Start$/;

    compile.$$addBindingInfo = debugInfoEnabled ? function $$addBindingInfo($element, binding) {
      var bindings = $element.data('$binding') || [];

      if (isArray(binding)) {
        bindings = bindings.concat(binding);
      } else {
        bindings.push(binding);
      }

      $element.data('$binding', bindings);
    } : noop;

    compile.$$addBindingClass = debugInfoEnabled ? function $$addBindingClass($element) {
      safeAddClass($element, 'ng-binding');
    } : noop;

    compile.$$addScopeInfo = debugInfoEnabled ? function $$addScopeInfo($element, scope, isolated, noTemplate) {
      var dataName = isolated ? (noTemplate ? '$isolateScopeNoTemplate' : '$isolateScope') : '$scope';
      $element.data(dataName, scope);
    } : noop;

    compile.$$addScopeClass = debugInfoEnabled ? function $$addScopeClass($element, isolated) {
      safeAddClass($element, isolated ? 'ng-isolate-scope' : 'ng-scope');
    } : noop;

    compile.$$createComment = function(directiveName, comment) {
      var content = '';
      if (debugInfoEnabled) {
        content = ' ' + (directiveName || '') + ': ';
        if (comment) content += comment + ' ';
      }
      return window.document.createComment(content);
    };

    return compile;

    //================================

    function compile($compileNodes, transcludeFn, maxPriority, ignoreDirective,
                        previousCompileContext) {
      if (!($compileNodes instanceof jqLite)) {
        // jquery always rewraps, whereas we need to preserve the original selector so that we can
        // modify it.
        $compileNodes = jqLite($compileNodes);
      }
      var compositeLinkFn =
              compileNodes($compileNodes, transcludeFn, $compileNodes,
                           maxPriority, ignoreDirective, previousCompileContext);
      compile.$$addScopeClass($compileNodes);
      var namespace = null;
      return function publicLinkFn(scope, cloneConnectFn, options) {
        if (!$compileNodes) {
          throw $compileMinErr('multilink', 'This element has already been linked.');
        }
        assertArg(scope, 'scope');

        if (previousCompileContext && previousCompileContext.needsNewScope) {
          // A parent directive did a replace and a directive on this element asked
          // for transclusion, which caused us to lose a layer of element on which
          // we could hold the new transclusion scope, so we will create it manually
          // here.
          scope = scope.$parent.$new();
        }

        options = options || {};
        var parentBoundTranscludeFn = options.parentBoundTranscludeFn,
          transcludeControllers = options.transcludeControllers,
          futureParentElement = options.futureParentElement;

        // When `parentBoundTranscludeFn` is passed, it is a
        // `controllersBoundTransclude` function (it was previously passed
        // as `transclude` to directive.link) so we must unwrap it to get
        // its `boundTranscludeFn`
        if (parentBoundTranscludeFn && parentBoundTranscludeFn.$$boundTransclude) {
          parentBoundTranscludeFn = parentBoundTranscludeFn.$$boundTransclude;
        }

        if (!namespace) {
          namespace = detectNamespaceForChildElements(futureParentElement);
        }
        var $linkNode;
        if (namespace !== 'html') {
          // When using a directive with replace:true and templateUrl the $compileNodes
          // (or a child element inside of them)
          // might change, so we need to recreate the namespace adapted compileNodes
          // for call to the link function.
          // Note: This will already clone the nodes...
          $linkNode = jqLite(
            wrapTemplate(namespace, jqLite('<div>').append($compileNodes).html())
          );
        } else if (cloneConnectFn) {
          // important!!: we must call our jqLite.clone() since the jQuery one is trying to be smart
          // and sometimes changes the structure of the DOM.
          $linkNode = JQLitePrototype.clone.call($compileNodes);
        } else {
          $linkNode = $compileNodes;
        }

        if (transcludeControllers) {
          for (var controllerName in transcludeControllers) {
            $linkNode.data('$' + controllerName + 'Controller', transcludeControllers[controllerName].instance);
          }
        }

        compile.$$addScopeInfo($linkNode, scope);

        if (cloneConnectFn) cloneConnectFn($linkNode, scope);
        if (compositeLinkFn) compositeLinkFn(scope, $linkNode, $linkNode, parentBoundTranscludeFn);

        if (!cloneConnectFn) {
          $compileNodes = compositeLinkFn = null;
        }
        return $linkNode;
      };
    }

    function detectNamespaceForChildElements(parentElement) {
      // TODO: Make this detect MathML as well...
      var node = parentElement && parentElement[0];
      if (!node) {
        return 'html';
      } else {
        return nodeName_(node) !== 'foreignobject' && toString.call(node).match(/SVG/) ? 'svg' : 'html';
      }
    }

    /**
     * Compile function matches each node in nodeList against the directives. Once all directives
     * for a particular node are collected their compile functions are executed. The compile
     * functions return values - the linking functions - are combined into a composite linking
     * function, which is the a linking function for the node.
     *
     * @param {NodeList} nodeList an array of nodes or NodeList to compile
     * @param {function(angular.Scope, cloneAttachFn=)} transcludeFn A linking function, where the
     *        scope argument is auto-generated to the new child of the transcluded parent scope.
     * @param {DOMElement=} $rootElement If the nodeList is the root of the compilation tree then
     *        the rootElement must be set the jqLite collection of the compile root. This is
     *        needed so that the jqLite collection items can be replaced with widgets.
     * @param {number=} maxPriority Max directive priority.
     * @returns {Function} A composite linking function of all of the matched directives or null.
     */
    function compileNodes(nodeList, transcludeFn, $rootElement, maxPriority, ignoreDirective,
                            previousCompileContext) {
      var linkFns = [],
          // `nodeList` can be either an element's `.childNodes` (live NodeList)
          // or a jqLite/jQuery collection or an array
          notLiveList = isArray(nodeList) || (nodeList instanceof jqLite),
          attrs, directives, nodeLinkFn, childNodes, childLinkFn, linkFnFound, nodeLinkFnFound;


      for (var i = 0; i < nodeList.length; i++) {
        attrs = new Attributes();

        // Support: IE 11 only
        // Workaround for #11781 and #14924
        if (msie === 11) {
          mergeConsecutiveTextNodes(nodeList, i, notLiveList);
        }

        // We must always refer to `nodeList[i]` hereafter,
        // since the nodes can be replaced underneath us.
        directives = collectDirectives(nodeList[i], [], attrs, i === 0 ? maxPriority : undefined,
                                        ignoreDirective);

        nodeLinkFn = (directives.length)
            ? applyDirectivesToNode(directives, nodeList[i], attrs, transcludeFn, $rootElement,
                                      null, [], [], previousCompileContext)
            : null;

        if (nodeLinkFn && nodeLinkFn.scope) {
          compile.$$addScopeClass(attrs.$$element);
        }

        childLinkFn = (nodeLinkFn && nodeLinkFn.terminal ||
                      !(childNodes = nodeList[i].childNodes) ||
                      !childNodes.length)
            ? null
            : compileNodes(childNodes,
                 nodeLinkFn ? (
                  (nodeLinkFn.transcludeOnThisElement || !nodeLinkFn.templateOnThisElement)
                     && nodeLinkFn.transclude) : transcludeFn);

        if (nodeLinkFn || childLinkFn) {
          linkFns.push(i, nodeLinkFn, childLinkFn);
          linkFnFound = true;
          nodeLinkFnFound = nodeLinkFnFound || nodeLinkFn;
        }

        //use the previous context only for the first element in the virtual group
        previousCompileContext = null;
      }

      // return a linking function if we have found anything, null otherwise
      return linkFnFound ? compositeLinkFn : null;

      function compositeLinkFn(scope, nodeList, $rootElement, parentBoundTranscludeFn) {
        var nodeLinkFn, childLinkFn, node, childScope, i, ii, idx, childBoundTranscludeFn;
        var stableNodeList;


        if (nodeLinkFnFound) {
          // copy nodeList so that if a nodeLinkFn removes or adds an element at this DOM level our
          // offsets don't get screwed up
          var nodeListLength = nodeList.length;
          stableNodeList = new Array(nodeListLength);

          // create a sparse array by only copying the elements which have a linkFn
          for (i = 0; i < linkFns.length; i += 3) {
            idx = linkFns[i];
            stableNodeList[idx] = nodeList[idx];
          }
        } else {
          stableNodeList = nodeList;
        }

        for (i = 0, ii = linkFns.length; i < ii;) {
          node = stableNodeList[linkFns[i++]];
          nodeLinkFn = linkFns[i++];
          childLinkFn = linkFns[i++];

          if (nodeLinkFn) {
            if (nodeLinkFn.scope) {
              childScope = scope.$new();
              compile.$$addScopeInfo(jqLite(node), childScope);
            } else {
              childScope = scope;
            }

            if (nodeLinkFn.transcludeOnThisElement) {
              childBoundTranscludeFn = createBoundTranscludeFn(
                  scope, nodeLinkFn.transclude, parentBoundTranscludeFn);

            } else if (!nodeLinkFn.templateOnThisElement && parentBoundTranscludeFn) {
              childBoundTranscludeFn = parentBoundTranscludeFn;

            } else if (!parentBoundTranscludeFn && transcludeFn) {
              childBoundTranscludeFn = createBoundTranscludeFn(scope, transcludeFn);

            } else {
              childBoundTranscludeFn = null;
            }

            nodeLinkFn(childLinkFn, childScope, node, $rootElement, childBoundTranscludeFn);

          } else if (childLinkFn) {
            childLinkFn(scope, node.childNodes, undefined, parentBoundTranscludeFn);
          }
        }
      }
    }

    function mergeConsecutiveTextNodes(nodeList, idx, notLiveList) {
      var node = nodeList[idx];
      var parent = node.parentNode;
      var sibling;

      if (node.nodeType !== NODE_TYPE_TEXT) {
        return;
      }

      while (true) {
        sibling = parent ? node.nextSibling : nodeList[idx + 1];
        if (!sibling || sibling.nodeType !== NODE_TYPE_TEXT) {
          break;
        }


        node.nodeValue = node.nodeValue + sibling.nodeValue;

        if (sibling.parentNode) {
          sibling.parentNode.removeChild(sibling);
        }
        if (notLiveList && sibling === nodeList[idx + 1]) {
          nodeList.splice(idx + 1, 1);
        }
      }
    }

    function createBoundTranscludeFn(scope, transcludeFn, previousBoundTranscludeFn) {
      function boundTranscludeFn(transcludedScope, cloneFn, controllers, futureParentElement, containingScope) {

        if (!transcludedScope) {
          transcludedScope = scope.$new(false, containingScope);
          transcludedScope.$$transcluded = true;
        }

        return transcludeFn(transcludedScope, cloneFn, {
          parentBoundTranscludeFn: previousBoundTranscludeFn,
          transcludeControllers: controllers,
          futureParentElement: futureParentElement
        });
      }

      // We need  to attach the transclusion slots onto the `boundTranscludeFn`
      // so that they are available inside the `controllersBoundTransclude` function
      var boundSlots = boundTranscludeFn.$$slots = createMap();
      for (var slotName in transcludeFn.$$slots) {
        if (transcludeFn.$$slots[slotName]) {
          boundSlots[slotName] = createBoundTranscludeFn(scope, transcludeFn.$$slots[slotName], previousBoundTranscludeFn);
        } else {
          boundSlots[slotName] = null;
        }
      }

      return boundTranscludeFn;
    }

    /**
     * Looks for directives on the given node and adds them to the directive collection which is
     * sorted.
     *
     * @param node Node to search.
     * @param directives An array to which the directives are added to. This array is sorted before
     *        the function returns.
     * @param attrs The shared attrs object which is used to populate the normalized attributes.
     * @param {number=} maxPriority Max directive priority.
     */
    function collectDirectives(node, directives, attrs, maxPriority, ignoreDirective) {
      var nodeType = node.nodeType,
          attrsMap = attrs.$attr,
          match,
          nodeName,
          className;


      switch (nodeType) {
        case NODE_TYPE_ELEMENT: /* Element */

          nodeName = nodeName_(node);

          // use the node name: <directive>
          addDirective(directives,
              directiveNormalize(nodeName), 'E', maxPriority, ignoreDirective);

          // iterate over the attributes
          for (var attr, name, nName, ngAttrName, value, isNgAttr, nAttrs = node.attributes,
                   j = 0, jj = nAttrs && nAttrs.length; j < jj; j++) {
            var attrStartName = false;
            var attrEndName = false;

            attr = nAttrs[j];
            name = attr.name;
            value = attr.value;

            // support ngAttr attribute binding
            ngAttrName = directiveNormalize(name);
            isNgAttr = NG_ATTR_BINDING.test(ngAttrName);
            if (isNgAttr) {
              name = name.replace(PREFIX_REGEXP, '')
                .substr(8).replace(/_(.)/g, function(match, letter) {
                  return letter.toUpperCase();
                });
            }

            var multiElementMatch = ngAttrName.match(MULTI_ELEMENT_DIR_RE);
            if (multiElementMatch && directiveIsMultiElement(multiElementMatch[1])) {
              attrStartName = name;
              attrEndName = name.substr(0, name.length - 5) + 'end';
              name = name.substr(0, name.length - 6);
            }

            nName = directiveNormalize(name.toLowerCase());
            attrsMap[nName] = name;
            if (isNgAttr || !attrs.hasOwnProperty(nName)) {
                attrs[nName] = value;
                if (getBooleanAttrName(node, nName)) {
                  attrs[nName] = true; // presence means true
                }
            }
            addAttrInterpolateDirective(node, directives, value, nName, isNgAttr);
            addDirective(directives, nName, 'A', maxPriority, ignoreDirective, attrStartName,
                          attrEndName);
          }

          if (nodeName === 'input' && node.getAttribute('type') === 'hidden') {
            // Hidden input elements can have strange behaviour when navigating back to the page
            // This tells the browser not to try to cache and reinstate previous values
            node.setAttribute('autocomplete', 'off');
          }

          // use class as directive
          if (!cssClassDirectivesEnabled) break;
          className = node.className;
          if (isObject(className)) {
              // Maybe SVGAnimatedString
              className = className.animVal;
          }
          if (isString(className) && className !== '') {
            while ((match = CLASS_DIRECTIVE_REGEXP.exec(className))) {
              nName = directiveNormalize(match[2]);
              if (addDirective(directives, nName, 'C', maxPriority, ignoreDirective)) {
                attrs[nName] = trim(match[3]);
              }
              className = className.substr(match.index + match[0].length);
            }
          }
          break;
        case NODE_TYPE_TEXT: /* Text Node */

          addTextInterpolateDirective(directives, node.nodeValue);
          break;
        case NODE_TYPE_COMMENT: /* Comment */
          if (!commentDirectivesEnabled) break;
          collectCommentDirectives(node, directives, attrs, maxPriority, ignoreDirective);
          break;
      }

      directives.sort(byPriority);
      return directives;
    }

    function collectCommentDirectives(node, directives, attrs, maxPriority, ignoreDirective) {
      // function created because of performance, try/catch disables
      // the optimization of the whole function #14848
      try {
        var match = COMMENT_DIRECTIVE_REGEXP.exec(node.nodeValue);
        if (match) {
          var nName = directiveNormalize(match[1]);
          if (addDirective(directives, nName, 'M', maxPriority, ignoreDirective)) {
            attrs[nName] = trim(match[2]);
          }
        }
      } catch (e) {
        // turns out that under some circumstances IE9 throws errors when one attempts to read
        // comment's node value.
        // Just ignore it and continue. (Can't seem to reproduce in test case.)
      }
    }

    /**
     * Given a node with a directive-start it collects all of the siblings until it finds
     * directive-end.
     * @param node
     * @param attrStart
     * @param attrEnd
     * @returns {*}
     */
    function groupScan(node, attrStart, attrEnd) {
      var nodes = [];
      var depth = 0;
      if (attrStart && node.hasAttribute && node.hasAttribute(attrStart)) {
        do {
          if (!node) {
            throw $compileMinErr('uterdir',
                      'Unterminated attribute, found \'{0}\' but no matching \'{1}\' found.',
                      attrStart, attrEnd);
          }
          if (node.nodeType === NODE_TYPE_ELEMENT) {
            if (node.hasAttribute(attrStart)) depth++;
            if (node.hasAttribute(attrEnd)) depth--;
          }
          nodes.push(node);
          node = node.nextSibling;
        } while (depth > 0);
      } else {
        nodes.push(node);
      }

      return jqLite(nodes);
    }

    /**
     * Wrapper for linking function which converts normal linking function into a grouped
     * linking function.
     * @param linkFn
     * @param attrStart
     * @param attrEnd
     * @returns {Function}
     */
    function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
      return function groupedElementsLink(scope, element, attrs, controllers, transcludeFn) {
        element = groupScan(element[0], attrStart, attrEnd);
        return linkFn(scope, element, attrs, controllers, transcludeFn);
      };
    }

    /**
     * A function generator that is used to support both eager and lazy compilation
     * linking function.
     * @param eager
     * @param $compileNodes
     * @param transcludeFn
     * @param maxPriority
     * @param ignoreDirective
     * @param previousCompileContext
     * @returns {Function}
     */
    function compilationGenerator(eager, $compileNodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
      var compiled;

      if (eager) {
        return compile($compileNodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext);
      }
      return /** @this */ function lazyCompilation() {
        if (!compiled) {
          compiled = compile($compileNodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext);

          // Null out all of these references in order to make them eligible for garbage collection
          // since this is a potentially long lived closure
          $compileNodes = transcludeFn = previousCompileContext = null;
        }
        return compiled.apply(this, arguments);
      };
    }

    /**
     * Once the directives have been collected, their compile functions are executed. This method
     * is responsible for inlining directive templates as well as terminating the application
     * of the directives if the terminal directive has been reached.
     *
     * @param {Array} directives Array of collected directives to execute their compile function.
     *        this needs to be pre-sorted by priority order.
     * @param {Node} compileNode The raw DOM node to apply the compile functions to
     * @param {Object} templateAttrs The shared attribute function
     * @param {function(angular.Scope, cloneAttachFn=)} transcludeFn A linking function, where the
     *                                                  scope argument is auto-generated to the new
     *                                                  child of the transcluded parent scope.
     * @param {JQLite} jqCollection If we are working on the root of the compile tree then this
     *                              argument has the root jqLite array so that we can replace nodes
     *                              on it.
     * @param {Object=} originalReplaceDirective An optional directive that will be ignored when
     *                                           compiling the transclusion.
     * @param {Array.<Function>} preLinkFns
     * @param {Array.<Function>} postLinkFns
     * @param {Object} previousCompileContext Context used for previous compilation of the current
     *                                        node
     * @returns {Function} linkFn
     */
    function applyDirectivesToNode(directives, compileNode, templateAttrs, transcludeFn,
                                   jqCollection, originalReplaceDirective, preLinkFns, postLinkFns,
                                   previousCompileContext) {
      previousCompileContext = previousCompileContext || {};

      var terminalPriority = -Number.MAX_VALUE,
          newScopeDirective = previousCompileContext.newScopeDirective,
          controllerDirectives = previousCompileContext.controllerDirectives,
          newIsolateScopeDirective = previousCompileContext.newIsolateScopeDirective,
          templateDirective = previousCompileContext.templateDirective,
          nonTlbTranscludeDirective = previousCompileContext.nonTlbTranscludeDirective,
          hasTranscludeDirective = false,
          hasTemplate = false,
          hasElementTranscludeDirective = previousCompileContext.hasElementTranscludeDirective,
          $compileNode = templateAttrs.$$element = jqLite(compileNode),
          directive,
          directiveName,
          $template,
          replaceDirective = originalReplaceDirective,
          childTranscludeFn = transcludeFn,
          linkFn,
          didScanForMultipleTransclusion = false,
          mightHaveMultipleTransclusionError = false,
          directiveValue;

      // executes all directives on the current element
      for (var i = 0, ii = directives.length; i < ii; i++) {
        directive = directives[i];
        var attrStart = directive.$$start;
        var attrEnd = directive.$$end;

        // collect multiblock sections
        if (attrStart) {
          $compileNode = groupScan(compileNode, attrStart, attrEnd);
        }
        $template = undefined;

        if (terminalPriority > directive.priority) {
          break; // prevent further processing of directives
        }

        directiveValue = directive.scope;

        if (directiveValue) {

          // skip the check for directives with async templates, we'll check the derived sync
          // directive when the template arrives
          if (!directive.templateUrl) {
            if (isObject(directiveValue)) {
              // This directive is trying to add an isolated scope.
              // Check that there is no scope of any kind already
              assertNoDuplicate('new/isolated scope', newIsolateScopeDirective || newScopeDirective,
                                directive, $compileNode);
              newIsolateScopeDirective = directive;
            } else {
              // This directive is trying to add a child scope.
              // Check that there is no isolated scope already
              assertNoDuplicate('new/isolated scope', newIsolateScopeDirective, directive,
                                $compileNode);
            }
          }

          newScopeDirective = newScopeDirective || directive;
        }

        directiveName = directive.name;

        // If we encounter a condition that can result in transclusion on the directive,
        // then scan ahead in the remaining directives for others that may cause a multiple
        // transclusion error to be thrown during the compilation process.  If a matching directive
        // is found, then we know that when we encounter a transcluded directive, we need to eagerly
        // compile the `transclude` function rather than doing it lazily in order to throw
        // exceptions at the correct time
        if (!didScanForMultipleTransclusion && ((directive.replace && (directive.templateUrl || directive.template))
            || (directive.transclude && !directive.$$tlb))) {
                var candidateDirective;

                for (var scanningIndex = i + 1; (candidateDirective = directives[scanningIndex++]);) {
                    if ((candidateDirective.transclude && !candidateDirective.$$tlb)
                        || (candidateDirective.replace && (candidateDirective.templateUrl || candidateDirective.template))) {
                        mightHaveMultipleTransclusionError = true;
                        break;
                    }
                }

                didScanForMultipleTransclusion = true;
        }

        if (!directive.templateUrl && directive.controller) {
          controllerDirectives = controllerDirectives || createMap();
          assertNoDuplicate('\'' + directiveName + '\' controller',
              controllerDirectives[directiveName], directive, $compileNode);
          controllerDirectives[directiveName] = directive;
        }

        directiveValue = directive.transclude;

        if (directiveValue) {
          hasTranscludeDirective = true;

          // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
          // This option should only be used by directives that know how to safely handle element transclusion,
          // where the transcluded nodes are added or replaced after linking.
          if (!directive.$$tlb) {
            assertNoDuplicate('transclusion', nonTlbTranscludeDirective, directive, $compileNode);
            nonTlbTranscludeDirective = directive;
          }

          if (directiveValue === 'element') {
            hasElementTranscludeDirective = true;
            terminalPriority = directive.priority;
            $template = $compileNode;
            $compileNode = templateAttrs.$$element =
                jqLite(compile.$$createComment(directiveName, templateAttrs[directiveName]));
            compileNode = $compileNode[0];
            replaceWith(jqCollection, sliceArgs($template), compileNode);

            // Support: Chrome < 50
            // https://github.com/angular/angular.js/issues/14041

            // In the versions of V8 prior to Chrome 50, the document fragment that is created
            // in the `replaceWith` function is improperly garbage collected despite still
            // being referenced by the `parentNode` property of all of the child nodes.  By adding
            // a reference to the fragment via a different property, we can avoid that incorrect
            // behavior.
            // TODO: remove this line after Chrome 50 has been released
            $template[0].$$parentNode = $template[0].parentNode;

            childTranscludeFn = compilationGenerator(mightHaveMultipleTransclusionError, $template, transcludeFn, terminalPriority,
                                        replaceDirective && replaceDirective.name, {
                                          // Don't pass in:
                                          // - controllerDirectives - otherwise we'll create duplicates controllers
                                          // - newIsolateScopeDirective or templateDirective - combining templates with
                                          //   element transclusion doesn't make sense.
                                          //
                                          // We need only nonTlbTranscludeDirective so that we prevent putting transclusion
                                          // on the same element more than once.
                                          nonTlbTranscludeDirective: nonTlbTranscludeDirective
                                        });
          } else {

            var slots = createMap();

            if (!isObject(directiveValue)) {
              $template = jqLite(jqLiteClone(compileNode)).contents();
            } else {

              // We have transclusion slots,
              // collect them up, compile them and store their transclusion functions
              $template = [];

              var slotMap = createMap();
              var filledSlots = createMap();

              // Parse the element selectors
              forEach(directiveValue, function(elementSelector, slotName) {
                // If an element selector starts with a ? then it is optional
                var optional = (elementSelector.charAt(0) === '?');
                elementSelector = optional ? elementSelector.substring(1) : elementSelector;

                slotMap[elementSelector] = slotName;

                // We explicitly assign `null` since this implies that a slot was defined but not filled.
                // Later when calling boundTransclusion functions with a slot name we only error if the
                // slot is `undefined`
                slots[slotName] = null;

                // filledSlots contains `true` for all slots that are either optional or have been
                // filled. This is used to check that we have not missed any required slots
                filledSlots[slotName] = optional;
              });

              // Add the matching elements into their slot
              forEach($compileNode.contents(), function(node) {
                var slotName = slotMap[directiveNormalize(nodeName_(node))];
                if (slotName) {
                  filledSlots[slotName] = true;
                  slots[slotName] = slots[slotName] || [];
                  slots[slotName].push(node);
                } else {
                  $template.push(node);
                }
              });

              // Check for required slots that were not filled
              forEach(filledSlots, function(filled, slotName) {
                if (!filled) {
                  throw $compileMinErr('reqslot', 'Required transclusion slot `{0}` was not filled.', slotName);
                }
              });

              for (var slotName in slots) {
                if (slots[slotName]) {
                  // Only define a transclusion function if the slot was filled
                  slots[slotName] = compilationGenerator(mightHaveMultipleTransclusionError, slots[slotName], transcludeFn);
                }
              }
            }

            $compileNode.empty(); // clear contents
            childTranscludeFn = compilationGenerator(mightHaveMultipleTransclusionError, $template, transcludeFn, undefined,
                undefined, { needsNewScope: directive.$$isolateScope || directive.$$newScope});
            childTranscludeFn.$$slots = slots;
          }
        }

        if (directive.template) {
          hasTemplate = true;
          assertNoDuplicate('template', templateDirective, directive, $compileNode);
          templateDirective = directive;

          directiveValue = (isFunction(directive.template))
              ? directive.template($compileNode, templateAttrs)
              : directive.template;

          directiveValue = denormalizeTemplate(directiveValue);

          if (directive.replace) {
            replaceDirective = directive;
            if (jqLiteIsTextNode(directiveValue)) {
              $template = [];
            } else {
              $template = removeComments(wrapTemplate(directive.templateNamespace, trim(directiveValue)));
            }
            compileNode = $template[0];

            if ($template.length !== 1 || compileNode.nodeType !== NODE_TYPE_ELEMENT) {
              throw $compileMinErr('tplrt',
                  'Template for directive \'{0}\' must have exactly one root element. {1}',
                  directiveName, '');
            }

            replaceWith(jqCollection, $compileNode, compileNode);

            var newTemplateAttrs = {$attr: {}};

            // combine directives from the original node and from the template:
            // - take the array of directives for this element
            // - split it into two parts, those that already applied (processed) and those that weren't (unprocessed)
            // - collect directives from the template and sort them by priority
            // - combine directives as: processed + template + unprocessed
            var templateDirectives = collectDirectives(compileNode, [], newTemplateAttrs);
            var unprocessedDirectives = directives.splice(i + 1, directives.length - (i + 1));

            if (newIsolateScopeDirective || newScopeDirective) {
              // The original directive caused the current element to be replaced but this element
              // also needs to have a new scope, so we need to tell the template directives
              // that they would need to get their scope from further up, if they require transclusion
              markDirectiveScope(templateDirectives, newIsolateScopeDirective, newScopeDirective);
            }
            directives = directives.concat(templateDirectives).concat(unprocessedDirectives);
            mergeTemplateAttributes(templateAttrs, newTemplateAttrs);

            ii = directives.length;
          } else {
            $compileNode.html(directiveValue);
          }
        }

        if (directive.templateUrl) {
          hasTemplate = true;
          assertNoDuplicate('template', templateDirective, directive, $compileNode);
          templateDirective = directive;

          if (directive.replace) {
            replaceDirective = directive;
          }

          // eslint-disable-next-line no-func-assign
          nodeLinkFn = compileTemplateUrl(directives.splice(i, directives.length - i), $compileNode,
              templateAttrs, jqCollection, hasTranscludeDirective && childTranscludeFn, preLinkFns, postLinkFns, {
                controllerDirectives: controllerDirectives,
                newScopeDirective: (newScopeDirective !== directive) && newScopeDirective,
                newIsolateScopeDirective: newIsolateScopeDirective,
                templateDirective: templateDirective,
                nonTlbTranscludeDirective: nonTlbTranscludeDirective
              });
          ii = directives.length;
        } else if (directive.compile) {
          try {
            linkFn = directive.compile($compileNode, templateAttrs, childTranscludeFn);
            var context = directive.$$originalDirective || directive;
            if (isFunction(linkFn)) {
              addLinkFns(null, bind(context, linkFn), attrStart, attrEnd);
            } else if (linkFn) {
              addLinkFns(bind(context, linkFn.pre), bind(context, linkFn.post), attrStart, attrEnd);
            }
          } catch (e) {
            $exceptionHandler(e, startingTag($compileNode));
          }
        }

        if (directive.terminal) {
          nodeLinkFn.terminal = true;
          terminalPriority = Math.max(terminalPriority, directive.priority);
        }

      }

      nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope === true;
      nodeLinkFn.transcludeOnThisElement = hasTranscludeDirective;
      nodeLinkFn.templateOnThisElement = hasTemplate;
      nodeLinkFn.transclude = childTranscludeFn;

      previousCompileContext.hasElementTranscludeDirective = hasElementTranscludeDirective;

      // might be normal or delayed nodeLinkFn depending on if templateUrl is present
      return nodeLinkFn;

      ////////////////////

      function addLinkFns(pre, post, attrStart, attrEnd) {
        if (pre) {
          if (attrStart) pre = groupElementsLinkFnWrapper(pre, attrStart, attrEnd);
          pre.require = directive.require;
          pre.directiveName = directiveName;
          if (newIsolateScopeDirective === directive || directive.$$isolateScope) {
            pre = cloneAndAnnotateFn(pre, {isolateScope: true});
          }
          preLinkFns.push(pre);
        }
        if (post) {
          if (attrStart) post = groupElementsLinkFnWrapper(post, attrStart, attrEnd);
          post.require = directive.require;
          post.directiveName = directiveName;
          if (newIsolateScopeDirective === directive || directive.$$isolateScope) {
            post = cloneAndAnnotateFn(post, {isolateScope: true});
          }
          postLinkFns.push(post);
        }
      }

      function nodeLinkFn(childLinkFn, scope, linkNode, $rootElement, boundTranscludeFn) {
        var i, ii, linkFn, isolateScope, controllerScope, elementControllers, transcludeFn, $element,
            attrs, scopeBindingInfo;

        if (compileNode === linkNode) {
          attrs = templateAttrs;
          $element = templateAttrs.$$element;
        } else {
          $element = jqLite(linkNode);
          attrs = new Attributes($element, templateAttrs);
        }

        controllerScope = scope;
        if (newIsolateScopeDirective) {
          isolateScope = scope.$new(true);
        } else if (newScopeDirective) {
          controllerScope = scope.$parent;
        }

        if (boundTranscludeFn) {
          // track `boundTranscludeFn` so it can be unwrapped if `transcludeFn`
          // is later passed as `parentBoundTranscludeFn` to `publicLinkFn`
          transcludeFn = controllersBoundTransclude;
          transcludeFn.$$boundTransclude = boundTranscludeFn;
          // expose the slots on the `$transclude` function
          transcludeFn.isSlotFilled = function(slotName) {
            return !!boundTranscludeFn.$$slots[slotName];
          };
        }

        if (controllerDirectives) {
          elementControllers = setupControllers($element, attrs, transcludeFn, controllerDirectives, isolateScope, scope, newIsolateScopeDirective);
        }

        if (newIsolateScopeDirective) {
          // Initialize isolate scope bindings for new isolate scope directive.
          compile.$$addScopeInfo($element, isolateScope, true, !(templateDirective && (templateDirective === newIsolateScopeDirective ||
              templateDirective === newIsolateScopeDirective.$$originalDirective)));
          compile.$$addScopeClass($element, true);
          isolateScope.$$isolateBindings =
              newIsolateScopeDirective.$$isolateBindings;
          scopeBindingInfo = initializeDirectiveBindings(scope, attrs, isolateScope,
                                        isolateScope.$$isolateBindings,
                                        newIsolateScopeDirective);
          if (scopeBindingInfo.removeWatches) {
            isolateScope.$on('$destroy', scopeBindingInfo.removeWatches);
          }
        }

        // Initialize bindToController bindings
        for (var name in elementControllers) {
          var controllerDirective = controllerDirectives[name];
          var controller = elementControllers[name];
          var bindings = controllerDirective.$$bindings.bindToController;

          if (preAssignBindingsEnabled) {
            if (bindings) {
              controller.bindingInfo =
                initializeDirectiveBindings(controllerScope, attrs, controller.instance, bindings, controllerDirective);
            } else {
              controller.bindingInfo = {};
            }

            var controllerResult = controller();
            if (controllerResult !== controller.instance) {
              // If the controller constructor has a return value, overwrite the instance
              // from setupControllers
              controller.instance = controllerResult;
              $element.data('$' + controllerDirective.name + 'Controller', controllerResult);
              if (controller.bindingInfo.removeWatches) {
                controller.bindingInfo.removeWatches();
              }
              controller.bindingInfo =
                initializeDirectiveBindings(controllerScope, attrs, controller.instance, bindings, controllerDirective);
            }
          } else {
            controller.instance = controller();
            $element.data('$' + controllerDirective.name + 'Controller', controller.instance);
            controller.bindingInfo =
              initializeDirectiveBindings(controllerScope, attrs, controller.instance, bindings, controllerDirective);
          }
        }

        // Bind the required controllers to the controller, if `require` is an object and `bindToController` is truthy
        forEach(controllerDirectives, function(controllerDirective, name) {
          var require = controllerDirective.require;
          if (controllerDirective.bindToController && !isArray(require) && isObject(require)) {
            extend(elementControllers[name].instance, getControllers(name, require, $element, elementControllers));
          }
        });

        // Handle the init and destroy lifecycle hooks on all controllers that have them
        forEach(elementControllers, function(controller) {
          var controllerInstance = controller.instance;
          if (isFunction(controllerInstance.$onChanges)) {
            try {
              controllerInstance.$onChanges(controller.bindingInfo.initialChanges);
            } catch (e) {
              $exceptionHandler(e);
            }
          }
          if (isFunction(controllerInstance.$onInit)) {
            try {
              controllerInstance.$onInit();
            } catch (e) {
              $exceptionHandler(e);
            }
          }
          if (isFunction(controllerInstance.$doCheck)) {
            controllerScope.$watch(function() { controllerInstance.$doCheck(); });
            controllerInstance.$doCheck();
          }
          if (isFunction(controllerInstance.$onDestroy)) {
            controllerScope.$on('$destroy', function callOnDestroyHook() {
              controllerInstance.$onDestroy();
            });
          }
        });

        // PRELINKING
        for (i = 0, ii = preLinkFns.length; i < ii; i++) {
          linkFn = preLinkFns[i];
          invokeLinkFn(linkFn,
              linkFn.isolateScope ? isolateScope : scope,
              $element,
              attrs,
              linkFn.require && getControllers(linkFn.directiveName, linkFn.require, $element, elementControllers),
              transcludeFn
          );
        }

        // RECURSION
        // We only pass the isolate scope, if the isolate directive has a template,
        // otherwise the child elements do not belong to the isolate directive.
        var scopeToChild = scope;
        if (newIsolateScopeDirective && (newIsolateScopeDirective.template || newIsolateScopeDirective.templateUrl === null)) {
          scopeToChild = isolateScope;
        }
        if (childLinkFn) {
          childLinkFn(scopeToChild, linkNode.childNodes, undefined, boundTranscludeFn);
        }

        // POSTLINKING
        for (i = postLinkFns.length - 1; i >= 0; i--) {
          linkFn = postLinkFns[i];
          invokeLinkFn(linkFn,
              linkFn.isolateScope ? isolateScope : scope,
              $element,
              attrs,
              linkFn.require && getControllers(linkFn.directiveName, linkFn.require, $element, elementControllers),
              transcludeFn
          );
        }

        // Trigger $postLink lifecycle hooks
        forEach(elementControllers, function(controller) {
          var controllerInstance = controller.instance;
          if (isFunction(controllerInstance.$postLink)) {
            controllerInstance.$postLink();
          }
        });

        // This is the function that is injected as `$transclude`.
        // Note: all arguments are optional!
        function controllersBoundTransclude(scope, cloneAttachFn, futureParentElement, slotName) {
          var transcludeControllers;
          // No scope passed in:
          if (!isScope(scope)) {
            slotName = futureParentElement;
            futureParentElement = cloneAttachFn;
            cloneAttachFn = scope;
            scope = undefined;
          }

          if (hasElementTranscludeDirective) {
            transcludeControllers = elementControllers;
          }
          if (!futureParentElement) {
            futureParentElement = hasElementTranscludeDirective ? $element.parent() : $element;
          }
          if (slotName) {
            // slotTranscludeFn can be one of three things:
            //  * a transclude function - a filled slot
            //  * `null` - an optional slot that was not filled
            //  * `undefined` - a slot that was not declared (i.e. invalid)
            var slotTranscludeFn = boundTranscludeFn.$$slots[slotName];
            if (slotTranscludeFn) {
              return slotTranscludeFn(scope, cloneAttachFn, transcludeControllers, futureParentElement, scopeToChild);
            } else if (isUndefined(slotTranscludeFn)) {
              throw $compileMinErr('noslot',
               'No parent directive that requires a transclusion with slot name "{0}". ' +
               'Element: {1}',
               slotName, startingTag($element));
            }
          } else {
            return boundTranscludeFn(scope, cloneAttachFn, transcludeControllers, futureParentElement, scopeToChild);
          }
        }
      }
    }

    function getControllers(directiveName, require, $element, elementControllers) {
      var value;

      if (isString(require)) {
        var match = require.match(REQUIRE_PREFIX_REGEXP);
        var name = require.substring(match[0].length);
        var inheritType = match[1] || match[3];
        var optional = match[2] === '?';

        //If only parents then start at the parent element
        if (inheritType === '^^') {
          $element = $element.parent();
        //Otherwise attempt getting the controller from elementControllers in case
        //the element is transcluded (and has no data) and to avoid .data if possible
        } else {
          value = elementControllers && elementControllers[name];
          value = value && value.instance;
        }

        if (!value) {
          var dataName = '$' + name + 'Controller';
          value = inheritType ? $element.inheritedData(dataName) : $element.data(dataName);
        }

        if (!value && !optional) {
          throw $compileMinErr('ctreq',
              'Controller \'{0}\', required by directive \'{1}\', can\'t be found!',
              name, directiveName);
        }
      } else if (isArray(require)) {
        value = [];
        for (var i = 0, ii = require.length; i < ii; i++) {
          value[i] = getControllers(directiveName, require[i], $element, elementControllers);
        }
      } else if (isObject(require)) {
        value = {};
        forEach(require, function(controller, property) {
          value[property] = getControllers(directiveName, controller, $element, elementControllers);
        });
      }

      return value || null;
    }

    function setupControllers($element, attrs, transcludeFn, controllerDirectives, isolateScope, scope, newIsolateScopeDirective) {
      var elementControllers = createMap();
      for (var controllerKey in controllerDirectives) {
        var directive = controllerDirectives[controllerKey];
        var locals = {
          $scope: directive === newIsolateScopeDirective || directive.$$isolateScope ? isolateScope : scope,
          $element: $element,
          $attrs: attrs,
          $transclude: transcludeFn
        };

        var controller = directive.controller;
        if (controller === '@') {
          controller = attrs[directive.name];
        }

        var controllerInstance = $controller(controller, locals, true, directive.controllerAs);

        // For directives with element transclusion the element is a comment.
        // In this case .data will not attach any data.
        // Instead, we save the controllers for the element in a local hash and attach to .data
        // later, once we have the actual element.
        elementControllers[directive.name] = controllerInstance;
        $element.data('$' + directive.name + 'Controller', controllerInstance.instance);
      }
      return elementControllers;
    }

    // Depending upon the context in which a directive finds itself it might need to have a new isolated
    // or child scope created. For instance:
    // * if the directive has been pulled into a template because another directive with a higher priority
    // asked for element transclusion
    // * if the directive itself asks for transclusion but it is at the root of a template and the original
    // element was replaced. See https://github.com/angular/angular.js/issues/12936
    function markDirectiveScope(directives, isolateScope, newScope) {
      for (var j = 0, jj = directives.length; j < jj; j++) {
        directives[j] = inherit(directives[j], {$$isolateScope: isolateScope, $$newScope: newScope});
      }
    }

    /**
     * looks up the directive and decorates it with exception handling and proper parameters. We
     * call this the boundDirective.
     *
     * @param {string} name name of the directive to look up.
     * @param {string} location The directive must be found in specific format.
     *   String containing any of theses characters:
     *
     *   * `E`: element name
     *   * `A': attribute
     *   * `C`: class
     *   * `M`: comment
     * @returns {boolean} true if directive was added.
     */
    function addDirective(tDirectives, name, location, maxPriority, ignoreDirective, startAttrName,
                          endAttrName) {
      if (name === ignoreDirective) return null;
      var match = null;
      if (hasDirectives.hasOwnProperty(name)) {
        for (var directive, directives = $injector.get(name + Suffix),
            i = 0, ii = directives.length; i < ii; i++) {
          directive = directives[i];
          if ((isUndefined(maxPriority) || maxPriority > directive.priority) &&
               directive.restrict.indexOf(location) !== -1) {
            if (startAttrName) {
              directive = inherit(directive, {$$start: startAttrName, $$end: endAttrName});
            }
            if (!directive.$$bindings) {
              var bindings = directive.$$bindings =
                  parseDirectiveBindings(directive, directive.name);
              if (isObject(bindings.isolateScope)) {
                directive.$$isolateBindings = bindings.isolateScope;
              }
            }
            tDirectives.push(directive);
            match = directive;
          }
        }
      }
      return match;
    }


    /**
     * looks up the directive and returns true if it is a multi-element directive,
     * and therefore requires DOM nodes between -start and -end markers to be grouped
     * together.
     *
     * @param {string} name name of the directive to look up.
     * @returns true if directive was registered as multi-element.
     */
    function directiveIsMultiElement(name) {
      if (hasDirectives.hasOwnProperty(name)) {
        for (var directive, directives = $injector.get(name + Suffix),
            i = 0, ii = directives.length; i < ii; i++) {
          directive = directives[i];
          if (directive.multiElement) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * When the element is replaced with HTML template then the new attributes
     * on the template need to be merged with the existing attributes in the DOM.
     * The desired effect is to have both of the attributes present.
     *
     * @param {object} dst destination attributes (original DOM)
     * @param {object} src source attributes (from the directive template)
     */
    function mergeTemplateAttributes(dst, src) {
      var srcAttr = src.$attr,
          dstAttr = dst.$attr;

      // reapply the old attributes to the new element
      forEach(dst, function(value, key) {
        if (key.charAt(0) !== '$') {
          if (src[key] && src[key] !== value) {
            if (value.length) {
              value += (key === 'style' ? ';' : ' ') + src[key];
            } else {
              value = src[key];
            }
          }
          dst.$set(key, value, true, srcAttr[key]);
        }
      });

      // copy the new attributes on the old attrs object
      forEach(src, function(value, key) {
        // Check if we already set this attribute in the loop above.
        // `dst` will never contain hasOwnProperty as DOM parser won't let it.
        // You will get an "InvalidCharacterError: DOM Exception 5" error if you
        // have an attribute like "has-own-property" or "data-has-own-property", etc.
        if (!dst.hasOwnProperty(key) && key.charAt(0) !== '$') {
          dst[key] = value;

          if (key !== 'class' && key !== 'style') {
            dstAttr[key] = srcAttr[key];
          }
        }
      });
    }


    function compileTemplateUrl(directives, $compileNode, tAttrs,
        $rootElement, childTranscludeFn, preLinkFns, postLinkFns, previousCompileContext) {
      var linkQueue = [],
          afterTemplateNodeLinkFn,
          afterTemplateChildLinkFn,
          beforeTemplateCompileNode = $compileNode[0],
          origAsyncDirective = directives.shift(),
          derivedSyncDirective = inherit(origAsyncDirective, {
            templateUrl: null, transclude: null, replace: null, $$originalDirective: origAsyncDirective
          }),
          templateUrl = (isFunction(origAsyncDirective.templateUrl))
              ? origAsyncDirective.templateUrl($compileNode, tAttrs)
              : origAsyncDirective.templateUrl,
          templateNamespace = origAsyncDirective.templateNamespace;

      $compileNode.empty();

      $templateRequest(templateUrl)
        .then(function(content) {
          var compileNode, tempTemplateAttrs, $template, childBoundTranscludeFn;

          content = denormalizeTemplate(content);

          if (origAsyncDirective.replace) {
            if (jqLiteIsTextNode(content)) {
              $template = [];
            } else {
              $template = removeComments(wrapTemplate(templateNamespace, trim(content)));
            }
            compileNode = $template[0];

            if ($template.length !== 1 || compileNode.nodeType !== NODE_TYPE_ELEMENT) {
              throw $compileMinErr('tplrt',
                  'Template for directive \'{0}\' must have exactly one root element. {1}',
                  origAsyncDirective.name, templateUrl);
            }

            tempTemplateAttrs = {$attr: {}};
            replaceWith($rootElement, $compileNode, compileNode);
            var templateDirectives = collectDirectives(compileNode, [], tempTemplateAttrs);

            if (isObject(origAsyncDirective.scope)) {
              // the original directive that caused the template to be loaded async required
              // an isolate scope
              markDirectiveScope(templateDirectives, true);
            }
            directives = templateDirectives.concat(directives);
            mergeTemplateAttributes(tAttrs, tempTemplateAttrs);
          } else {
            compileNode = beforeTemplateCompileNode;
            $compileNode.html(content);
          }

          directives.unshift(derivedSyncDirective);

          afterTemplateNodeLinkFn = applyDirectivesToNode(directives, compileNode, tAttrs,
              childTranscludeFn, $compileNode, origAsyncDirective, preLinkFns, postLinkFns,
              previousCompileContext);
          forEach($rootElement, function(node, i) {
            if (node === compileNode) {
              $rootElement[i] = $compileNode[0];
            }
          });
          afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes, childTranscludeFn);

          while (linkQueue.length) {
            var scope = linkQueue.shift(),
                beforeTemplateLinkNode = linkQueue.shift(),
                linkRootElement = linkQueue.shift(),
                boundTranscludeFn = linkQueue.shift(),
                linkNode = $compileNode[0];

            if (scope.$$destroyed) continue;

            if (beforeTemplateLinkNode !== beforeTemplateCompileNode) {
              var oldClasses = beforeTemplateLinkNode.className;

              if (!(previousCompileContext.hasElementTranscludeDirective &&
                  origAsyncDirective.replace)) {
                // it was cloned therefore we have to clone as well.
                linkNode = jqLiteClone(compileNode);
              }
              replaceWith(linkRootElement, jqLite(beforeTemplateLinkNode), linkNode);

              // Copy in CSS classes from original node
              safeAddClass(jqLite(linkNode), oldClasses);
            }
            if (afterTemplateNodeLinkFn.transcludeOnThisElement) {
              childBoundTranscludeFn = createBoundTranscludeFn(scope, afterTemplateNodeLinkFn.transclude, boundTranscludeFn);
            } else {
              childBoundTranscludeFn = boundTranscludeFn;
            }
            afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode, $rootElement,
              childBoundTranscludeFn);
          }
          linkQueue = null;
        }).catch(function(error) {
          if (error instanceof Error) {
            $exceptionHandler(error);
          }
        });

      return function delayedNodeLinkFn(ignoreChildLinkFn, scope, node, rootElement, boundTranscludeFn) {
        var childBoundTranscludeFn = boundTranscludeFn;
        if (scope.$$destroyed) return;
        if (linkQueue) {
          linkQueue.push(scope,
                         node,
                         rootElement,
                         childBoundTranscludeFn);
        } else {
          if (afterTemplateNodeLinkFn.transcludeOnThisElement) {
            childBoundTranscludeFn = createBoundTranscludeFn(scope, afterTemplateNodeLinkFn.transclude, boundTranscludeFn);
          }
          afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, node, rootElement, childBoundTranscludeFn);
        }
      };
    }


    /**
     * Sorting function for bound directives.
     */
    function byPriority(a, b) {
      var diff = b.priority - a.priority;
      if (diff !== 0) return diff;
      if (a.name !== b.name) return (a.name < b.name) ? -1 : 1;
      return a.index - b.index;
    }

    function assertNoDuplicate(what, previousDirective, directive, element) {

      function wrapModuleNameIfDefined(moduleName) {
        return moduleName ?
          (' (module: ' + moduleName + ')') :
          '';
      }

      if (previousDirective) {
        throw $compileMinErr('multidir', 'Multiple directives [{0}{1}, {2}{3}] asking for {4} on: {5}',
            previousDirective.name, wrapModuleNameIfDefined(previousDirective.$$moduleName),
            directive.name, wrapModuleNameIfDefined(directive.$$moduleName), what, startingTag(element));
      }
    }


    function addTextInterpolateDirective(directives, text) {

      var interpolateFn = $interpolate(text, true);

      if (interpolateFn) {
        directives.push({
          priority: 0,
          compile: function textInterpolateCompileFn(templateNode) {

            var templateNodeParent = templateNode.parent(),
                hasCompileParent = !!templateNodeParent.length;

            // When transcluding a template that has bindings in the root
            // we don't have a parent and thus need to add the class during linking fn.
            if (hasCompileParent) compile.$$addBindingClass(templateNodeParent);

            return function textInterpolateLinkFn(scope, node) {

              console.log(scope);
              console.log(node);

              var parent = node.parent();
              if (!hasCompileParent) compile.$$addBindingClass(parent);
              compile.$$addBindingInfo(parent, interpolateFn.expressions);
              scope.$watch(interpolateFn, function interpolateFnWatchAction(value) {
                node[0].nodeValue = value;
              });
            };
          }
        });
      }
    }


    function wrapTemplate(type, template) {
      type = lowercase(type || 'html');
      switch (type) {
      case 'svg':
      case 'math':
        var wrapper = window.document.createElement('div');
        wrapper.innerHTML = '<' + type + '>' + template + '</' + type + '>';
        return wrapper.childNodes[0].childNodes;
      default:
        return template;
      }
    }


    function getTrustedContext(node, attrNormalizedName) {
      if (attrNormalizedName === 'srcdoc') {
        return $sce.HTML;
      }
      var tag = nodeName_(node);
      // All tags with src attributes require a RESOURCE_URL value, except for
      // img and various html5 media tags.
      if (attrNormalizedName === 'src' || attrNormalizedName === 'ngSrc') {
        if (['img', 'video', 'audio', 'source', 'track'].indexOf(tag) === -1) {
          return $sce.RESOURCE_URL;
        }
      // maction[xlink:href] can source SVG.  It's not limited to <maction>.
      } else if (attrNormalizedName === 'xlinkHref' ||
          (tag === 'form' && attrNormalizedName === 'action') ||
          // links can be stylesheets or imports, which can run script in the current origin
          (tag === 'link' && attrNormalizedName === 'href')
      ) {
        return $sce.RESOURCE_URL;
      }
    }


    function addAttrInterpolateDirective(node, directives, value, name, isNgAttr) {
      var trustedContext = getTrustedContext(node, name);
      var mustHaveExpression = !isNgAttr;
      var allOrNothing = ALL_OR_NOTHING_ATTRS[name] || isNgAttr;

      var interpolateFn = $interpolate(value, mustHaveExpression, trustedContext, allOrNothing);

      // no interpolation found -> ignore
      if (!interpolateFn) return;

      if (name === 'multiple' && nodeName_(node) === 'select') {
        throw $compileMinErr('selmulti',
            'Binding to the \'multiple\' attribute is not supported. Element: {0}',
            startingTag(node));
      }

      if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
        throw $compileMinErr('nodomevents',
            'Interpolations for HTML DOM event attributes are disallowed.  Please use the ' +
                'ng- versions (such as ng-click instead of onclick) instead.');
      }

      directives.push({
        priority: 100,
        compile: function() {
            return {
              pre: function attrInterpolatePreLinkFn(scope, element, attr) {
                var $$observers = (attr.$$observers || (attr.$$observers = createMap()));

                // If the attribute has changed since last $interpolate()ed
                var newValue = attr[name];
                if (newValue !== value) {
                  // we need to interpolate again since the attribute value has been updated
                  // (e.g. by another directive's compile function)
                  // ensure unset/empty values make interpolateFn falsy
                  interpolateFn = newValue && $interpolate(newValue, true, trustedContext, allOrNothing);
                  value = newValue;
                }

                // if attribute was updated so that there is no interpolation going on we don't want to
                // register any observers
                if (!interpolateFn) return;

                // initialize attr object so that it's ready in case we need the value for isolate
                // scope initialization, otherwise the value would not be available from isolate
                // directive's linking fn during linking phase
                attr[name] = interpolateFn(scope);

                ($$observers[name] || ($$observers[name] = [])).$$inter = true;
                (attr.$$observers && attr.$$observers[name].$$scope || scope).
                  $watch(interpolateFn, function interpolateFnWatchAction(newValue, oldValue) {
                    //special case for class attribute addition + removal
                    //so that class changes can tap into the animation
                    //hooks provided by the $animate service. Be sure to
                    //skip animations when the first digest occurs (when
                    //both the new and the old values are the same) since
                    //the CSS classes are the non-interpolated values
                    if (name === 'class' && newValue !== oldValue) {
                      attr.$updateClass(newValue, oldValue);
                    } else {
                      attr.$set(name, newValue);
                    }
                  });
              }
            };
          }
      });
    }


    /**
     * This is a special jqLite.replaceWith, which can replace items which
     * have no parents, provided that the containing jqLite collection is provided.
     *
     * @param {JqLite=} $rootElement The root of the compile tree. Used so that we can replace nodes
     *                               in the root of the tree.
     * @param {JqLite} elementsToRemove The jqLite element which we are going to replace. We keep
     *                                  the shell, but replace its DOM node reference.
     * @param {Node} newNode The new DOM node.
     */
    function replaceWith($rootElement, elementsToRemove, newNode) {
      var firstElementToRemove = elementsToRemove[0],
          removeCount = elementsToRemove.length,
          parent = firstElementToRemove.parentNode,
          i, ii;

      if ($rootElement) {
        for (i = 0, ii = $rootElement.length; i < ii; i++) {
          if ($rootElement[i] === firstElementToRemove) {
            $rootElement[i++] = newNode;
            for (var j = i, j2 = j + removeCount - 1,
                     jj = $rootElement.length;
                 j < jj; j++, j2++) {
              if (j2 < jj) {
                $rootElement[j] = $rootElement[j2];
              } else {
                delete $rootElement[j];
              }
            }
            $rootElement.length -= removeCount - 1;

            // If the replaced element is also the jQuery .context then replace it
            // .context is a deprecated jQuery api, so we should set it only when jQuery set it
            // http://api.jquery.com/context/
            if ($rootElement.context === firstElementToRemove) {
              $rootElement.context = newNode;
            }
            break;
          }
        }
      }

      if (parent) {
        parent.replaceChild(newNode, firstElementToRemove);
      }

      // Append all the `elementsToRemove` to a fragment. This will...
      // - remove them from the DOM
      // - allow them to still be traversed with .nextSibling
      // - allow a single fragment.qSA to fetch all elements being removed
      var fragment = window.document.createDocumentFragment();
      for (i = 0; i < removeCount; i++) {
        fragment.appendChild(elementsToRemove[i]);
      }

      if (jqLite.hasData(firstElementToRemove)) {
        // Copy over user data (that includes Angular's $scope etc.). Don't copy private
        // data here because there's no public interface in jQuery to do that and copying over
        // event listeners (which is the main use of private data) wouldn't work anyway.
        jqLite.data(newNode, jqLite.data(firstElementToRemove));

        // Remove $destroy event listeners from `firstElementToRemove`
        jqLite(firstElementToRemove).off('$destroy');
      }

      // Cleanup any data/listeners on the elements and children.
      // This includes invoking the $destroy event on any elements with listeners.
      jqLite.cleanData(fragment.querySelectorAll('*'));

      // Update the jqLite collection to only contain the `newNode`
      for (i = 1; i < removeCount; i++) {
        delete elementsToRemove[i];
      }
      elementsToRemove[0] = newNode;
      elementsToRemove.length = 1;
    }


    function cloneAndAnnotateFn(fn, annotation) {
      return extend(function() { return fn.apply(null, arguments); }, fn, annotation);
    }


    function invokeLinkFn(linkFn, scope, $element, attrs, controllers, transcludeFn) {
      try {
        linkFn(scope, $element, attrs, controllers, transcludeFn);
      } catch (e) {
        $exceptionHandler(e, startingTag($element));
      }
    }


    // Set up $watches for isolate scope and controller bindings.
    function initializeDirectiveBindings(scope, attrs, destination, bindings, directive) {
      var removeWatchCollection = [];
      var initialChanges = {};
      var changes;
      forEach(bindings, function initializeBinding(definition, scopeName) {
        var attrName = definition.attrName,
        optional = definition.optional,
        mode = definition.mode, // @, =, <, or &
        lastValue,
        parentGet, parentSet, compare, removeWatch;

        switch (mode) {

          case '@':
            if (!optional && !hasOwnProperty.call(attrs, attrName)) {
              destination[scopeName] = attrs[attrName] = undefined;
            }
            removeWatch = attrs.$observe(attrName, function(value) {
              if (isString(value) || isBoolean(value)) {
                var oldValue = destination[scopeName];
                recordChanges(scopeName, value, oldValue);
                destination[scopeName] = value;
              }
            });
            attrs.$$observers[attrName].$$scope = scope;
            lastValue = attrs[attrName];
            if (isString(lastValue)) {
              // If the attribute has been provided then we trigger an interpolation to ensure
              // the value is there for use in the link fn
              destination[scopeName] = $interpolate(lastValue)(scope);
            } else if (isBoolean(lastValue)) {
              // If the attributes is one of the BOOLEAN_ATTR then Angular will have converted
              // the value to boolean rather than a string, so we special case this situation
              destination[scopeName] = lastValue;
            }
            initialChanges[scopeName] = new SimpleChange(_UNINITIALIZED_VALUE, destination[scopeName]);
            removeWatchCollection.push(removeWatch);
            break;

          case '=':
            if (!hasOwnProperty.call(attrs, attrName)) {
              if (optional) break;
              attrs[attrName] = undefined;
            }
            if (optional && !attrs[attrName]) break;

            parentGet = $parse(attrs[attrName]);
            if (parentGet.literal) {
              compare = equals;
            } else {
              compare = simpleCompare;
            }
            parentSet = parentGet.assign || function() {
              // reset the change, or we will throw this exception on every $digest
              lastValue = destination[scopeName] = parentGet(scope);
              throw $compileMinErr('nonassign',
                  'Expression \'{0}\' in attribute \'{1}\' used with directive \'{2}\' is non-assignable!',
                  attrs[attrName], attrName, directive.name);
            };
            lastValue = destination[scopeName] = parentGet(scope);
            var parentValueWatch = function parentValueWatch(parentValue) {
              if (!compare(parentValue, destination[scopeName])) {
                // we are out of sync and need to copy
                if (!compare(parentValue, lastValue)) {
                  // parent changed and it has precedence
                  destination[scopeName] = parentValue;
                } else {
                  // if the parent can be assigned then do so
                  parentSet(scope, parentValue = destination[scopeName]);
                }
              }
              lastValue = parentValue;
              return lastValue;
            };
            parentValueWatch.$stateful = true;
            if (definition.collection) {
              removeWatch = scope.$watchCollection(attrs[attrName], parentValueWatch);
            } else {
              removeWatch = scope.$watch($parse(attrs[attrName], parentValueWatch), null, parentGet.literal);
            }
            removeWatchCollection.push(removeWatch);
            break;

          case '<':
            if (!hasOwnProperty.call(attrs, attrName)) {
              if (optional) break;
              attrs[attrName] = undefined;
            }
            if (optional && !attrs[attrName]) break;

            parentGet = $parse(attrs[attrName]);
            var deepWatch = parentGet.literal;

            var initialValue = destination[scopeName] = parentGet(scope);
            initialChanges[scopeName] = new SimpleChange(_UNINITIALIZED_VALUE, destination[scopeName]);

            removeWatch = scope.$watch(parentGet, function parentValueWatchAction(newValue, oldValue) {
              if (oldValue === newValue) {
                if (oldValue === initialValue || (deepWatch && equals(oldValue, initialValue))) {
                  return;
                }
                oldValue = initialValue;
              }
              recordChanges(scopeName, newValue, oldValue);
              destination[scopeName] = newValue;
            }, deepWatch);

            removeWatchCollection.push(removeWatch);
            break;

          case '&':
            // Don't assign Object.prototype method to scope
            parentGet = attrs.hasOwnProperty(attrName) ? $parse(attrs[attrName]) : noop;

            // Don't assign noop to destination if expression is not valid
            if (parentGet === noop && optional) break;

            destination[scopeName] = function(locals) {
              return parentGet(scope, locals);
            };
            break;
        }
      });

      function recordChanges(key, currentValue, previousValue) {
        if (isFunction(destination.$onChanges) && !simpleCompare(currentValue, previousValue)) {
          // If we have not already scheduled the top level onChangesQueue handler then do so now
          if (!onChangesQueue) {
            scope.$$postDigest(flushOnChangesQueue);
            onChangesQueue = [];
          }
          // If we have not already queued a trigger of onChanges for this controller then do so now
          if (!changes) {
            changes = {};
            onChangesQueue.push(triggerOnChangesHook);
          }
          // If the has been a change on this property already then we need to reuse the previous value
          if (changes[key]) {
            previousValue = changes[key].previousValue;
          }
          // Store this change
          changes[key] = new SimpleChange(previousValue, currentValue);
        }
      }

      function triggerOnChangesHook() {
        destination.$onChanges(changes);
        // Now clear the changes so that we schedule onChanges when more changes arrive
        changes = undefined;
      }

      return {
        initialChanges: initialChanges,
        removeWatches: removeWatchCollection.length && function removeWatches() {
          for (var i = 0, ii = removeWatchCollection.length; i < ii; ++i) {
            removeWatchCollection[i]();
          }
        }
      };
    }
  }];
}

function SimpleChange(previous, current) {
  this.previousValue = previous;
  this.currentValue = current;
}
SimpleChange.prototype.isFirstChange = function() { return this.previousValue === _UNINITIALIZED_VALUE; };


var PREFIX_REGEXP = /^((?:x|data)[:\-_])/i;
var SPECIAL_CHARS_REGEXP = /[:\-_]+(.)/g;

/**
 * Converts all accepted directives format into proper directive name.
 * @param name Name to normalize
 */
function directiveNormalize(name) {
  return name
    .replace(PREFIX_REGEXP, '')
    .replace(SPECIAL_CHARS_REGEXP, fnCamelCaseReplace);
}

/**
 * @ngdoc type
 * @name $compile.directive.Attributes
 *
 * @description
 * A shared object between directive compile / linking functions which contains normalized DOM
 * element attributes. The values reflect current binding state `{{ }}`. The normalization is
 * needed since all of these are treated as equivalent in Angular:
 *
 * ```
 *    <span ng:bind="a" ng-bind="a" data-ng-bind="a" x-ng-bind="a">
 * ```
 */

/**
 * @ngdoc property
 * @name $compile.directive.Attributes#$attr
 *
 * @description
 * A map of DOM element attribute names to the normalized name. This is
 * needed to do reverse lookup from normalized name back to actual name.
 */


/**
 * @ngdoc method
 * @name $compile.directive.Attributes#$set
 * @kind function
 *
 * @description
 * Set DOM element attribute value.
 *
 *
 * @param {string} name Normalized element attribute name of the property to modify. The name is
 *          reverse-translated using the {@link ng.$compile.directive.Attributes#$attr $attr}
 *          property to the original name.
 * @param {string} value Value to set the attribute to. The value can be an interpolated string.
 */



/**
 * Closure compiler type information
 */

function nodesetLinkingFn(
  /* angular.Scope */ scope,
  /* NodeList */ nodeList,
  /* Element */ rootElement,
  /* function(Function) */ boundTranscludeFn
) {}

function directiveLinkingFn(
  /* nodesetLinkingFn */ nodesetLinkingFn,
  /* angular.Scope */ scope,
  /* Node */ node,
  /* Element */ rootElement,
  /* function(Function) */ boundTranscludeFn
) {}

function tokenDifference(str1, str2) {
  var values = '',
      tokens1 = str1.split(/\s+/),
      tokens2 = str2.split(/\s+/);

  outer:
  for (var i = 0; i < tokens1.length; i++) {
    var token = tokens1[i];
    for (var j = 0; j < tokens2.length; j++) {
      if (token === tokens2[j]) continue outer;
    }
    values += (values.length > 0 ? ' ' : '') + token;
  }
  return values;
}

function removeComments(jqNodes) {
  jqNodes = jqLite(jqNodes);
  var i = jqNodes.length;

  if (i <= 1) {
    return jqNodes;
  }

  while (i--) {
    var node = jqNodes[i];
    if (node.nodeType === NODE_TYPE_COMMENT ||
       (node.nodeType === NODE_TYPE_TEXT && node.nodeValue.trim() === '')) {
         splice.call(jqNodes, i, 1);
    }
  }
  return jqNodes;
}

var $controllerMinErr = minErr('$controller');


var CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;
function identifierForController(controller, ident) {
  if (ident && isString(ident)) return ident;
  if (isString(controller)) {
    var match = CNTRL_REG.exec(controller);
    if (match) return match[3];
  }
}


/**
 * @ngdoc provider
 * @name $controllerProvider
 * @this
 *
 * @description
 * The {@link ng.$controller $controller service} is used by Angular to create new
 * controllers.
 *
 * This provider allows controller registration via the
 * {@link ng.$controllerProvider#register register} method.
 */
function $ControllerProvider() {
  var controllers = {},
      globals = false;

  /**
   * @ngdoc method
   * @name $controllerProvider#has
   * @param {string} name Controller name to check.
   */
  this.has = function(name) {
    return controllers.hasOwnProperty(name);
  };

  /**
   * @ngdoc method
   * @name $controllerProvider#register
   * @param {string|Object} name Controller name, or an object map of controllers where the keys are
   *    the names and the values are the constructors.
   * @param {Function|Array} constructor Controller constructor fn (optionally decorated with DI
   *    annotations in the array notation).
   */
  this.register = function(name, constructor) {
    assertNotHasOwnProperty(name, 'controller');
    if (isObject(name)) {
      extend(controllers, name);
    } else {
      controllers[name] = constructor;
    }
  };

  /**
   * @ngdoc method
   * @name $controllerProvider#allowGlobals
   * @description If called, allows `$controller` to find controller constructors on `window`
   *
   * @deprecated
   * sinceVersion="v1.3.0"
   * removeVersion="v1.7.0"
   * This method of finding controllers has been deprecated.
   */
  this.allowGlobals = function() {
    globals = true;
  };


  this.$get = ['$injector', '$window', function($injector, $window) {

    /**
     * @ngdoc service
     * @name $controller
     * @requires $injector
     *
     * @param {Function|string} constructor If called with a function then it's considered to be the
     *    controller constructor function. Otherwise it's considered to be a string which is used
     *    to retrieve the controller constructor using the following steps:
     *
     *    * check if a controller with given name is registered via `$controllerProvider`
     *    * check if evaluating the string on the current scope returns a constructor
     *    * if $controllerProvider#allowGlobals, check `window[constructor]` on the global
     *      `window` object (deprecated, not recommended)
     *
     *    The string can use the `controller as property` syntax, where the controller instance is published
     *    as the specified property on the `scope`; the `scope` must be injected into `locals` param for this
     *    to work correctly.
     *
     * @param {Object} locals Injection locals for Controller.
     * @return {Object} Instance of given controller.
     *
     * @description
     * `$controller` service is responsible for instantiating controllers.
     *
     * It's just a simple call to {@link auto.$injector $injector}, but extracted into
     * a service, so that one can override this service with [BC version](https://gist.github.com/1649788).
     */
    return function $controller(expression, locals, later, ident) {
      // PRIVATE API:
      //   param `later` --- indicates that the controller's constructor is invoked at a later time.
      //                     If true, $controller will allocate the object with the correct
      //                     prototype chain, but will not invoke the controller until a returned
      //                     callback is invoked.
      //   param `ident` --- An optional label which overrides the label parsed from the controller
      //                     expression, if any.
      var instance, match, constructor, identifier;
      later = later === true;
      if (ident && isString(ident)) {
        identifier = ident;
      }

      if (isString(expression)) {
        match = expression.match(CNTRL_REG);
        if (!match) {
          throw $controllerMinErr('ctrlfmt',
            'Badly formed controller string \'{0}\'. ' +
            'Must match `__name__ as __id__` or `__name__`.', expression);
        }
        constructor = match[1];
        identifier = identifier || match[3];
        expression = controllers.hasOwnProperty(constructor)
            ? controllers[constructor]
            : getter(locals.$scope, constructor, true) ||
                (globals ? getter($window, constructor, true) : undefined);

        if (!expression) {
          throw $controllerMinErr('ctrlreg',
            'The controller with the name \'{0}\' is not registered.', constructor);
        }

        assertArgFn(expression, constructor, true);
      }

      if (later) {
        // Instantiate controller later:
        // This machinery is used to create an instance of the object before calling the
        // controller's constructor itself.
        //
        // This allows properties to be added to the controller before the constructor is
        // invoked. Primarily, this is used for isolate scope bindings in $compile.
        //
        // This feature is not intended for use by applications, and is thus not documented
        // publicly.
        // Object creation: http://jsperf.com/create-constructor/2
        var controllerPrototype = (isArray(expression) ?
          expression[expression.length - 1] : expression).prototype;
        instance = Object.create(controllerPrototype || null);

        if (identifier) {
          addIdentifier(locals, identifier, instance, constructor || expression.name);
        }

        return extend(function $controllerInit() {
          var result = $injector.invoke(expression, instance, locals, constructor);
          if (result !== instance && (isObject(result) || isFunction(result))) {
            instance = result;
            if (identifier) {
              // If result changed, re-assign controllerAs value to scope.
              addIdentifier(locals, identifier, instance, constructor || expression.name);
            }
          }
          return instance;
        }, {
          instance: instance,
          identifier: identifier
        });
      }

      instance = $injector.instantiate(expression, locals, constructor);

      if (identifier) {
        addIdentifier(locals, identifier, instance, constructor || expression.name);
      }

      return instance;
    };

    function addIdentifier(locals, identifier, instance, name) {
      if (!(locals && isObject(locals.$scope))) {
        throw minErr('$controller')('noscp',
          'Cannot export controller \'{0}\' as \'{1}\'! No $scope object provided via `locals`.',
          name, identifier);
      }

      locals.$scope[identifier] = instance;
    }
  }];
}

/**
 * @ngdoc service
 * @name $document
 * @requires $window
 * @this
 *
 * @description
 * A {@link angular.element jQuery or jqLite} wrapper for the browser's `window.document` object.
 *
 * @example
   <example module="documentExample" name="document">
     <file name="index.html">
       <div ng-controller="ExampleController">
         <p>$document title: <b ng-bind="title"></b></p>
         <p>window.document title: <b ng-bind="windowTitle"></b></p>
       </div>
     </file>
     <file name="script.js">
       angular.module('documentExample', [])
         .controller('ExampleController', ['$scope', '$document', function($scope, $document) {
           $scope.title = $document[0].title;
           $scope.windowTitle = angular.element(window.document)[0].title;
         }]);
     </file>
   </example>
 */
function $DocumentProvider() {
  this.$get = ['$window', function(window) {
    return jqLite(window.document);
  }];
}


/**
 * @private
 * @this
 * Listens for document visibility change and makes the current status accessible.
 */
function $$IsDocumentHiddenProvider() {
  this.$get = ['$document', '$rootScope', function($document, $rootScope) {
    var doc = $document[0];
    var hidden = doc && doc.hidden;

    $document.on('visibilitychange', changeListener);

    $rootScope.$on('$destroy', function() {
      $document.off('visibilitychange', changeListener);
    });

    function changeListener() {
      hidden = doc.hidden;
    }

    return function() {
      return hidden;
    };
  }];
}

/**
 * @ngdoc service
 * @name $exceptionHandler
 * @requires ng.$log
 * @this
 *
 * @description
 * Any uncaught exception in angular expressions is delegated to this service.
 * The default implementation simply delegates to `$log.error` which logs it into
 * the browser console.
 *
 * In unit tests, if `angular-mocks.js` is loaded, this service is overridden by
 * {@link ngMock.$exceptionHandler mock $exceptionHandler} which aids in testing.
 *
 * ## Example:
 *
 * The example below will overwrite the default `$exceptionHandler` in order to (a) log uncaught
 * errors to the backend for later inspection by the developers and (b) to use `$log.warn()` instead
 * of `$log.error()`.
 *
 * ```js
 *   angular.
 *     module('exceptionOverwrite', []).
 *     factory('$exceptionHandler', ['$log', 'logErrorsToBackend', function($log, logErrorsToBackend) {
 *       return function myExceptionHandler(exception, cause) {
 *         logErrorsToBackend(exception, cause);
 *         $log.warn(exception, cause);
 *       };
 *     }]);
 * ```
 *
 * <hr />
 * Note, that code executed in event-listeners (even those registered using jqLite's `on`/`bind`
 * methods) does not delegate exceptions to the {@link ng.$exceptionHandler $exceptionHandler}
 * (unless executed during a digest).
 *
 * If you wish, you can manually delegate exceptions, e.g.
 * `try { ... } catch(e) { $exceptionHandler(e); }`
 *
 * @param {Error} exception Exception associated with the error.
 * @param {string=} cause Optional information about the context in which
 *       the error was thrown.
 *
 */
function $ExceptionHandlerProvider() {
  this.$get = ['$log', function($log) {
    return function(exception, cause) {
      $log.error.apply($log, arguments);
    };
  }];
}

var $$ForceReflowProvider = /** @this */ function() {
  this.$get = ['$document', function($document) {
    return function(domNode) {
      //the line below will force the browser to perform a repaint so
      //that all the animated elements within the animation frame will
      //be properly updated and drawn on screen. This is required to
      //ensure that the preparation animation is properly flushed so that
      //the active state picks up from there. DO NOT REMOVE THIS LINE.
      //DO NOT OPTIMIZE THIS LINE. THE MINIFIER WILL REMOVE IT OTHERWISE WHICH
      //WILL RESULT IN AN UNPREDICTABLE BUG THAT IS VERY HARD TO TRACK DOWN AND
      //WILL TAKE YEARS AWAY FROM YOUR LIFE.
      if (domNode) {
        if (!domNode.nodeType && domNode instanceof jqLite) {
          domNode = domNode[0];
        }
      } else {
        domNode = $document[0].body;
      }
      return domNode.offsetWidth + 1;
    };
  }];
};

var APPLICATION_JSON = 'application/json';
var CONTENT_TYPE_APPLICATION_JSON = {'Content-Type': APPLICATION_JSON + ';charset=utf-8'};
var JSON_START = /^\[|^\{(?!\{)/;
var JSON_ENDS = {
  '[': /]$/,
  '{': /}$/
};
var JSON_PROTECTION_PREFIX = /^\)]\}',?\n/;
var $httpMinErr = minErr('$http');

function serializeValue(v) {
  if (isObject(v)) {
    return isDate(v) ? v.toISOString() : toJson(v);
  }
  return v;
}


/** @this */
function $HttpParamSerializerProvider() {
  /**
   * @ngdoc service
   * @name $httpParamSerializer
   * @description
   *
   * Default {@link $http `$http`} params serializer that converts objects to strings
   * according to the following rules:
   *
   * * `{'foo': 'bar'}` results in `foo=bar`
   * * `{'foo': Date.now()}` results in `foo=2015-04-01T09%3A50%3A49.262Z` (`toISOString()` and encoded representation of a Date object)
   * * `{'foo': ['bar', 'baz']}` results in `foo=bar&foo=baz` (repeated key for each array element)
   * * `{'foo': {'bar':'baz'}}` results in `foo=%7B%22bar%22%3A%22baz%22%7D` (stringified and encoded representation of an object)
   *
   * Note that serializer will sort the request parameters alphabetically.
   * */

  this.$get = function() {
    return function ngParamSerializer(params) {
      if (!params) return '';
      var parts = [];
      forEachSorted(params, function(value, key) {
        if (value === null || isUndefined(value)) return;
        if (isArray(value)) {
          forEach(value, function(v) {
            parts.push(encodeUriQuery(key)  + '=' + encodeUriQuery(serializeValue(v)));
          });
        } else {
          parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(serializeValue(value)));
        }
      });

      return parts.join('&');
    };
  };
}

/** @this */
function $HttpParamSerializerJQLikeProvider() {
  /**
   * @ngdoc service
   * @name $httpParamSerializerJQLike
   *
   * @description
   *
   * Alternative {@link $http `$http`} params serializer that follows
   * jQuery's [`param()`](http://api.jquery.com/jquery.param/) method logic.
   * The serializer will also sort the params alphabetically.
   *
   * To use it for serializing `$http` request parameters, set it as the `paramSerializer` property:
   *
   * ```js
   * $http({
   *   url: myUrl,
   *   method: 'GET',
   *   params: myParams,
   *   paramSerializer: '$httpParamSerializerJQLike'
   * });
   * ```
   *
   * It is also possible to set it as the default `paramSerializer` in the
   * {@link $httpProvider#defaults `$httpProvider`}.
   *
   * Additionally, you can inject the serializer and use it explicitly, for example to serialize
   * form data for submission:
   *
   * ```js
   * .controller(function($http, $httpParamSerializerJQLike) {
   *   //...
   *
   *   $http({
   *     url: myUrl,
   *     method: 'POST',
   *     data: $httpParamSerializerJQLike(myData),
   *     headers: {
   *       'Content-Type': 'application/x-www-form-urlencoded'
   *     }
   *   });
   *
   * });
   * ```
   *
   * */
  this.$get = function() {
    return function jQueryLikeParamSerializer(params) {
      if (!params) return '';
      var parts = [];
      serialize(params, '', true);
      return parts.join('&');

      function serialize(toSerialize, prefix, topLevel) {
        if (toSerialize === null || isUndefined(toSerialize)) return;
        if (isArray(toSerialize)) {
          forEach(toSerialize, function(value, index) {
            serialize(value, prefix + '[' + (isObject(value) ? index : '') + ']');
          });
        } else if (isObject(toSerialize) && !isDate(toSerialize)) {
          forEachSorted(toSerialize, function(value, key) {
            serialize(value, prefix +
                (topLevel ? '' : '[') +
                key +
                (topLevel ? '' : ']'));
          });
        } else {
          parts.push(encodeUriQuery(prefix) + '=' + encodeUriQuery(serializeValue(toSerialize)));
        }
      }
    };
  };
}

function defaultHttpResponseTransform(data, headers) {
  if (isString(data)) {
    // Strip json vulnerability protection prefix and trim whitespace
    var tempData = data.replace(JSON_PROTECTION_PREFIX, '').trim();

    if (tempData) {
      var contentType = headers('Content-Type');
      if ((contentType && (contentType.indexOf(APPLICATION_JSON) === 0)) || isJsonLike(tempData)) {
        try {
          data = fromJson(tempData);
        } catch (e) {
          throw $httpMinErr('baddata', 'Data must be a valid JSON object. Received: "{0}". ' +
          'Parse error: "{1}"', data, e);
        }
      }
    }
  }

  return data;
}

function isJsonLike(str) {
    var jsonStart = str.match(JSON_START);
    return jsonStart && JSON_ENDS[jsonStart[0]].test(str);
}

/**
 * Parse headers into key value object
 *
 * @param {string} headers Raw headers as a string
 * @returns {Object} Parsed headers as key value object
 */
function parseHeaders(headers) {
  var parsed = createMap(), i;

  function fillInParsed(key, val) {
    if (key) {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  }

  if (isString(headers)) {
    forEach(headers.split('\n'), function(line) {
      i = line.indexOf(':');
      fillInParsed(lowercase(trim(line.substr(0, i))), trim(line.substr(i + 1)));
    });
  } else if (isObject(headers)) {
    forEach(headers, function(headerVal, headerKey) {
      fillInParsed(lowercase(headerKey), trim(headerVal));
    });
  }

  return parsed;
}


/**
 * Returns a function that provides access to parsed headers.
 *
 * Headers are lazy parsed when first requested.
 * @see parseHeaders
 *
 * @param {(string|Object)} headers Headers to provide access to.
 * @returns {function(string=)} Returns a getter function which if called with:
 *
 *   - if called with an argument returns a single header value or null
 *   - if called with no arguments returns an object containing all headers.
 */
function headersGetter(headers) {
  var headersObj;

  return function(name) {
    if (!headersObj) headersObj =  parseHeaders(headers);

    if (name) {
      var value = headersObj[lowercase(name)];
      if (value === undefined) {
        value = null;
      }
      return value;
    }

    return headersObj;
  };
}


/**
 * Chain all given functions
 *
 * This function is used for both request and response transforming
 *
 * @param {*} data Data to transform.
 * @param {function(string=)} headers HTTP headers getter fn.
 * @param {number} status HTTP status code of the response.
 * @param {(Function|Array.<Function>)} fns Function or an array of functions.
 * @returns {*} Transformed data.
 */
function transformData(data, headers, status, fns) {
  if (isFunction(fns)) {
    return fns(data, headers, status);
  }

  forEach(fns, function(fn) {
    data = fn(data, headers, status);
  });

  return data;
}


function isSuccess(status) {
  return 200 <= status && status < 300;
}


/**
 * @ngdoc provider
 * @name $httpProvider
 * @this
 *
 * @description
 * Use `$httpProvider` to change the default behavior of the {@link ng.$http $http} service.
 * */
function $HttpProvider() {
  /**
   * @ngdoc property
   * @name $httpProvider#defaults
   * @description
   *
   * Object containing default values for all {@link ng.$http $http} requests.
   *
   * - **`defaults.cache`** - {boolean|Object} - A boolean value or object created with
   * {@link ng.$cacheFactory `$cacheFactory`} to enable or disable caching of HTTP responses
   * by default. See {@link $http#caching $http Caching} for more information.
   *
   * - **`defaults.xsrfCookieName`** - {string} - Name of cookie containing the XSRF token.
   * Defaults value is `'XSRF-TOKEN'`.
   *
   * - **`defaults.xsrfHeaderName`** - {string} - Name of HTTP header to populate with the
   * XSRF token. Defaults value is `'X-XSRF-TOKEN'`.
   *
   * - **`defaults.headers`** - {Object} - Default headers for all $http requests.
   * Refer to {@link ng.$http#setting-http-headers $http} for documentation on
   * setting default headers.
   *     - **`defaults.headers.common`**
   *     - **`defaults.headers.post`**
   *     - **`defaults.headers.put`**
   *     - **`defaults.headers.patch`**
   *
   *
   * - **`defaults.paramSerializer`** - `{string|function(Object<string,string>):string}` - A function
   *  used to the prepare string representation of request parameters (specified as an object).
   *  If specified as string, it is interpreted as a function registered with the {@link auto.$injector $injector}.
   *  Defaults to {@link ng.$httpParamSerializer $httpParamSerializer}.
   *
   * - **`defaults.jsonpCallbackParam`** - `{string}` - the name of the query parameter that passes the name of the
   * callback in a JSONP request. The value of this parameter will be replaced with the expression generated by the
   * {@link $jsonpCallbacks} service. Defaults to `'callback'`.
   *
   **/
  var defaults = this.defaults = {
    // transform incoming response data
    transformResponse: [defaultHttpResponseTransform],

    // transform outgoing request data
    transformRequest: [function(d) {
      return isObject(d) && !isFile(d) && !isBlob(d) && !isFormData(d) ? toJson(d) : d;
    }],

    // default headers
    headers: {
      common: {
        'Accept': 'application/json, text/plain, */*'
      },
      post:   shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
      put:    shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
      patch:  shallowCopy(CONTENT_TYPE_APPLICATION_JSON)
    },

    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',

    paramSerializer: '$httpParamSerializer',

    jsonpCallbackParam: 'callback'
  };

  var useApplyAsync = false;
  /**
   * @ngdoc method
   * @name $httpProvider#useApplyAsync
   * @description
   *
   * Configure $http service to combine processing of multiple http responses received at around
   * the same time via {@link ng.$rootScope.Scope#$applyAsync $rootScope.$applyAsync}. This can result in
   * significant performance improvement for bigger applications that make many HTTP requests
   * concurrently (common during application bootstrap).
   *
   * Defaults to false. If no value is specified, returns the current configured value.
   *
   * @param {boolean=} value If true, when requests are loaded, they will schedule a deferred
   *    "apply" on the next tick, giving time for subsequent requests in a roughly ~10ms window
   *    to load and share the same digest cycle.
   *
   * @returns {boolean|Object} If a value is specified, returns the $httpProvider for chaining.
   *    otherwise, returns the current configured value.
   **/
  this.useApplyAsync = function(value) {
    if (isDefined(value)) {
      useApplyAsync = !!value;
      return this;
    }
    return useApplyAsync;
  };

  /**
   * @ngdoc property
   * @name $httpProvider#interceptors
   * @description
   *
   * Array containing service factories for all synchronous or asynchronous {@link ng.$http $http}
   * pre-processing of request or postprocessing of responses.
   *
   * These service factories are ordered by request, i.e. they are applied in the same order as the
   * array, on request, but reverse order, on response.
   *
   * {@link ng.$http#interceptors Interceptors detailed info}
   **/
  var interceptorFactories = this.interceptors = [];

  this.$get = ['$browser', '$httpBackend', '$$cookieReader', '$cacheFactory', '$rootScope', '$q', '$injector', '$sce',
      function($browser, $httpBackend, $$cookieReader, $cacheFactory, $rootScope, $q, $injector, $sce) {

    var defaultCache = $cacheFactory('$http');

    /**
     * Make sure that default param serializer is exposed as a function
     */
    defaults.paramSerializer = isString(defaults.paramSerializer) ?
      $injector.get(defaults.paramSerializer) : defaults.paramSerializer;

    /**
     * Interceptors stored in reverse order. Inner interceptors before outer interceptors.
     * The reversal is needed so that we can build up the interception chain around the
     * server request.
     */
    var reversedInterceptors = [];

    forEach(interceptorFactories, function(interceptorFactory) {
      reversedInterceptors.unshift(isString(interceptorFactory)
          ? $injector.get(interceptorFactory) : $injector.invoke(interceptorFactory));
    });

    /**
     * @ngdoc service
     * @kind function
     * @name $http
     * @requires ng.$httpBackend
     * @requires $cacheFactory
     * @requires $rootScope
     * @requires $q
     * @requires $injector
     *
     * @description
     * The `$http` service is a core Angular service that facilitates communication with the remote
     * HTTP servers via the browser's [XMLHttpRequest](https://developer.mozilla.org/en/xmlhttprequest)
     * object or via [JSONP](http://en.wikipedia.org/wiki/JSONP).
     *
     * For unit testing applications that use `$http` service, see
     * {@link ngMock.$httpBackend $httpBackend mock}.
     *
     * For a higher level of abstraction, please check out the {@link ngResource.$resource
     * $resource} service.
     *
     * The $http API is based on the {@link ng.$q deferred/promise APIs} exposed by
     * the $q service. While for simple usage patterns this doesn't matter much, for advanced usage
     * it is important to familiarize yourself with these APIs and the guarantees they provide.
     *
     *
     * ## General usage
     * The `$http` service is a function which takes a single argument — a {@link $http#usage configuration object} —
     * that is used to generate an HTTP request and returns  a {@link ng.$q promise}.
     *
     * ```js
     *   // Simple GET request example:
     *   $http({
     *     method: 'GET',
     *     url: '/someUrl'
     *   }).then(function successCallback(response) {
     *       // this callback will be called asynchronously
     *       // when the response is available
     *     }, function errorCallback(response) {
     *       // called asynchronously if an error occurs
     *       // or server returns response with an error status.
     *     });
     * ```
     *
     * The response object has these properties:
     *
     *   - **data** – `{string|Object}` – The response body transformed with the transform
     *     functions.
     *   - **status** – `{number}` – HTTP status code of the response.
     *   - **headers** – `{function([headerName])}` – Header getter function.
     *   - **config** – `{Object}` – The configuration object that was used to generate the request.
     *   - **statusText** – `{string}` – HTTP status text of the response.
     *
     * A response status code between 200 and 299 is considered a success status and will result in
     * the success callback being called. Any response status code outside of that range is
     * considered an error status and will result in the error callback being called.
     * Also, status codes less than -1 are normalized to zero. -1 usually means the request was
     * aborted, e.g. using a `config.timeout`.
     * Note that if the response is a redirect, XMLHttpRequest will transparently follow it, meaning
     * that the outcome (success or error) will be determined by the final response status code.
     *
     *
     * ## Shortcut methods
     *
     * Shortcut methods are also available. All shortcut methods require passing in the URL, and
     * request data must be passed in for POST/PUT requests. An optional config can be passed as the
     * last argument.
     *
     * ```js
     *   $http.get('/someUrl', config).then(successCallback, errorCallback);
     *   $http.post('/someUrl', data, config).then(successCallback, errorCallback);
     * ```
     *
     * Complete list of shortcut methods:
     *
     * - {@link ng.$http#get $http.get}
     * - {@link ng.$http#head $http.head}
     * - {@link ng.$http#post $http.post}
     * - {@link ng.$http#put $http.put}
     * - {@link ng.$http#delete $http.delete}
     * - {@link ng.$http#jsonp $http.jsonp}
     * - {@link ng.$http#patch $http.patch}
     *
     *
     * ## Writing Unit Tests that use $http
     * When unit testing (using {@link ngMock ngMock}), it is necessary to call
     * {@link ngMock.$httpBackend#flush $httpBackend.flush()} to flush each pending
     * request using trained responses.
     *
     * ```
     * $httpBackend.expectGET(...);
     * $http.get(...);
     * $httpBackend.flush();
     * ```
     *
     * ## Setting HTTP Headers
     *
     * The $http service will automatically add certain HTTP headers to all requests. These defaults
     * can be fully configured by accessing the `$httpProvider.defaults.headers` configuration
     * object, which currently contains this default configuration:
     *
     * - `$httpProvider.defaults.headers.common` (headers that are common for all requests):
     *   - <code>Accept: application/json, text/plain, \*&#65279;/&#65279;\*</code>
     * - `$httpProvider.defaults.headers.post`: (header defaults for POST requests)
     *   - `Content-Type: application/json`
     * - `$httpProvider.defaults.headers.put` (header defaults for PUT requests)
     *   - `Content-Type: application/json`
     *
     * To add or overwrite these defaults, simply add or remove a property from these configuration
     * objects. To add headers for an HTTP method other than POST or PUT, simply add a new object
     * with the lowercased HTTP method name as the key, e.g.
     * `$httpProvider.defaults.headers.get = { 'My-Header' : 'value' }`.
     *
     * The defaults can also be set at runtime via the `$http.defaults` object in the same
     * fashion. For example:
     *
     * ```
     * module.run(function($http) {
     *   $http.defaults.headers.common.Authorization = 'Basic YmVlcDpib29w';
     * });
     * ```
     *
     * In addition, you can supply a `headers` property in the config object passed when
     * calling `$http(config)`, which overrides the defaults without changing them globally.
     *
     * To explicitly remove a header automatically added via $httpProvider.defaults.headers on a per request basis,
     * Use the `headers` property, setting the desired header to `undefined`. For example:
     *
     * ```js
     * var req = {
     *  method: 'POST',
     *  url: 'http://example.com',
     *  headers: {
     *    'Content-Type': undefined
     *  },
     *  data: { test: 'test' }
     * }
     *
     * $http(req).then(function(){...}, function(){...});
     * ```
     *
     * ## Transforming Requests and Responses
     *
     * Both requests and responses can be transformed using transformation functions: `transformRequest`
     * and `transformResponse`. These properties can be a single function that returns
     * the transformed value (`function(data, headersGetter, status)`) or an array of such transformation functions,
     * which allows you to `push` or `unshift` a new transformation function into the transformation chain.
     *
     * <div class="alert alert-warning">
     * **Note:** Angular does not make a copy of the `data` parameter before it is passed into the `transformRequest` pipeline.
     * That means changes to the properties of `data` are not local to the transform function (since Javascript passes objects by reference).
     * For example, when calling `$http.get(url, $scope.myObject)`, modifications to the object's properties in a transformRequest
     * function will be reflected on the scope and in any templates where the object is data-bound.
     * To prevent this, transform functions should have no side-effects.
     * If you need to modify properties, it is recommended to make a copy of the data, or create new object to return.
     * </div>
     *
     * ### Default Transformations
     *
     * The `$httpProvider` provider and `$http` service expose `defaults.transformRequest` and
     * `defaults.transformResponse` properties. If a request does not provide its own transformations
     * then these will be applied.
     *
     * You can augment or replace the default transformations by modifying these properties by adding to or
     * replacing the array.
     *
     * Angular provides the following default transformations:
     *
     * Request transformations (`$httpProvider.defaults.transformRequest` and `$http.defaults.transformRequest`):
     *
     * - If the `data` property of the request configuration object contains an object, serialize it
     *   into JSON format.
     *
     * Response transformations (`$httpProvider.defaults.transformResponse` and `$http.defaults.transformResponse`):
     *
     *  - If XSRF prefix is detected, strip it (see Security Considerations section below).
     *  - If JSON response is detected, deserialize it using a JSON parser.
     *
     *
     * ### Overriding the Default Transformations Per Request
     *
     * If you wish to override the request/response transformations only for a single request then provide
     * `transformRequest` and/or `transformResponse` properties on the configuration object passed
     * into `$http`.
     *
     * Note that if you provide these properties on the config object the default transformations will be
     * overwritten. If you wish to augment the default transformations then you must include them in your
     * local transformation array.
     *
     * The following code demonstrates adding a new response transformation to be run after the default response
     * transformations have been run.
     *
     * ```js
     * function appendTransform(defaults, transform) {
     *
     *   // We can't guarantee that the default transformation is an array
     *   defaults = angular.isArray(defaults) ? defaults : [defaults];
     *
     *   // Append the new transformation to the defaults
     *   return defaults.concat(transform);
     * }
     *
     * $http({
     *   url: '...',
     *   method: 'GET',
     *   transformResponse: appendTransform($http.defaults.transformResponse, function(value) {
     *     return doTransform(value);
     *   })
     * });
     * ```
     *
     *
     * ## Caching
     *
     * {@link ng.$http `$http`} responses are not cached by default. To enable caching, you must
     * set the config.cache value or the default cache value to TRUE or to a cache object (created
     * with {@link ng.$cacheFactory `$cacheFactory`}). If defined, the value of config.cache takes
     * precedence over the default cache value.
     *
     * In order to:
     *   * cache all responses - set the default cache value to TRUE or to a cache object
     *   * cache a specific response - set config.cache value to TRUE or to a cache object
     *
     * If caching is enabled, but neither the default cache nor config.cache are set to a cache object,
     * then the default `$cacheFactory("$http")` object is used.
     *
     * The default cache value can be set by updating the
     * {@link ng.$http#defaults `$http.defaults.cache`} property or the
     * {@link $httpProvider#defaults `$httpProvider.defaults.cache`} property.
     *
     * When caching is enabled, {@link ng.$http `$http`} stores the response from the server using
     * the relevant cache object. The next time the same request is made, the response is returned
     * from the cache without sending a request to the server.
     *
     * Take note that:
     *
     *   * Only GET and JSONP requests are cached.
     *   * The cache key is the request URL including search parameters; headers are not considered.
     *   * Cached responses are returned asynchronously, in the same way as responses from the server.
     *   * If multiple identical requests are made using the same cache, which is not yet populated,
     *     one request will be made to the server and remaining requests will return the same response.
     *   * A cache-control header on the response does not affect if or how responses are cached.
     *
     *
     * ## Interceptors
     *
     * Before you start creating interceptors, be sure to understand the
     * {@link ng.$q $q and deferred/promise APIs}.
     *
     * For purposes of global error handling, authentication, or any kind of synchronous or
     * asynchronous pre-processing of request or postprocessing of responses, it is desirable to be
     * able to intercept requests before they are handed to the server and
     * responses before they are handed over to the application code that
     * initiated these requests. The interceptors leverage the {@link ng.$q
     * promise APIs} to fulfill this need for both synchronous and asynchronous pre-processing.
     *
     * The interceptors are service factories that are registered with the `$httpProvider` by
     * adding them to the `$httpProvider.interceptors` array. The factory is called and
     * injected with dependencies (if specified) and returns the interceptor.
     *
     * There are two kinds of interceptors (and two kinds of rejection interceptors):
     *
     *   * `request`: interceptors get called with a http {@link $http#usage config} object. The function is free to
     *     modify the `config` object or create a new one. The function needs to return the `config`
     *     object directly, or a promise containing the `config` or a new `config` object.
     *   * `requestError`: interceptor gets called when a previous interceptor threw an error or
     *     resolved with a rejection.
     *   * `response`: interceptors get called with http `response` object. The function is free to
     *     modify the `response` object or create a new one. The function needs to return the `response`
     *     object directly, or as a promise containing the `response` or a new `response` object.
     *   * `responseError`: interceptor gets called when a previous interceptor threw an error or
     *     resolved with a rejection.
     *
     *
     * ```js
     *   // register the interceptor as a service
     *   $provide.factory('myHttpInterceptor', function($q, dependency1, dependency2) {
     *     return {
     *       // optional method
     *       'request': function(config) {
     *         // do something on success
     *         return config;
     *       },
     *
     *       // optional method
     *      'requestError': function(rejection) {
     *         // do something on error
     *         if (canRecover(rejection)) {
     *           return responseOrNewPromise
     *         }
     *         return $q.reject(rejection);
     *       },
     *
     *
     *
     *       // optional method
     *       'response': function(response) {
     *         // do something on success
     *         return response;
     *       },
     *
     *       // optional method
     *      'responseError': function(rejection) {
     *         // do something on error
     *         if (canRecover(rejection)) {
     *           return responseOrNewPromise
     *         }
     *         return $q.reject(rejection);
     *       }
     *     };
     *   });
     *
     *   $httpProvider.interceptors.push('myHttpInterceptor');
     *
     *
     *   // alternatively, register the interceptor via an anonymous factory
     *   $httpProvider.interceptors.push(function($q, dependency1, dependency2) {
     *     return {
     *      'request': function(config) {
     *          // same as above
     *       },
     *
     *       'response': function(response) {
     *          // same as above
     *       }
     *     };
     *   });
     * ```
     *
     * ## Security Considerations
     *
     * When designing web applications, consider security threats from:
     *
     * - [JSON vulnerability](http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx)
     * - [XSRF](http://en.wikipedia.org/wiki/Cross-site_request_forgery)
     *
     * Both server and the client must cooperate in order to eliminate these threats. Angular comes
     * pre-configured with strategies that address these issues, but for this to work backend server
     * cooperation is required.
     *
     * ### JSON Vulnerability Protection
     *
     * A [JSON vulnerability](http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx)
     * allows third party website to turn your JSON resource URL into
     * [JSONP](http://en.wikipedia.org/wiki/JSONP) request under some conditions. To
     * counter this your server can prefix all JSON requests with following string `")]}',\n"`.
     * Angular will automatically strip the prefix before processing it as JSON.
     *
     * For example if your server needs to return:
     * ```js
     * ['one','two']
     * ```
     *
     * which is vulnerable to attack, your server can return:
     * ```js
     * )]}',
     * ['one','two']
     * ```
     *
     * Angular will strip the prefix, before processing the JSON.
     *
     *
     * ### Cross Site Request Forgery (XSRF) Protection
     *
     * [XSRF](http://en.wikipedia.org/wiki/Cross-site_request_forgery) is an attack technique by
     * which the attacker can trick an authenticated user into unknowingly executing actions on your
     * website. Angular provides a mechanism to counter XSRF. When performing XHR requests, the
     * $http service reads a token from a cookie (by default, `XSRF-TOKEN`) and sets it as an HTTP
     * header (`X-XSRF-TOKEN`). Since only JavaScript that runs on your domain could read the
     * cookie, your server can be assured that the XHR came from JavaScript running on your domain.
     * The header will not be set for cross-domain requests.
     *
     * To take advantage of this, your server needs to set a token in a JavaScript readable session
     * cookie called `XSRF-TOKEN` on the first HTTP GET request. On subsequent XHR requests the
     * server can verify that the cookie matches `X-XSRF-TOKEN` HTTP header, and therefore be sure
     * that only JavaScript running on your domain could have sent the request. The token must be
     * unique for each user and must be verifiable by the server (to prevent the JavaScript from
     * making up its own tokens). We recommend that the token is a digest of your site's
     * authentication cookie with a [salt](https://en.wikipedia.org/wiki/Salt_(cryptography&#41;)
     * for added security.
     *
     * The name of the headers can be specified using the xsrfHeaderName and xsrfCookieName
     * properties of either $httpProvider.defaults at config-time, $http.defaults at run-time,
     * or the per-request config object.
     *
     * In order to prevent collisions in environments where multiple Angular apps share the
     * same domain or subdomain, we recommend that each application uses unique cookie name.
     *
     * @param {object} config Object describing the request to be made and how it should be
     *    processed. The object has following properties:
     *
     *    - **method** – `{string}` – HTTP method (e.g. 'GET', 'POST', etc)
     *    - **url** – `{string|TrustedObject}` – Absolute or relative URL of the resource that is being requested;
     *      or an object created by a call to `$sce.trustAsResourceUrl(url)`.
     *    - **params** – `{Object.<string|Object>}` – Map of strings or objects which will be serialized
     *      with the `paramSerializer` and appended as GET parameters.
     *    - **data** – `{string|Object}` – Data to be sent as the request message data.
     *    - **headers** – `{Object}` – Map of strings or functions which return strings representing
     *      HTTP headers to send to the server. If the return value of a function is null, the
     *      header will not be sent. Functions accept a config object as an argument.
     *    - **eventHandlers** - `{Object}` - Event listeners to be bound to the XMLHttpRequest object.
     *      To bind events to the XMLHttpRequest upload object, use `uploadEventHandlers`.
     *      The handler will be called in the context of a `$apply` block.
     *    - **uploadEventHandlers** - `{Object}` - Event listeners to be bound to the XMLHttpRequest upload
     *      object. To bind events to the XMLHttpRequest object, use `eventHandlers`.
     *      The handler will be called in the context of a `$apply` block.
     *    - **xsrfHeaderName** – `{string}` – Name of HTTP header to populate with the XSRF token.
     *    - **xsrfCookieName** – `{string}` – Name of cookie containing the XSRF token.
     *    - **transformRequest** –
     *      `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
     *      transform function or an array of such functions. The transform function takes the http
     *      request body and headers and returns its transformed (typically serialized) version.
     *      See {@link ng.$http#overriding-the-default-transformations-per-request
     *      Overriding the Default Transformations}
     *    - **transformResponse** –
     *      `{function(data, headersGetter, status)|Array.<function(data, headersGetter, status)>}` –
     *      transform function or an array of such functions. The transform function takes the http
     *      response body, headers and status and returns its transformed (typically deserialized) version.
     *      See {@link ng.$http#overriding-the-default-transformations-per-request
     *      Overriding the Default Transformations}
     *    - **paramSerializer** - `{string|function(Object<string,string>):string}` - A function used to
     *      prepare the string representation of request parameters (specified as an object).
     *      If specified as string, it is interpreted as function registered with the
     *      {@link $injector $injector}, which means you can create your own serializer
     *      by registering it as a {@link auto.$provide#service service}.
     *      The default serializer is the {@link $httpParamSerializer $httpParamSerializer};
     *      alternatively, you can use the {@link $httpParamSerializerJQLike $httpParamSerializerJQLike}
     *    - **cache** – `{boolean|Object}` – A boolean value or object created with
     *      {@link ng.$cacheFactory `$cacheFactory`} to enable or disable caching of the HTTP response.
     *      See {@link $http#caching $http Caching} for more information.
     *    - **timeout** – `{number|Promise}` – timeout in milliseconds, or {@link ng.$q promise}
     *      that should abort the request when resolved.
     *    - **withCredentials** - `{boolean}` - whether to set the `withCredentials` flag on the
     *      XHR object. See [requests with credentials](https://developer.mozilla.org/docs/Web/HTTP/Access_control_CORS#Requests_with_credentials)
     *      for more information.
     *    - **responseType** - `{string}` - see
     *      [XMLHttpRequest.responseType](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#xmlhttprequest-responsetype).
     *
     * @returns {HttpPromise} Returns a {@link ng.$q `Promise}` that will be resolved to a response object
     *                        when the request succeeds or fails.
     *
     *
     * @property {Array.<Object>} pendingRequests Array of config objects for currently pending
     *   requests. This is primarily meant to be used for debugging purposes.
     *
     *
     * @example
<example module="httpExample" name="http-service">
<file name="index.html">
  <div ng-controller="FetchController">
    <select ng-model="method" aria-label="Request method">
      <option>GET</option>
      <option>JSONP</option>
    </select>
    <input type="text" ng-model="url" size="80" aria-label="URL" />
    <button id="fetchbtn" ng-click="fetch()">fetch</button><br>
    <button id="samplegetbtn" ng-click="updateModel('GET', 'http-hello.html')">Sample GET</button>
    <button id="samplejsonpbtn"
      ng-click="updateModel('JSONP',
                    'https://angularjs.org/greet.php?name=Super%20Hero')">
      Sample JSONP
    </button>
    <button id="invalidjsonpbtn"
      ng-click="updateModel('JSONP', 'https://angularjs.org/doesntexist')">
        Invalid JSONP
      </button>
    <pre>http status code: {{status}}</pre>
    <pre>http response data: {{data}}</pre>
  </div>
</file>
<file name="script.js">
  angular.module('httpExample', [])
    .config(['$sceDelegateProvider', function($sceDelegateProvider) {
      // We must whitelist the JSONP endpoint that we are using to show that we trust it
      $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'https://angularjs.org/**'
      ]);
    }])
    .controller('FetchController', ['$scope', '$http', '$templateCache',
      function($scope, $http, $templateCache) {
        $scope.method = 'GET';
        $scope.url = 'http-hello.html';

        $scope.fetch = function() {
          $scope.code = null;
          $scope.response = null;

          $http({method: $scope.method, url: $scope.url, cache: $templateCache}).
            then(function(response) {
              $scope.status = response.status;
              $scope.data = response.data;
            }, function(response) {
              $scope.data = response.data || 'Request failed';
              $scope.status = response.status;
          });
        };

        $scope.updateModel = function(method, url) {
          $scope.method = method;
          $scope.url = url;
        };
      }]);
</file>
<file name="http-hello.html">
  Hello, $http!
</file>
<file name="protractor.js" type="protractor">
  var status = element(by.binding('status'));
  var data = element(by.binding('data'));
  var fetchBtn = element(by.id('fetchbtn'));
  var sampleGetBtn = element(by.id('samplegetbtn'));
  var invalidJsonpBtn = element(by.id('invalidjsonpbtn'));

  it('should make an xhr GET request', function() {
    sampleGetBtn.click();
    fetchBtn.click();
    expect(status.getText()).toMatch('200');
    expect(data.getText()).toMatch(/Hello, \$http!/);
  });

// Commented out due to flakes. See https://github.com/angular/angular.js/issues/9185
// it('should make a JSONP request to angularjs.org', function() {
//   var sampleJsonpBtn = element(by.id('samplejsonpbtn'));
//   sampleJsonpBtn.click();
//   fetchBtn.click();
//   expect(status.getText()).toMatch('200');
//   expect(data.getText()).toMatch(/Super Hero!/);
// });

  it('should make JSONP request to invalid URL and invoke the error handler',
      function() {
    invalidJsonpBtn.click();
    fetchBtn.click();
    expect(status.getText()).toMatch('0');
    expect(data.getText()).toMatch('Request failed');
  });
</file>
</example>
     */
    function $http(requestConfig) {

      if (!isObject(requestConfig)) {
        throw minErr('$http')('badreq', 'Http request configuration must be an object.  Received: {0}', requestConfig);
      }

      if (!isString($sce.valueOf(requestConfig.url))) {
        throw minErr('$http')('badreq', 'Http request configuration url must be a string or a $sce trusted object.  Received: {0}', requestConfig.url);
      }

      var config = extend({
        method: 'get',
        transformRequest: defaults.transformRequest,
        transformResponse: defaults.transformResponse,
        paramSerializer: defaults.paramSerializer,
        jsonpCallbackParam: defaults.jsonpCallbackParam
      }, requestConfig);

      config.headers = mergeHeaders(requestConfig);
      config.method = uppercase(config.method);
      config.paramSerializer = isString(config.paramSerializer) ?
          $injector.get(config.paramSerializer) : config.paramSerializer;

      $browser.$$incOutstandingRequestCount();

      var requestInterceptors = [];
      var responseInterceptors = [];
      var promise = $q.resolve(config);

      // apply interceptors
      forEach(reversedInterceptors, function(interceptor) {
        if (interceptor.request || interceptor.requestError) {
          requestInterceptors.unshift(interceptor.request, interceptor.requestError);
        }
        if (interceptor.response || interceptor.responseError) {
          responseInterceptors.push(interceptor.response, interceptor.responseError);
        }
      });

      promise = chainInterceptors(promise, requestInterceptors);
      promise = promise.then(serverRequest);
      promise = chainInterceptors(promise, responseInterceptors);
      promise = promise.finally(completeOutstandingRequest);

      return promise;


      function chainInterceptors(promise, interceptors) {
        for (var i = 0, ii = interceptors.length; i < ii;) {
          var thenFn = interceptors[i++];
          var rejectFn = interceptors[i++];

          promise = promise.then(thenFn, rejectFn);
        }

        interceptors.length = 0;

        return promise;
      }

      function completeOutstandingRequest() {
        $browser.$$completeOutstandingRequest(noop);
      }

      function executeHeaderFns(headers, config) {
        var headerContent, processedHeaders = {};

        forEach(headers, function(headerFn, header) {
          if (isFunction(headerFn)) {
            headerContent = headerFn(config);
            if (headerContent != null) {
              processedHeaders[header] = headerContent;
            }
          } else {
            processedHeaders[header] = headerFn;
          }
        });

        return processedHeaders;
      }

      function mergeHeaders(config) {
        var defHeaders = defaults.headers,
            reqHeaders = extend({}, config.headers),
            defHeaderName, lowercaseDefHeaderName, reqHeaderName;

        defHeaders = extend({}, defHeaders.common, defHeaders[lowercase(config.method)]);

        // using for-in instead of forEach to avoid unnecessary iteration after header has been found
        defaultHeadersIteration:
        for (defHeaderName in defHeaders) {
          lowercaseDefHeaderName = lowercase(defHeaderName);

          for (reqHeaderName in reqHeaders) {
            if (lowercase(reqHeaderName) === lowercaseDefHeaderName) {
              continue defaultHeadersIteration;
            }
          }

          reqHeaders[defHeaderName] = defHeaders[defHeaderName];
        }

        // execute if header value is a function for merged headers
        return executeHeaderFns(reqHeaders, shallowCopy(config));
      }

      function serverRequest(config) {
        var headers = config.headers;
        var reqData = transformData(config.data, headersGetter(headers), undefined, config.transformRequest);

        // strip content-type if data is undefined
        if (isUndefined(reqData)) {
          forEach(headers, function(value, header) {
            if (lowercase(header) === 'content-type') {
              delete headers[header];
            }
          });
        }

        if (isUndefined(config.withCredentials) && !isUndefined(defaults.withCredentials)) {
          config.withCredentials = defaults.withCredentials;
        }

        // send request
        return sendReq(config, reqData).then(transformResponse, transformResponse);
      }

      function transformResponse(response) {
        // make a copy since the response must be cacheable
        var resp = extend({}, response);
        resp.data = transformData(response.data, response.headers, response.status,
                                  config.transformResponse);
        return (isSuccess(response.status))
          ? resp
          : $q.reject(resp);
      }
    }

    $http.pendingRequests = [];

    /**
     * @ngdoc method
     * @name $http#get
     *
     * @description
     * Shortcut method to perform `GET` request.
     *
     * @param {string|TrustedObject} url Absolute or relative URL of the resource that is being requested;
     *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
     * @param {Object=} config Optional configuration object
     * @returns {HttpPromise} Future object
     */

    /**
     * @ngdoc method
     * @name $http#delete
     *
     * @description
     * Shortcut method to perform `DELETE` request.
     *
     * @param {string|TrustedObject} url Absolute or relative URL of the resource that is being requested;
     *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
     * @param {Object=} config Optional configuration object
     * @returns {HttpPromise} Future object
     */

    /**
     * @ngdoc method
     * @name $http#head
     *
     * @description
     * Shortcut method to perform `HEAD` request.
     *
     * @param {string|TrustedObject} url Absolute or relative URL of the resource that is being requested;
     *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
     * @param {Object=} config Optional configuration object
     * @returns {HttpPromise} Future object
     */

    /**
     * @ngdoc method
     * @name $http#jsonp
     *
     * @description
     * Shortcut method to perform `JSONP` request.
     *
     * Note that, since JSONP requests are sensitive because the response is given full access to the browser,
     * the url must be declared, via {@link $sce} as a trusted resource URL.
     * You can trust a URL by adding it to the whitelist via
     * {@link $sceDelegateProvider#resourceUrlWhitelist  `$sceDelegateProvider.resourceUrlWhitelist`} or
     * by explicitly trusting the URL via {@link $sce#trustAsResourceUrl `$sce.trustAsResourceUrl(url)`}.
     *
     * JSONP requests must specify a callback to be used in the response from the server. This callback
     * is passed as a query parameter in the request. You must specify the name of this parameter by
     * setting the `jsonpCallbackParam` property on the request config object.
     *
     * ```
     * $http.jsonp('some/trusted/url', {jsonpCallbackParam: 'callback'})
     * ```
     *
     * You can also specify a default callback parameter name in `$http.defaults.jsonpCallbackParam`.
     * Initially this is set to `'callback'`.
     *
     * <div class="alert alert-danger">
     * You can no longer use the `JSON_CALLBACK` string as a placeholder for specifying where the callback
     * parameter value should go.
     * </div>
     *
     * If you would like to customise where and how the callbacks are stored then try overriding
     * or decorating the {@link $jsonpCallbacks} service.
     *
     * @param {string|TrustedObject} url Absolute or relative URL of the resource that is being requested;
     *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
     * @param {Object=} config Optional configuration object
     * @returns {HttpPromise} Future object
     */
    createShortMethods('get', 'delete', 'head', 'jsonp');

    /**
     * @ngdoc method
     * @name $http#post
     *
     * @description
     * Shortcut method to perform `POST` request.
     *
     * @param {string} url Relative or absolute URL specifying the destination of the request
     * @param {*} data Request content
     * @param {Object=} config Optional configuration object
     * @returns {HttpPromise} Future object
     */

    /**
     * @ngdoc method
     * @name $http#put
     *
     * @description
     * Shortcut method to perform `PUT` request.
     *
     * @param {string} url Relative or absolute URL specifying the destination of the request
     * @param {*} data Request content
     * @param {Object=} config Optional configuration object
     * @returns {HttpPromise} Future object
     */

     /**
      * @ngdoc method
      * @name $http#patch
      *
      * @description
      * Shortcut method to perform `PATCH` request.
      *
      * @param {string} url Relative or absolute URL specifying the destination of the request
      * @param {*} data Request content
      * @param {Object=} config Optional configuration object
      * @returns {HttpPromise} Future object
      */
    createShortMethodsWithData('post', 'put', 'patch');

        /**
         * @ngdoc property
         * @name $http#defaults
         *
         * @description
         * Runtime equivalent of the `$httpProvider.defaults` property. Allows configuration of
         * default headers, withCredentials as well as request and response transformations.
         *
         * See "Setting HTTP Headers" and "Transforming Requests and Responses" sections above.
         */
    $http.defaults = defaults;


    return $http;


    function createShortMethods(names) {
      forEach(arguments, function(name) {
        $http[name] = function(url, config) {
          return $http(extend({}, config || {}, {
            method: name,
            url: url
          }));
        };
      });
    }


    function createShortMethodsWithData(name) {
      forEach(arguments, function(name) {
        $http[name] = function(url, data, config) {
          return $http(extend({}, config || {}, {
            method: name,
            url: url,
            data: data
          }));
        };
      });
    }


    /**
     * Makes the request.
     *
     * !!! ACCESSES CLOSURE VARS:
     * $httpBackend, defaults, $log, $rootScope, defaultCache, $http.pendingRequests
     */
    function sendReq(config, reqData) {
      var deferred = $q.defer(),
          promise = deferred.promise,
          cache,
          cachedResp,
          reqHeaders = config.headers,
          isJsonp = lowercase(config.method) === 'jsonp',
          url = config.url;

      if (isJsonp) {
        // JSONP is a pretty sensitive operation where we're allowing a script to have full access to
        // our DOM and JS space.  So we require that the URL satisfies SCE.RESOURCE_URL.
        url = $sce.getTrustedResourceUrl(url);
      } else if (!isString(url)) {
        // If it is not a string then the URL must be a $sce trusted object
        url = $sce.valueOf(url);
      }

      url = buildUrl(url, config.paramSerializer(config.params));

      if (isJsonp) {
        // Check the url and add the JSONP callback placeholder
        url = sanitizeJsonpCallbackParam(url, config.jsonpCallbackParam);
      }

      $http.pendingRequests.push(config);
      promise.then(removePendingReq, removePendingReq);

      if ((config.cache || defaults.cache) && config.cache !== false &&
          (config.method === 'GET' || config.method === 'JSONP')) {
        cache = isObject(config.cache) ? config.cache
            : isObject(/** @type {?} */ (defaults).cache)
              ? /** @type {?} */ (defaults).cache
              : defaultCache;
      }

      if (cache) {
        cachedResp = cache.get(url);
        if (isDefined(cachedResp)) {
          if (isPromiseLike(cachedResp)) {
            // cached request has already been sent, but there is no response yet
            cachedResp.then(resolvePromiseWithResult, resolvePromiseWithResult);
          } else {
            // serving from cache
            if (isArray(cachedResp)) {
              resolvePromise(cachedResp[1], cachedResp[0], shallowCopy(cachedResp[2]), cachedResp[3]);
            } else {
              resolvePromise(cachedResp, 200, {}, 'OK');
            }
          }
        } else {
          // put the promise for the non-transformed response into cache as a placeholder
          cache.put(url, promise);
        }
      }


      // if we won't have the response in cache, set the xsrf headers and
      // send the request to the backend
      if (isUndefined(cachedResp)) {
        var xsrfValue = urlIsSameOrigin(config.url)
            ? $$cookieReader()[config.xsrfCookieName || defaults.xsrfCookieName]
            : undefined;
        if (xsrfValue) {
          reqHeaders[(config.xsrfHeaderName || defaults.xsrfHeaderName)] = xsrfValue;
        }

        $httpBackend(config.method, url, reqData, done, reqHeaders, config.timeout,
            config.withCredentials, config.responseType,
            createApplyHandlers(config.eventHandlers),
            createApplyHandlers(config.uploadEventHandlers));
      }

      return promise;

      function createApplyHandlers(eventHandlers) {
        if (eventHandlers) {
          var applyHandlers = {};
          forEach(eventHandlers, function(eventHandler, key) {
            applyHandlers[key] = function(event) {
              if (useApplyAsync) {
                $rootScope.$applyAsync(callEventHandler);
              } else if ($rootScope.$$phase) {
                callEventHandler();
              } else {
                $rootScope.$apply(callEventHandler);
              }

              function callEventHandler() {
                eventHandler(event);
              }
            };
          });
          return applyHandlers;
        }
      }


      /**
       * Callback registered to $httpBackend():
       *  - caches the response if desired
       *  - resolves the raw $http promise
       *  - calls $apply
       */
      function done(status, response, headersString, statusText) {
        if (cache) {
          if (isSuccess(status)) {
            cache.put(url, [status, response, parseHeaders(headersString), statusText]);
          } else {
            // remove promise from the cache
            cache.remove(url);
          }
        }

        function resolveHttpPromise() {
          resolvePromise(response, status, headersString, statusText);
        }

        if (useApplyAsync) {
          $rootScope.$applyAsync(resolveHttpPromise);
        } else {
          resolveHttpPromise();
          if (!$rootScope.$$phase) $rootScope.$apply();
        }
      }


      /**
       * Resolves the raw $http promise.
       */
      function resolvePromise(response, status, headers, statusText) {
        //status: HTTP response status code, 0, -1 (aborted by timeout / promise)
        status = status >= -1 ? status : 0;

        (isSuccess(status) ? deferred.resolve : deferred.reject)({
          data: response,
          status: status,
          headers: headersGetter(headers),
          config: config,
          statusText: statusText
        });
      }

      function resolvePromiseWithResult(result) {
        resolvePromise(result.data, result.status, shallowCopy(result.headers()), result.statusText);
      }

      function removePendingReq() {
        var idx = $http.pendingRequests.indexOf(config);
        if (idx !== -1) $http.pendingRequests.splice(idx, 1);
      }
    }


    function buildUrl(url, serializedParams) {
      if (serializedParams.length > 0) {
        url += ((url.indexOf('?') === -1) ? '?' : '&') + serializedParams;
      }
      return url;
    }

    function sanitizeJsonpCallbackParam(url, key) {
      if (/[&?][^=]+=JSON_CALLBACK/.test(url)) {
        // Throw if the url already contains a reference to JSON_CALLBACK
        throw $httpMinErr('badjsonp', 'Illegal use of JSON_CALLBACK in url, "{0}"', url);
      }

      var callbackParamRegex = new RegExp('[&?]' + key + '=');
      if (callbackParamRegex.test(url)) {
        // Throw if the callback param was already provided
        throw $httpMinErr('badjsonp', 'Illegal use of callback param, "{0}", in url, "{1}"', key, url);
      }

      // Add in the JSON_CALLBACK callback param value
      url += ((url.indexOf('?') === -1) ? '?' : '&') + key + '=JSON_CALLBACK';

      return url;
    }
  }];
}

/**
 * @ngdoc service
 * @name $xhrFactory
 * @this
 *
 * @description
 * Factory function used to create XMLHttpRequest objects.
 *
 * Replace or decorate this service to create your own custom XMLHttpRequest objects.
 *
 * ```
 * angular.module('myApp', [])
 * .factory('$xhrFactory', function() {
 *   return function createXhr(method, url) {
 *     return new window.XMLHttpRequest({mozSystem: true});
 *   };
 * });
 * ```
 *
 * @param {string} method HTTP method of the request (GET, POST, PUT, ..)
 * @param {string} url URL of the request.
 */
function $xhrFactoryProvider() {
  this.$get = function() {
    return function createXhr() {
      return new window.XMLHttpRequest();
    };
  };
}

/**
 * @ngdoc service
 * @name $httpBackend
 * @requires $jsonpCallbacks
 * @requires $document
 * @requires $xhrFactory
 * @this
 *
 * @description
 * HTTP backend used by the {@link ng.$http service} that delegates to
 * XMLHttpRequest object or JSONP and deals with browser incompatibilities.
 *
 * You should never need to use this service directly, instead use the higher-level abstractions:
 * {@link ng.$http $http} or {@link ngResource.$resource $resource}.
 *
 * During testing this implementation is swapped with {@link ngMock.$httpBackend mock
 * $httpBackend} which can be trained with responses.
 */
function $HttpBackendProvider() {
  this.$get = ['$browser', '$jsonpCallbacks', '$document', '$xhrFactory', function($browser, $jsonpCallbacks, $document, $xhrFactory) {
    return createHttpBackend($browser, $xhrFactory, $browser.defer, $jsonpCallbacks, $document[0]);
  }];
}

function createHttpBackend($browser, createXhr, $browserDefer, callbacks, rawDocument) {
  // TODO(vojta): fix the signature
  return function(method, url, post, callback, headers, timeout, withCredentials, responseType, eventHandlers, uploadEventHandlers) {
    url = url || $browser.url();

    if (lowercase(method) === 'jsonp') {
      var callbackPath = callbacks.createCallback(url);
      var jsonpDone = jsonpReq(url, callbackPath, function(status, text) {
        // jsonpReq only ever sets status to 200 (OK), 404 (ERROR) or -1 (WAITING)
        var response = (status === 200) && callbacks.getResponse(callbackPath);
        completeRequest(callback, status, response, '', text);
        callbacks.removeCallback(callbackPath);
      });
    } else {

      var xhr = createXhr(method, url);

      xhr.open(method, url, true);
      forEach(headers, function(value, key) {
        if (isDefined(value)) {
            xhr.setRequestHeader(key, value);
        }
      });

      xhr.onload = function requestLoaded() {
        var statusText = xhr.statusText || '';

        // responseText is the old-school way of retrieving response (supported by IE9)
        // response/responseType properties were introduced in XHR Level2 spec (supported by IE10)
        var response = ('response' in xhr) ? xhr.response : xhr.responseText;

        // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
        var status = xhr.status === 1223 ? 204 : xhr.status;

        // fix status code when it is 0 (0 status is undocumented).
        // Occurs when accessing file resources or on Android 4.1 stock browser
        // while retrieving files from application cache.
        if (status === 0) {
          status = response ? 200 : urlResolve(url).protocol === 'file' ? 404 : 0;
        }

        completeRequest(callback,
            status,
            response,
            xhr.getAllResponseHeaders(),
            statusText);
      };

      var requestError = function() {
        // The response is always empty
        // See https://xhr.spec.whatwg.org/#request-error-steps and https://fetch.spec.whatwg.org/#concept-network-error
        completeRequest(callback, -1, null, null, '');
      };

      xhr.onerror = requestError;
      xhr.onabort = requestError;
      xhr.ontimeout = requestError;

      forEach(eventHandlers, function(value, key) {
          xhr.addEventListener(key, value);
      });

      forEach(uploadEventHandlers, function(value, key) {
        xhr.upload.addEventListener(key, value);
      });

      if (withCredentials) {
        xhr.withCredentials = true;
      }

      if (responseType) {
        try {
          xhr.responseType = responseType;
        } catch (e) {
          // WebKit added support for the json responseType value on 09/03/2013
          // https://bugs.webkit.org/show_bug.cgi?id=73648. Versions of Safari prior to 7 are
          // known to throw when setting the value "json" as the response type. Other older
          // browsers implementing the responseType
          //
          // The json response type can be ignored if not supported, because JSON payloads are
          // parsed on the client-side regardless.
          if (responseType !== 'json') {
            throw e;
          }
        }
      }

      xhr.send(isUndefined(post) ? null : post);
    }

    if (timeout > 0) {
      var timeoutId = $browserDefer(timeoutRequest, timeout);
    } else if (isPromiseLike(timeout)) {
      timeout.then(timeoutRequest);
    }


    function timeoutRequest() {
      if (jsonpDone) {
        jsonpDone();
      }
      if (xhr) {
        xhr.abort();
      }
    }

    function completeRequest(callback, status, response, headersString, statusText) {
      // cancel timeout and subsequent timeout promise resolution
      if (isDefined(timeoutId)) {
        $browserDefer.cancel(timeoutId);
      }
      jsonpDone = xhr = null;

      callback(status, response, headersString, statusText);
    }
  };

  function jsonpReq(url, callbackPath, done) {
    url = url.replace('JSON_CALLBACK', callbackPath);
    // we can't use jQuery/jqLite here because jQuery does crazy stuff with script elements, e.g.:
    // - fetches local scripts via XHR and evals them
    // - adds and immediately removes script elements from the document
    var script = rawDocument.createElement('script'), callback = null;
    script.type = 'text/javascript';
    script.src = url;
    script.async = true;

    callback = function(event) {
      script.removeEventListener('load', callback);
      script.removeEventListener('error', callback);
      rawDocument.body.removeChild(script);
      script = null;
      var status = -1;
      var text = 'unknown';

      if (event) {
        if (event.type === 'load' && !callbacks.wasCalled(callbackPath)) {
          event = { type: 'error' };
        }
        text = event.type;
        status = event.type === 'error' ? 404 : 200;
      }

      if (done) {
        done(status, text);
      }
    };

    script.addEventListener('load', callback);
    script.addEventListener('error', callback);
    rawDocument.body.appendChild(script);
    return callback;
  }
}

var $interpolateMinErr = angular.$interpolateMinErr = minErr('$interpolate');
$interpolateMinErr.throwNoconcat = function(text) {
  throw $interpolateMinErr('noconcat',
      'Error while interpolating: {0}\nStrict Contextual Escaping disallows ' +
      'interpolations that concatenate multiple expressions when a trusted value is ' +
      'required.  See http://docs.angularjs.org/api/ng.$sce', text);
};

$interpolateMinErr.interr = function(text, err) {
  return $interpolateMinErr('interr', 'Can\'t interpolate: {0}\n{1}', text, err.toString());
};

/**
 * @ngdoc provider
 * @name $interpolateProvider
 * @this
 *
 * @description
 *
 * Used for configuring the interpolation markup. Defaults to `{{` and `}}`.
 *
 * <div class="alert alert-danger">
 * This feature is sometimes used to mix different markup languages, e.g. to wrap an Angular
 * template within a Python Jinja template (or any other template language). Mixing templating
 * languages is **very dangerous**. The embedding template language will not safely escape Angular
 * expressions, so any user-controlled values in the template will cause Cross Site Scripting (XSS)
 * security bugs!
 * </div>
 *
 * @example
<example name="custom-interpolation-markup" module="customInterpolationApp">
<file name="index.html">
<script>
  var customInterpolationApp = angular.module('customInterpolationApp', []);

  customInterpolationApp.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('//');
    $interpolateProvider.endSymbol('//');
  });


  customInterpolationApp.controller('DemoController', function() {
      this.label = "This binding is brought you by // interpolation symbols.";
  });
</script>
<div ng-controller="DemoController as demo">
    //demo.label//
</div>
</file>
<file name="protractor.js" type="protractor">
  it('should interpolate binding with custom symbols', function() {
    expect(element(by.binding('demo.label')).getText()).toBe('This binding is brought you by // interpolation symbols.');
  });
</file>
</example>
 */
function $InterpolateProvider() {
  var startSymbol = '{{';
  var endSymbol = '}}';

  /**
   * @ngdoc method
   * @name $interpolateProvider#startSymbol
   * @description
   * Symbol to denote start of expression in the interpolated string. Defaults to `{{`.
   *
   * @param {string=} value new value to set the starting symbol to.
   * @returns {string|self} Returns the symbol when used as getter and self if used as setter.
   */
  this.startSymbol = function(value) {
    if (value) {
      startSymbol = value;
      return this;
    } else {
      return startSymbol;
    }
  };

  /**
   * @ngdoc method
   * @name $interpolateProvider#endSymbol
   * @description
   * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
   *
   * @param {string=} value new value to set the ending symbol to.
   * @returns {string|self} Returns the symbol when used as getter and self if used as setter.
   */
  this.endSymbol = function(value) {
    if (value) {
      endSymbol = value;
      return this;
    } else {
      return endSymbol;
    }
  };


  this.$get = ['$parse', '$exceptionHandler', '$sce', function($parse, $exceptionHandler, $sce) {
    var startSymbolLength = startSymbol.length,
        endSymbolLength = endSymbol.length,
        escapedStartRegexp = new RegExp(startSymbol.replace(/./g, escape), 'g'),
        escapedEndRegexp = new RegExp(endSymbol.replace(/./g, escape), 'g');

    function escape(ch) {
      return '\\\\\\' + ch;
    }

    function unescapeText(text) {
      return text.replace(escapedStartRegexp, startSymbol).
        replace(escapedEndRegexp, endSymbol);
    }

    // TODO: this is the same as the constantWatchDelegate in parse.js
    function constantWatchDelegate(scope, listener, objectEquality, constantInterp) {
      var unwatch = scope.$watch(function constantInterpolateWatch(scope) {
        unwatch();
        return constantInterp(scope);
      }, listener, objectEquality);
      return unwatch;
    }

    /**
     * @ngdoc service
     * @name $interpolate
     * @kind function
     *
     * @requires $parse
     * @requires $sce
     *
     * @description
     *
     * Compiles a string with markup into an interpolation function. This service is used by the
     * HTML {@link ng.$compile $compile} service for data binding. See
     * {@link ng.$interpolateProvider $interpolateProvider} for configuring the
     * interpolation markup.
     *
     *
     * ```js
     *   var $interpolate = ...; // injected
     *   var exp = $interpolate('Hello {{name | uppercase}}!');
     *   expect(exp({name:'Angular'})).toEqual('Hello ANGULAR!');
     * ```
     *
     * `$interpolate` takes an optional fourth argument, `allOrNothing`. If `allOrNothing` is
     * `true`, the interpolation function will return `undefined` unless all embedded expressions
     * evaluate to a value other than `undefined`.
     *
     * ```js
     *   var $interpolate = ...; // injected
     *   var context = {greeting: 'Hello', name: undefined };
     *
     *   // default "forgiving" mode
     *   var exp = $interpolate('{{greeting}} {{name}}!');
     *   expect(exp(context)).toEqual('Hello !');
     *
     *   // "allOrNothing" mode
     *   exp = $interpolate('{{greeting}} {{name}}!', false, null, true);
     *   expect(exp(context)).toBeUndefined();
     *   context.name = 'Angular';
     *   expect(exp(context)).toEqual('Hello Angular!');
     * ```
     *
     * `allOrNothing` is useful for interpolating URLs. `ngSrc` and `ngSrcset` use this behavior.
     *
     * #### Escaped Interpolation
     * $interpolate provides a mechanism for escaping interpolation markers. Start and end markers
     * can be escaped by preceding each of their characters with a REVERSE SOLIDUS U+005C (backslash).
     * It will be rendered as a regular start/end marker, and will not be interpreted as an expression
     * or binding.
     *
     * This enables web-servers to prevent script injection attacks and defacing attacks, to some
     * degree, while also enabling code examples to work without relying on the
     * {@link ng.directive:ngNonBindable ngNonBindable} directive.
     *
     * **For security purposes, it is strongly encouraged that web servers escape user-supplied data,
     * replacing angle brackets (&lt;, &gt;) with &amp;lt; and &amp;gt; respectively, and replacing all
     * interpolation start/end markers with their escaped counterparts.**
     *
     * Escaped interpolation markers are only replaced with the actual interpolation markers in rendered
     * output when the $interpolate service processes the text. So, for HTML elements interpolated
     * by {@link ng.$compile $compile}, or otherwise interpolated with the `mustHaveExpression` parameter
     * set to `true`, the interpolated text must contain an unescaped interpolation expression. As such,
     * this is typically useful only when user-data is used in rendering a template from the server, or
     * when otherwise untrusted data is used by a directive.
     *
     * <example name="interpolation">
     *  <file name="index.html">
     *    <div ng-init="username='A user'">
     *      <p ng-init="apptitle='Escaping demo'">{{apptitle}}: \{\{ username = "defaced value"; \}\}
     *        </p>
     *      <p><strong>{{username}}</strong> attempts to inject code which will deface the
     *        application, but fails to accomplish their task, because the server has correctly
     *        escaped the interpolation start/end markers with REVERSE SOLIDUS U+005C (backslash)
     *        characters.</p>
     *      <p>Instead, the result of the attempted script injection is visible, and can be removed
     *        from the database by an administrator.</p>
     *    </div>
     *  </file>
     * </example>
     *
     * @knownIssue
     * It is currently not possible for an interpolated expression to contain the interpolation end
     * symbol. For example, `{{ '}}' }}` will be incorrectly interpreted as `{{ ' }}` + `' }}`, i.e.
     * an interpolated expression consisting of a single-quote (`'`) and the `' }}` string.
     *
     * @knownIssue
     * All directives and components must use the standard `{{` `}}` interpolation symbols
     * in their templates. If you change the application interpolation symbols the {@link $compile}
     * service will attempt to denormalize the standard symbols to the custom symbols.
     * The denormalization process is not clever enough to know not to replace instances of the standard
     * symbols where they would not normally be treated as interpolation symbols. For example in the following
     * code snippet the closing braces of the literal object will get incorrectly denormalized:
     *
     * ```
     * <div data-context='{"context":{"id":3,"type":"page"}}">
     * ```
     *
     * The workaround is to ensure that such instances are separated by whitespace:
     * ```
     * <div data-context='{"context":{"id":3,"type":"page"} }">
     * ```
     *
     * See https://github.com/angular/angular.js/pull/14610#issuecomment-219401099 for more information.
     *
     * @param {string} text The text with markup to interpolate.
     * @param {boolean=} mustHaveExpression if set to true then the interpolation string must have
     *    embedded expression in order to return an interpolation function. Strings with no
     *    embedded expression will return null for the interpolation function.
     * @param {string=} trustedContext when provided, the returned function passes the interpolated
     *    result through {@link ng.$sce#getTrusted $sce.getTrusted(interpolatedResult,
     *    trustedContext)} before returning it.  Refer to the {@link ng.$sce $sce} service that
     *    provides Strict Contextual Escaping for details.
     * @param {boolean=} allOrNothing if `true`, then the returned function returns undefined
     *    unless all embedded expressions evaluate to a value other than `undefined`.
     * @returns {function(context)} an interpolation function which is used to compute the
     *    interpolated string. The function has these parameters:
     *
     * - `context`: evaluation context for all expressions embedded in the interpolated text
     */
    function $interpolate(text, mustHaveExpression, trustedContext, allOrNothing) {
      // Provide a quick exit and simplified result function for text with no interpolation
      if (!text.length || text.indexOf(startSymbol) === -1) {
        var constantInterp;
        if (!mustHaveExpression) {
          var unescapedText = unescapeText(text);
          constantInterp = valueFn(unescapedText);
          constantInterp.exp = text;
          constantInterp.expressions = [];
          constantInterp.$$watchDelegate = constantWatchDelegate;
        }
        return constantInterp;
      }

      allOrNothing = !!allOrNothing;
      var startIndex,
          endIndex,
          index = 0,
          expressions = [],
          parseFns = [],
          textLength = text.length,
          exp,
          concat = [],
          expressionPositions = [];

      while (index < textLength) {
        if (((startIndex = text.indexOf(startSymbol, index)) !== -1) &&
             ((endIndex = text.indexOf(endSymbol, startIndex + startSymbolLength)) !== -1)) {
          if (index !== startIndex) {
            concat.push(unescapeText(text.substring(index, startIndex)));
          }
          exp = text.substring(startIndex + startSymbolLength, endIndex);
          expressions.push(exp);
          parseFns.push($parse(exp, parseStringifyInterceptor));
          index = endIndex + endSymbolLength;
          expressionPositions.push(concat.length);
          concat.push('');
        } else {
          // we did not find an interpolation, so we have to add the remainder to the separators array
          if (index !== textLength) {
            concat.push(unescapeText(text.substring(index)));
          }
          break;
        }
      }

      // Concatenating expressions makes it hard to reason about whether some combination of
      // concatenated values are unsafe to use and could easily lead to XSS.  By requiring that a
      // single expression be used for iframe[src], object[src], etc., we ensure that the value
      // that's used is assigned or constructed by some JS code somewhere that is more testable or
      // make it obvious that you bound the value to some user controlled value.  This helps reduce
      // the load when auditing for XSS issues.
      if (trustedContext && concat.length > 1) {
          $interpolateMinErr.throwNoconcat(text);
      }

      if (!mustHaveExpression || expressions.length) {
        var compute = function(values) {
          for (var i = 0, ii = expressions.length; i < ii; i++) {
            if (allOrNothing && isUndefined(values[i])) return;
            concat[expressionPositions[i]] = values[i];
          }
          return concat.join('');
        };

        var getValue = function(value) {
          return trustedContext ?
            $sce.getTrusted(trustedContext, value) :
            $sce.valueOf(value);
        };

        return extend(function interpolationFn(context) {
            var i = 0;
            var ii = expressions.length;
            var values = new Array(ii);

            try {
              for (; i < ii; i++) {
                values[i] = parseFns[i](context);
              }

              return compute(values);
            } catch (err) {
              $exceptionHandler($interpolateMinErr.interr(text, err));
            }

          }, {
          // all of these properties are undocumented for now
          exp: text, //just for compatibility with regular watchers created via $watch
          expressions: expressions,
          $$watchDelegate: function(scope, listener) {
            var lastValue;
            return scope.$watchGroup(parseFns, /** @this */ function interpolateFnWatcher(values, oldValues) {
              var currValue = compute(values);
              if (isFunction(listener)) {
                listener.call(this, currValue, values !== oldValues ? lastValue : currValue, scope);
              }
              lastValue = currValue;
            });
          }
        });
      }

      function parseStringifyInterceptor(value) {
        try {
          value = getValue(value);
          return allOrNothing && !isDefined(value) ? value : stringify(value);
        } catch (err) {
          $exceptionHandler($interpolateMinErr.interr(text, err));
        }
      }
    }


    /**
     * @ngdoc method
     * @name $interpolate#startSymbol
     * @description
     * Symbol to denote the start of expression in the interpolated string. Defaults to `{{`.
     *
     * Use {@link ng.$interpolateProvider#startSymbol `$interpolateProvider.startSymbol`} to change
     * the symbol.
     *
     * @returns {string} start symbol.
     */
    $interpolate.startSymbol = function() {
      return startSymbol;
    };


    /**
     * @ngdoc method
     * @name $interpolate#endSymbol
     * @description
     * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
     *
     * Use {@link ng.$interpolateProvider#endSymbol `$interpolateProvider.endSymbol`} to change
     * the symbol.
     *
     * @returns {string} end symbol.
     */
    $interpolate.endSymbol = function() {
      return endSymbol;
    };

    return $interpolate;
  }];
}

/** @this */
function $IntervalProvider() {
  this.$get = ['$rootScope', '$window', '$q', '$$q', '$browser',
       function($rootScope,   $window,   $q,   $$q,   $browser) {
    var intervals = {};


     /**
      * @ngdoc service
      * @name $interval
      *
      * @description
      * Angular's wrapper for `window.setInterval`. The `fn` function is executed every `delay`
      * milliseconds.
      *
      * The return value of registering an interval function is a promise. This promise will be
      * notified upon each tick of the interval, and will be resolved after `count` iterations, or
      * run indefinitely if `count` is not defined. The value of the notification will be the
      * number of iterations that have run.
      * To cancel an interval, call `$interval.cancel(promise)`.
      *
      * In tests you can use {@link ngMock.$interval#flush `$interval.flush(millis)`} to
      * move forward by `millis` milliseconds and trigger any functions scheduled to run in that
      * time.
      *
      * <div class="alert alert-warning">
      * **Note**: Intervals created by this service must be explicitly destroyed when you are finished
      * with them.  In particular they are not automatically destroyed when a controller's scope or a
      * directive's element are destroyed.
      * You should take this into consideration and make sure to always cancel the interval at the
      * appropriate moment.  See the example below for more details on how and when to do this.
      * </div>
      *
      * @param {function()} fn A function that should be called repeatedly. If no additional arguments
      *   are passed (see below), the function is called with the current iteration count.
      * @param {number} delay Number of milliseconds between each function call.
      * @param {number=} [count=0] Number of times to repeat. If not set, or 0, will repeat
      *   indefinitely.
      * @param {boolean=} [invokeApply=true] If set to `false` skips model dirty checking, otherwise
      *   will invoke `fn` within the {@link ng.$rootScope.Scope#$apply $apply} block.
      * @param {...*=} Pass additional parameters to the executed function.
      * @returns {promise} A promise which will be notified on each iteration. It will resolve once all iterations of the interval complete.
      *
      * @example
      * <example module="intervalExample" name="interval-service">
      * <file name="index.html">
      *   <script>
      *     angular.module('intervalExample', [])
      *       .controller('ExampleController', ['$scope', '$interval',
      *         function($scope, $interval) {
      *           $scope.format = 'M/d/yy h:mm:ss a';
      *           $scope.blood_1 = 100;
      *           $scope.blood_2 = 120;
      *
      *           var stop;
      *           $scope.fight = function() {
      *             // Don't start a new fight if we are already fighting
      *             if ( angular.isDefined(stop) ) return;
      *
      *             stop = $interval(function() {
      *               if ($scope.blood_1 > 0 && $scope.blood_2 > 0) {
      *                 $scope.blood_1 = $scope.blood_1 - 3;
      *                 $scope.blood_2 = $scope.blood_2 - 4;
      *               } else {
      *                 $scope.stopFight();
      *               }
      *             }, 100);
      *           };
      *
      *           $scope.stopFight = function() {
      *             if (angular.isDefined(stop)) {
      *               $interval.cancel(stop);
      *               stop = undefined;
      *             }
      *           };
      *
      *           $scope.resetFight = function() {
      *             $scope.blood_1 = 100;
      *             $scope.blood_2 = 120;
      *           };
      *
      *           $scope.$on('$destroy', function() {
      *             // Make sure that the interval is destroyed too
      *             $scope.stopFight();
      *           });
      *         }])
      *       // Register the 'myCurrentTime' directive factory method.
      *       // We inject $interval and dateFilter service since the factory method is DI.
      *       .directive('myCurrentTime', ['$interval', 'dateFilter',
      *         function($interval, dateFilter) {
      *           // return the directive link function. (compile function not needed)
      *           return function(scope, element, attrs) {
      *             var format,  // date format
      *                 stopTime; // so that we can cancel the time updates
      *
      *             // used to update the UI
      *             function updateTime() {
      *               element.text(dateFilter(new Date(), format));
      *             }
      *
      *             // watch the expression, and update the UI on change.
      *             scope.$watch(attrs.myCurrentTime, function(value) {
      *               format = value;
      *               updateTime();
      *             });
      *
      *             stopTime = $interval(updateTime, 1000);
      *
      *             // listen on DOM destroy (removal) event, and cancel the next UI update
      *             // to prevent updating time after the DOM element was removed.
      *             element.on('$destroy', function() {
      *               $interval.cancel(stopTime);
      *             });
      *           }
      *         }]);
      *   </script>
      *
      *   <div>
      *     <div ng-controller="ExampleController">
      *       <label>Date format: <input ng-model="format"></label> <hr/>
      *       Current time is: <span my-current-time="format"></span>
      *       <hr/>
      *       Blood 1 : <font color='red'>{{blood_1}}</font>
      *       Blood 2 : <font color='red'>{{blood_2}}</font>
      *       <button type="button" data-ng-click="fight()">Fight</button>
      *       <button type="button" data-ng-click="stopFight()">StopFight</button>
      *       <button type="button" data-ng-click="resetFight()">resetFight</button>
      *     </div>
      *   </div>
      *
      * </file>
      * </example>
      */
    function interval(fn, delay, count, invokeApply) {
      var hasParams = arguments.length > 4,
          args = hasParams ? sliceArgs(arguments, 4) : [],
          setInterval = $window.setInterval,
          clearInterval = $window.clearInterval,
          iteration = 0,
          skipApply = (isDefined(invokeApply) && !invokeApply),
          deferred = (skipApply ? $$q : $q).defer(),
          promise = deferred.promise;

      count = isDefined(count) ? count : 0;

      promise.$$intervalId = setInterval(function tick() {
        if (skipApply) {
          $browser.defer(callback);
        } else {
          $rootScope.$evalAsync(callback);
        }
        deferred.notify(iteration++);

        if (count > 0 && iteration >= count) {
          deferred.resolve(iteration);
          clearInterval(promise.$$intervalId);
          delete intervals[promise.$$intervalId];
        }

        if (!skipApply) $rootScope.$apply();

      }, delay);

      intervals[promise.$$intervalId] = deferred;

      return promise;

      function callback() {
        if (!hasParams) {
          fn(iteration);
        } else {
          fn.apply(null, args);
        }
      }
    }


     /**
      * @ngdoc method
      * @name $interval#cancel
      *
      * @description
      * Cancels a task associated with the `promise`.
      *
      * @param {Promise=} promise returned by the `$interval` function.
      * @returns {boolean} Returns `true` if the task was successfully canceled.
      */
    interval.cancel = function(promise) {
      if (promise && promise.$$intervalId in intervals) {
        // Interval cancels should not report as unhandled promise.
        intervals[promise.$$intervalId].promise.catch(noop);
        intervals[promise.$$intervalId].reject('canceled');
        $window.clearInterval(promise.$$intervalId);
        delete intervals[promise.$$intervalId];
        return true;
      }
      return false;
    };

    return interval;
  }];
}

/**
 * @ngdoc service
 * @name $jsonpCallbacks
 * @requires $window
 * @description
 * This service handles the lifecycle of callbacks to handle JSONP requests.
 * Override this service if you wish to customise where the callbacks are stored and
 * how they vary compared to the requested url.
 */
var $jsonpCallbacksProvider = /** @this */ function() {
  this.$get = function() {
    var callbacks = angular.callbacks;
    var callbackMap = {};

    function createCallback(callbackId) {
      var callback = function(data) {
        callback.data = data;
        callback.called = true;
      };
      callback.id = callbackId;
      return callback;
    }

    return {
      /**
       * @ngdoc method
       * @name $jsonpCallbacks#createCallback
       * @param {string} url the url of the JSONP request
       * @returns {string} the callback path to send to the server as part of the JSONP request
       * @description
       * {@link $httpBackend} calls this method to create a callback and get hold of the path to the callback
       * to pass to the server, which will be used to call the callback with its payload in the JSONP response.
       */
      createCallback: function(url) {
        var callbackId = '_' + (callbacks.$$counter++).toString(36);
        var callbackPath = 'angular.callbacks.' + callbackId;
        var callback = createCallback(callbackId);
        callbackMap[callbackPath] = callbacks[callbackId] = callback;
        return callbackPath;
      },
      /**
       * @ngdoc method
       * @name $jsonpCallbacks#wasCalled
       * @param {string} callbackPath the path to the callback that was sent in the JSONP request
       * @returns {boolean} whether the callback has been called, as a result of the JSONP response
       * @description
       * {@link $httpBackend} calls this method to find out whether the JSONP response actually called the
       * callback that was passed in the request.
       */
      wasCalled: function(callbackPath) {
        return callbackMap[callbackPath].called;
      },
      /**
       * @ngdoc method
       * @name $jsonpCallbacks#getResponse
       * @param {string} callbackPath the path to the callback that was sent in the JSONP request
       * @returns {*} the data received from the response via the registered callback
       * @description
       * {@link $httpBackend} calls this method to get hold of the data that was provided to the callback
       * in the JSONP response.
       */
      getResponse: function(callbackPath) {
        return callbackMap[callbackPath].data;
      },
      /**
       * @ngdoc method
       * @name $jsonpCallbacks#removeCallback
       * @param {string} callbackPath the path to the callback that was sent in the JSONP request
       * @description
       * {@link $httpBackend} calls this method to remove the callback after the JSONP request has
       * completed or timed-out.
       */
      removeCallback: function(callbackPath) {
        var callback = callbackMap[callbackPath];
        delete callbacks[callback.id];
        delete callbackMap[callbackPath];
      }
    };
  };
};

/**
 * @ngdoc service
 * @name $locale
 *
 * @description
 * $locale service provides localization rules for various Angular components. As of right now the
 * only public api is:
 *
 * * `id` – `{string}` – locale id formatted as `languageId-countryId` (e.g. `en-us`)
 */

var PATH_MATCH = /^([^?#]*)(\?([^#]*))?(#(.*))?$/,
    DEFAULT_PORTS = {'http': 80, 'https': 443, 'ftp': 21};
var $locationMinErr = minErr('$location');


/**
 * Encode path using encodeUriSegment, ignoring forward slashes
 *
 * @param {string} path Path to encode
 * @returns {string}
 */
function encodePath(path) {
  var segments = path.split('/'),
      i = segments.length;

  while (i--) {
    segments[i] = encodeUriSegment(segments[i]);
  }

  return segments.join('/');
}

function parseAbsoluteUrl(absoluteUrl, locationObj) {
  var parsedUrl = urlResolve(absoluteUrl);

  locationObj.$$protocol = parsedUrl.protocol;
  locationObj.$$host = parsedUrl.hostname;
  locationObj.$$port = toInt(parsedUrl.port) || DEFAULT_PORTS[parsedUrl.protocol] || null;
}

var DOUBLE_SLASH_REGEX = /^\s*[\\/]{2,}/;
function parseAppUrl(url, locationObj) {

  if (DOUBLE_SLASH_REGEX.test(url)) {
    throw $locationMinErr('badpath', 'Invalid url "{0}".', url);
  }

  var prefixed = (url.charAt(0) !== '/');
  if (prefixed) {
    url = '/' + url;
  }
  var match = urlResolve(url);
  locationObj.$$path = decodeURIComponent(prefixed && match.pathname.charAt(0) === '/' ?
      match.pathname.substring(1) : match.pathname);
  locationObj.$$search = parseKeyValue(match.search);
  locationObj.$$hash = decodeURIComponent(match.hash);

  // make sure path starts with '/';
  if (locationObj.$$path && locationObj.$$path.charAt(0) !== '/') {
    locationObj.$$path = '/' + locationObj.$$path;
  }
}

function startsWith(str, search) {
  return str.slice(0, search.length) === search;
}

/**
 *
 * @param {string} base
 * @param {string} url
 * @returns {string} returns text from `url` after `base` or `undefined` if it does not begin with
 *                   the expected string.
 */
function stripBaseUrl(base, url) {
  if (startsWith(url, base)) {
    return url.substr(base.length);
  }
}


function stripHash(url) {
  var index = url.indexOf('#');
  return index === -1 ? url : url.substr(0, index);
}

function trimEmptyHash(url) {
  return url.replace(/(#.+)|#$/, '$1');
}


function stripFile(url) {
  return url.substr(0, stripHash(url).lastIndexOf('/') + 1);
}

/* return the server only (scheme://host:port) */
function serverBase(url) {
  return url.substring(0, url.indexOf('/', url.indexOf('//') + 2));
}


/**
 * LocationHtml5Url represents a URL
 * This object is exposed as $location service when HTML5 mode is enabled and supported
 *
 * @constructor
 * @param {string} appBase application base URL
 * @param {string} appBaseNoFile application base URL stripped of any filename
 * @param {string} basePrefix URL path prefix
 */
function LocationHtml5Url(appBase, appBaseNoFile, basePrefix) {
  this.$$html5 = true;
  basePrefix = basePrefix || '';
  parseAbsoluteUrl(appBase, this);


  /**
   * Parse given HTML5 (regular) URL string into properties
   * @param {string} url HTML5 URL
   * @private
   */
  this.$$parse = function(url) {
    var pathUrl = stripBaseUrl(appBaseNoFile, url);
    if (!isString(pathUrl)) {
      throw $locationMinErr('ipthprfx', 'Invalid url "{0}", missing path prefix "{1}".', url,
          appBaseNoFile);
    }

    parseAppUrl(pathUrl, this);

    if (!this.$$path) {
      this.$$path = '/';
    }

    this.$$compose();
  };

  /**
   * Compose url and update `absUrl` property
   * @private
   */
  this.$$compose = function() {
    var search = toKeyValue(this.$$search),
        hash = this.$$hash ? '#' + encodeUriSegment(this.$$hash) : '';

    this.$$url = encodePath(this.$$path) + (search ? '?' + search : '') + hash;
    this.$$absUrl = appBaseNoFile + this.$$url.substr(1); // first char is always '/'

    this.$$urlUpdatedByLocation = true;
  };

  this.$$parseLinkUrl = function(url, relHref) {
    if (relHref && relHref[0] === '#') {
      // special case for links to hash fragments:
      // keep the old url and only replace the hash fragment
      this.hash(relHref.slice(1));
      return true;
    }
    var appUrl, prevAppUrl;
    var rewrittenUrl;


    if (isDefined(appUrl = stripBaseUrl(appBase, url))) {
      prevAppUrl = appUrl;
      if (basePrefix && isDefined(appUrl = stripBaseUrl(basePrefix, appUrl))) {
        rewrittenUrl = appBaseNoFile + (stripBaseUrl('/', appUrl) || appUrl);
      } else {
        rewrittenUrl = appBase + prevAppUrl;
      }
    } else if (isDefined(appUrl = stripBaseUrl(appBaseNoFile, url))) {
      rewrittenUrl = appBaseNoFile + appUrl;
    } else if (appBaseNoFile === url + '/') {
      rewrittenUrl = appBaseNoFile;
    }
    if (rewrittenUrl) {
      this.$$parse(rewrittenUrl);
    }
    return !!rewrittenUrl;
  };
}


/**
 * LocationHashbangUrl represents URL
 * This object is exposed as $location service when developer doesn't opt into html5 mode.
 * It also serves as the base class for html5 mode fallback on legacy browsers.
 *
 * @constructor
 * @param {string} appBase application base URL
 * @param {string} appBaseNoFile application base URL stripped of any filename
 * @param {string} hashPrefix hashbang prefix
 */
function LocationHashbangUrl(appBase, appBaseNoFile, hashPrefix) {

  parseAbsoluteUrl(appBase, this);


  /**
   * Parse given hashbang URL into properties
   * @param {string} url Hashbang URL
   * @private
   */
  this.$$parse = function(url) {
    var withoutBaseUrl = stripBaseUrl(appBase, url) || stripBaseUrl(appBaseNoFile, url);
    var withoutHashUrl;

    if (!isUndefined(withoutBaseUrl) && withoutBaseUrl.charAt(0) === '#') {

      // The rest of the URL starts with a hash so we have
      // got either a hashbang path or a plain hash fragment
      withoutHashUrl = stripBaseUrl(hashPrefix, withoutBaseUrl);
      if (isUndefined(withoutHashUrl)) {
        // There was no hashbang prefix so we just have a hash fragment
        withoutHashUrl = withoutBaseUrl;
      }

    } else {
      // There was no hashbang path nor hash fragment:
      // If we are in HTML5 mode we use what is left as the path;
      // Otherwise we ignore what is left
      if (this.$$html5) {
        withoutHashUrl = withoutBaseUrl;
      } else {
        withoutHashUrl = '';
        if (isUndefined(withoutBaseUrl)) {
          appBase = url;
          /** @type {?} */ (this).replace();
        }
      }
    }

    parseAppUrl(withoutHashUrl, this);

    this.$$path = removeWindowsDriveName(this.$$path, withoutHashUrl, appBase);

    this.$$compose();

    /*
     * In Windows, on an anchor node on documents loaded from
     * the filesystem, the browser will return a pathname
     * prefixed with the drive name ('/C:/path') when a
     * pathname without a drive is set:
     *  * a.setAttribute('href', '/foo')
     *   * a.pathname === '/C:/foo' //true
     *
     * Inside of Angular, we're always using pathnames that
     * do not include drive names for routing.
     */
    function removeWindowsDriveName(path, url, base) {
      /*
      Matches paths for file protocol on windows,
      such as /C:/foo/bar, and captures only /foo/bar.
      */
      var windowsFilePathExp = /^\/[A-Z]:(\/.*)/;

      var firstPathSegmentMatch;

      //Get the relative path from the input URL.
      if (startsWith(url, base)) {
        url = url.replace(base, '');
      }

      // The input URL intentionally contains a first path segment that ends with a colon.
      if (windowsFilePathExp.exec(url)) {
        return path;
      }

      firstPathSegmentMatch = windowsFilePathExp.exec(path);
      return firstPathSegmentMatch ? firstPathSegmentMatch[1] : path;
    }
  };

  /**
   * Compose hashbang URL and update `absUrl` property
   * @private
   */
  this.$$compose = function() {
    var search = toKeyValue(this.$$search),
        hash = this.$$hash ? '#' + encodeUriSegment(this.$$hash) : '';

    this.$$url = encodePath(this.$$path) + (search ? '?' + search : '') + hash;
    this.$$absUrl = appBase + (this.$$url ? hashPrefix + this.$$url : '');

    this.$$urlUpdatedByLocation = true;
  };

  this.$$parseLinkUrl = function(url, relHref) {
    if (stripHash(appBase) === stripHash(url)) {
      this.$$parse(url);
      return true;
    }
    return false;
  };
}


/**
 * LocationHashbangUrl represents URL
 * This object is exposed as $location service when html5 history api is enabled but the browser
 * does not support it.
 *
 * @constructor
 * @param {string} appBase application base URL
 * @param {string} appBaseNoFile application base URL stripped of any filename
 * @param {string} hashPrefix hashbang prefix
 */
function LocationHashbangInHtml5Url(appBase, appBaseNoFile, hashPrefix) {
  this.$$html5 = true;
  LocationHashbangUrl.apply(this, arguments);

  this.$$parseLinkUrl = function(url, relHref) {
    if (relHref && relHref[0] === '#') {
      // special case for links to hash fragments:
      // keep the old url and only replace the hash fragment
      this.hash(relHref.slice(1));
      return true;
    }

    var rewrittenUrl;
    var appUrl;

    if (appBase === stripHash(url)) {
      rewrittenUrl = url;
    } else if ((appUrl = stripBaseUrl(appBaseNoFile, url))) {
      rewrittenUrl = appBase + hashPrefix + appUrl;
    } else if (appBaseNoFile === url + '/') {
      rewrittenUrl = appBaseNoFile;
    }
    if (rewrittenUrl) {
      this.$$parse(rewrittenUrl);
    }
    return !!rewrittenUrl;
  };

  this.$$compose = function() {
    var search = toKeyValue(this.$$search),
        hash = this.$$hash ? '#' + encodeUriSegment(this.$$hash) : '';

    this.$$url = encodePath(this.$$path) + (search ? '?' + search : '') + hash;
    // include hashPrefix in $$absUrl when $$url is empty so IE9 does not reload page because of removal of '#'
    this.$$absUrl = appBase + hashPrefix + this.$$url;

    this.$$urlUpdatedByLocation = true;
  };

}


var locationPrototype = {

  /**
   * Ensure absolute URL is initialized.
   * @private
   */
  $$absUrl:'',

  /**
   * Are we in html5 mode?
   * @private
   */
  $$html5: false,

  /**
   * Has any change been replacing?
   * @private
   */
  $$replace: false,

  /**
   * @ngdoc method
   * @name $location#absUrl
   *
   * @description
   * This method is getter only.
   *
   * Return full URL representation with all segments encoded according to rules specified in
   * [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt).
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var absUrl = $location.absUrl();
   * // => "http://example.com/#/some/path?foo=bar&baz=xoxo"
   * ```
   *
   * @return {string} full URL
   */
  absUrl: locationGetter('$$absUrl'),

  /**
   * @ngdoc method
   * @name $location#url
   *
   * @description
   * This method is getter / setter.
   *
   * Return URL (e.g. `/path?a=b#hash`) when called without any parameter.
   *
   * Change path, search and hash, when called with parameter and return `$location`.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var url = $location.url();
   * // => "/some/path?foo=bar&baz=xoxo"
   * ```
   *
   * @param {string=} url New URL without base prefix (e.g. `/path?a=b#hash`)
   * @return {string} url
   */
  url: function(url) {
    if (isUndefined(url)) {
      return this.$$url;
    }

    var match = PATH_MATCH.exec(url);
    if (match[1] || url === '') this.path(decodeURIComponent(match[1]));
    if (match[2] || match[1] || url === '') this.search(match[3] || '');
    this.hash(match[5] || '');

    return this;
  },

  /**
   * @ngdoc method
   * @name $location#protocol
   *
   * @description
   * This method is getter only.
   *
   * Return protocol of current URL.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var protocol = $location.protocol();
   * // => "http"
   * ```
   *
   * @return {string} protocol of current URL
   */
  protocol: locationGetter('$$protocol'),

  /**
   * @ngdoc method
   * @name $location#host
   *
   * @description
   * This method is getter only.
   *
   * Return host of current URL.
   *
   * Note: compared to the non-angular version `location.host` which returns `hostname:port`, this returns the `hostname` portion only.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var host = $location.host();
   * // => "example.com"
   *
   * // given URL http://user:password@example.com:8080/#/some/path?foo=bar&baz=xoxo
   * host = $location.host();
   * // => "example.com"
   * host = location.host;
   * // => "example.com:8080"
   * ```
   *
   * @return {string} host of current URL.
   */
  host: locationGetter('$$host'),

  /**
   * @ngdoc method
   * @name $location#port
   *
   * @description
   * This method is getter only.
   *
   * Return port of current URL.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var port = $location.port();
   * // => 80
   * ```
   *
   * @return {Number} port
   */
  port: locationGetter('$$port'),

  /**
   * @ngdoc method
   * @name $location#path
   *
   * @description
   * This method is getter / setter.
   *
   * Return path of current URL when called without any parameter.
   *
   * Change path when called with parameter and return `$location`.
   *
   * Note: Path should always begin with forward slash (/), this method will add the forward slash
   * if it is missing.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var path = $location.path();
   * // => "/some/path"
   * ```
   *
   * @param {(string|number)=} path New path
   * @return {(string|object)} path if called with no parameters, or `$location` if called with a parameter
   */
  path: locationGetterSetter('$$path', function(path) {
    path = path !== null ? path.toString() : '';
    return path.charAt(0) === '/' ? path : '/' + path;
  }),

  /**
   * @ngdoc method
   * @name $location#search
   *
   * @description
   * This method is getter / setter.
   *
   * Return search part (as object) of current URL when called without any parameter.
   *
   * Change search part when called with parameter and return `$location`.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
   * var searchObject = $location.search();
   * // => {foo: 'bar', baz: 'xoxo'}
   *
   * // set foo to 'yipee'
   * $location.search('foo', 'yipee');
   * // $location.search() => {foo: 'yipee', baz: 'xoxo'}
   * ```
   *
   * @param {string|Object.<string>|Object.<Array.<string>>} search New search params - string or
   * hash object.
   *
   * When called with a single argument the method acts as a setter, setting the `search` component
   * of `$location` to the specified value.
   *
   * If the argument is a hash object containing an array of values, these values will be encoded
   * as duplicate search parameters in the URL.
   *
   * @param {(string|Number|Array<string>|boolean)=} paramValue If `search` is a string or number, then `paramValue`
   * will override only a single search property.
   *
   * If `paramValue` is an array, it will override the property of the `search` component of
   * `$location` specified via the first argument.
   *
   * If `paramValue` is `null`, the property specified via the first argument will be deleted.
   *
   * If `paramValue` is `true`, the property specified via the first argument will be added with no
   * value nor trailing equal sign.
   *
   * @return {Object} If called with no arguments returns the parsed `search` object. If called with
   * one or more arguments returns `$location` object itself.
   */
  search: function(search, paramValue) {
    switch (arguments.length) {
      case 0:
        return this.$$search;
      case 1:
        if (isString(search) || isNumber(search)) {
          search = search.toString();
          this.$$search = parseKeyValue(search);
        } else if (isObject(search)) {
          search = copy(search, {});
          // remove object undefined or null properties
          forEach(search, function(value, key) {
            if (value == null) delete search[key];
          });

          this.$$search = search;
        } else {
          throw $locationMinErr('isrcharg',
              'The first argument of the `$location#search()` call must be a string or an object.');
        }
        break;
      default:
        if (isUndefined(paramValue) || paramValue === null) {
          delete this.$$search[search];
        } else {
          this.$$search[search] = paramValue;
        }
    }

    this.$$compose();
    return this;
  },

  /**
   * @ngdoc method
   * @name $location#hash
   *
   * @description
   * This method is getter / setter.
   *
   * Returns the hash fragment when called without any parameters.
   *
   * Changes the hash fragment when called with a parameter and returns `$location`.
   *
   *
   * ```js
   * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo#hashValue
   * var hash = $location.hash();
   * // => "hashValue"
   * ```
   *
   * @param {(string|number)=} hash New hash fragment
   * @return {string} hash
   */
  hash: locationGetterSetter('$$hash', function(hash) {
    return hash !== null ? hash.toString() : '';
  }),

  /**
   * @ngdoc method
   * @name $location#replace
   *
   * @description
   * If called, all changes to $location during the current `$digest` will replace the current history
   * record, instead of adding a new one.
   */
  replace: function() {
    this.$$replace = true;
    return this;
  }
};

forEach([LocationHashbangInHtml5Url, LocationHashbangUrl, LocationHtml5Url], function(Location) {
  Location.prototype = Object.create(locationPrototype);

  /**
   * @ngdoc method
   * @name $location#state
   *
   * @description
   * This method is getter / setter.
   *
   * Return the history state object when called without any parameter.
   *
   * Change the history state object when called with one parameter and return `$location`.
   * The state object is later passed to `pushState` or `replaceState`.
   *
   * NOTE: This method is supported only in HTML5 mode and only in browsers supporting
   * the HTML5 History API (i.e. methods `pushState` and `replaceState`). If you need to support
   * older browsers (like IE9 or Android < 4.0), don't use this method.
   *
   * @param {object=} state State object for pushState or replaceState
   * @return {object} state
   */
  Location.prototype.state = function(state) {
    if (!arguments.length) {
      return this.$$state;
    }

    if (Location !== LocationHtml5Url || !this.$$html5) {
      throw $locationMinErr('nostate', 'History API state support is available only ' +
        'in HTML5 mode and only in browsers supporting HTML5 History API');
    }
    // The user might modify `stateObject` after invoking `$location.state(stateObject)`
    // but we're changing the $$state reference to $browser.state() during the $digest
    // so the modification window is narrow.
    this.$$state = isUndefined(state) ? null : state;
    this.$$urlUpdatedByLocation = true;

    return this;
  };
});


function locationGetter(property) {
  return /** @this */ function() {
    return this[property];
  };
}


function locationGetterSetter(property, preprocess) {
  return /** @this */ function(value) {
    if (isUndefined(value)) {
      return this[property];
    }

    this[property] = preprocess(value);
    this.$$compose();

    return this;
  };
}


/**
 * @ngdoc service
 * @name $location
 *
 * @requires $rootElement
 *
 * @description
 * The $location service parses the URL in the browser address bar (based on the
 * [window.location](https://developer.mozilla.org/en/window.location)) and makes the URL
 * available to your application. Changes to the URL in the address bar are reflected into
 * $location service and changes to $location are reflected into the browser address bar.
 *
 * **The $location service:**
 *
 * - Exposes the current URL in the browser address bar, so you can
 *   - Watch and observe the URL.
 *   - Change the URL.
 * - Synchronizes the URL with the browser when the user
 *   - Changes the address bar.
 *   - Clicks the back or forward button (or clicks a History link).
 *   - Clicks on a link.
 * - Represents the URL object as a set of methods (protocol, host, port, path, search, hash).
 *
 * For more information see {@link guide/$location Developer Guide: Using $location}
 */

/**
 * @ngdoc provider
 * @name $locationProvider
 * @this
 *
 * @description
 * Use the `$locationProvider` to configure how the application deep linking paths are stored.
 */
function $LocationProvider() {
  var hashPrefix = '!',
      html5Mode = {
        enabled: false,
        requireBase: true,
        rewriteLinks: true
      };

  /**
   * @ngdoc method
   * @name $locationProvider#hashPrefix
   * @description
   * The default value for the prefix is `'!'`.
   * @param {string=} prefix Prefix for hash part (containing path and search)
   * @returns {*} current value if used as getter or itself (chaining) if used as setter
   */
  this.hashPrefix = function(prefix) {
    if (isDefined(prefix)) {
      hashPrefix = prefix;
      return this;
    } else {
      return hashPrefix;
    }
  };

  /**
   * @ngdoc method
   * @name $locationProvider#html5Mode
   * @description
   * @param {(boolean|Object)=} mode If boolean, sets `html5Mode.enabled` to value.
   *   If object, sets `enabled`, `requireBase` and `rewriteLinks` to respective values. Supported
   *   properties:
   *   - **enabled** – `{boolean}` – (default: false) If true, will rely on `history.pushState` to
   *     change urls where supported. Will fall back to hash-prefixed paths in browsers that do not
   *     support `pushState`.
   *   - **requireBase** - `{boolean}` - (default: `true`) When html5Mode is enabled, specifies
   *     whether or not a <base> tag is required to be present. If `enabled` and `requireBase` are
   *     true, and a base tag is not present, an error will be thrown when `$location` is injected.
   *     See the {@link guide/$location $location guide for more information}
   *   - **rewriteLinks** - `{boolean|string}` - (default: `true`) When html5Mode is enabled,
   *     enables/disables URL rewriting for relative links. If set to a string, URL rewriting will
   *     only happen on links with an attribute that matches the given string. For example, if set
   *     to `'internal-link'`, then the URL will only be rewritten for `<a internal-link>` links.
   *     Note that [attribute name normalization](guide/directive#normalization) does not apply
   *     here, so `'internalLink'` will **not** match `'internal-link'`.
   *
   * @returns {Object} html5Mode object if used as getter or itself (chaining) if used as setter
   */
  this.html5Mode = function(mode) {
    if (isBoolean(mode)) {
      html5Mode.enabled = mode;
      return this;
    } else if (isObject(mode)) {

      if (isBoolean(mode.enabled)) {
        html5Mode.enabled = mode.enabled;
      }

      if (isBoolean(mode.requireBase)) {
        html5Mode.requireBase = mode.requireBase;
      }

      if (isBoolean(mode.rewriteLinks) || isString(mode.rewriteLinks)) {
        html5Mode.rewriteLinks = mode.rewriteLinks;
      }

      return this;
    } else {
      return html5Mode;
    }
  };

  /**
   * @ngdoc event
   * @name $location#$locationChangeStart
   * @eventType broadcast on root scope
   * @description
   * Broadcasted before a URL will change.
   *
   * This change can be prevented by calling
   * `preventDefault` method of the event. See {@link ng.$rootScope.Scope#$on} for more
   * details about event object. Upon successful change
   * {@link ng.$location#$locationChangeSuccess $locationChangeSuccess} is fired.
   *
   * The `newState` and `oldState` parameters may be defined only in HTML5 mode and when
   * the browser supports the HTML5 History API.
   *
   * @param {Object} angularEvent Synthetic event object.
   * @param {string} newUrl New URL
   * @param {string=} oldUrl URL that was before it was changed.
   * @param {string=} newState New history state object
   * @param {string=} oldState History state object that was before it was changed.
   */

  /**
   * @ngdoc event
   * @name $location#$locationChangeSuccess
   * @eventType broadcast on root scope
   * @description
   * Broadcasted after a URL was changed.
   *
   * The `newState` and `oldState` parameters may be defined only in HTML5 mode and when
   * the browser supports the HTML5 History API.
   *
   * @param {Object} angularEvent Synthetic event object.
   * @param {string} newUrl New URL
   * @param {string=} oldUrl URL that was before it was changed.
   * @param {string=} newState New history state object
   * @param {string=} oldState History state object that was before it was changed.
   */

  this.$get = ['$rootScope', '$browser', '$sniffer', '$rootElement', '$window',
      function($rootScope, $browser, $sniffer, $rootElement, $window) {
    var $location,
        LocationMode,
        baseHref = $browser.baseHref(), // if base[href] is undefined, it defaults to ''
        initialUrl = $browser.url(),
        appBase;

    if (html5Mode.enabled) {
      if (!baseHref && html5Mode.requireBase) {
        throw $locationMinErr('nobase',
          '$location in HTML5 mode requires a <base> tag to be present!');
      }
      appBase = serverBase(initialUrl) + (baseHref || '/');
      LocationMode = $sniffer.history ? LocationHtml5Url : LocationHashbangInHtml5Url;
    } else {
      appBase = stripHash(initialUrl);
      LocationMode = LocationHashbangUrl;
    }
    var appBaseNoFile = stripFile(appBase);

    $location = new LocationMode(appBase, appBaseNoFile, '#' + hashPrefix);
    $location.$$parseLinkUrl(initialUrl, initialUrl);

    $location.$$state = $browser.state();

    var IGNORE_URI_REGEXP = /^\s*(javascript|mailto):/i;

    function setBrowserUrlWithFallback(url, replace, state) {
      var oldUrl = $location.url();
      var oldState = $location.$$state;
      try {
        $browser.url(url, replace, state);

        // Make sure $location.state() returns referentially identical (not just deeply equal)
        // state object; this makes possible quick checking if the state changed in the digest
        // loop. Checking deep equality would be too expensive.
        $location.$$state = $browser.state();
      } catch (e) {
        // Restore old values if pushState fails
        $location.url(oldUrl);
        $location.$$state = oldState;

        throw e;
      }
    }

    $rootElement.on('click', function(event) {
      var rewriteLinks = html5Mode.rewriteLinks;
      // TODO(vojta): rewrite link when opening in new tab/window (in legacy browser)
      // currently we open nice url link and redirect then

      if (!rewriteLinks || event.ctrlKey || event.metaKey || event.shiftKey || event.which === 2 || event.button === 2) return;

      var elm = jqLite(event.target);

      // traverse the DOM up to find first A tag
      while (nodeName_(elm[0]) !== 'a') {
        // ignore rewriting if no A tag (reached root element, or no parent - removed from document)
        if (elm[0] === $rootElement[0] || !(elm = elm.parent())[0]) return;
      }

      if (isString(rewriteLinks) && isUndefined(elm.attr(rewriteLinks))) return;

      var absHref = elm.prop('href');
      // get the actual href attribute - see
      // http://msdn.microsoft.com/en-us/library/ie/dd347148(v=vs.85).aspx
      var relHref = elm.attr('href') || elm.attr('xlink:href');

      if (isObject(absHref) && absHref.toString() === '[object SVGAnimatedString]') {
        // SVGAnimatedString.animVal should be identical to SVGAnimatedString.baseVal, unless during
        // an animation.
        absHref = urlResolve(absHref.animVal).href;
      }

      // Ignore when url is started with javascript: or mailto:
      if (IGNORE_URI_REGEXP.test(absHref)) return;

      if (absHref && !elm.attr('target') && !event.isDefaultPrevented()) {
        if ($location.$$parseLinkUrl(absHref, relHref)) {
          // We do a preventDefault for all urls that are part of the angular application,
          // in html5mode and also without, so that we are able to abort navigation without
          // getting double entries in the location history.
          event.preventDefault();
          // update location manually
          if ($location.absUrl() !== $browser.url()) {
            $rootScope.$apply();
            // hack to work around FF6 bug 684208 when scenario runner clicks on links
            $window.angular['ff-684208-preventDefault'] = true;
          }
        }
      }
    });


    // rewrite hashbang url <> html5 url
    if (trimEmptyHash($location.absUrl()) !== trimEmptyHash(initialUrl)) {
      $browser.url($location.absUrl(), true);
    }

    var initializing = true;

    // update $location when $browser url changes
    $browser.onUrlChange(function(newUrl, newState) {

      if (!startsWith(newUrl, appBaseNoFile)) {
        // If we are navigating outside of the app then force a reload
        $window.location.href = newUrl;
        return;
      }

      $rootScope.$evalAsync(function() {
        var oldUrl = $location.absUrl();
        var oldState = $location.$$state;
        var defaultPrevented;
        newUrl = trimEmptyHash(newUrl);
        $location.$$parse(newUrl);
        $location.$$state = newState;

        defaultPrevented = $rootScope.$broadcast('$locationChangeStart', newUrl, oldUrl,
            newState, oldState).defaultPrevented;

        // if the location was changed by a `$locationChangeStart` handler then stop
        // processing this location change
        if ($location.absUrl() !== newUrl) return;

        if (defaultPrevented) {
          $location.$$parse(oldUrl);
          $location.$$state = oldState;
          setBrowserUrlWithFallback(oldUrl, false, oldState);
        } else {
          initializing = false;
          afterLocationChange(oldUrl, oldState);
        }
      });
      if (!$rootScope.$$phase) $rootScope.$digest();
    });

    // update browser
    $rootScope.$watch(function $locationWatch() {
      if (initializing || $location.$$urlUpdatedByLocation) {
        $location.$$urlUpdatedByLocation = false;

        var oldUrl = trimEmptyHash($browser.url());
        var newUrl = trimEmptyHash($location.absUrl());
        var oldState = $browser.state();
        var currentReplace = $location.$$replace;
        var urlOrStateChanged = oldUrl !== newUrl ||
          ($location.$$html5 && $sniffer.history && oldState !== $location.$$state);

        if (initializing || urlOrStateChanged) {
          initializing = false;

          $rootScope.$evalAsync(function() {
            var newUrl = $location.absUrl();
            var defaultPrevented = $rootScope.$broadcast('$locationChangeStart', newUrl, oldUrl,
                $location.$$state, oldState).defaultPrevented;

            // if the location was changed by a `$locationChangeStart` handler then stop
            // processing this location change
            if ($location.absUrl() !== newUrl) return;

            if (defaultPrevented) {
              $location.$$parse(oldUrl);
              $location.$$state = oldState;
            } else {
              if (urlOrStateChanged) {
                setBrowserUrlWithFallback(newUrl, currentReplace,
                                          oldState === $location.$$state ? null : $location.$$state);
              }
              afterLocationChange(oldUrl, oldState);
            }
          });
        }
      }

      $location.$$replace = false;

      // we don't need to return anything because $evalAsync will make the digest loop dirty when
      // there is a change
    });

    return $location;

    function afterLocationChange(oldUrl, oldState) {
      $rootScope.$broadcast('$locationChangeSuccess', $location.absUrl(), oldUrl,
        $location.$$state, oldState);
    }
}];
}

/**
 * @ngdoc service
 * @name $log
 * @requires $window
 *
 * @description
 * Simple service for logging. Default implementation safely writes the message
 * into the browser's console (if present).
 *
 * The main purpose of this service is to simplify debugging and troubleshooting.
 *
 * The default is to log `debug` messages. You can use
 * {@link ng.$logProvider ng.$logProvider#debugEnabled} to change this.
 *
 * @example
   <example module="logExample" name="log-service">
     <file name="script.js">
       angular.module('logExample', [])
         .controller('LogController', ['$scope', '$log', function($scope, $log) {
           $scope.$log = $log;
           $scope.message = 'Hello World!';
         }]);
     </file>
     <file name="index.html">
       <div ng-controller="LogController">
         <p>Reload this page with open console, enter text and hit the log button...</p>
         <label>Message:
         <input type="text" ng-model="message" /></label>
         <button ng-click="$log.log(message)">log</button>
         <button ng-click="$log.warn(message)">warn</button>
         <button ng-click="$log.info(message)">info</button>
         <button ng-click="$log.error(message)">error</button>
         <button ng-click="$log.debug(message)">debug</button>
       </div>
     </file>
   </example>
 */

/**
 * @ngdoc provider
 * @name $logProvider
 * @this
 *
 * @description
 * Use the `$logProvider` to configure how the application logs messages
 */
function $LogProvider() {
  var debug = true,
      self = this;

  /**
   * @ngdoc method
   * @name $logProvider#debugEnabled
   * @description
   * @param {boolean=} flag enable or disable debug level messages
   * @returns {*} current value if used as getter or itself (chaining) if used as setter
   */
  this.debugEnabled = function(flag) {
    if (isDefined(flag)) {
      debug = flag;
      return this;
    } else {
      return debug;
    }
  };

  this.$get = ['$window', function($window) {
    // Support: IE 9-11, Edge 12-14+
    // IE/Edge display errors in such a way that it requires the user to click in 4 places
    // to see the stack trace. There is no way to feature-detect it so there's a chance
    // of the user agent sniffing to go wrong but since it's only about logging, this shouldn't
    // break apps. Other browsers display errors in a sensible way and some of them map stack
    // traces along source maps if available so it makes sense to let browsers display it
    // as they want.
    var formatStackTrace = msie || /\bEdge\//.test($window.navigator && $window.navigator.userAgent);

    return {
      /**
       * @ngdoc method
       * @name $log#log
       *
       * @description
       * Write a log message
       */
      log: consoleLog('log'),

      /**
       * @ngdoc method
       * @name $log#info
       *
       * @description
       * Write an information message
       */
      info: consoleLog('info'),

      /**
       * @ngdoc method
       * @name $log#warn
       *
       * @description
       * Write a warning message
       */
      warn: consoleLog('warn'),

      /**
       * @ngdoc method
       * @name $log#error
       *
       * @description
       * Write an error message
       */
      error: consoleLog('error'),

      /**
       * @ngdoc method
       * @name $log#debug
       *
       * @description
       * Write a debug message
       */
      debug: (function() {
        var fn = consoleLog('debug');

        return function() {
          if (debug) {
            fn.apply(self, arguments);
          }
        };
      })()
    };

    function formatError(arg) {
      if (arg instanceof Error) {
        if (arg.stack && formatStackTrace) {
          arg = (arg.message && arg.stack.indexOf(arg.message) === -1)
              ? 'Error: ' + arg.message + '\n' + arg.stack
              : arg.stack;
        } else if (arg.sourceURL) {
          arg = arg.message + '\n' + arg.sourceURL + ':' + arg.line;
        }
      }
      return arg;
    }

    function consoleLog(type) {
      var console = $window.console || {},
          logFn = console[type] || console.log || noop,
          hasApply = false;

      // Note: reading logFn.apply throws an error in IE11 in IE8 document mode.
      // The reason behind this is that console.log has type "object" in IE8...
      try {
        hasApply = !!logFn.apply;
      } catch (e) { /* empty */ }

      if (hasApply) {
        return function() {
          var args = [];
          forEach(arguments, function(arg) {
            args.push(formatError(arg));
          });
          return logFn.apply(console, args);
        };
      }

      // we are IE which either doesn't have window.console => this is noop and we do nothing,
      // or we are IE where console.log doesn't have apply so we log at least first 2 args
      return function(arg1, arg2) {
        logFn(arg1, arg2 == null ? '' : arg2);
      };
    }
  }];
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *     Any commits to this file should be reviewed with security in mind.  *
 *   Changes to this file can potentially create security vulnerabilities. *
 *          An approval from 2 Core members with history of modifying      *
 *                         this file is required.                          *
 *                                                                         *
 *  Does the change somehow allow for arbitrary javascript to be executed? *
 *    Or allows for someone to change the prototype of built-in objects?   *
 *     Or gives undesired access to variables likes document or window?    *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var $parseMinErr = minErr('$parse');

var objectValueOf = {}.constructor.prototype.valueOf;

// Sandboxing Angular Expressions
// ------------------------------
// Angular expressions are no longer sandboxed. So it is now even easier to access arbitrary JS code by
// various means such as obtaining a reference to native JS functions like the Function constructor.
//
// As an example, consider the following Angular expression:
//
//   {}.toString.constructor('alert("evil JS code")')
//
// It is important to realize that if you create an expression from a string that contains user provided
// content then it is possible that your application contains a security vulnerability to an XSS style attack.
//
// See https://docs.angularjs.org/guide/security


function getStringValue(name) {
  // Property names must be strings. This means that non-string objects cannot be used
  // as keys in an object. Any non-string object, including a number, is typecasted
  // into a string via the toString method.
  // -- MDN, https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Property_accessors#Property_names
  //
  // So, to ensure that we are checking the same `name` that JavaScript would use, we cast it
  // to a string. It's not always possible. If `name` is an object and its `toString` method is
  // 'broken' (doesn't return a string, isn't a function, etc.), an error will be thrown:
  //
  // TypeError: Cannot convert object to primitive value
  //
  // For performance reasons, we don't catch this error here and allow it to propagate up the call
  // stack. Note that you'll get the same error in JavaScript if you try to access a property using
  // such a 'broken' object as a key.
  return name + '';
}


var OPERATORS = createMap();
forEach('+ - * / % === !== == != < > <= >= && || ! = |'.split(' '), function(operator) { OPERATORS[operator] = true; });
var ESCAPE = {'n':'\n', 'f':'\f', 'r':'\r', 't':'\t', 'v':'\v', '\'':'\'', '"':'"'};


/////////////////////////////////////////


/**
 * @constructor
 */
var Lexer = function Lexer(options) {
  this.options = options;
};

Lexer.prototype = {
  constructor: Lexer,

  lex: function(text) {
    this.text = text;
    this.index = 0;
    this.tokens = [];

    while (this.index < this.text.length) {
      var ch = this.text.charAt(this.index);
      if (ch === '"' || ch === '\'') {
        this.readString(ch);
      } else if (this.isNumber(ch) || ch === '.' && this.isNumber(this.peek())) {
        this.readNumber();
      } else if (this.isIdentifierStart(this.peekMultichar())) {
        this.readIdent();
      } else if (this.is(ch, '(){}[].,;:?')) {
        this.tokens.push({index: this.index, text: ch});
        this.index++;
      } else if (this.isWhitespace(ch)) {
        this.index++;
      } else {
        var ch2 = ch + this.peek();
        var ch3 = ch2 + this.peek(2);
        var op1 = OPERATORS[ch];
        var op2 = OPERATORS[ch2];
        var op3 = OPERATORS[ch3];
        if (op1 || op2 || op3) {
          var token = op3 ? ch3 : (op2 ? ch2 : ch);
          this.tokens.push({index: this.index, text: token, operator: true});
          this.index += token.length;
        } else {
          this.throwError('Unexpected next character ', this.index, this.index + 1);
        }
      }
    }
    return this.tokens;
  },

  is: function(ch, chars) {
    return chars.indexOf(ch) !== -1;
  },

  peek: function(i) {
    var num = i || 1;
    return (this.index + num < this.text.length) ? this.text.charAt(this.index + num) : false;
  },

  isNumber: function(ch) {
    return ('0' <= ch && ch <= '9') && typeof ch === 'string';
  },

  isWhitespace: function(ch) {
    // IE treats non-breaking space as \u00A0
    return (ch === ' ' || ch === '\r' || ch === '\t' ||
            ch === '\n' || ch === '\v' || ch === '\u00A0');
  },

  isIdentifierStart: function(ch) {
    return this.options.isIdentifierStart ?
        this.options.isIdentifierStart(ch, this.codePointAt(ch)) :
        this.isValidIdentifierStart(ch);
  },

  isValidIdentifierStart: function(ch) {
    return ('a' <= ch && ch <= 'z' ||
            'A' <= ch && ch <= 'Z' ||
            '_' === ch || ch === '$');
  },

  isIdentifierContinue: function(ch) {
    return this.options.isIdentifierContinue ?
        this.options.isIdentifierContinue(ch, this.codePointAt(ch)) :
        this.isValidIdentifierContinue(ch);
  },

  isValidIdentifierContinue: function(ch, cp) {
    return this.isValidIdentifierStart(ch, cp) || this.isNumber(ch);
  },

  codePointAt: function(ch) {
    if (ch.length === 1) return ch.charCodeAt(0);
    // eslint-disable-next-line no-bitwise
    return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35FDC00;
  },

  peekMultichar: function() {
    var ch = this.text.charAt(this.index);
    var peek = this.peek();
    if (!peek) {
      return ch;
    }
    var cp1 = ch.charCodeAt(0);
    var cp2 = peek.charCodeAt(0);
    if (cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF) {
      return ch + peek;
    }
    return ch;
  },

  isExpOperator: function(ch) {
    return (ch === '-' || ch === '+' || this.isNumber(ch));
  },

  throwError: function(error, start, end) {
    end = end || this.index;
    var colStr = (isDefined(start)
            ? 's ' + start +  '-' + this.index + ' [' + this.text.substring(start, end) + ']'
            : ' ' + end);
    throw $parseMinErr('lexerr', 'Lexer Error: {0} at column{1} in expression [{2}].',
        error, colStr, this.text);
  },

  readNumber: function() {
    var number = '';
    var start = this.index;
    while (this.index < this.text.length) {
      var ch = lowercase(this.text.charAt(this.index));
      if (ch === '.' || this.isNumber(ch)) {
        number += ch;
      } else {
        var peekCh = this.peek();
        if (ch === 'e' && this.isExpOperator(peekCh)) {
          number += ch;
        } else if (this.isExpOperator(ch) &&
            peekCh && this.isNumber(peekCh) &&
            number.charAt(number.length - 1) === 'e') {
          number += ch;
        } else if (this.isExpOperator(ch) &&
            (!peekCh || !this.isNumber(peekCh)) &&
            number.charAt(number.length - 1) === 'e') {
          this.throwError('Invalid exponent');
        } else {
          break;
        }
      }
      this.index++;
    }
    this.tokens.push({
      index: start,
      text: number,
      constant: true,
      value: Number(number)
    });
  },

  readIdent: function() {
    var start = this.index;
    this.index += this.peekMultichar().length;
    while (this.index < this.text.length) {
      var ch = this.peekMultichar();
      if (!this.isIdentifierContinue(ch)) {
        break;
      }
      this.index += ch.length;
    }
    this.tokens.push({
      index: start,
      text: this.text.slice(start, this.index),
      identifier: true
    });
  },

  readString: function(quote) {
    var start = this.index;
    this.index++;
    var string = '';
    var rawString = quote;
    var escape = false;
    while (this.index < this.text.length) {
      var ch = this.text.charAt(this.index);
      rawString += ch;
      if (escape) {
        if (ch === 'u') {
          var hex = this.text.substring(this.index + 1, this.index + 5);
          if (!hex.match(/[\da-f]{4}/i)) {
            this.throwError('Invalid unicode escape [\\u' + hex + ']');
          }
          this.index += 4;
          string += String.fromCharCode(parseInt(hex, 16));
        } else {
          var rep = ESCAPE[ch];
          string = string + (rep || ch);
        }
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === quote) {
        this.index++;
        this.tokens.push({
          index: start,
          text: rawString,
          constant: true,
          value: string
        });
        return;
      } else {
        string += ch;
      }
      this.index++;
    }
    this.throwError('Unterminated quote', start);
  }
};

var AST = function AST(lexer, options) {
  this.lexer = lexer;
  this.options = options;
};

AST.Program = 'Program';
AST.ExpressionStatement = 'ExpressionStatement';
AST.AssignmentExpression = 'AssignmentExpression';
AST.ConditionalExpression = 'ConditionalExpression';
AST.LogicalExpression = 'LogicalExpression';
AST.BinaryExpression = 'BinaryExpression';
AST.UnaryExpression = 'UnaryExpression';
AST.CallExpression = 'CallExpression';
AST.MemberExpression = 'MemberExpression';
AST.Identifier = 'Identifier';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.Property = 'Property';
AST.ObjectExpression = 'ObjectExpression';
AST.ThisExpression = 'ThisExpression';
AST.LocalsExpression = 'LocalsExpression';

// Internal use only
AST.NGValueParameter = 'NGValueParameter';

AST.prototype = {
  ast: function(text) {
    this.text = text;
    this.tokens = this.lexer.lex(text);

    var value = this.program();

    if (this.tokens.length !== 0) {
      this.throwError('is an unexpected token', this.tokens[0]);
    }

    return value;
  },

  program: function() {
    var body = [];
    while (true) {
      if (this.tokens.length > 0 && !this.peek('}', ')', ';', ']'))
        body.push(this.expressionStatement());
      if (!this.expect(';')) {
        return { type: AST.Program, body: body};
      }
    }
  },

  expressionStatement: function() {
    return { type: AST.ExpressionStatement, expression: this.filterChain() };
  },

  filterChain: function() {
    var left = this.expression();
    while (this.expect('|')) {
      left = this.filter(left);
    }
    return left;
  },

  expression: function() {
    return this.assignment();
  },

  assignment: function() {
    var result = this.ternary();
    if (this.expect('=')) {
      if (!isAssignable(result)) {
        throw $parseMinErr('lval', 'Trying to assign a value to a non l-value');
      }

      result = { type: AST.AssignmentExpression, left: result, right: this.assignment(), operator: '='};
    }
    return result;
  },

  ternary: function() {
    var test = this.logicalOR();
    var alternate;
    var consequent;
    if (this.expect('?')) {
      alternate = this.expression();
      if (this.consume(':')) {
        consequent = this.expression();
        return { type: AST.ConditionalExpression, test: test, alternate: alternate, consequent: consequent};
      }
    }
    return test;
  },

  logicalOR: function() {
    var left = this.logicalAND();
    while (this.expect('||')) {
      left = { type: AST.LogicalExpression, operator: '||', left: left, right: this.logicalAND() };
    }
    return left;
  },

  logicalAND: function() {
    var left = this.equality();
    while (this.expect('&&')) {
      left = { type: AST.LogicalExpression, operator: '&&', left: left, right: this.equality()};
    }
    return left;
  },

  equality: function() {
    var left = this.relational();
    var token;
    while ((token = this.expect('==','!=','===','!=='))) {
      left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.relational() };
    }
    return left;
  },

  relational: function() {
    var left = this.additive();
    var token;
    while ((token = this.expect('<', '>', '<=', '>='))) {
      left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.additive() };
    }
    return left;
  },

  additive: function() {
    var left = this.multiplicative();
    var token;
    while ((token = this.expect('+','-'))) {
      left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.multiplicative() };
    }
    return left;
  },

  multiplicative: function() {
    var left = this.unary();
    var token;
    while ((token = this.expect('*','/','%'))) {
      left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.unary() };
    }
    return left;
  },

  unary: function() {
    var token;
    if ((token = this.expect('+', '-', '!'))) {
      return { type: AST.UnaryExpression, operator: token.text, prefix: true, argument: this.unary() };
    } else {
      return this.primary();
    }
  },

  primary: function() {
    var primary;
    if (this.expect('(')) {
      primary = this.filterChain();
      this.consume(')');
    } else if (this.expect('[')) {
      primary = this.arrayDeclaration();
    } else if (this.expect('{')) {
      primary = this.object();
    } else if (this.selfReferential.hasOwnProperty(this.peek().text)) {
      primary = copy(this.selfReferential[this.consume().text]);
    } else if (this.options.literals.hasOwnProperty(this.peek().text)) {
      primary = { type: AST.Literal, value: this.options.literals[this.consume().text]};
    } else if (this.peek().identifier) {
      primary = this.identifier();
    } else if (this.peek().constant) {
      primary = this.constant();
    } else {
      this.throwError('not a primary expression', this.peek());
    }

    var next;
    while ((next = this.expect('(', '[', '.'))) {
      if (next.text === '(') {
        primary = {type: AST.CallExpression, callee: primary, arguments: this.parseArguments() };
        this.consume(')');
      } else if (next.text === '[') {
        primary = { type: AST.MemberExpression, object: primary, property: this.expression(), computed: true };
        this.consume(']');
      } else if (next.text === '.') {
        primary = { type: AST.MemberExpression, object: primary, property: this.identifier(), computed: false };
      } else {
        this.throwError('IMPOSSIBLE');
      }
    }
    return primary;
  },

  filter: function(baseExpression) {
    var args = [baseExpression];
    var result = {type: AST.CallExpression, callee: this.identifier(), arguments: args, filter: true};

    while (this.expect(':')) {
      args.push(this.expression());
    }

    return result;
  },

  parseArguments: function() {
    var args = [];
    if (this.peekToken().text !== ')') {
      do {
        args.push(this.filterChain());
      } while (this.expect(','));
    }
    return args;
  },

  identifier: function() {
    var token = this.consume();
    if (!token.identifier) {
      this.throwError('is not a valid identifier', token);
    }
    return { type: AST.Identifier, name: token.text };
  },

  constant: function() {
    // TODO check that it is a constant
    return { type: AST.Literal, value: this.consume().value };
  },

  arrayDeclaration: function() {
    var elements = [];
    if (this.peekToken().text !== ']') {
      do {
        if (this.peek(']')) {
          // Support trailing commas per ES5.1.
          break;
        }
        elements.push(this.expression());
      } while (this.expect(','));
    }
    this.consume(']');

    return { type: AST.ArrayExpression, elements: elements };
  },

  object: function() {
    var properties = [], property;
    if (this.peekToken().text !== '}') {
      do {
        if (this.peek('}')) {
          // Support trailing commas per ES5.1.
          break;
        }
        property = {type: AST.Property, kind: 'init'};
        if (this.peek().constant) {
          property.key = this.constant();
          property.computed = false;
          this.consume(':');
          property.value = this.expression();
        } else if (this.peek().identifier) {
          property.key = this.identifier();
          property.computed = false;
          if (this.peek(':')) {
            this.consume(':');
            property.value = this.expression();
          } else {
            property.value = property.key;
          }
        } else if (this.peek('[')) {
          this.consume('[');
          property.key = this.expression();
          this.consume(']');
          property.computed = true;
          this.consume(':');
          property.value = this.expression();
        } else {
          this.throwError('invalid key', this.peek());
        }
        properties.push(property);
      } while (this.expect(','));
    }
    this.consume('}');

    return {type: AST.ObjectExpression, properties: properties };
  },

  throwError: function(msg, token) {
    throw $parseMinErr('syntax',
        'Syntax Error: Token \'{0}\' {1} at column {2} of the expression [{3}] starting at [{4}].',
          token.text, msg, (token.index + 1), this.text, this.text.substring(token.index));
  },

  consume: function(e1) {
    if (this.tokens.length === 0) {
      throw $parseMinErr('ueoe', 'Unexpected end of expression: {0}', this.text);
    }

    var token = this.expect(e1);
    if (!token) {
      this.throwError('is unexpected, expecting [' + e1 + ']', this.peek());
    }
    return token;
  },

  peekToken: function() {
    if (this.tokens.length === 0) {
      throw $parseMinErr('ueoe', 'Unexpected end of expression: {0}', this.text);
    }
    return this.tokens[0];
  },

  peek: function(e1, e2, e3, e4) {
    return this.peekAhead(0, e1, e2, e3, e4);
  },

  peekAhead: function(i, e1, e2, e3, e4) {
    if (this.tokens.length > i) {
      var token = this.tokens[i];
      var t = token.text;
      if (t === e1 || t === e2 || t === e3 || t === e4 ||
          (!e1 && !e2 && !e3 && !e4)) {
        return token;
      }
    }
    return false;
  },

  expect: function(e1, e2, e3, e4) {
    var token = this.peek(e1, e2, e3, e4);
    if (token) {
      this.tokens.shift();
      return token;
    }
    return false;
  },

  selfReferential: {
    'this': {type: AST.ThisExpression },
    '$locals': {type: AST.LocalsExpression }
  }
};

function ifDefined(v, d) {
  return typeof v !== 'undefined' ? v : d;
}

function plusFn(l, r) {
  if (typeof l === 'undefined') return r;
  if (typeof r === 'undefined') return l;
  return l + r;
}

function isStateless($filter, filterName) {
  var fn = $filter(filterName);
  return !fn.$stateful;
}

function findConstantAndWatchExpressions(ast, $filter) {
  var allConstants;
  var argsToWatch;
  var isStatelessFilter;
  switch (ast.type) {
  case AST.Program:
    allConstants = true;
    forEach(ast.body, function(expr) {
      findConstantAndWatchExpressions(expr.expression, $filter);
      allConstants = allConstants && expr.expression.constant;
    });
    ast.constant = allConstants;
    break;
  case AST.Literal:
    ast.constant = true;
    ast.toWatch = [];
    break;
  case AST.UnaryExpression:
    findConstantAndWatchExpressions(ast.argument, $filter);
    ast.constant = ast.argument.constant;
    ast.toWatch = ast.argument.toWatch;
    break;
  case AST.BinaryExpression:
    findConstantAndWatchExpressions(ast.left, $filter);
    findConstantAndWatchExpressions(ast.right, $filter);
    ast.constant = ast.left.constant && ast.right.constant;
    ast.toWatch = ast.left.toWatch.concat(ast.right.toWatch);
    break;
  case AST.LogicalExpression:
    findConstantAndWatchExpressions(ast.left, $filter);
    findConstantAndWatchExpressions(ast.right, $filter);
    ast.constant = ast.left.constant && ast.right.constant;
    ast.toWatch = ast.constant ? [] : [ast];
    break;
  case AST.ConditionalExpression:
    findConstantAndWatchExpressions(ast.test, $filter);
    findConstantAndWatchExpressions(ast.alternate, $filter);
    findConstantAndWatchExpressions(ast.consequent, $filter);
    ast.constant = ast.test.constant && ast.alternate.constant && ast.consequent.constant;
    ast.toWatch = ast.constant ? [] : [ast];
    break;
  case AST.Identifier:
    ast.constant = false;
    ast.toWatch = [ast];
    break;
  case AST.MemberExpression:
    findConstantAndWatchExpressions(ast.object, $filter);
    if (ast.computed) {
      findConstantAndWatchExpressions(ast.property, $filter);
    }
    ast.constant = ast.object.constant && (!ast.computed || ast.property.constant);
    ast.toWatch = [ast];
    break;
  case AST.CallExpression:
    isStatelessFilter = ast.filter ? isStateless($filter, ast.callee.name) : false;
    allConstants = isStatelessFilter;
    argsToWatch = [];
    forEach(ast.arguments, function(expr) {
      findConstantAndWatchExpressions(expr, $filter);
      allConstants = allConstants && expr.constant;
      if (!expr.constant) {
        argsToWatch.push.apply(argsToWatch, expr.toWatch);
      }
    });
    ast.constant = allConstants;
    ast.toWatch = isStatelessFilter ? argsToWatch : [ast];
    break;
  case AST.AssignmentExpression:
    findConstantAndWatchExpressions(ast.left, $filter);
    findConstantAndWatchExpressions(ast.right, $filter);
    ast.constant = ast.left.constant && ast.right.constant;
    ast.toWatch = [ast];
    break;
  case AST.ArrayExpression:
    allConstants = true;
    argsToWatch = [];
    forEach(ast.elements, function(expr) {
      findConstantAndWatchExpressions(expr, $filter);
      allConstants = allConstants && expr.constant;
      if (!expr.constant) {
        argsToWatch.push.apply(argsToWatch, expr.toWatch);
      }
    });
    ast.constant = allConstants;
    ast.toWatch = argsToWatch;
    break;
  case AST.ObjectExpression:
    allConstants = true;
    argsToWatch = [];
    forEach(ast.properties, function(property) {
      findConstantAndWatchExpressions(property.value, $filter);
      allConstants = allConstants && property.value.constant && !property.computed;
      if (!property.value.constant) {
        argsToWatch.push.apply(argsToWatch, property.value.toWatch);
      }
      if (property.computed) {
        findConstantAndWatchExpressions(property.key, $filter);
        if (!property.key.constant) {
          argsToWatch.push.apply(argsToWatch, property.key.toWatch);
        }
      }

    });
    ast.constant = allConstants;
    ast.toWatch = argsToWatch;
    break;
  case AST.ThisExpression:
    ast.constant = false;
    ast.toWatch = [];
    break;
  case AST.LocalsExpression:
    ast.constant = false;
    ast.toWatch = [];
    break;
  }
}

function getInputs(body) {
  if (body.length !== 1) return;
  var lastExpression = body[0].expression;
  var candidate = lastExpression.toWatch;
  if (candidate.length !== 1) return candidate;
  return candidate[0] !== lastExpression ? candidate : undefined;
}

function isAssignable(ast) {
  return ast.type === AST.Identifier || ast.type === AST.MemberExpression;
}

function assignableAST(ast) {
  if (ast.body.length === 1 && isAssignable(ast.body[0].expression)) {
    return {type: AST.AssignmentExpression, left: ast.body[0].expression, right: {type: AST.NGValueParameter}, operator: '='};
  }
}

function isLiteral(ast) {
  return ast.body.length === 0 ||
      ast.body.length === 1 && (
      ast.body[0].expression.type === AST.Literal ||
      ast.body[0].expression.type === AST.ArrayExpression ||
      ast.body[0].expression.type === AST.ObjectExpression);
}

function isConstant(ast) {
  return ast.constant;
}

function ASTCompiler($filter) {
  this.$filter = $filter;
}

ASTCompiler.prototype = {
  compile: function(ast) {
    var self = this;
    this.state = {
      nextId: 0,
      filters: {},
      fn: {vars: [], body: [], own: {}},
      assign: {vars: [], body: [], own: {}},
      inputs: []
    };
    findConstantAndWatchExpressions(ast, self.$filter);
    var extra = '';
    var assignable;
    this.stage = 'assign';
    if ((assignable = assignableAST(ast))) {
      this.state.computing = 'assign';
      var result = this.nextId();
      this.recurse(assignable, result);
      this.return_(result);
      extra = 'fn.assign=' + this.generateFunction('assign', 's,v,l');
    }
    var toWatch = getInputs(ast.body);
    self.stage = 'inputs';
    forEach(toWatch, function(watch, key) {
      var fnKey = 'fn' + key;
      self.state[fnKey] = {vars: [], body: [], own: {}};
      self.state.computing = fnKey;
      var intoId = self.nextId();
      self.recurse(watch, intoId);
      self.return_(intoId);
      self.state.inputs.push(fnKey);
      watch.watchId = key;
    });
    this.state.computing = 'fn';
    this.stage = 'main';
    this.recurse(ast);
    var fnString =
      // The build and minification steps remove the string "use strict" from the code, but this is done using a regex.
      // This is a workaround for this until we do a better job at only removing the prefix only when we should.
      '"' + this.USE + ' ' + this.STRICT + '";\n' +
      this.filterPrefix() +
      'var fn=' + this.generateFunction('fn', 's,l,a,i') +
      extra +
      this.watchFns() +
      'return fn;';

    // eslint-disable-next-line no-new-func
    var fn = (new Function('$filter',
        'getStringValue',
        'ifDefined',
        'plus',
        fnString))(
          this.$filter,
          getStringValue,
          ifDefined,
          plusFn);
    this.state = this.stage = undefined;
    return fn;
  },

  USE: 'use',

  STRICT: 'strict',

  watchFns: function() {
    var result = [];
    var fns = this.state.inputs;
    var self = this;
    forEach(fns, function(name) {
      result.push('var ' + name + '=' + self.generateFunction(name, 's'));
    });
    if (fns.length) {
      result.push('fn.inputs=[' + fns.join(',') + '];');
    }
    return result.join('');
  },

  generateFunction: function(name, params) {
    return 'function(' + params + '){' +
        this.varsPrefix(name) +
        this.body(name) +
        '};';
  },

  filterPrefix: function() {
    var parts = [];
    var self = this;
    forEach(this.state.filters, function(id, filter) {
      parts.push(id + '=$filter(' + self.escape(filter) + ')');
    });
    if (parts.length) return 'var ' + parts.join(',') + ';';
    return '';
  },

  varsPrefix: function(section) {
    return this.state[section].vars.length ? 'var ' + this.state[section].vars.join(',') + ';' : '';
  },

  body: function(section) {
    return this.state[section].body.join('');
  },

  recurse: function(ast, intoId, nameId, recursionFn, create, skipWatchIdCheck) {
    var left, right, self = this, args, expression, computed;
    recursionFn = recursionFn || noop;
    if (!skipWatchIdCheck && isDefined(ast.watchId)) {
      intoId = intoId || this.nextId();
      this.if_('i',
        this.lazyAssign(intoId, this.computedMember('i', ast.watchId)),
        this.lazyRecurse(ast, intoId, nameId, recursionFn, create, true)
      );
      return;
    }
    switch (ast.type) {
    case AST.Program:
      forEach(ast.body, function(expression, pos) {
        self.recurse(expression.expression, undefined, undefined, function(expr) { right = expr; });
        if (pos !== ast.body.length - 1) {
          self.current().body.push(right, ';');
        } else {
          self.return_(right);
        }
      });
      break;
    case AST.Literal:
      expression = this.escape(ast.value);
      this.assign(intoId, expression);
      recursionFn(intoId || expression);
      break;
    case AST.UnaryExpression:
      this.recurse(ast.argument, undefined, undefined, function(expr) { right = expr; });
      expression = ast.operator + '(' + this.ifDefined(right, 0) + ')';
      this.assign(intoId, expression);
      recursionFn(expression);
      break;
    case AST.BinaryExpression:
      this.recurse(ast.left, undefined, undefined, function(expr) { left = expr; });
      this.recurse(ast.right, undefined, undefined, function(expr) { right = expr; });
      if (ast.operator === '+') {
        expression = this.plus(left, right);
      } else if (ast.operator === '-') {
        expression = this.ifDefined(left, 0) + ast.operator + this.ifDefined(right, 0);
      } else {
        expression = '(' + left + ')' + ast.operator + '(' + right + ')';
      }
      this.assign(intoId, expression);
      recursionFn(expression);
      break;
    case AST.LogicalExpression:
      intoId = intoId || this.nextId();
      self.recurse(ast.left, intoId);
      self.if_(ast.operator === '&&' ? intoId : self.not(intoId), self.lazyRecurse(ast.right, intoId));
      recursionFn(intoId);
      break;
    case AST.ConditionalExpression:
      intoId = intoId || this.nextId();
      self.recurse(ast.test, intoId);
      self.if_(intoId, self.lazyRecurse(ast.alternate, intoId), self.lazyRecurse(ast.consequent, intoId));
      recursionFn(intoId);
      break;
    case AST.Identifier:
      intoId = intoId || this.nextId();
      if (nameId) {
        nameId.context = self.stage === 'inputs' ? 's' : this.assign(this.nextId(), this.getHasOwnProperty('l', ast.name) + '?l:s');
        nameId.computed = false;
        nameId.name = ast.name;
      }
      self.if_(self.stage === 'inputs' || self.not(self.getHasOwnProperty('l', ast.name)),
        function() {
          self.if_(self.stage === 'inputs' || 's', function() {
            if (create && create !== 1) {
              self.if_(
                self.isNull(self.nonComputedMember('s', ast.name)),
                self.lazyAssign(self.nonComputedMember('s', ast.name), '{}'));
            }
            self.assign(intoId, self.nonComputedMember('s', ast.name));
          });
        }, intoId && self.lazyAssign(intoId, self.nonComputedMember('l', ast.name))
        );
      recursionFn(intoId);
      break;
    case AST.MemberExpression:
      left = nameId && (nameId.context = this.nextId()) || this.nextId();
      intoId = intoId || this.nextId();
      self.recurse(ast.object, left, undefined, function() {
        self.if_(self.notNull(left), function() {
          if (ast.computed) {
            right = self.nextId();
            self.recurse(ast.property, right);
            self.getStringValue(right);
            if (create && create !== 1) {
              self.if_(self.not(self.computedMember(left, right)), self.lazyAssign(self.computedMember(left, right), '{}'));
            }
            expression = self.computedMember(left, right);
            self.assign(intoId, expression);
            if (nameId) {
              nameId.computed = true;
              nameId.name = right;
            }
          } else {
            if (create && create !== 1) {
              self.if_(self.isNull(self.nonComputedMember(left, ast.property.name)), self.lazyAssign(self.nonComputedMember(left, ast.property.name), '{}'));
            }
            expression = self.nonComputedMember(left, ast.property.name);
            self.assign(intoId, expression);
            if (nameId) {
              nameId.computed = false;
              nameId.name = ast.property.name;
            }
          }
        }, function() {
          self.assign(intoId, 'undefined');
        });
        recursionFn(intoId);
      }, !!create);
      break;
    case AST.CallExpression:
      intoId = intoId || this.nextId();
      if (ast.filter) {
        right = self.filter(ast.callee.name);
        args = [];
        forEach(ast.arguments, function(expr) {
          var argument = self.nextId();
          self.recurse(expr, argument);
          args.push(argument);
        });
        expression = right + '(' + args.join(',') + ')';
        self.assign(intoId, expression);
        recursionFn(intoId);
      } else {
        right = self.nextId();
        left = {};
        args = [];
        self.recurse(ast.callee, right, left, function() {
          self.if_(self.notNull(right), function() {
            forEach(ast.arguments, function(expr) {
              self.recurse(expr, ast.constant ? undefined : self.nextId(), undefined, function(argument) {
                args.push(argument);
              });
            });
            if (left.name) {
              expression = self.member(left.context, left.name, left.computed) + '(' + args.join(',') + ')';
            } else {
              expression = right + '(' + args.join(',') + ')';
            }
            self.assign(intoId, expression);
          }, function() {
            self.assign(intoId, 'undefined');
          });
          recursionFn(intoId);
        });
      }
      break;
    case AST.AssignmentExpression:
      right = this.nextId();
      left = {};
      this.recurse(ast.left, undefined, left, function() {
        self.if_(self.notNull(left.context), function() {
          self.recurse(ast.right, right);
          expression = self.member(left.context, left.name, left.computed) + ast.operator + right;
          self.assign(intoId, expression);
          recursionFn(intoId || expression);
        });
      }, 1);
      break;
    case AST.ArrayExpression:
      args = [];
      forEach(ast.elements, function(expr) {
        self.recurse(expr, ast.constant ? undefined : self.nextId(), undefined, function(argument) {
          args.push(argument);
        });
      });
      expression = '[' + args.join(',') + ']';
      this.assign(intoId, expression);
      recursionFn(intoId || expression);
      break;
    case AST.ObjectExpression:
      args = [];
      computed = false;
      forEach(ast.properties, function(property) {
        if (property.computed) {
          computed = true;
        }
      });
      if (computed) {
        intoId = intoId || this.nextId();
        this.assign(intoId, '{}');
        forEach(ast.properties, function(property) {
          if (property.computed) {
            left = self.nextId();
            self.recurse(property.key, left);
          } else {
            left = property.key.type === AST.Identifier ?
                       property.key.name :
                       ('' + property.key.value);
          }
          right = self.nextId();
          self.recurse(property.value, right);
          self.assign(self.member(intoId, left, property.computed), right);
        });
      } else {
        forEach(ast.properties, function(property) {
          self.recurse(property.value, ast.constant ? undefined : self.nextId(), undefined, function(expr) {
            args.push(self.escape(
                property.key.type === AST.Identifier ? property.key.name :
                  ('' + property.key.value)) +
                ':' + expr);
          });
        });
        expression = '{' + args.join(',') + '}';
        this.assign(intoId, expression);
      }
      recursionFn(intoId || expression);
      break;
    case AST.ThisExpression:
      this.assign(intoId, 's');
      recursionFn(intoId || 's');
      break;
    case AST.LocalsExpression:
      this.assign(intoId, 'l');
      recursionFn(intoId || 'l');
      break;
    case AST.NGValueParameter:
      this.assign(intoId, 'v');
      recursionFn(intoId || 'v');
      break;
    }
  },

  getHasOwnProperty: function(element, property) {
    var key = element + '.' + property;
    var own = this.current().own;
    if (!own.hasOwnProperty(key)) {
      own[key] = this.nextId(false, element + '&&(' + this.escape(property) + ' in ' + element + ')');
    }
    return own[key];
  },

  assign: function(id, value) {
    if (!id) return;
    this.current().body.push(id, '=', value, ';');
    return id;
  },

  filter: function(filterName) {
    if (!this.state.filters.hasOwnProperty(filterName)) {
      this.state.filters[filterName] = this.nextId(true);
    }
    return this.state.filters[filterName];
  },

  ifDefined: function(id, defaultValue) {
    return 'ifDefined(' + id + ',' + this.escape(defaultValue) + ')';
  },

  plus: function(left, right) {
    return 'plus(' + left + ',' + right + ')';
  },

  return_: function(id) {
    this.current().body.push('return ', id, ';');
  },

  if_: function(test, alternate, consequent) {
    if (test === true) {
      alternate();
    } else {
      var body = this.current().body;
      body.push('if(', test, '){');
      alternate();
      body.push('}');
      if (consequent) {
        body.push('else{');
        consequent();
        body.push('}');
      }
    }
  },

  not: function(expression) {
    return '!(' + expression + ')';
  },

  isNull: function(expression) {
    return expression + '==null';
  },

  notNull: function(expression) {
    return expression + '!=null';
  },

  nonComputedMember: function(left, right) {
    var SAFE_IDENTIFIER = /^[$_a-zA-Z][$_a-zA-Z0-9]*$/;
    var UNSAFE_CHARACTERS = /[^$_a-zA-Z0-9]/g;
    if (SAFE_IDENTIFIER.test(right)) {
      return left + '.' + right;
    } else {
      return left  + '["' + right.replace(UNSAFE_CHARACTERS, this.stringEscapeFn) + '"]';
    }
  },

  computedMember: function(left, right) {
    return left + '[' + right + ']';
  },

  member: function(left, right, computed) {
    if (computed) return this.computedMember(left, right);
    return this.nonComputedMember(left, right);
  },

  getStringValue: function(item) {
    this.assign(item, 'getStringValue(' + item + ')');
  },

  lazyRecurse: function(ast, intoId, nameId, recursionFn, create, skipWatchIdCheck) {
    var self = this;
    return function() {
      self.recurse(ast, intoId, nameId, recursionFn, create, skipWatchIdCheck);
    };
  },

  lazyAssign: function(id, value) {
    var self = this;
    return function() {
      self.assign(id, value);
    };
  },

  stringEscapeRegex: /[^ a-zA-Z0-9]/g,

  stringEscapeFn: function(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  },

  escape: function(value) {
    if (isString(value)) return '\'' + value.replace(this.stringEscapeRegex, this.stringEscapeFn) + '\'';
    if (isNumber(value)) return value.toString();
    if (value === true) return 'true';
    if (value === false) return 'false';
    if (value === null) return 'null';
    if (typeof value === 'undefined') return 'undefined';

    throw $parseMinErr('esc', 'IMPOSSIBLE');
  },

  nextId: function(skip, init) {
    var id = 'v' + (this.state.nextId++);
    if (!skip) {
      this.current().vars.push(id + (init ? '=' + init : ''));
    }
    return id;
  },

  current: function() {
    return this.state[this.state.computing];
  }
};


function ASTInterpreter($filter) {
  this.$filter = $filter;
}

ASTInterpreter.prototype = {
  compile: function(ast) {
    var self = this;
    findConstantAndWatchExpressions(ast, self.$filter);
    var assignable;
    var assign;
    if ((assignable = assignableAST(ast))) {
      assign = this.recurse(assignable);
    }
    var toWatch = getInputs(ast.body);
    var inputs;
    if (toWatch) {
      inputs = [];
      forEach(toWatch, function(watch, key) {
        var input = self.recurse(watch);
        watch.input = input;
        inputs.push(input);
        watch.watchId = key;
      });
    }
    var expressions = [];
    forEach(ast.body, function(expression) {
      expressions.push(self.recurse(expression.expression));
    });
    var fn = ast.body.length === 0 ? noop :
             ast.body.length === 1 ? expressions[0] :
             function(scope, locals) {
               var lastValue;
               forEach(expressions, function(exp) {
                 lastValue = exp(scope, locals);
               });
               return lastValue;
             };
    if (assign) {
      fn.assign = function(scope, value, locals) {
        return assign(scope, locals, value);
      };
    }
    if (inputs) {
      fn.inputs = inputs;
    }
    return fn;
  },

  recurse: function(ast, context, create) {
    var left, right, self = this, args;
    if (ast.input) {
      return this.inputs(ast.input, ast.watchId);
    }
    switch (ast.type) {
    case AST.Literal:
      return this.value(ast.value, context);
    case AST.UnaryExpression:
      right = this.recurse(ast.argument);
      return this['unary' + ast.operator](right, context);
    case AST.BinaryExpression:
      left = this.recurse(ast.left);
      right = this.recurse(ast.right);
      return this['binary' + ast.operator](left, right, context);
    case AST.LogicalExpression:
      left = this.recurse(ast.left);
      right = this.recurse(ast.right);
      return this['binary' + ast.operator](left, right, context);
    case AST.ConditionalExpression:
      return this['ternary?:'](
        this.recurse(ast.test),
        this.recurse(ast.alternate),
        this.recurse(ast.consequent),
        context
      );
    case AST.Identifier:
      return self.identifier(ast.name, context, create);
    case AST.MemberExpression:
      left = this.recurse(ast.object, false, !!create);
      if (!ast.computed) {
        right = ast.property.name;
      }
      if (ast.computed) right = this.recurse(ast.property);
      return ast.computed ?
        this.computedMember(left, right, context, create) :
        this.nonComputedMember(left, right, context, create);
    case AST.CallExpression:
      args = [];
      forEach(ast.arguments, function(expr) {
        args.push(self.recurse(expr));
      });
      if (ast.filter) right = this.$filter(ast.callee.name);
      if (!ast.filter) right = this.recurse(ast.callee, true);
      return ast.filter ?
        function(scope, locals, assign, inputs) {
          var values = [];
          for (var i = 0; i < args.length; ++i) {
            values.push(args[i](scope, locals, assign, inputs));
          }
          var value = right.apply(undefined, values, inputs);
          return context ? {context: undefined, name: undefined, value: value} : value;
        } :
        function(scope, locals, assign, inputs) {
          var rhs = right(scope, locals, assign, inputs);
          var value;
          if (rhs.value != null) {
            var values = [];
            for (var i = 0; i < args.length; ++i) {
              values.push(args[i](scope, locals, assign, inputs));
            }
            value = rhs.value.apply(rhs.context, values);
          }
          return context ? {value: value} : value;
        };
    case AST.AssignmentExpression:
      left = this.recurse(ast.left, true, 1);
      right = this.recurse(ast.right);
      return function(scope, locals, assign, inputs) {
        var lhs = left(scope, locals, assign, inputs);
        var rhs = right(scope, locals, assign, inputs);
        lhs.context[lhs.name] = rhs;
        return context ? {value: rhs} : rhs;
      };
    case AST.ArrayExpression:
      args = [];
      forEach(ast.elements, function(expr) {
        args.push(self.recurse(expr));
      });
      return function(scope, locals, assign, inputs) {
        var value = [];
        for (var i = 0; i < args.length; ++i) {
          value.push(args[i](scope, locals, assign, inputs));
        }
        return context ? {value: value} : value;
      };
    case AST.ObjectExpression:
      args = [];
      forEach(ast.properties, function(property) {
        if (property.computed) {
          args.push({key: self.recurse(property.key),
                     computed: true,
                     value: self.recurse(property.value)
          });
        } else {
          args.push({key: property.key.type === AST.Identifier ?
                          property.key.name :
                          ('' + property.key.value),
                     computed: false,
                     value: self.recurse(property.value)
          });
        }
      });
      return function(scope, locals, assign, inputs) {
        var value = {};
        for (var i = 0; i < args.length; ++i) {
          if (args[i].computed) {
            value[args[i].key(scope, locals, assign, inputs)] = args[i].value(scope, locals, assign, inputs);
          } else {
            value[args[i].key] = args[i].value(scope, locals, assign, inputs);
          }
        }
        return context ? {value: value} : value;
      };
    case AST.ThisExpression:
      return function(scope) {
        return context ? {value: scope} : scope;
      };
    case AST.LocalsExpression:
      return function(scope, locals) {
        return context ? {value: locals} : locals;
      };
    case AST.NGValueParameter:
      return function(scope, locals, assign) {
        return context ? {value: assign} : assign;
      };
    }
  },

  'unary+': function(argument, context) {
    return function(scope, locals, assign, inputs) {
      var arg = argument(scope, locals, assign, inputs);
      if (isDefined(arg)) {
        arg = +arg;
      } else {
        arg = 0;
      }
      return context ? {value: arg} : arg;
    };
  },
  'unary-': function(argument, context) {
    return function(scope, locals, assign, inputs) {
      var arg = argument(scope, locals, assign, inputs);
      if (isDefined(arg)) {
        arg = -arg;
      } else {
        arg = -0;
      }
      return context ? {value: arg} : arg;
    };
  },
  'unary!': function(argument, context) {
    return function(scope, locals, assign, inputs) {
      var arg = !argument(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary+': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var lhs = left(scope, locals, assign, inputs);
      var rhs = right(scope, locals, assign, inputs);
      var arg = plusFn(lhs, rhs);
      return context ? {value: arg} : arg;
    };
  },
  'binary-': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var lhs = left(scope, locals, assign, inputs);
      var rhs = right(scope, locals, assign, inputs);
      var arg = (isDefined(lhs) ? lhs : 0) - (isDefined(rhs) ? rhs : 0);
      return context ? {value: arg} : arg;
    };
  },
  'binary*': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) * right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary/': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) / right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary%': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) % right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary===': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) === right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary!==': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) !== right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary==': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      // eslint-disable-next-line eqeqeq
      var arg = left(scope, locals, assign, inputs) == right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary!=': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      // eslint-disable-next-line eqeqeq
      var arg = left(scope, locals, assign, inputs) != right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary<': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) < right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary>': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) > right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary<=': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) <= right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary>=': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) >= right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary&&': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) && right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'binary||': function(left, right, context) {
    return function(scope, locals, assign, inputs) {
      var arg = left(scope, locals, assign, inputs) || right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  'ternary?:': function(test, alternate, consequent, context) {
    return function(scope, locals, assign, inputs) {
      var arg = test(scope, locals, assign, inputs) ? alternate(scope, locals, assign, inputs) : consequent(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  },
  value: function(value, context) {
    return function() { return context ? {context: undefined, name: undefined, value: value} : value; };
  },
  identifier: function(name, context, create) {
    return function(scope, locals, assign, inputs) {
      var base = locals && (name in locals) ? locals : scope;
      if (create && create !== 1 && base && base[name] == null) {
        base[name] = {};
      }
      var value = base ? base[name] : undefined;
      if (context) {
        return {context: base, name: name, value: value};
      } else {
        return value;
      }
    };
  },
  computedMember: function(left, right, context, create) {
    return function(scope, locals, assign, inputs) {
      var lhs = left(scope, locals, assign, inputs);
      var rhs;
      var value;
      if (lhs != null) {
        rhs = right(scope, locals, assign, inputs);
        rhs = getStringValue(rhs);
        if (create && create !== 1) {
          if (lhs && !(lhs[rhs])) {
            lhs[rhs] = {};
          }
        }
        value = lhs[rhs];
      }
      if (context) {
        return {context: lhs, name: rhs, value: value};
      } else {
        return value;
      }
    };
  },
  nonComputedMember: function(left, right, context, create) {
    return function(scope, locals, assign, inputs) {
      var lhs = left(scope, locals, assign, inputs);
      if (create && create !== 1) {
        if (lhs && lhs[right] == null) {
          lhs[right] = {};
        }
      }
      var value = lhs != null ? lhs[right] : undefined;
      if (context) {
        return {context: lhs, name: right, value: value};
      } else {
        return value;
      }
    };
  },
  inputs: function(input, watchId) {
    return function(scope, value, locals, inputs) {
      if (inputs) return inputs[watchId];
      return input(scope, value, locals);
    };
  }
};

/**
 * @constructor
 */
function Parser(lexer, $filter, options) {
  this.ast = new AST(lexer, options);
  this.astCompiler = options.csp ? new ASTInterpreter($filter) :
                                   new ASTCompiler($filter);
}

Parser.prototype = {
  constructor: Parser,

  parse: function(text) {
    var ast = this.ast.ast(text);
    var fn = this.astCompiler.compile(ast);
    fn.literal = isLiteral(ast);
    fn.constant = isConstant(ast);
    return fn;
  }
};

function getValueOf(value) {
  return isFunction(value.valueOf) ? value.valueOf() : objectValueOf.call(value);
}

///////////////////////////////////

/**
 * @ngdoc service
 * @name $parse
 * @kind function
 *
 * @description
 *
 * Converts Angular {@link guide/expression expression} into a function.
 *
 * ```js
 *   var getter = $parse('user.name');
 *   var setter = getter.assign;
 *   var context = {user:{name:'angular'}};
 *   var locals = {user:{name:'local'}};
 *
 *   expect(getter(context)).toEqual('angular');
 *   setter(context, 'newValue');
 *   expect(context.user.name).toEqual('newValue');
 *   expect(getter(context, locals)).toEqual('local');
 * ```
 *
 *
 * @param {string} expression String expression to compile.
 * @returns {function(context, locals)} a function which represents the compiled expression:
 *
 *    * `context` – `{object}` – an object against which any expressions embedded in the strings
 *      are evaluated against (typically a scope object).
 *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
 *      `context`.
 *
 *    The returned function also has the following properties:
 *      * `literal` – `{boolean}` – whether the expression's top-level node is a JavaScript
 *        literal.
 *      * `constant` – `{boolean}` – whether the expression is made entirely of JavaScript
 *        constant literals.
 *      * `assign` – `{?function(context, value)}` – if the expression is assignable, this will be
 *        set to a function to change its value on the given context.
 *
 */


/**
 * @ngdoc provider
 * @name $parseProvider
 * @this
 *
 * @description
 * `$parseProvider` can be used for configuring the default behavior of the {@link ng.$parse $parse}
 *  service.
 */
function $ParseProvider() {
  var cache = createMap();
  var literals = {
    'true': true,
    'false': false,
    'null': null,
    'undefined': undefined
  };
  var identStart, identContinue;

  /**
   * @ngdoc method
   * @name $parseProvider#addLiteral
   * @description
   *
   * Configure $parse service to add literal values that will be present as literal at expressions.
   *
   * @param {string} literalName Token for the literal value. The literal name value must be a valid literal name.
   * @param {*} literalValue Value for this literal. All literal values must be primitives or `undefined`.
   *
   **/
  this.addLiteral = function(literalName, literalValue) {
    literals[literalName] = literalValue;
  };

 /**
  * @ngdoc method
  * @name $parseProvider#setIdentifierFns
  *
  * @description
  *
  * Allows defining the set of characters that are allowed in Angular expressions. The function
  * `identifierStart` will get called to know if a given character is a valid character to be the
  * first character for an identifier. The function `identifierContinue` will get called to know if
  * a given character is a valid character to be a follow-up identifier character. The functions
  * `identifierStart` and `identifierContinue` will receive as arguments the single character to be
  * identifier and the character code point. These arguments will be `string` and `numeric`. Keep in
  * mind that the `string` parameter can be two characters long depending on the character
  * representation. It is expected for the function to return `true` or `false`, whether that
  * character is allowed or not.
  *
  * Since this function will be called extensively, keep the implementation of these functions fast,
  * as the performance of these functions have a direct impact on the expressions parsing speed.
  *
  * @param {function=} identifierStart The function that will decide whether the given character is
  *   a valid identifier start character.
  * @param {function=} identifierContinue The function that will decide whether the given character is
  *   a valid identifier continue character.
  */
  this.setIdentifierFns = function(identifierStart, identifierContinue) {
    identStart = identifierStart;
    identContinue = identifierContinue;
    return this;
  };

  this.$get = ['$filter', function($filter) {
    var noUnsafeEval = csp().noUnsafeEval;
    var $parseOptions = {
          csp: noUnsafeEval,
          literals: copy(literals),
          isIdentifierStart: isFunction(identStart) && identStart,
          isIdentifierContinue: isFunction(identContinue) && identContinue
        };
    return $parse;

    function $parse(exp, interceptorFn) {
      var parsedExpression, oneTime, cacheKey;

      switch (typeof exp) {
        case 'string':
          exp = exp.trim();
          cacheKey = exp;

          parsedExpression = cache[cacheKey];

          if (!parsedExpression) {
            if (exp.charAt(0) === ':' && exp.charAt(1) === ':') {
              oneTime = true;
              exp = exp.substring(2);
            }
            var lexer = new Lexer($parseOptions);
            var parser = new Parser(lexer, $filter, $parseOptions);
            parsedExpression = parser.parse(exp);
            if (parsedExpression.constant) {
              parsedExpression.$$watchDelegate = constantWatchDelegate;
            } else if (oneTime) {
              parsedExpression.oneTime = true;
              parsedExpression.$$watchDelegate = oneTimeWatchDelegate;
            } else if (parsedExpression.inputs) {
              parsedExpression.$$watchDelegate = inputsWatchDelegate;
            }
            cache[cacheKey] = parsedExpression;
          }
          return addInterceptor(parsedExpression, interceptorFn);

        case 'function':
          return addInterceptor(exp, interceptorFn);

        default:
          return addInterceptor(noop, interceptorFn);
      }
    }

    function expressionInputDirtyCheck(newValue, oldValueOfValue, compareObjectIdentity) {

      if (newValue == null || oldValueOfValue == null) { // null/undefined
        return newValue === oldValueOfValue;
      }

      if (typeof newValue === 'object') {

        // attempt to convert the value to a primitive type
        // TODO(docs): add a note to docs that by implementing valueOf even objects and arrays can
        //             be cheaply dirty-checked
        newValue = getValueOf(newValue);

        if (typeof newValue === 'object' && !compareObjectIdentity) {
          // objects/arrays are not supported - deep-watching them would be too expensive
          return false;
        }

        // fall-through to the primitive equality check
      }

      //Primitive or NaN
      // eslint-disable-next-line no-self-compare
      return newValue === oldValueOfValue || (newValue !== newValue && oldValueOfValue !== oldValueOfValue);
    }

    function inputsWatchDelegate(scope, listener, objectEquality, parsedExpression, prettyPrintExpression) {
      var inputExpressions = parsedExpression.inputs;
      var lastResult;

      if (inputExpressions.length === 1) {
        var oldInputValueOf = expressionInputDirtyCheck; // init to something unique so that equals check fails
        inputExpressions = inputExpressions[0];
        return scope.$watch(function expressionInputWatch(scope) {
          var newInputValue = inputExpressions(scope);
          if (!expressionInputDirtyCheck(newInputValue, oldInputValueOf, parsedExpression.literal)) {
            lastResult = parsedExpression(scope, undefined, undefined, [newInputValue]);
            oldInputValueOf = newInputValue && getValueOf(newInputValue);
          }
          return lastResult;
        }, listener, objectEquality, prettyPrintExpression);
      }

      var oldInputValueOfValues = [];
      var oldInputValues = [];
      for (var i = 0, ii = inputExpressions.length; i < ii; i++) {
        oldInputValueOfValues[i] = expressionInputDirtyCheck; // init to something unique so that equals check fails
        oldInputValues[i] = null;
      }

      return scope.$watch(function expressionInputsWatch(scope) {
        var changed = false;

        for (var i = 0, ii = inputExpressions.length; i < ii; i++) {
          var newInputValue = inputExpressions[i](scope);
          if (changed || (changed = !expressionInputDirtyCheck(newInputValue, oldInputValueOfValues[i], parsedExpression.literal))) {
            oldInputValues[i] = newInputValue;
            oldInputValueOfValues[i] = newInputValue && getValueOf(newInputValue);
          }
        }

        if (changed) {
          lastResult = parsedExpression(scope, undefined, undefined, oldInputValues);
        }

        return lastResult;
      }, listener, objectEquality, prettyPrintExpression);
    }

    function oneTimeWatchDelegate(scope, listener, objectEquality, parsedExpression, prettyPrintExpression) {
      var isDone = parsedExpression.literal ? isAllDefined : isDefined;
      var unwatch, lastValue;
      if (parsedExpression.inputs) {
        unwatch = inputsWatchDelegate(scope, oneTimeListener, objectEquality, parsedExpression, prettyPrintExpression);
      } else {
        unwatch = scope.$watch(oneTimeWatch, oneTimeListener, objectEquality);
      }
      return unwatch;

      function oneTimeWatch(scope) {
        return parsedExpression(scope);
      }
      function oneTimeListener(value, old, scope) {
        lastValue = value;
        if (isFunction(listener)) {
          listener(value, old, scope);
        }
        if (isDone(value)) {
          scope.$$postDigest(function() {
            if (isDone(lastValue)) {
              unwatch();
            }
          });
        }
      }
    }

    function isAllDefined(value) {
      var allDefined = true;
      forEach(value, function(val) {
        if (!isDefined(val)) allDefined = false;
      });
      return allDefined;
    }

    function constantWatchDelegate(scope, listener, objectEquality, parsedExpression) {
      var unwatch = scope.$watch(function constantWatch(scope) {
        unwatch();
        return parsedExpression(scope);
      }, listener, objectEquality);
      return unwatch;
    }

    function addInterceptor(parsedExpression, interceptorFn) {
      if (!interceptorFn) return parsedExpression;
      var watchDelegate = parsedExpression.$$watchDelegate;
      var useInputs = false;

      var isDone = parsedExpression.literal ? isAllDefined : isDefined;

      function regularInterceptedExpression(scope, locals, assign, inputs) {
        var value = useInputs && inputs ? inputs[0] : parsedExpression(scope, locals, assign, inputs);
        return interceptorFn(value, scope, locals);
      }

      function oneTimeInterceptedExpression(scope, locals, assign, inputs) {
        var value = useInputs && inputs ? inputs[0] : parsedExpression(scope, locals, assign, inputs);
        var result = interceptorFn(value, scope, locals);
        // we only return the interceptor's result if the
        // initial value is defined (for bind-once)
        return isDone(value) ? result : value;
      }

      var fn = parsedExpression.oneTime ? oneTimeInterceptedExpression : regularInterceptedExpression;

      // Propogate the literal/oneTime attributes
      fn.literal = parsedExpression.literal;
      fn.oneTime = parsedExpression.oneTime;

      // Propagate or create inputs / $$watchDelegates
      useInputs = !parsedExpression.inputs;
      if (watchDelegate && watchDelegate !== inputsWatchDelegate) {
        fn.$$watchDelegate = watchDelegate;
        fn.inputs = parsedExpression.inputs;
      } else if (!interceptorFn.$stateful) {
        // If there is an interceptor, but no watchDelegate then treat the interceptor like
        // we treat filters - it is assumed to be a pure function unless flagged with $stateful
        fn.$$watchDelegate = inputsWatchDelegate;
        fn.inputs = parsedExpression.inputs ? parsedExpression.inputs : [parsedExpression];
      }

      return fn;
    }
  }];
}

/**
 * @ngdoc service
 * @name $q
 * @requires $rootScope
 *
 * @description
 * A service that helps you run functions asynchronously, and use their return values (or exceptions)
 * when they are done processing.
 *
 * This is a [Promises/A+](https://promisesaplus.com/)-compliant implementation of promises/deferred
 * objects inspired by [Kris Kowal's Q](https://github.com/kriskowal/q).
 *
 * $q can be used in two fashions --- one which is more similar to Kris Kowal's Q or jQuery's Deferred
 * implementations, and the other which resembles ES6 (ES2015) promises to some degree.
 *
 * # $q constructor
 *
 * The streamlined ES6 style promise is essentially just using $q as a constructor which takes a `resolver`
 * function as the first argument. This is similar to the native Promise implementation from ES6,
 * see [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
 *
 * While the constructor-style use is supported, not all of the supporting methods from ES6 promises are
 * available yet.
 *
 * It can be used like so:
 *
 * ```js
 *   // for the purpose of this example let's assume that variables `$q` and `okToGreet`
 *   // are available in the current lexical scope (they could have been injected or passed in).
 *
 *   function asyncGreet(name) {
 *     // perform some asynchronous operation, resolve or reject the promise when appropriate.
 *     return $q(function(resolve, reject) {
 *       setTimeout(function() {
 *         if (okToGreet(name)) {
 *           resolve('Hello, ' + name + '!');
 *         } else {
 *           reject('Greeting ' + name + ' is not allowed.');
 *         }
 *       }, 1000);
 *     });
 *   }
 *
 *   var promise = asyncGreet('Robin Hood');
 *   promise.then(function(greeting) {
 *     alert('Success: ' + greeting);
 *   }, function(reason) {
 *     alert('Failed: ' + reason);
 *   });
 * ```
 *
 * Note: progress/notify callbacks are not currently supported via the ES6-style interface.
 *
 * Note: unlike ES6 behavior, an exception thrown in the constructor function will NOT implicitly reject the promise.
 *
 * However, the more traditional CommonJS-style usage is still available, and documented below.
 *
 * [The CommonJS Promise proposal](http://wiki.commonjs.org/wiki/Promises) describes a promise as an
 * interface for interacting with an object that represents the result of an action that is
 * performed asynchronously, and may or may not be finished at any given point in time.
 *
 * From the perspective of dealing with error handling, deferred and promise APIs are to
 * asynchronous programming what `try`, `catch` and `throw` keywords are to synchronous programming.
 *
 * ```js
 *   // for the purpose of this example let's assume that variables `$q` and `okToGreet`
 *   // are available in the current lexical scope (they could have been injected or passed in).
 *
 *   function asyncGreet(name) {
 *     var deferred = $q.defer();
 *
 *     setTimeout(function() {
 *       deferred.notify('About to greet ' + name + '.');
 *
 *       if (okToGreet(name)) {
 *         deferred.resolve('Hello, ' + name + '!');
 *       } else {
 *         deferred.reject('Greeting ' + name + ' is not allowed.');
 *       }
 *     }, 1000);
 *
 *     return deferred.promise;
 *   }
 *
 *   var promise = asyncGreet('Robin Hood');
 *   promise.then(function(greeting) {
 *     alert('Success: ' + greeting);
 *   }, function(reason) {
 *     alert('Failed: ' + reason);
 *   }, function(update) {
 *     alert('Got notification: ' + update);
 *   });
 * ```
 *
 * At first it might not be obvious why this extra complexity is worth the trouble. The payoff
 * comes in the way of guarantees that promise and deferred APIs make, see
 * https://github.com/kriskowal/uncommonjs/blob/master/promises/specification.md.
 *
 * Additionally the promise api allows for composition that is very hard to do with the
 * traditional callback ([CPS](http://en.wikipedia.org/wiki/Continuation-passing_style)) approach.
 * For more on this please see the [Q documentation](https://github.com/kriskowal/q) especially the
 * section on serial or parallel joining of promises.
 *
 * # The Deferred API
 *
 * A new instance of deferred is constructed by calling `$q.defer()`.
 *
 * The purpose of the deferred object is to expose the associated Promise instance as well as APIs
 * that can be used for signaling the successful or unsuccessful completion, as well as the status
 * of the task.
 *
 * **Methods**
 *
 * - `resolve(value)` – resolves the derived promise with the `value`. If the value is a rejection
 *   constructed via `$q.reject`, the promise will be rejected instead.
 * - `reject(reason)` – rejects the derived promise with the `reason`. This is equivalent to
 *   resolving it with a rejection constructed via `$q.reject`.
 * - `notify(value)` - provides updates on the status of the promise's execution. This may be called
 *   multiple times before the promise is either resolved or rejected.
 *
 * **Properties**
 *
 * - promise – `{Promise}` – promise object associated with this deferred.
 *
 *
 * # The Promise API
 *
 * A new promise instance is created when a deferred instance is created and can be retrieved by
 * calling `deferred.promise`.
 *
 * The purpose of the promise object is to allow for interested parties to get access to the result
 * of the deferred task when it completes.
 *
 * **Methods**
 *
 * - `then(successCallback, [errorCallback], [notifyCallback])` – regardless of when the promise was or
 *   will be resolved or rejected, `then` calls one of the success or error callbacks asynchronously
 *   as soon as the result is available. The callbacks are called with a single argument: the result
 *   or rejection reason. Additionally, the notify callback may be called zero or more times to
 *   provide a progress indication, before the promise is resolved or rejected.
 *
 *   This method *returns a new promise* which is resolved or rejected via the return value of the
 *   `successCallback`, `errorCallback` (unless that value is a promise, in which case it is resolved
 *   with the value which is resolved in that promise using
 *   [promise chaining](http://www.html5rocks.com/en/tutorials/es6/promises/#toc-promises-queues)).
 *   It also notifies via the return value of the `notifyCallback` method. The promise cannot be
 *   resolved or rejected from the notifyCallback method. The errorCallback and notifyCallback
 *   arguments are optional.
 *
 * - `catch(errorCallback)` – shorthand for `promise.then(null, errorCallback)`
 *
 * - `finally(callback, notifyCallback)` – allows you to observe either the fulfillment or rejection of a promise,
 *   but to do so without modifying the final value. This is useful to release resources or do some
 *   clean-up that needs to be done whether the promise was rejected or resolved. See the [full
 *   specification](https://github.com/kriskowal/q/wiki/API-Reference#promisefinallycallback) for
 *   more information.
 *
 * # Chaining promises
 *
 * Because calling the `then` method of a promise returns a new derived promise, it is easily
 * possible to create a chain of promises:
 *
 * ```js
 *   promiseB = promiseA.then(function(result) {
 *     return result + 1;
 *   });
 *
 *   // promiseB will be resolved immediately after promiseA is resolved and its value
 *   // will be the result of promiseA incremented by 1
 * ```
 *
 * It is possible to create chains of any length and since a promise can be resolved with another
 * promise (which will defer its resolution further), it is possible to pause/defer resolution of
 * the promises at any point in the chain. This makes it possible to implement powerful APIs like
 * $http's response interceptors.
 *
 *
 * # Differences between Kris Kowal's Q and $q
 *
 *  There are two main differences:
 *
 * - $q is integrated with the {@link ng.$rootScope.Scope} Scope model observation
 *   mechanism in angular, which means faster propagation of resolution or rejection into your
 *   models and avoiding unnecessary browser repaints, which would result in flickering UI.
 * - Q has many more features than $q, but that comes at a cost of bytes. $q is tiny, but contains
 *   all the important functionality needed for common async tasks.
 *
 * # Testing
 *
 *  ```js
 *    it('should simulate promise', inject(function($q, $rootScope) {
 *      var deferred = $q.defer();
 *      var promise = deferred.promise;
 *      var resolvedValue;
 *
 *      promise.then(function(value) { resolvedValue = value; });
 *      expect(resolvedValue).toBeUndefined();
 *
 *      // Simulate resolving of promise
 *      deferred.resolve(123);
 *      // Note that the 'then' function does not get called synchronously.
 *      // This is because we want the promise API to always be async, whether or not
 *      // it got called synchronously or asynchronously.
 *      expect(resolvedValue).toBeUndefined();
 *
 *      // Propagate promise resolution to 'then' functions using $apply().
 *      $rootScope.$apply();
 *      expect(resolvedValue).toEqual(123);
 *    }));
 *  ```
 *
 * @param {function(function, function)} resolver Function which is responsible for resolving or
 *   rejecting the newly created promise. The first parameter is a function which resolves the
 *   promise, the second parameter is a function which rejects the promise.
 *
 * @returns {Promise} The newly created promise.
 */
/**
 * @ngdoc provider
 * @name $qProvider
 * @this
 *
 * @description
 */
function $QProvider() {
  var errorOnUnhandledRejections = true;
  this.$get = ['$rootScope', '$exceptionHandler', function($rootScope, $exceptionHandler) {
    return qFactory(function(callback) {
      $rootScope.$evalAsync(callback);
    }, $exceptionHandler, errorOnUnhandledRejections);
  }];

  /**
   * @ngdoc method
   * @name $qProvider#errorOnUnhandledRejections
   * @kind function
   *
   * @description
   * Retrieves or overrides whether to generate an error when a rejected promise is not handled.
   * This feature is enabled by default.
   *
   * @param {boolean=} value Whether to generate an error when a rejected promise is not handled.
   * @returns {boolean|ng.$qProvider} Current value when called without a new value or self for
   *    chaining otherwise.
   */
  this.errorOnUnhandledRejections = function(value) {
    if (isDefined(value)) {
      errorOnUnhandledRejections = value;
      return this;
    } else {
      return errorOnUnhandledRejections;
    }
  };
}

/** @this */
function $$QProvider() {
  var errorOnUnhandledRejections = true;
  this.$get = ['$browser', '$exceptionHandler', function($browser, $exceptionHandler) {
    return qFactory(function(callback) {
      $browser.defer(callback);
    }, $exceptionHandler, errorOnUnhandledRejections);
  }];

  this.errorOnUnhandledRejections = function(value) {
    if (isDefined(value)) {
      errorOnUnhandledRejections = value;
      return this;
    } else {
      return errorOnUnhandledRejections;
    }
  };
}

/**
 * Constructs a promise manager.
 *
 * @param {function(function)} nextTick Function for executing functions in the next turn.
 * @param {function(...*)} exceptionHandler Function into which unexpected exceptions are passed for
 *     debugging purposes.
 @ param {=boolean} errorOnUnhandledRejections Whether an error should be generated on unhandled
 *     promises rejections.
 * @returns {object} Promise manager.
 */
function qFactory(nextTick, exceptionHandler, errorOnUnhandledRejections) {
  var $qMinErr = minErr('$q', TypeError);
  var queueSize = 0;
  var checkQueue = [];

  /**
   * @ngdoc method
   * @name ng.$q#defer
   * @kind function
   *
   * @description
   * Creates a `Deferred` object which represents a task which will finish in the future.
   *
   * @returns {Deferred} Returns a new instance of deferred.
   */
  function defer() {
    return new Deferred();
  }

  function Deferred() {
    var promise = this.promise = new Promise();
    //Non prototype methods necessary to support unbound execution :/
    this.resolve = function(val) { resolvePromise(promise, val); };
    this.reject = function(reason) { rejectPromise(promise, reason); };
    this.notify = function(progress) { notifyPromise(promise, progress); };
  }


  function Promise() {
    this.$$state = { status: 0 };
  }

  extend(Promise.prototype, {
    then: function(onFulfilled, onRejected, progressBack) {
      if (isUndefined(onFulfilled) && isUndefined(onRejected) && isUndefined(progressBack)) {
        return this;
      }
      var result = new Promise();

      this.$$state.pending = this.$$state.pending || [];
      this.$$state.pending.push([result, onFulfilled, onRejected, progressBack]);
      if (this.$$state.status > 0) scheduleProcessQueue(this.$$state);

      return result;
    },

    'catch': function(callback) {
      return this.then(null, callback);
    },

    'finally': function(callback, progressBack) {
      return this.then(function(value) {
        return handleCallback(value, resolve, callback);
      }, function(error) {
        return handleCallback(error, reject, callback);
      }, progressBack);
    }
  });

  function processQueue(state) {
    var fn, promise, pending;

    pending = state.pending;
    state.processScheduled = false;
    state.pending = undefined;
    try {
      for (var i = 0, ii = pending.length; i < ii; ++i) {
        state.pur = true;
        promise = pending[i][0];
        fn = pending[i][state.status];
        try {
          if (isFunction(fn)) {
            resolvePromise(promise, fn(state.value));
          } else if (state.status === 1) {
            resolvePromise(promise, state.value);
          } else {
            rejectPromise(promise, state.value);
          }
        } catch (e) {
          rejectPromise(promise, e);
        }
      }
    } finally {
      --queueSize;
      if (errorOnUnhandledRejections && queueSize === 0) {
        nextTick(processChecks);
      }
    }
  }

  function processChecks() {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!queueSize && checkQueue.length) {
      var toCheck = checkQueue.shift();
      if (!toCheck.pur) {
        toCheck.pur = true;
        var errorMessage = 'Possibly unhandled rejection: ' + toDebugString(toCheck.value);
        if (toCheck.value instanceof Error) {
          exceptionHandler(toCheck.value, errorMessage);
        } else {
          exceptionHandler(errorMessage);
        }
      }
    }
  }

  function scheduleProcessQueue(state) {
    if (errorOnUnhandledRejections && !state.pending && state.status === 2 && !state.pur) {
      if (queueSize === 0 && checkQueue.length === 0) {
        nextTick(processChecks);
      }
      checkQueue.push(state);
    }
    if (state.processScheduled || !state.pending) return;
    state.processScheduled = true;
    ++queueSize;
    nextTick(function() { processQueue(state); });
  }

  function resolvePromise(promise, val) {
    if (promise.$$state.status) return;
    if (val === promise) {
      $$reject(promise, $qMinErr(
        'qcycle',
        'Expected promise to be resolved with value other than itself \'{0}\'',
        val));
    } else {
      $$resolve(promise, val);
    }

  }

  function $$resolve(promise, val) {
    var then;
    var done = false;
    try {
      if (isObject(val) || isFunction(val)) then = val.then;
      if (isFunction(then)) {
        promise.$$state.status = -1;
        then.call(val, doResolve, doReject, doNotify);
      } else {
        promise.$$state.value = val;
        promise.$$state.status = 1;
        scheduleProcessQueue(promise.$$state);
      }
    } catch (e) {
      doReject(e);
    }

    function doResolve(val) {
      if (done) return;
      done = true;
      $$resolve(promise, val);
    }
    function doReject(val) {
      if (done) return;
      done = true;
      $$reject(promise, val);
    }
    function doNotify(progress) {
      notifyPromise(promise, progress);
    }
  }

  function rejectPromise(promise, reason) {
    if (promise.$$state.status) return;
    $$reject(promise, reason);
  }

  function $$reject(promise, reason) {
    promise.$$state.value = reason;
    promise.$$state.status = 2;
    scheduleProcessQueue(promise.$$state);
  }

  function notifyPromise(promise, progress) {
    var callbacks = promise.$$state.pending;

    if ((promise.$$state.status <= 0) && callbacks && callbacks.length) {
      nextTick(function() {
        var callback, result;
        for (var i = 0, ii = callbacks.length; i < ii; i++) {
          result = callbacks[i][0];
          callback = callbacks[i][3];
          try {
            notifyPromise(result, isFunction(callback) ? callback(progress) : progress);
          } catch (e) {
            exceptionHandler(e);
          }
        }
      });
    }
  }

  /**
   * @ngdoc method
   * @name $q#reject
   * @kind function
   *
   * @description
   * Creates a promise that is resolved as rejected with the specified `reason`. This api should be
   * used to forward rejection in a chain of promises. If you are dealing with the last promise in
   * a promise chain, you don't need to worry about it.
   *
   * When comparing deferreds/promises to the familiar behavior of try/catch/throw, think of
   * `reject` as the `throw` keyword in JavaScript. This also means that if you "catch" an error via
   * a promise error callback and you want to forward the error to the promise derived from the
   * current promise, you have to "rethrow" the error by returning a rejection constructed via
   * `reject`.
   *
   * ```js
   *   promiseB = promiseA.then(function(result) {
   *     // success: do something and resolve promiseB
   *     //          with the old or a new result
   *     return result;
   *   }, function(reason) {
   *     // error: handle the error if possible and
   *     //        resolve promiseB with newPromiseOrValue,
   *     //        otherwise forward the rejection to promiseB
   *     if (canHandle(reason)) {
   *      // handle the error and recover
   *      return newPromiseOrValue;
   *     }
   *     return $q.reject(reason);
   *   });
   * ```
   *
   * @param {*} reason Constant, message, exception or an object representing the rejection reason.
   * @returns {Promise} Returns a promise that was already resolved as rejected with the `reason`.
   */
  function reject(reason) {
    var result = new Promise();
    rejectPromise(result, reason);
    return result;
  }

  function handleCallback(value, resolver, callback) {
    var callbackOutput = null;
    try {
      if (isFunction(callback)) callbackOutput = callback();
    } catch (e) {
      return reject(e);
    }
    if (isPromiseLike(callbackOutput)) {
      return callbackOutput.then(function() {
        return resolver(value);
      }, reject);
    } else {
      return resolver(value);
    }
  }

  /**
   * @ngdoc method
   * @name $q#when
   * @kind function
   *
   * @description
   * Wraps an object that might be a value or a (3rd party) then-able promise into a $q promise.
   * This is useful when you are dealing with an object that might or might not be a promise, or if
   * the promise comes from a source that can't be trusted.
   *
   * @param {*} value Value or a promise
   * @param {Function=} successCallback
   * @param {Function=} errorCallback
   * @param {Function=} progressCallback
   * @returns {Promise} Returns a promise of the passed value or promise
   */


  function when(value, callback, errback, progressBack) {
    var result = new Promise();
    resolvePromise(result, value);
    return result.then(callback, errback, progressBack);
  }

  /**
   * @ngdoc method
   * @name $q#resolve
   * @kind function
   *
   * @description
   * Alias of {@link ng.$q#when when} to maintain naming consistency with ES6.
   *
   * @param {*} value Value or a promise
   * @param {Function=} successCallback
   * @param {Function=} errorCallback
   * @param {Function=} progressCallback
   * @returns {Promise} Returns a promise of the passed value or promise
   */
  var resolve = when;

  /**
   * @ngdoc method
   * @name $q#all
   * @kind function
   *
   * @description
   * Combines multiple promises into a single promise that is resolved when all of the input
   * promises are resolved.
   *
   * @param {Array.<Promise>|Object.<Promise>} promises An array or hash of promises.
   * @returns {Promise} Returns a single promise that will be resolved with an array/hash of values,
   *   each value corresponding to the promise at the same index/key in the `promises` array/hash.
   *   If any of the promises is resolved with a rejection, this resulting promise will be rejected
   *   with the same rejection value.
   */

  function all(promises) {
    var result = new Promise(),
        counter = 0,
        results = isArray(promises) ? [] : {};

    forEach(promises, function(promise, key) {
      counter++;
      when(promise).then(function(value) {
        results[key] = value;
        if (!(--counter)) resolvePromise(result, results);
      }, function(reason) {
        rejectPromise(result, reason);
      });
    });

    if (counter === 0) {
      resolvePromise(result, results);
    }

    return result;
  }

  /**
   * @ngdoc method
   * @name $q#race
   * @kind function
   *
   * @description
   * Returns a promise that resolves or rejects as soon as one of those promises
   * resolves or rejects, with the value or reason from that promise.
   *
   * @param {Array.<Promise>|Object.<Promise>} promises An array or hash of promises.
   * @returns {Promise} a promise that resolves or rejects as soon as one of the `promises`
   * resolves or rejects, with the value or reason from that promise.
   */

  function race(promises) {
    var deferred = defer();

    forEach(promises, function(promise) {
      when(promise).then(deferred.resolve, deferred.reject);
    });

    return deferred.promise;
  }

  function $Q(resolver) {
    if (!isFunction(resolver)) {
      throw $qMinErr('norslvr', 'Expected resolverFn, got \'{0}\'', resolver);
    }

    var promise = new Promise();

    function resolveFn(value) {
      resolvePromise(promise, value);
    }

    function rejectFn(reason) {
      rejectPromise(promise, reason);
    }

    resolver(resolveFn, rejectFn);

    return promise;
  }

  // Let's make the instanceof operator work for promises, so that
  // `new $q(fn) instanceof $q` would evaluate to true.
  $Q.prototype = Promise.prototype;

  $Q.defer = defer;
  $Q.reject = reject;
  $Q.when = when;
  $Q.resolve = resolve;
  $Q.all = all;
  $Q.race = race;

  return $Q;
}

/** @this */
function $$RAFProvider() { //rAF
  this.$get = ['$window', '$timeout', function($window, $timeout) {
    var requestAnimationFrame = $window.requestAnimationFrame ||
                                $window.webkitRequestAnimationFrame;

    var cancelAnimationFrame = $window.cancelAnimationFrame ||
                               $window.webkitCancelAnimationFrame ||
                               $window.webkitCancelRequestAnimationFrame;

    var rafSupported = !!requestAnimationFrame;
    var raf = rafSupported
      ? function(fn) {
          var id = requestAnimationFrame(fn);
          return function() {
            cancelAnimationFrame(id);
          };
        }
      : function(fn) {
          var timer = $timeout(fn, 16.66, false); // 1000 / 60 = 16.666
          return function() {
            $timeout.cancel(timer);
          };
        };

    raf.supported = rafSupported;

    return raf;
  }];
}

/**
 * DESIGN NOTES
 *
 * The design decisions behind the scope are heavily favored for speed and memory consumption.
 *
 * The typical use of scope is to watch the expressions, which most of the time return the same
 * value as last time so we optimize the operation.
 *
 * Closures construction is expensive in terms of speed as well as memory:
 *   - No closures, instead use prototypical inheritance for API
 *   - Internal state needs to be stored on scope directly, which means that private state is
 *     exposed as $$____ properties
 *
 * Loop operations are optimized by using while(count--) { ... }
 *   - This means that in order to keep the same order of execution as addition we have to add
 *     items to the array at the beginning (unshift) instead of at the end (push)
 *
 * Child scopes are created and removed often
 *   - Using an array would be slow since inserts in the middle are expensive; so we use linked lists
 *
 * There are fewer watches than observers. This is why you don't want the observer to be implemented
 * in the same way as watch. Watch requires return of the initialization function which is expensive
 * to construct.
 */


/**
 * @ngdoc provider
 * @name $rootScopeProvider
 * @description
 *
 * Provider for the $rootScope service.
 */

/**
 * @ngdoc method
 * @name $rootScopeProvider#digestTtl
 * @description
 *
 * Sets the number of `$digest` iterations the scope should attempt to execute before giving up and
 * assuming that the model is unstable.
 *
 * The current default is 10 iterations.
 *
 * In complex applications it's possible that the dependencies between `$watch`s will result in
 * several digest iterations. However if an application needs more than the default 10 digest
 * iterations for its model to stabilize then you should investigate what is causing the model to
 * continuously change during the digest.
 *
 * Increasing the TTL could have performance implications, so you should not change it without
 * proper justification.
 *
 * @param {number} limit The number of digest iterations.
 */


/**
 * @ngdoc service
 * @name $rootScope
 * @this
 *
 * @description
 *
 * Every application has a single root {@link ng.$rootScope.Scope scope}.
 * All other scopes are descendant scopes of the root scope. Scopes provide separation
 * between the model and the view, via a mechanism for watching the model for changes.
 * They also provide event emission/broadcast and subscription facility. See the
 * {@link guide/scope developer guide on scopes}.
 */
function $RootScopeProvider() {
  var TTL = 10;
  var $rootScopeMinErr = minErr('$rootScope');
  var lastDirtyWatch = null;
  var applyAsyncId = null;

  this.digestTtl = function(value) {
    if (arguments.length) {
      TTL = value;
    }
    return TTL;
  };

  function createChildScopeClass(parent) {
    function ChildScope() {
      this.$$watchers = this.$$nextSibling =
          this.$$childHead = this.$$childTail = null;
      this.$$listeners = {};
      this.$$listenerCount = {};
      this.$$watchersCount = 0;
      this.$id = nextUid();
      this.$$ChildScope = null;
    }
    ChildScope.prototype = parent;
    return ChildScope;
  }

  this.$get = ['$exceptionHandler', '$parse', '$browser',
      function($exceptionHandler, $parse, $browser) {

    function destroyChildScope($event) {
        $event.currentScope.$$destroyed = true;
    }

    function cleanUpScope($scope) {

      // Support: IE 9 only
      if (msie === 9) {
        // There is a memory leak in IE9 if all child scopes are not disconnected
        // completely when a scope is destroyed. So this code will recurse up through
        // all this scopes children
        //
        // See issue https://github.com/angular/angular.js/issues/10706
        if ($scope.$$childHead) {
          cleanUpScope($scope.$$childHead);
        }
        if ($scope.$$nextSibling) {
          cleanUpScope($scope.$$nextSibling);
        }
      }

      // The code below works around IE9 and V8's memory leaks
      //
      // See:
      // - https://code.google.com/p/v8/issues/detail?id=2073#c26
      // - https://github.com/angular/angular.js/issues/6794#issuecomment-38648909
      // - https://github.com/angular/angular.js/issues/1313#issuecomment-10378451

      $scope.$parent = $scope.$$nextSibling = $scope.$$prevSibling = $scope.$$childHead =
          $scope.$$childTail = $scope.$root = $scope.$$watchers = null;
    }


    function Scope() {
      this.$id = nextUid();
      this.$$phase = this.$parent = this.$$watchers =
                     this.$$nextSibling = this.$$prevSibling =
                     this.$$childHead = this.$$childTail = null;
      this.$root = this;
      this.$$destroyed = false;
      this.$$listeners = {};
      this.$$listenerCount = {};
      this.$$watchersCount = 0;
      this.$$isolateBindings = null;
    }


    Scope.prototype = {
      constructor: Scope,

      $new: function(isolate, parent) {
        var child;

        parent = parent || this;

        if (isolate) {
          child = new Scope();
          child.$root = this.$root;
        } else {
          // Only create a child scope class if somebody asks for one,
          // but cache it to allow the VM to optimize lookups.
          if (!this.$$ChildScope) {
            this.$$ChildScope = createChildScopeClass(this);
          }
          child = new this.$$ChildScope();
        }
        child.$parent = parent;
        child.$$prevSibling = parent.$$childTail;
        if (parent.$$childHead) {
          parent.$$childTail.$$nextSibling = child;
          parent.$$childTail = child;
        } else {
          parent.$$childHead = parent.$$childTail = child;
        }

        // When the new scope is not isolated or we inherit from `this`, and
        // the parent scope is destroyed, the property `$$destroyed` is inherited
        // prototypically. In all other cases, this property needs to be set
        // when the parent scope is destroyed.
        // The listener needs to be added after the parent is set
        if (isolate || parent !== this) child.$on('$destroy', destroyChildScope);

        return child;
      },

      $watch: function(watchExp, listener, objectEquality, prettyPrintExpression) {



		var get = $parse(watchExp);

        if (get.$$watchDelegate) {
          return get.$$watchDelegate(this, listener, objectEquality, get, watchExp);
        }
        var scope = this,
            array = scope.$$watchers,
            watcher = {
              fn: listener,
              last: initWatchVal,
              get: get,
              exp: prettyPrintExpression || watchExp,
              eq: !!objectEquality
            };

        lastDirtyWatch = null;

        if (!isFunction(listener)) {
          watcher.fn = noop;
        }

        if (!array) {
          array = scope.$$watchers = [];
          array.$$digestWatchIndex = -1;
        }
        // we use unshift since we use a while loop in $digest for speed.
        // the while loop reads in reverse order.
        array.unshift(watcher);
        array.$$digestWatchIndex++;
        incrementWatchersCount(this, 1);

        return function deregisterWatch() {
          var index = arrayRemove(array, watcher);
          if (index >= 0) {
            incrementWatchersCount(scope, -1);
            if (index < array.$$digestWatchIndex) {
              array.$$digestWatchIndex--;
            }
          }
          lastDirtyWatch = null;
        };
      },

      $watchGroup: function(watchExpressions, listener) {
        var oldValues = new Array(watchExpressions.length);
        var newValues = new Array(watchExpressions.length);
        var deregisterFns = [];
        var self = this;
        var changeReactionScheduled = false;
        var firstRun = true;

        console.log(oldValues);
        console.log(newValues);

        if (!watchExpressions.length) {
          // No expressions means we call the listener ASAP
          var shouldCall = true;
          self.$evalAsync(function() {
            if (shouldCall) listener(newValues, newValues, self);
          });
          return function deregisterWatchGroup() {
            shouldCall = false;
          };
        }

        if (watchExpressions.length === 1) {
          // Special case size of one
          return this.$watch(watchExpressions[0], function watchGroupAction(value, oldValue, scope) {
            newValues[0] = value;
            oldValues[0] = oldValue;
            listener(newValues, (value === oldValue) ? newValues : oldValues, scope);
          });
        }

        forEach(watchExpressions, function(expr, i) {
          var unwatchFn = self.$watch(expr, function watchGroupSubAction(value, oldValue) {
            newValues[i] = value;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
              changeReactionScheduled = true;
              self.$evalAsync(watchGroupAction);
            }
          });
          deregisterFns.push(unwatchFn);
        });

        function watchGroupAction() {
          changeReactionScheduled = false;

          if (firstRun) {
            firstRun = false;
            listener(newValues, newValues, self);
          } else {
            listener(newValues, oldValues, self);
          }
        }

        return function deregisterWatchGroup() {
          while (deregisterFns.length) {
            deregisterFns.shift()();
          }
        };
      },

      $watchCollection: function(obj, listener) {
        $watchCollectionInterceptor.$stateful = true;

        var self = this;
        // the current value, updated on each dirty-check run
        var newValue;
        // a shallow copy of the newValue from the last dirty-check run,
        // updated to match newValue during dirty-check run
        var oldValue;
        // a shallow copy of the newValue from when the last change happened
        var veryOldValue;
        // only track veryOldValue if the listener is asking for it
        var trackVeryOldValue = (listener.length > 1);
        var changeDetected = 0;
        var changeDetector = $parse(obj, $watchCollectionInterceptor);
        var internalArray = [];
        var internalObject = {};
        var initRun = true;
        var oldLength = 0;

        function $watchCollectionInterceptor(_value) {
          newValue = _value;
          var newLength, key, bothNaN, newItem, oldItem;

          // If the new value is undefined, then return undefined as the watch may be a one-time watch
          if (isUndefined(newValue)) return;

          if (!isObject(newValue)) { // if primitive
            if (oldValue !== newValue) {
              oldValue = newValue;
              changeDetected++;
            }
          } else if (isArrayLike(newValue)) {
            if (oldValue !== internalArray) {
              // we are transitioning from something which was not an array into array.
              oldValue = internalArray;
              oldLength = oldValue.length = 0;
              changeDetected++;
            }

            newLength = newValue.length;

            if (oldLength !== newLength) {
              // if lengths do not match we need to trigger change notification
              changeDetected++;
              oldValue.length = oldLength = newLength;
            }
            // copy the items to oldValue and look for changes.
            for (var i = 0; i < newLength; i++) {
              oldItem = oldValue[i];
              newItem = newValue[i];

              // eslint-disable-next-line no-self-compare
              bothNaN = (oldItem !== oldItem) && (newItem !== newItem);
              if (!bothNaN && (oldItem !== newItem)) {
                changeDetected++;
                oldValue[i] = newItem;
              }
            }
          } else {
            if (oldValue !== internalObject) {
              // we are transitioning from something which was not an object into object.
              oldValue = internalObject = {};
              oldLength = 0;
              changeDetected++;
            }
            // copy the items to oldValue and look for changes.
            newLength = 0;
            for (key in newValue) {
              if (hasOwnProperty.call(newValue, key)) {
                newLength++;
                newItem = newValue[key];
                oldItem = oldValue[key];

                if (key in oldValue) {
                  // eslint-disable-next-line no-self-compare
                  bothNaN = (oldItem !== oldItem) && (newItem !== newItem);
                  if (!bothNaN && (oldItem !== newItem)) {
                    changeDetected++;
                    oldValue[key] = newItem;
                  }
                } else {
                  oldLength++;
                  oldValue[key] = newItem;
                  changeDetected++;
                }
              }
            }
            if (oldLength > newLength) {
              // we used to have more keys, need to find them and destroy them.
              changeDetected++;
              for (key in oldValue) {
                if (!hasOwnProperty.call(newValue, key)) {
                  oldLength--;
                  delete oldValue[key];
                }
              }
            }
          }
          return changeDetected;
        }

        function $watchCollectionAction() {
          if (initRun) {
            initRun = false;
            listener(newValue, newValue, self);
          } else {
            listener(newValue, veryOldValue, self);
          }

          // make a copy for the next time a collection is changed
          if (trackVeryOldValue) {
            if (!isObject(newValue)) {
              //primitive
              veryOldValue = newValue;
            } else if (isArrayLike(newValue)) {
              veryOldValue = new Array(newValue.length);
              for (var i = 0; i < newValue.length; i++) {
                veryOldValue[i] = newValue[i];
              }
            } else { // if object
              veryOldValue = {};
              for (var key in newValue) {
                if (hasOwnProperty.call(newValue, key)) {
                  veryOldValue[key] = newValue[key];
                }
              }
            }
          }
        }

        return this.$watch(changeDetector, $watchCollectionAction);
      },

      $digest: function() {
        var watch, value, last, fn, get,
            watchers,
            dirty, ttl = TTL,
            next, current, target = this,
            watchLog = [],
            logIdx, asyncTask;

        beginPhase('$digest');
        // Check for changes to browser url that happened in sync before the call to $digest
        $browser.$$checkUrlChange();

        if (this === $rootScope && applyAsyncId !== null) {
          // If this is the root scope, and $applyAsync has scheduled a deferred $apply(), then
          // cancel the scheduled $apply and flush the queue of expressions to be evaluated.
          $browser.defer.cancel(applyAsyncId);
          flushApplyAsync();
        }

        lastDirtyWatch = null;

        do { // "while dirty" loop
          dirty = false;
          current = target;

          // It's safe for asyncQueuePosition to be a local variable here because this loop can't
          // be reentered recursively. Calling $digest from a function passed to $evalAsync would
          // lead to a '$digest already in progress' error.
          for (var asyncQueuePosition = 0; asyncQueuePosition < asyncQueue.length; asyncQueuePosition++) {
            try {
              asyncTask = asyncQueue[asyncQueuePosition];
              fn = asyncTask.fn;
              fn(asyncTask.scope, asyncTask.locals);
            } catch (e) {
              $exceptionHandler(e);
            }
            lastDirtyWatch = null;
          }
          asyncQueue.length = 0;

          traverseScopesLoop:
          do { // "traverse the scopes" loop
            if ((watchers = current.$$watchers)) {
              // process our watches
              watchers.$$digestWatchIndex = watchers.length;
              while (watchers.$$digestWatchIndex--) {
                try {
                  watch = watchers[watchers.$$digestWatchIndex];
                  // Most common watches are on primitives, in which case we can short
                  // circuit it with === operator, only when === fails do we use .equals
                  if (watch) {
                    get = watch.get;
                    if ((value = get(current)) !== (last = watch.last) &&
                        !(watch.eq
                            ? equals(value, last)
                            : (isNumberNaN(value) && isNumberNaN(last)))) {
                      dirty = true;
                      lastDirtyWatch = watch;
                      watch.last = watch.eq ? copy(value, null) : value;
                      fn = watch.fn;
                      fn(value, ((last === initWatchVal) ? value : last), current);
                      if (ttl < 5) {
                        logIdx = 4 - ttl;
                        if (!watchLog[logIdx]) watchLog[logIdx] = [];
                        watchLog[logIdx].push({
                          msg: isFunction(watch.exp) ? 'fn: ' + (watch.exp.name || watch.exp.toString()) : watch.exp,
                          newVal: value,
                          oldVal: last
                        });
                      }
                    } else if (watch === lastDirtyWatch) {
                      // If the most recently dirty watcher is now clean, short circuit since the remaining watchers
                      // have already been tested.
                      dirty = false;
                      break traverseScopesLoop;
                    }
                  }
                } catch (e) {
                  $exceptionHandler(e);
                }
              }
            }

            // Insanity Warning: scope depth-first traversal
            // yes, this code is a bit crazy, but it works and we have tests to prove it!
            // this piece should be kept in sync with the traversal in $broadcast
            if (!(next = ((current.$$watchersCount && current.$$childHead) ||
                (current !== target && current.$$nextSibling)))) {
              while (current !== target && !(next = current.$$nextSibling)) {
                current = current.$parent;
              }
            }
          } while ((current = next));

          // `break traverseScopesLoop;` takes us to here

          if ((dirty || asyncQueue.length) && !(ttl--)) {
            clearPhase();
            throw $rootScopeMinErr('infdig',
                '{0} $digest() iterations reached. Aborting!\n' +
                'Watchers fired in the last 5 iterations: {1}',
                TTL, watchLog);
          }

        } while (dirty || asyncQueue.length);

        clearPhase();

        // postDigestQueuePosition isn't local here because this loop can be reentered recursively.
        while (postDigestQueuePosition < postDigestQueue.length) {
          try {
            postDigestQueue[postDigestQueuePosition++]();
          } catch (e) {
            $exceptionHandler(e);
          }
        }
        postDigestQueue.length = postDigestQueuePosition = 0;

        // Check for changes to browser url that happened during the $digest
        // (for which no event is fired; e.g. via `history.pushState()`)
        $browser.$$checkUrlChange();
      },

      $destroy: function() {
        // We can't destroy a scope that has been already destroyed.
        if (this.$$destroyed) return;
        var parent = this.$parent;

        this.$broadcast('$destroy');
        this.$$destroyed = true;

        if (this === $rootScope) {
          //Remove handlers attached to window when $rootScope is removed
          $browser.$$applicationDestroyed();
        }

        incrementWatchersCount(this, -this.$$watchersCount);
        for (var eventName in this.$$listenerCount) {
          decrementListenerCount(this, this.$$listenerCount[eventName], eventName);
        }

        // sever all the references to parent scopes (after this cleanup, the current scope should
        // not be retained by any of our references and should be eligible for garbage collection)
        if (parent && parent.$$childHead === this) parent.$$childHead = this.$$nextSibling;
        if (parent && parent.$$childTail === this) parent.$$childTail = this.$$prevSibling;
        if (this.$$prevSibling) this.$$prevSibling.$$nextSibling = this.$$nextSibling;
        if (this.$$nextSibling) this.$$nextSibling.$$prevSibling = this.$$prevSibling;

        // Disable listeners, watchers and apply/digest methods
        this.$destroy = this.$digest = this.$apply = this.$evalAsync = this.$applyAsync = noop;
        this.$on = this.$watch = this.$watchGroup = function() { return noop; };
        this.$$listeners = {};

        // Disconnect the next sibling to prevent `cleanUpScope` destroying those too
        this.$$nextSibling = null;
        cleanUpScope(this);
      },

      $eval: function(expr, locals) {
        return $parse(expr)(this, locals);
      },

      $evalAsync: function(expr, locals) {
        // if we are outside of an $digest loop and this is the first time we are scheduling async
        // task also schedule async auto-flush
        if (!$rootScope.$$phase && !asyncQueue.length) {
          $browser.defer(function() {
            if (asyncQueue.length) {
              $rootScope.$digest();
            }
          });
        }

        asyncQueue.push({scope: this, fn: $parse(expr), locals: locals});
      },

      $$postDigest: function(fn) {
        postDigestQueue.push(fn);
      },

      $apply: function(expr) {
        try {
          beginPhase('$apply');
          try {
            return this.$eval(expr);
          } finally {
            clearPhase();
          }
        } catch (e) {
          $exceptionHandler(e);
        } finally {
          try {
            $rootScope.$digest();
          } catch (e) {
            $exceptionHandler(e);
            // eslint-disable-next-line no-unsafe-finally
            throw e;
          }
        }
      },

      $applyAsync: function(expr) {
        var scope = this;
        if (expr) {
          applyAsyncQueue.push($applyAsyncExpression);
        }
        expr = $parse(expr);
        scheduleApplyAsync();

        function $applyAsyncExpression() {
          scope.$eval(expr);
        }
      },

      $on: function(name, listener) {
        var namedListeners = this.$$listeners[name];
        if (!namedListeners) {
          this.$$listeners[name] = namedListeners = [];
        }
        namedListeners.push(listener);

        var current = this;
        do {
          if (!current.$$listenerCount[name]) {
            current.$$listenerCount[name] = 0;
          }
          current.$$listenerCount[name]++;
        } while ((current = current.$parent));

        var self = this;
        return function() {
          var indexOfListener = namedListeners.indexOf(listener);
          if (indexOfListener !== -1) {
            namedListeners[indexOfListener] = null;
            decrementListenerCount(self, 1, name);
          }
        };
      },


      $emit: function(name, args) {
        var empty = [],
            namedListeners,
            scope = this,
            stopPropagation = false,
            event = {
              name: name,
              targetScope: scope,
              stopPropagation: function() {stopPropagation = true;},
              preventDefault: function() {
                event.defaultPrevented = true;
              },
              defaultPrevented: false
            },
            listenerArgs = concat([event], arguments, 1),
            i, length;

        do {
          namedListeners = scope.$$listeners[name] || empty;
          event.currentScope = scope;
          for (i = 0, length = namedListeners.length; i < length; i++) {

            // if listeners were deregistered, defragment the array
            if (!namedListeners[i]) {
              namedListeners.splice(i, 1);
              i--;
              length--;
              continue;
            }
            try {
              //allow all listeners attached to the current scope to run
              namedListeners[i].apply(null, listenerArgs);
            } catch (e) {
              $exceptionHandler(e);
            }
          }
          //if any listener on the current scope stops propagation, prevent bubbling
          if (stopPropagation) {
            event.currentScope = null;
            return event;
          }
          //traverse upwards
          scope = scope.$parent;
        } while (scope);

        event.currentScope = null;

        return event;
      },

      $broadcast: function(name, args) {
        var target = this,
            current = target,
            next = target,
            event = {
              name: name,
              targetScope: target,
              preventDefault: function() {
                event.defaultPrevented = true;
              },
              defaultPrevented: false
            };

        if (!target.$$listenerCount[name]) return event;

        var listenerArgs = concat([event], arguments, 1),
            listeners, i, length;

        //down while you can, then up and next sibling or up and next sibling until back at root
        while ((current = next)) {
          event.currentScope = current;
          listeners = current.$$listeners[name] || [];
          for (i = 0, length = listeners.length; i < length; i++) {
            // if listeners were deregistered, defragment the array
            if (!listeners[i]) {
              listeners.splice(i, 1);
              i--;
              length--;
              continue;
            }

            try {
              listeners[i].apply(null, listenerArgs);
            } catch (e) {
              $exceptionHandler(e);
            }
          }

          // Insanity Warning: scope depth-first traversal
          // yes, this code is a bit crazy, but it works and we have tests to prove it!
          // this piece should be kept in sync with the traversal in $digest
          // (though it differs due to having the extra check for $$listenerCount)
          if (!(next = ((current.$$listenerCount[name] && current.$$childHead) ||
              (current !== target && current.$$nextSibling)))) {
            while (current !== target && !(next = current.$$nextSibling)) {
              current = current.$parent;
            }
          }
        }

        event.currentScope = null;
        return event;
      }
    };

    var $rootScope = new Scope();

    //The internal queues. Expose them on the $rootScope for debugging/testing purposes.
    var asyncQueue = $rootScope.$$asyncQueue = [];
    var postDigestQueue = $rootScope.$$postDigestQueue = [];
    var applyAsyncQueue = $rootScope.$$applyAsyncQueue = [];

    var postDigestQueuePosition = 0;

    return $rootScope;


    function beginPhase(phase) {
      if ($rootScope.$$phase) {
        throw $rootScopeMinErr('inprog', '{0} already in progress', $rootScope.$$phase);
      }

      $rootScope.$$phase = phase;
    }

    function clearPhase() {
      $rootScope.$$phase = null;
    }

    function incrementWatchersCount(current, count) {
      do {
        current.$$watchersCount += count;
      } while ((current = current.$parent));
    }

    function decrementListenerCount(current, count, name) {
      do {
        current.$$listenerCount[name] -= count;

        if (current.$$listenerCount[name] === 0) {
          delete current.$$listenerCount[name];
        }
      } while ((current = current.$parent));
    }

    function initWatchVal() {}

    function flushApplyAsync() {
      while (applyAsyncQueue.length) {
        try {
          applyAsyncQueue.shift()();
        } catch (e) {
          $exceptionHandler(e);
        }
      }
      applyAsyncId = null;
    }

    function scheduleApplyAsync() {
      if (applyAsyncId === null) {
        applyAsyncId = $browser.defer(function() {
          $rootScope.$apply(flushApplyAsync);
        });
      }
    }
  }];
}


function $$SanitizeUriProvider() {
  var aHrefSanitizationWhitelist = /^\s*(https?|ftp|mailto|tel|file):/,
    imgSrcSanitizationWhitelist = /^\s*((https?|ftp|file|blob):|data:image\/)/;

  this.aHrefSanitizationWhitelist = function(regexp) {
    if (isDefined(regexp)) {
      aHrefSanitizationWhitelist = regexp;
      return this;
    }
    return aHrefSanitizationWhitelist;
  };


  this.imgSrcSanitizationWhitelist = function(regexp) {
    if (isDefined(regexp)) {
      imgSrcSanitizationWhitelist = regexp;
      return this;
    }
    return imgSrcSanitizationWhitelist;
  };

  this.$get = function() {
    return function sanitizeUri(uri, isImage) {
      var regex = isImage ? imgSrcSanitizationWhitelist : aHrefSanitizationWhitelist;
      var normalizedVal;
      normalizedVal = urlResolve(uri).href;
      if (normalizedVal !== '' && !normalizedVal.match(regex)) {
        return 'unsafe:' + normalizedVal;
      }
      return uri;
    };
  };
}


var $sceMinErr = minErr('$sce');

var SCE_CONTEXTS = {
  // HTML is used when there's HTML rendered (e.g. ng-bind-html, iframe srcdoc binding).
  HTML: 'html',

  // Style statements or stylesheets. Currently unused in AngularJS.
  CSS: 'css',

  // An URL used in a context where it does not refer to a resource that loads code. Currently
  // unused in AngularJS.
  URL: 'url',

  // RESOURCE_URL is a subtype of URL used where the referred-to resource could be interpreted as
  // code. (e.g. ng-include, script src binding, templateUrl)
  RESOURCE_URL: 'resourceUrl',

  // Script. Currently unused in AngularJS.
  JS: 'js'
};

// Helper functions follow.

var UNDERSCORE_LOWERCASE_REGEXP = /_([a-z])/g;

function snakeToCamel(name) {
  return name
    .replace(UNDERSCORE_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

function adjustMatcher(matcher) {
  if (matcher === 'self') {
    return matcher;
  } else if (isString(matcher)) {
    // Strings match exactly except for 2 wildcards - '*' and '**'.
    // '*' matches any character except those from the set ':/.?&'.
    // '**' matches any character (like .* in a RegExp).
    // More than 2 *'s raises an error as it's ill defined.
    if (matcher.indexOf('***') > -1) {
      throw $sceMinErr('iwcard',
          'Illegal sequence *** in string matcher.  String: {0}', matcher);
    }
    matcher = escapeForRegexp(matcher).
                  replace(/\\\*\\\*/g, '.*').
                  replace(/\\\*/g, '[^:/.?&;]*');
    return new RegExp('^' + matcher + '$');
  } else if (isRegExp(matcher)) {
    // The only other type of matcher allowed is a Regexp.
    // Match entire URL / disallow partial matches.
    // Flags are reset (i.e. no global, ignoreCase or multiline)
    return new RegExp('^' + matcher.source + '$');
  } else {
    throw $sceMinErr('imatcher',
        'Matchers may only be "self", string patterns or RegExp objects');
  }
}


function adjustMatchers(matchers) {
  var adjustedMatchers = [];
  if (isDefined(matchers)) {
    forEach(matchers, function(matcher) {
      adjustedMatchers.push(adjustMatcher(matcher));
    });
  }
  return adjustedMatchers;
}

function $SceDelegateProvider() {
  this.SCE_CONTEXTS = SCE_CONTEXTS;

  // Resource URLs can also be trusted by policy.
  var resourceUrlWhitelist = ['self'],
      resourceUrlBlacklist = [];

  this.resourceUrlWhitelist = function(value) {
    if (arguments.length) {
      resourceUrlWhitelist = adjustMatchers(value);
    }
    return resourceUrlWhitelist;
  };


  this.resourceUrlBlacklist = function(value) {
    if (arguments.length) {
      resourceUrlBlacklist = adjustMatchers(value);
    }
    return resourceUrlBlacklist;
  };

  this.$get = ['$injector', function($injector) {

    var htmlSanitizer = function htmlSanitizer(html) {
      throw $sceMinErr('unsafe', 'Attempting to use an unsafe value in a safe context.');
    };

    if ($injector.has('$sanitize')) {
      htmlSanitizer = $injector.get('$sanitize');
    }


    function matchUrl(matcher, parsedUrl) {
      if (matcher === 'self') {
        return urlIsSameOrigin(parsedUrl);
      } else {
        // definitely a regex.  See adjustMatchers()
        return !!matcher.exec(parsedUrl.href);
      }
    }

    function isResourceUrlAllowedByPolicy(url) {
      var parsedUrl = urlResolve(url.toString());
      var i, n, allowed = false;
      // Ensure that at least one item from the whitelist allows this url.
      for (i = 0, n = resourceUrlWhitelist.length; i < n; i++) {
        if (matchUrl(resourceUrlWhitelist[i], parsedUrl)) {
          allowed = true;
          break;
        }
      }
      if (allowed) {
        // Ensure that no item from the blacklist blocked this url.
        for (i = 0, n = resourceUrlBlacklist.length; i < n; i++) {
          if (matchUrl(resourceUrlBlacklist[i], parsedUrl)) {
            allowed = false;
            break;
          }
        }
      }
      return allowed;
    }

    function generateHolderType(Base) {
      var holderType = function TrustedValueHolderType(trustedValue) {
        this.$$unwrapTrustedValue = function() {
          return trustedValue;
        };
      };
      if (Base) {
        holderType.prototype = new Base();
      }
      holderType.prototype.valueOf = function sceValueOf() {
        return this.$$unwrapTrustedValue();
      };
      holderType.prototype.toString = function sceToString() {
        return this.$$unwrapTrustedValue().toString();
      };
      return holderType;
    }

    var trustedValueHolderBase = generateHolderType(),
        byType = {};

    byType[SCE_CONTEXTS.HTML] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.CSS] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.URL] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.JS] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.RESOURCE_URL] = generateHolderType(byType[SCE_CONTEXTS.URL]);


    function trustAs(type, trustedValue) {
      var Constructor = (byType.hasOwnProperty(type) ? byType[type] : null);
      if (!Constructor) {
        throw $sceMinErr('icontext',
            'Attempted to trust a value in invalid context. Context: {0}; Value: {1}',
            type, trustedValue);
      }
      if (trustedValue === null || isUndefined(trustedValue) || trustedValue === '') {
        return trustedValue;
      }
      // All the current contexts in SCE_CONTEXTS happen to be strings.  In order to avoid trusting
      // mutable objects, we ensure here that the value passed in is actually a string.
      if (typeof trustedValue !== 'string') {
        throw $sceMinErr('itype',
            'Attempted to trust a non-string value in a content requiring a string: Context: {0}',
            type);
      }
      return new Constructor(trustedValue);
    }

    function valueOf(maybeTrusted) {
      if (maybeTrusted instanceof trustedValueHolderBase) {
        return maybeTrusted.$$unwrapTrustedValue();
      } else {
        return maybeTrusted;
      }
    }


    function getTrusted(type, maybeTrusted) {
      if (maybeTrusted === null || isUndefined(maybeTrusted) || maybeTrusted === '') {
        return maybeTrusted;
      }
      var constructor = (byType.hasOwnProperty(type) ? byType[type] : null);
      // If maybeTrusted is a trusted class instance or subclass instance, then unwrap and return
      // as-is.
      if (constructor && maybeTrusted instanceof constructor) {
        return maybeTrusted.$$unwrapTrustedValue();
      }
      // Otherwise, if we get here, then we may either make it safe, or throw an exception. This
      // depends on the context: some are sanitizatible (HTML), some use whitelists (RESOURCE_URL),
      // some are impossible to do (JS). This step isn't implemented for CSS and URL, as AngularJS
      // has no corresponding sinks.
      if (type === SCE_CONTEXTS.RESOURCE_URL) {
        // RESOURCE_URL uses a whitelist.
        if (isResourceUrlAllowedByPolicy(maybeTrusted)) {
          return maybeTrusted;
        } else {
          throw $sceMinErr('insecurl',
              'Blocked loading resource from url not allowed by $sceDelegate policy.  URL: {0}',
              maybeTrusted.toString());
        }
      } else if (type === SCE_CONTEXTS.HTML) {
        // htmlSanitizer throws its own error when no sanitizer is available.
        return htmlSanitizer(maybeTrusted);
      }
      // Default error when the $sce service has no way to make the input safe.
      throw $sceMinErr('unsafe', 'Attempting to use an unsafe value in a safe context.');
    }

    return { trustAs: trustAs,
             getTrusted: getTrusted,
             valueOf: valueOf };
  }];
}

function $SceProvider() {
  var enabled = true;

  this.enabled = function(value) {
    if (arguments.length) {
      enabled = !!value;
    }
    return enabled;
  };


  this.$get = ['$parse', '$sceDelegate', function(
                $parse,   $sceDelegate) {
    // Support: IE 9-11 only
    // Prereq: Ensure that we're not running in IE<11 quirks mode.  In that mode, IE < 11 allow
    // the "expression(javascript expression)" syntax which is insecure.
    if (enabled && msie < 8) {
      throw $sceMinErr('iequirks',
        'Strict Contextual Escaping does not support Internet Explorer version < 11 in quirks ' +
        'mode.  You can fix this by adding the text <!doctype html> to the top of your HTML ' +
        'document.  See http://docs.angularjs.org/api/ng.$sce for more information.');
    }

    var sce = shallowCopy(SCE_CONTEXTS);


    sce.isEnabled = function() {
      return enabled;
    };
    sce.trustAs = $sceDelegate.trustAs;
    sce.getTrusted = $sceDelegate.getTrusted;
    sce.valueOf = $sceDelegate.valueOf;

    if (!enabled) {
      sce.trustAs = sce.getTrusted = function(type, value) { return value; };
      sce.valueOf = identity;
    }


    sce.parseAs = function sceParseAs(type, expr) {
      var parsed = $parse(expr);
      if (parsed.literal && parsed.constant) {
        return parsed;
      } else {
        return $parse(expr, function(value) {
          return sce.getTrusted(type, value);
        });
      }
    };


    // Shorthand delegations.
    var parse = sce.parseAs,
        getTrusted = sce.getTrusted,
        trustAs = sce.trustAs;

    forEach(SCE_CONTEXTS, function(enumValue, name) {
      var lName = lowercase(name);
      sce[snakeToCamel('parse_as_' + lName)] = function(expr) {
        return parse(enumValue, expr);
      };
      sce[snakeToCamel('get_trusted_' + lName)] = function(value) {
        return getTrusted(enumValue, value);
      };
      sce[snakeToCamel('trust_as_' + lName)] = function(value) {
        return trustAs(enumValue, value);
      };
    });

    return sce;
  }];
}

function $SnifferProvider() {
  this.$get = ['$window', '$document', function($window, $document) {
    var eventSupport = {},
        isNw = $window.nw && $window.nw.process,
        isChromePackagedApp =
            !isNw &&
            $window.chrome &&
            ($window.chrome.app && $window.chrome.app.runtime ||
                !$window.chrome.app && $window.chrome.runtime && $window.chrome.runtime.id),
        hasHistoryPushState = !isChromePackagedApp && $window.history && $window.history.pushState,
        android =
          toInt((/android (\d+)/.exec(lowercase(($window.navigator || {}).userAgent)) || [])[1]),
        boxee = /Boxee/i.test(($window.navigator || {}).userAgent),
        document = $document[0] || {},
        bodyStyle = document.body && document.body.style,
        transitions = false,
        animations = false;

    if (bodyStyle) {
      // Support: Android <5, Blackberry Browser 10, default Chrome in Android 4.4.x
      // Mentioned browsers need a -webkit- prefix for transitions & animations.
      transitions = !!('transition' in bodyStyle || 'webkitTransition' in bodyStyle);
      animations = !!('animation' in bodyStyle || 'webkitAnimation' in bodyStyle);
    }


    return {
      history: !!(hasHistoryPushState && !(android < 4) && !boxee),
      hasEvent: function(event) {

        if (event === 'input' && msie) return false;

        if (isUndefined(eventSupport[event])) {
          var divElm = document.createElement('div');
          eventSupport[event] = 'on' + event in divElm;
        }

        return eventSupport[event];
      },
      csp: csp(),
      transitions: transitions,
      animations: animations,
      android: android
    };
  }];
}

var $templateRequestMinErr = minErr('$compile');

function $TemplateRequestProvider() {

  var httpOptions;

  this.httpOptions = function(val) {
    if (val) {
      httpOptions = val;
      return this;
    }
    return httpOptions;
  };


  this.$get = ['$exceptionHandler', '$templateCache', '$http', '$q', '$sce',
    function($exceptionHandler, $templateCache, $http, $q, $sce) {

      function handleRequestFn(tpl, ignoreRequestError) {
        handleRequestFn.totalPendingRequests++;

        if (!isString(tpl) || isUndefined($templateCache.get(tpl))) {
          tpl = $sce.getTrustedResourceUrl(tpl);
        }

        var transformResponse = $http.defaults && $http.defaults.transformResponse;

        if (isArray(transformResponse)) {
          transformResponse = transformResponse.filter(function(transformer) {
            return transformer !== defaultHttpResponseTransform;
          });
        } else if (transformResponse === defaultHttpResponseTransform) {
          transformResponse = null;
        }

        return $http.get(tpl, extend({
            cache: $templateCache,
            transformResponse: transformResponse
          }, httpOptions))
          .finally(function() {
            handleRequestFn.totalPendingRequests--;
          })
          .then(function(response) {
            $templateCache.put(tpl, response.data);
            return response.data;
          }, handleError);

        function handleError(resp) {
          if (!ignoreRequestError) {
            resp = $templateRequestMinErr('tpload',
                'Failed to load template: {0} (HTTP status: {1} {2})',
                tpl, resp.status, resp.statusText);

            $exceptionHandler(resp);
          }

          return $q.reject(resp);
        }
      }

      handleRequestFn.totalPendingRequests = 0;

      return handleRequestFn;
    }
  ];
}

/** @this */
function $$TestabilityProvider() {
  this.$get = ['$rootScope', '$browser', '$location',
       function($rootScope,   $browser,   $location) {

    var testability = {};

    testability.findBindings = function(element, expression, opt_exactMatch) {
      var bindings = element.getElementsByClassName('ng-binding');
      var matches = [];
      forEach(bindings, function(binding) {
        var dataBinding = angular.element(binding).data('$binding');
        if (dataBinding) {
          forEach(dataBinding, function(bindingName) {
            if (opt_exactMatch) {
              var matcher = new RegExp('(^|\\s)' + escapeForRegexp(expression) + '(\\s|\\||$)');
              if (matcher.test(bindingName)) {
                matches.push(binding);
              }
            } else {
              if (bindingName.indexOf(expression) !== -1) {
                matches.push(binding);
              }
            }
          });
        }
      });
      return matches;
    };

    testability.findModels = function(element, expression, opt_exactMatch) {
      var prefixes = ['ng-', 'data-ng-', 'ng\\:'];
      for (var p = 0; p < prefixes.length; ++p) {
        var attributeEquals = opt_exactMatch ? '=' : '*=';
        var selector = '[' + prefixes[p] + 'model' + attributeEquals + '"' + expression + '"]';
        var elements = element.querySelectorAll(selector);
        if (elements.length) {
          return elements;
        }
      }
    };

    testability.getLocation = function() {
      return $location.url();
    };

    testability.setLocation = function(url) {
      if (url !== $location.url()) {
        $location.url(url);
        $rootScope.$digest();
      }
    };

    testability.whenStable = function(callback) {
      $browser.notifyWhenNoOutstandingRequests(callback);
    };

    return testability;
  }];
}

/** @this */
function $TimeoutProvider() {
  this.$get = ['$rootScope', '$browser', '$q', '$$q', '$exceptionHandler',
       function($rootScope,   $browser,   $q,   $$q,   $exceptionHandler) {

    var deferreds = {};


    function timeout(fn, delay, invokeApply) {
      if (!isFunction(fn)) {
        invokeApply = delay;
        delay = fn;
        fn = noop;
      }

      var args = sliceArgs(arguments, 3),
          skipApply = (isDefined(invokeApply) && !invokeApply),
          deferred = (skipApply ? $$q : $q).defer(),
          promise = deferred.promise,
          timeoutId;

      timeoutId = $browser.defer(function() {
        try {
          deferred.resolve(fn.apply(null, args));
        } catch (e) {
          deferred.reject(e);
          $exceptionHandler(e);
        } finally {
          delete deferreds[promise.$$timeoutId];
        }

        if (!skipApply) $rootScope.$apply();
      }, delay);

      promise.$$timeoutId = timeoutId;
      deferreds[timeoutId] = deferred;

      return promise;
    }

    timeout.cancel = function(promise) {
      if (promise && promise.$$timeoutId in deferreds) {
        // Timeout cancels should not report an unhandled promise.
        deferreds[promise.$$timeoutId].promise.catch(noop);
        deferreds[promise.$$timeoutId].reject('canceled');
        delete deferreds[promise.$$timeoutId];
        return $browser.defer.cancel(promise.$$timeoutId);
      }
      return false;
    };

    return timeout;
  }];
}

var urlParsingNode = window.document.createElement('a');
var originUrl = urlResolve(window.location.href);

function urlResolve(url) {
  var href = url;

  // Support: IE 9-11 only
  if (msie) {
    // Normalize before parse.  Refer Implementation Notes on why this is
    // done in two steps on IE.
    urlParsingNode.setAttribute('href', href);
    href = urlParsingNode.href;
  }

  urlParsingNode.setAttribute('href', href);

  // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
  return {
    href: urlParsingNode.href,
    protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
    host: urlParsingNode.host,
    search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
    hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
    hostname: urlParsingNode.hostname,
    port: urlParsingNode.port,
    pathname: (urlParsingNode.pathname.charAt(0) === '/')
      ? urlParsingNode.pathname
      : '/' + urlParsingNode.pathname
  };
}

function urlIsSameOrigin(requestUrl) {
  var parsed = (isString(requestUrl)) ? urlResolve(requestUrl) : requestUrl;
  return (parsed.protocol === originUrl.protocol &&
          parsed.host === originUrl.host);
}

function $WindowProvider() {
  this.$get = valueFn(window);
}

function $$CookieReader($document) {
  var rawDocument = $document[0] || {};
  var lastCookies = {};
  var lastCookieString = '';

  function safeGetCookie(rawDocument) {
    try {
      return rawDocument.cookie || '';
    } catch (e) {
      return '';
    }
  }

  function safeDecodeURIComponent(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return str;
    }
  }

  return function() {
    var cookieArray, cookie, i, index, name;
    var currentCookieString = safeGetCookie(rawDocument);

    if (currentCookieString !== lastCookieString) {
      lastCookieString = currentCookieString;
      cookieArray = lastCookieString.split('; ');
      lastCookies = {};

      for (i = 0; i < cookieArray.length; i++) {
        cookie = cookieArray[i];
        index = cookie.indexOf('=');
        if (index > 0) { //ignore nameless cookies
          name = safeDecodeURIComponent(cookie.substring(0, index));
          // the first value that is seen for a cookie is the most
          // specific one.  values for the same cookie name that
          // follow are for less specific paths.
          if (isUndefined(lastCookies[name])) {
            lastCookies[name] = safeDecodeURIComponent(cookie.substring(index + 1));
          }
        }
      }
    }
    return lastCookies;
  };
}

$$CookieReader.$inject = ['$document'];

function $$CookieReaderProvider() {
  this.$get = $$CookieReader;
}

$FilterProvider.$inject = ['$provide'];
/** @this */
function $FilterProvider($provide) {
  var suffix = 'Filter';


  function register(name, factory) {
    if (isObject(name)) {
      var filters = {};
      forEach(name, function(filter, key) {
        filters[key] = register(key, filter);
      });
      return filters;
    } else {
      return $provide.factory(name + suffix, factory);
    }
  }
  this.register = register;

  this.$get = ['$injector', function($injector) {
    return function(name) {
      return $injector.get(name + suffix);
    };
  }];


  register('currency', currencyFilter);
  register('date', dateFilter);
  register('filter', filterFilter);
  register('json', jsonFilter);
  register('limitTo', limitToFilter);
  register('lowercase', lowercaseFilter);
  register('number', numberFilter);
  register('orderBy', orderByFilter);
  register('uppercase', uppercaseFilter);
}

function filterFilter() {
  return function(array, expression, comparator, anyPropertyKey) {
    if (!isArrayLike(array)) {
      if (array == null) {
        return array;
      } else {
        throw minErr('filter')('notarray', 'Expected array but received: {0}', array);
      }
    }

    anyPropertyKey = anyPropertyKey || '$';
    var expressionType = getTypeForFilter(expression);
    var predicateFn;
    var matchAgainstAnyProp;

    switch (expressionType) {
      case 'function':
        predicateFn = expression;
        break;
      case 'boolean':
      case 'null':
      case 'number':
      case 'string':
        matchAgainstAnyProp = true;
        // falls through
      case 'object':
        predicateFn = createPredicateFn(expression, comparator, anyPropertyKey, matchAgainstAnyProp);
        break;
      default:
        return array;
    }

    return Array.prototype.filter.call(array, predicateFn);
  };
}

// Helper functions for `filterFilter`
function createPredicateFn(expression, comparator, anyPropertyKey, matchAgainstAnyProp) {
  var shouldMatchPrimitives = isObject(expression) && (anyPropertyKey in expression);
  var predicateFn;

  if (comparator === true) {
    comparator = equals;
  } else if (!isFunction(comparator)) {
    comparator = function(actual, expected) {
      if (isUndefined(actual)) {
        // No substring matching against `undefined`
        return false;
      }
      if ((actual === null) || (expected === null)) {
        // No substring matching against `null`; only match against `null`
        return actual === expected;
      }
      if (isObject(expected) || (isObject(actual) && !hasCustomToString(actual))) {
        // Should not compare primitives against objects, unless they have custom `toString` method
        return false;
      }

      actual = lowercase('' + actual);
      expected = lowercase('' + expected);
      return actual.indexOf(expected) !== -1;
    };
  }

  predicateFn = function(item) {
    if (shouldMatchPrimitives && !isObject(item)) {
      return deepCompare(item, expression[anyPropertyKey], comparator, anyPropertyKey, false);
    }
    return deepCompare(item, expression, comparator, anyPropertyKey, matchAgainstAnyProp);
  };

  return predicateFn;
}

function deepCompare(actual, expected, comparator, anyPropertyKey, matchAgainstAnyProp, dontMatchWholeObject) {
  var actualType = getTypeForFilter(actual);
  var expectedType = getTypeForFilter(expected);

  if ((expectedType === 'string') && (expected.charAt(0) === '!')) {
    return !deepCompare(actual, expected.substring(1), comparator, anyPropertyKey, matchAgainstAnyProp);
  } else if (isArray(actual)) {
    // In case `actual` is an array, consider it a match
    // if ANY of it's items matches `expected`
    return actual.some(function(item) {
      return deepCompare(item, expected, comparator, anyPropertyKey, matchAgainstAnyProp);
    });
  }

  switch (actualType) {
    case 'object':
      var key;
      if (matchAgainstAnyProp) {
        for (key in actual) {
          // Under certain, rare, circumstances, key may not be a string and `charAt` will be undefined
          // See: https://github.com/angular/angular.js/issues/15644
          if (key.charAt && (key.charAt(0) !== '$') &&
              deepCompare(actual[key], expected, comparator, anyPropertyKey, true)) {
            return true;
          }
        }
        return dontMatchWholeObject ? false : deepCompare(actual, expected, comparator, anyPropertyKey, false);
      } else if (expectedType === 'object') {
        for (key in expected) {
          var expectedVal = expected[key];
          if (isFunction(expectedVal) || isUndefined(expectedVal)) {
            continue;
          }

          var matchAnyProperty = key === anyPropertyKey;
          var actualVal = matchAnyProperty ? actual : actual[key];
          if (!deepCompare(actualVal, expectedVal, comparator, anyPropertyKey, matchAnyProperty, matchAnyProperty)) {
            return false;
          }
        }
        return true;
      } else {
        return comparator(actual, expected);
      }
    case 'function':
      return false;
    default:
      return comparator(actual, expected);
  }
}

// Used for easily differentiating between `null` and actual `object`
function getTypeForFilter(val) {
  return (val === null) ? 'null' : typeof val;
}

var MAX_DIGITS = 22;
var DECIMAL_SEP = '.';
var ZERO_CHAR = '0';

currencyFilter.$inject = ['$locale'];
function currencyFilter($locale) {
  var formats = $locale.NUMBER_FORMATS;
  return function(amount, currencySymbol, fractionSize) {
    if (isUndefined(currencySymbol)) {
      currencySymbol = formats.CURRENCY_SYM;
    }

    if (isUndefined(fractionSize)) {
      fractionSize = formats.PATTERNS[1].maxFrac;
    }

    // if null or undefined pass it through
    return (amount == null)
        ? amount
        : formatNumber(amount, formats.PATTERNS[1], formats.GROUP_SEP, formats.DECIMAL_SEP, fractionSize).
            replace(/\u00A4/g, currencySymbol);
  };
}

numberFilter.$inject = ['$locale'];
function numberFilter($locale) {
  var formats = $locale.NUMBER_FORMATS;
  return function(number, fractionSize) {

    // if null or undefined pass it through
    return (number == null)
        ? number
        : formatNumber(number, formats.PATTERNS[0], formats.GROUP_SEP, formats.DECIMAL_SEP,
                       fractionSize);
  };
}

function parse(numStr) {
  var exponent = 0, digits, numberOfIntegerDigits;
  var i, j, zeros;

  // Decimal point?
  if ((numberOfIntegerDigits = numStr.indexOf(DECIMAL_SEP)) > -1) {
    numStr = numStr.replace(DECIMAL_SEP, '');
  }

  // Exponential form?
  if ((i = numStr.search(/e/i)) > 0) {
    // Work out the exponent.
    if (numberOfIntegerDigits < 0) numberOfIntegerDigits = i;
    numberOfIntegerDigits += +numStr.slice(i + 1);
    numStr = numStr.substring(0, i);
  } else if (numberOfIntegerDigits < 0) {
    // There was no decimal point or exponent so it is an integer.
    numberOfIntegerDigits = numStr.length;
  }

  // Count the number of leading zeros.
  for (i = 0; numStr.charAt(i) === ZERO_CHAR; i++) { /* empty */ }

  if (i === (zeros = numStr.length)) {
    // The digits are all zero.
    digits = [0];
    numberOfIntegerDigits = 1;
  } else {
    // Count the number of trailing zeros
    zeros--;
    while (numStr.charAt(zeros) === ZERO_CHAR) zeros--;

    // Trailing zeros are insignificant so ignore them
    numberOfIntegerDigits -= i;
    digits = [];
    // Convert string to array of digits without leading/trailing zeros.
    for (j = 0; i <= zeros; i++, j++) {
      digits[j] = +numStr.charAt(i);
    }
  }

  // If the number overflows the maximum allowed digits then use an exponent.
  if (numberOfIntegerDigits > MAX_DIGITS) {
    digits = digits.splice(0, MAX_DIGITS - 1);
    exponent = numberOfIntegerDigits - 1;
    numberOfIntegerDigits = 1;
  }

  return { d: digits, e: exponent, i: numberOfIntegerDigits };
}

/**
 * Round the parsed number to the specified number of decimal places
 * This function changed the parsedNumber in-place
 */
function roundNumber(parsedNumber, fractionSize, minFrac, maxFrac) {
    var digits = parsedNumber.d;
    var fractionLen = digits.length - parsedNumber.i;

    // determine fractionSize if it is not specified; `+fractionSize` converts it to a number
    fractionSize = (isUndefined(fractionSize)) ? Math.min(Math.max(minFrac, fractionLen), maxFrac) : +fractionSize;

    // The index of the digit to where rounding is to occur
    var roundAt = fractionSize + parsedNumber.i;
    var digit = digits[roundAt];

    if (roundAt > 0) {
      // Drop fractional digits beyond `roundAt`
      digits.splice(Math.max(parsedNumber.i, roundAt));

      // Set non-fractional digits beyond `roundAt` to 0
      for (var j = roundAt; j < digits.length; j++) {
        digits[j] = 0;
      }
    } else {
      // We rounded to zero so reset the parsedNumber
      fractionLen = Math.max(0, fractionLen);
      parsedNumber.i = 1;
      digits.length = Math.max(1, roundAt = fractionSize + 1);
      digits[0] = 0;
      for (var i = 1; i < roundAt; i++) digits[i] = 0;
    }

    if (digit >= 5) {
      if (roundAt - 1 < 0) {
        for (var k = 0; k > roundAt; k--) {
          digits.unshift(0);
          parsedNumber.i++;
        }
        digits.unshift(1);
        parsedNumber.i++;
      } else {
        digits[roundAt - 1]++;
      }
    }

    // Pad out with zeros to get the required fraction length
    for (; fractionLen < Math.max(0, fractionSize); fractionLen++) digits.push(0);


    // Do any carrying, e.g. a digit was rounded up to 10
    var carry = digits.reduceRight(function(carry, d, i, digits) {
      d = d + carry;
      digits[i] = d % 10;
      return Math.floor(d / 10);
    }, 0);
    if (carry) {
      digits.unshift(carry);
      parsedNumber.i++;
    }
}

function formatNumber(number, pattern, groupSep, decimalSep, fractionSize) {

  if (!(isString(number) || isNumber(number)) || isNaN(number)) return '';

  var isInfinity = !isFinite(number);
  var isZero = false;
  var numStr = Math.abs(number) + '',
      formattedText = '',
      parsedNumber;

  if (isInfinity) {
    formattedText = '\u221e';
  } else {
    parsedNumber = parse(numStr);

    roundNumber(parsedNumber, fractionSize, pattern.minFrac, pattern.maxFrac);

    var digits = parsedNumber.d;
    var integerLen = parsedNumber.i;
    var exponent = parsedNumber.e;
    var decimals = [];
    isZero = digits.reduce(function(isZero, d) { return isZero && !d; }, true);

    // pad zeros for small numbers
    while (integerLen < 0) {
      digits.unshift(0);
      integerLen++;
    }

    // extract decimals digits
    if (integerLen > 0) {
      decimals = digits.splice(integerLen, digits.length);
    } else {
      decimals = digits;
      digits = [0];
    }

    // format the integer digits with grouping separators
    var groups = [];
    if (digits.length >= pattern.lgSize) {
      groups.unshift(digits.splice(-pattern.lgSize, digits.length).join(''));
    }
    while (digits.length > pattern.gSize) {
      groups.unshift(digits.splice(-pattern.gSize, digits.length).join(''));
    }
    if (digits.length) {
      groups.unshift(digits.join(''));
    }
    formattedText = groups.join(groupSep);

    // append the decimal digits
    if (decimals.length) {
      formattedText += decimalSep + decimals.join('');
    }

    if (exponent) {
      formattedText += 'e+' + exponent;
    }
  }
  if (number < 0 && !isZero) {
    return pattern.negPre + formattedText + pattern.negSuf;
  } else {
    return pattern.posPre + formattedText + pattern.posSuf;
  }
}

function padNumber(num, digits, trim, negWrap) {
  var neg = '';
  if (num < 0 || (negWrap && num <= 0)) {
    if (negWrap) {
      num = -num + 1;
    } else {
      num = -num;
      neg = '-';
    }
  }
  num = '' + num;
  while (num.length < digits) num = ZERO_CHAR + num;
  if (trim) {
    num = num.substr(num.length - digits);
  }
  return neg + num;
}


function dateGetter(name, size, offset, trim, negWrap) {
  offset = offset || 0;
  return function(date) {
    var value = date['get' + name]();
    if (offset > 0 || value > -offset) {
      value += offset;
    }
    if (value === 0 && offset === -12) value = 12;
    return padNumber(value, size, trim, negWrap);
  };
}

function dateStrGetter(name, shortForm, standAlone) {
  return function(date, formats) {
    var value = date['get' + name]();
    var propPrefix = (standAlone ? 'STANDALONE' : '') + (shortForm ? 'SHORT' : '');
    var get = uppercase(propPrefix + name);

    return formats[get][value];
  };
}

function timeZoneGetter(date, formats, offset) {
  var zone = -1 * offset;
  var paddedZone = (zone >= 0) ? '+' : '';

  paddedZone += padNumber(Math[zone > 0 ? 'floor' : 'ceil'](zone / 60), 2) +
                padNumber(Math.abs(zone % 60), 2);

  return paddedZone;
}

function getFirstThursdayOfYear(year) {
    // 0 = index of January
    var dayOfWeekOnFirst = (new Date(year, 0, 1)).getDay();
    // 4 = index of Thursday (+1 to account for 1st = 5)
    // 11 = index of *next* Thursday (+1 account for 1st = 12)
    return new Date(year, 0, ((dayOfWeekOnFirst <= 4) ? 5 : 12) - dayOfWeekOnFirst);
}

function getThursdayThisWeek(datetime) {
    return new Date(datetime.getFullYear(), datetime.getMonth(),
      // 4 = index of Thursday
      datetime.getDate() + (4 - datetime.getDay()));
}

function weekGetter(size) {
   return function(date) {
      var firstThurs = getFirstThursdayOfYear(date.getFullYear()),
         thisThurs = getThursdayThisWeek(date);

      var diff = +thisThurs - +firstThurs,
         result = 1 + Math.round(diff / 6.048e8); // 6.048e8 ms per week

      return padNumber(result, size);
   };
}

function ampmGetter(date, formats) {
  return date.getHours() < 12 ? formats.AMPMS[0] : formats.AMPMS[1];
}

function eraGetter(date, formats) {
  return date.getFullYear() <= 0 ? formats.ERAS[0] : formats.ERAS[1];
}

function longEraGetter(date, formats) {
  return date.getFullYear() <= 0 ? formats.ERANAMES[0] : formats.ERANAMES[1];
}

var DATE_FORMATS = {
  yyyy: dateGetter('FullYear', 4, 0, false, true),
    yy: dateGetter('FullYear', 2, 0, true, true),
     y: dateGetter('FullYear', 1, 0, false, true),
  MMMM: dateStrGetter('Month'),
   MMM: dateStrGetter('Month', true),
    MM: dateGetter('Month', 2, 1),
     M: dateGetter('Month', 1, 1),
  LLLL: dateStrGetter('Month', false, true),
    dd: dateGetter('Date', 2),
     d: dateGetter('Date', 1),
    HH: dateGetter('Hours', 2),
     H: dateGetter('Hours', 1),
    hh: dateGetter('Hours', 2, -12),
     h: dateGetter('Hours', 1, -12),
    mm: dateGetter('Minutes', 2),
     m: dateGetter('Minutes', 1),
    ss: dateGetter('Seconds', 2),
     s: dateGetter('Seconds', 1),
     // while ISO 8601 requires fractions to be prefixed with `.` or `,`
     // we can be just safely rely on using `sss` since we currently don't support single or two digit fractions
   sss: dateGetter('Milliseconds', 3),
  EEEE: dateStrGetter('Day'),
   EEE: dateStrGetter('Day', true),
     a: ampmGetter,
     Z: timeZoneGetter,
    ww: weekGetter(2),
     w: weekGetter(1),
     G: eraGetter,
     GG: eraGetter,
     GGG: eraGetter,
     GGGG: longEraGetter
};

var DATE_FORMATS_SPLIT = /((?:[^yMLdHhmsaZEwG']+)|(?:'(?:[^']|'')*')|(?:E+|y+|M+|L+|d+|H+|h+|m+|s+|a|Z|G+|w+))([\s\S]*)/,
    NUMBER_STRING = /^-?\d+$/;

dateFilter.$inject = ['$locale'];
function dateFilter($locale) {


  var R_ISO8601_STR = /^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/;
                     // 1        2       3         4          5          6          7          8  9     10      11
  function jsonStringToDate(string) {
    var match;
    if ((match = string.match(R_ISO8601_STR))) {
      var date = new Date(0),
          tzHour = 0,
          tzMin  = 0,
          dateSetter = match[8] ? date.setUTCFullYear : date.setFullYear,
          timeSetter = match[8] ? date.setUTCHours : date.setHours;

      if (match[9]) {
        tzHour = toInt(match[9] + match[10]);
        tzMin = toInt(match[9] + match[11]);
      }
      dateSetter.call(date, toInt(match[1]), toInt(match[2]) - 1, toInt(match[3]));
      var h = toInt(match[4] || 0) - tzHour;
      var m = toInt(match[5] || 0) - tzMin;
      var s = toInt(match[6] || 0);
      var ms = Math.round(parseFloat('0.' + (match[7] || 0)) * 1000);
      timeSetter.call(date, h, m, s, ms);
      return date;
    }
    return string;
  }


  return function(date, format, timezone) {
    var text = '',
        parts = [],
        fn, match;

    format = format || 'mediumDate';
    format = $locale.DATETIME_FORMATS[format] || format;
    if (isString(date)) {
      date = NUMBER_STRING.test(date) ? toInt(date) : jsonStringToDate(date);
    }

    if (isNumber(date)) {
      date = new Date(date);
    }

    if (!isDate(date) || !isFinite(date.getTime())) {
      return date;
    }

    while (format) {
      match = DATE_FORMATS_SPLIT.exec(format);
      if (match) {
        parts = concat(parts, match, 1);
        format = parts.pop();
      } else {
        parts.push(format);
        format = null;
      }
    }

    var dateTimezoneOffset = date.getTimezoneOffset();
    if (timezone) {
      dateTimezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
      date = convertTimezoneToLocal(date, timezone, true);
    }
    forEach(parts, function(value) {
      fn = DATE_FORMATS[value];
      text += fn ? fn(date, $locale.DATETIME_FORMATS, dateTimezoneOffset)
                 : value === '\'\'' ? '\'' : value.replace(/(^'|'$)/g, '').replace(/''/g, '\'');
    });

    return text;
  };
}


function jsonFilter() {
  return function(object, spacing) {
    if (isUndefined(spacing)) {
        spacing = 2;
    }
    return toJson(object, spacing);
  };
}

var lowercaseFilter = valueFn(lowercase);


var uppercaseFilter = valueFn(uppercase);

function limitToFilter() {
  return function(input, limit, begin) {
    if (Math.abs(Number(limit)) === Infinity) {
      limit = Number(limit);
    } else {
      limit = toInt(limit);
    }
    if (isNumberNaN(limit)) return input;

    if (isNumber(input)) input = input.toString();
    if (!isArrayLike(input)) return input;

    begin = (!begin || isNaN(begin)) ? 0 : toInt(begin);
    begin = (begin < 0) ? Math.max(0, input.length + begin) : begin;

    if (limit >= 0) {
      return sliceFn(input, begin, begin + limit);
    } else {
      if (begin === 0) {
        return sliceFn(input, limit, input.length);
      } else {
        return sliceFn(input, Math.max(0, begin + limit), begin);
      }
    }
  };
}

function sliceFn(input, begin, end) {
  if (isString(input)) return input.slice(begin, end);

  return slice.call(input, begin, end);
}

orderByFilter.$inject = ['$parse'];
function orderByFilter($parse) {
  return function(array, sortPredicate, reverseOrder, compareFn) {

    if (array == null) return array;
    if (!isArrayLike(array)) {
      throw minErr('orderBy')('notarray', 'Expected array but received: {0}', array);
    }

    if (!isArray(sortPredicate)) { sortPredicate = [sortPredicate]; }
    if (sortPredicate.length === 0) { sortPredicate = ['+']; }

    var predicates = processPredicates(sortPredicate);

    var descending = reverseOrder ? -1 : 1;

    // Define the `compare()` function. Use a default comparator if none is specified.
    var compare = isFunction(compareFn) ? compareFn : defaultCompare;

    // The next three lines are a version of a Swartzian Transform idiom from Perl
    // (sometimes called the Decorate-Sort-Undecorate idiom)
    // See https://en.wikipedia.org/wiki/Schwartzian_transform
    var compareValues = Array.prototype.map.call(array, getComparisonObject);
    compareValues.sort(doComparison);
    array = compareValues.map(function(item) { return item.value; });

    return array;

    function getComparisonObject(value, index) {
      // NOTE: We are adding an extra `tieBreaker` value based on the element's index.
      // This will be used to keep the sort stable when none of the input predicates can
      // distinguish between two elements.
      return {
        value: value,
        tieBreaker: {value: index, type: 'number', index: index},
        predicateValues: predicates.map(function(predicate) {
          return getPredicateValue(predicate.get(value), index);
        })
      };
    }

    function doComparison(v1, v2) {
      for (var i = 0, ii = predicates.length; i < ii; i++) {
        var result = compare(v1.predicateValues[i], v2.predicateValues[i]);
        if (result) {
          return result * predicates[i].descending * descending;
        }
      }

      return compare(v1.tieBreaker, v2.tieBreaker) * descending;
    }
  };

  function processPredicates(sortPredicates) {
    return sortPredicates.map(function(predicate) {
      var descending = 1, get = identity;

      if (isFunction(predicate)) {
        get = predicate;
      } else if (isString(predicate)) {
        if ((predicate.charAt(0) === '+' || predicate.charAt(0) === '-')) {
          descending = predicate.charAt(0) === '-' ? -1 : 1;
          predicate = predicate.substring(1);
        }
        if (predicate !== '') {
          get = $parse(predicate);
          if (get.constant) {
            var key = get();
            get = function(value) { return value[key]; };
          }
        }
      }
      return {get: get, descending: descending};
    });
  }

  function isPrimitive(value) {
    switch (typeof value) {
      case 'number': /* falls through */
      case 'boolean': /* falls through */
      case 'string':
        return true;
      default:
        return false;
    }
  }

  function objectValue(value) {
    // If `valueOf` is a valid function use that
    if (isFunction(value.valueOf)) {
      value = value.valueOf();
      if (isPrimitive(value)) return value;
    }
    // If `toString` is a valid function and not the one from `Object.prototype` use that
    if (hasCustomToString(value)) {
      value = value.toString();
      if (isPrimitive(value)) return value;
    }

    return value;
  }

  function getPredicateValue(value, index) {
    var type = typeof value;
    if (value === null) {
      type = 'string';
      value = 'null';
    } else if (type === 'object') {
      value = objectValue(value);
    }
    return {value: value, type: type, index: index};
  }

  function defaultCompare(v1, v2) {
    var result = 0;
    var type1 = v1.type;
    var type2 = v2.type;

    if (type1 === type2) {
      var value1 = v1.value;
      var value2 = v2.value;

      if (type1 === 'string') {
        // Compare strings case-insensitively
        value1 = value1.toLowerCase();
        value2 = value2.toLowerCase();
      } else if (type1 === 'object') {
        // For basic objects, use the position of the object
        // in the collection instead of the value
        if (isObject(value1)) value1 = v1.index;
        if (isObject(value2)) value2 = v2.index;
      }

      if (value1 !== value2) {
        result = value1 < value2 ? -1 : 1;
      }
    } else {
      result = type1 < type2 ? -1 : 1;
    }

    return result;
  }
}

function ngDirective(directive) {
  if (isFunction(directive)) {
    directive = {
      link: directive
    };
  }
  directive.restrict = directive.restrict || 'AC';
  return valueFn(directive);
}

var htmlAnchorDirective = valueFn({
  restrict: 'E',
  compile: function(element, attr) {
    if (!attr.href && !attr.xlinkHref) {
      return function(scope, element) {
        // If the linked element is not an anchor tag anymore, do nothing
        if (element[0].nodeName.toLowerCase() !== 'a') return;

        // SVGAElement does not use the href attribute, but rather the 'xlinkHref' attribute.
        var href = toString.call(element.prop('href')) === '[object SVGAnimatedString]' ?
                   'xlink:href' : 'href';
        element.on('click', function(event) {
          // if we have no href url, then don't navigate anywhere.
          if (!element.attr(href)) {
            event.preventDefault();
          }
        });
      };
    }
  }
});

var ngAttributeAliasDirectives = {};

// boolean attrs are evaluated
forEach(BOOLEAN_ATTR, function(propName, attrName) {
  // binding to multiple is not supported
  if (propName === 'multiple') return;

  function defaultLinkFn(scope, element, attr) {
    scope.$watch(attr[normalized], function ngBooleanAttrWatchAction(value) {
      attr.$set(attrName, !!value);
    });
  }

  var normalized = directiveNormalize('ng-' + attrName);
  var linkFn = defaultLinkFn;

  if (propName === 'checked') {
    linkFn = function(scope, element, attr) {
      // ensuring ngChecked doesn't interfere with ngModel when both are set on the same input
      if (attr.ngModel !== attr[normalized]) {
        defaultLinkFn(scope, element, attr);
      }
    };
  }

  ngAttributeAliasDirectives[normalized] = function() {
    return {
      restrict: 'A',
      priority: 100,
      link: linkFn
    };
  };
});

// aliased input attrs are evaluated
forEach(ALIASED_ATTR, function(htmlAttr, ngAttr) {
  ngAttributeAliasDirectives[ngAttr] = function() {
    return {
      priority: 100,
      link: function(scope, element, attr) {
        //special case ngPattern when a literal regular expression value
        //is used as the expression (this way we don't have to watch anything).
        if (ngAttr === 'ngPattern' && attr.ngPattern.charAt(0) === '/') {
          var match = attr.ngPattern.match(REGEX_STRING_REGEXP);
          if (match) {
            attr.$set('ngPattern', new RegExp(match[1], match[2]));
            return;
          }
        }

        scope.$watch(attr[ngAttr], function ngAttrAliasWatchAction(value) {
          attr.$set(ngAttr, value);
        });
      }
    };
  };
});

// ng-src, ng-srcset, ng-href are interpolated
forEach(['src', 'srcset', 'href'], function(attrName) {
  var normalized = directiveNormalize('ng-' + attrName);
  ngAttributeAliasDirectives[normalized] = function() {
    return {
      priority: 99, // it needs to run after the attributes are interpolated
      link: function(scope, element, attr) {
        var propName = attrName,
            name = attrName;

        if (attrName === 'href' &&
            toString.call(element.prop('href')) === '[object SVGAnimatedString]') {
          name = 'xlinkHref';
          attr.$attr[name] = 'xlink:href';
          propName = null;
        }

        attr.$observe(normalized, function(value) {
          if (!value) {
            if (attrName === 'href') {
              attr.$set(name, null);
            }
            return;
          }

          attr.$set(name, value);

          // Support: IE 9-11 only
          // On IE, if "ng:src" directive declaration is used and "src" attribute doesn't exist
          // then calling element.setAttribute('src', 'foo') doesn't do anything, so we need
          // to set the property as well to achieve the desired effect.
          // We use attr[attrName] value since $set can sanitize the url.
          if (msie && propName) element.prop(propName, attr[name]);
        });
      }
    };
  };
});

var nullFormCtrl = {
  $addControl: noop,
  $$renameControl: nullFormRenameControl,
  $removeControl: noop,
  $setValidity: noop,
  $setDirty: noop,
  $setPristine: noop,
  $setSubmitted: noop
},
PENDING_CLASS = 'ng-pending',
SUBMITTED_CLASS = 'ng-submitted';

function nullFormRenameControl(control, name) {
  control.$name = name;
}

//asks for $scope to fool the BC controller module
FormController.$inject = ['$element', '$attrs', '$scope', '$animate', '$interpolate'];
function FormController($element, $attrs, $scope, $animate, $interpolate) {
  this.$$controls = [];

  // init state
  this.$error = {};
  this.$$success = {};
  this.$pending = undefined;
  this.$name = $interpolate($attrs.name || $attrs.ngForm || '')($scope);
  this.$dirty = false;
  this.$pristine = true;
  this.$valid = true;
  this.$invalid = false;
  this.$submitted = false;
  this.$$parentForm = nullFormCtrl;

  this.$$element = $element;
  this.$$animate = $animate;

  setupValidity(this);
}

FormController.prototype = {

  $rollbackViewValue: function() {
    forEach(this.$$controls, function(control) {
      control.$rollbackViewValue();
    });
  },

  $commitViewValue: function() {
    forEach(this.$$controls, function(control) {
      control.$commitViewValue();
    });
  },

  $addControl: function(control) {
    // Breaking change - before, inputs whose name was "hasOwnProperty" were quietly ignored
    // and not added to the scope.  Now we throw an error.
    assertNotHasOwnProperty(control.$name, 'input');
    this.$$controls.push(control);

    if (control.$name) {
      this[control.$name] = control;
    }

    control.$$parentForm = this;
  },

  // Private API: rename a form control
  $$renameControl: function(control, newName) {
    var oldName = control.$name;

    if (this[oldName] === control) {
      delete this[oldName];
    }
    this[newName] = control;
    control.$name = newName;
  },
  $removeControl: function(control) {
    if (control.$name && this[control.$name] === control) {
      delete this[control.$name];
    }
    forEach(this.$pending, function(value, name) {
      // eslint-disable-next-line no-invalid-this
      this.$setValidity(name, null, control);
    }, this);
    forEach(this.$error, function(value, name) {
      // eslint-disable-next-line no-invalid-this
      this.$setValidity(name, null, control);
    }, this);
    forEach(this.$$success, function(value, name) {
      // eslint-disable-next-line no-invalid-this
      this.$setValidity(name, null, control);
    }, this);

    arrayRemove(this.$$controls, control);
    control.$$parentForm = nullFormCtrl;
  },
  $setDirty: function() {
    this.$$animate.removeClass(this.$$element, PRISTINE_CLASS);
    this.$$animate.addClass(this.$$element, DIRTY_CLASS);
    this.$dirty = true;
    this.$pristine = false;
    this.$$parentForm.$setDirty();
  },
  $setPristine: function() {
    this.$$animate.setClass(this.$$element, PRISTINE_CLASS, DIRTY_CLASS + ' ' + SUBMITTED_CLASS);
    this.$dirty = false;
    this.$pristine = true;
    this.$submitted = false;
    forEach(this.$$controls, function(control) {
      control.$setPristine();
    });
  },
  $setUntouched: function() {
    forEach(this.$$controls, function(control) {
      control.$setUntouched();
    });
  },

  $setSubmitted: function() {
    this.$$animate.addClass(this.$$element, SUBMITTED_CLASS);
    this.$submitted = true;
    this.$$parentForm.$setSubmitted();
  }
};

addSetValidityMethod({
  clazz: FormController,
  set: function(object, property, controller) {
    var list = object[property];
    if (!list) {
      object[property] = [controller];
    } else {
      var index = list.indexOf(controller);
      if (index === -1) {
        list.push(controller);
      }
    }
  },
  unset: function(object, property, controller) {
    var list = object[property];
    if (!list) {
      return;
    }
    arrayRemove(list, controller);
    if (list.length === 0) {
      delete object[property];
    }
  }
});

var formDirectiveFactory = function(isNgForm) {
  return ['$timeout', '$parse', function($timeout, $parse) {
    var formDirective = {
      name: 'form',
      restrict: isNgForm ? 'EAC' : 'E',
      require: ['form', '^^?form'], //first is the form's own ctrl, second is an optional parent form
      controller: FormController,
      compile: function ngFormCompile(formElement, attr) {
        // Setup initial state of the control
        formElement.addClass(PRISTINE_CLASS).addClass(VALID_CLASS);

        var nameAttr = attr.name ? 'name' : (isNgForm && attr.ngForm ? 'ngForm' : false);

        return {
          pre: function ngFormPreLink(scope, formElement, attr, ctrls) {
            var controller = ctrls[0];

            // if `action` attr is not present on the form, prevent the default action (submission)
            if (!('action' in attr)) {
              // we can't use jq events because if a form is destroyed during submission the default
              // action is not prevented. see #1238
              //
              // IE 9 is not affected because it doesn't fire a submit event and try to do a full
              // page reload if the form was destroyed by submission of the form via a click handler
              // on a button in the form. Looks like an IE9 specific bug.
              var handleFormSubmission = function(event) {
                scope.$apply(function() {
                  controller.$commitViewValue();
                  controller.$setSubmitted();
                });

                event.preventDefault();
              };

              formElement[0].addEventListener('submit', handleFormSubmission);

              // unregister the preventDefault listener so that we don't not leak memory but in a
              // way that will achieve the prevention of the default action.
              formElement.on('$destroy', function() {
                $timeout(function() {
                  formElement[0].removeEventListener('submit', handleFormSubmission);
                }, 0, false);
              });
            }

            var parentFormCtrl = ctrls[1] || controller.$$parentForm;
            parentFormCtrl.$addControl(controller);

            var setter = nameAttr ? getSetter(controller.$name) : noop;

            if (nameAttr) {
              setter(scope, controller);
              attr.$observe(nameAttr, function(newValue) {
                if (controller.$name === newValue) return;
                setter(scope, undefined);
                controller.$$parentForm.$$renameControl(controller, newValue);
                setter = getSetter(controller.$name);
                setter(scope, controller);
              });
            }
            formElement.on('$destroy', function() {
              controller.$$parentForm.$removeControl(controller);
              setter(scope, undefined);
              extend(controller, nullFormCtrl); //stop propagating child destruction handlers upwards
            });
          }
        };
      }
    };

    return formDirective;

    function getSetter(expression) {
      if (expression === '') {
        //create an assignable expression, so forms with an empty name can be renamed later
        return $parse('this[""]').assign;
      }
      return $parse(expression).assign || noop;
    }
  }];
};

var formDirective = formDirectiveFactory();
var ngFormDirective = formDirectiveFactory(true);



// helper methods
function setupValidity(instance) {
  instance.$$classCache = {};
  instance.$$classCache[INVALID_CLASS] = !(instance.$$classCache[VALID_CLASS] = instance.$$element.hasClass(VALID_CLASS));
}
function addSetValidityMethod(context) {
  var clazz = context.clazz,
      set = context.set,
      unset = context.unset;

  clazz.prototype.$setValidity = function(validationErrorKey, state, controller) {
    if (isUndefined(state)) {
      createAndSet(this, '$pending', validationErrorKey, controller);
    } else {
      unsetAndCleanup(this, '$pending', validationErrorKey, controller);
    }
    if (!isBoolean(state)) {
      unset(this.$error, validationErrorKey, controller);
      unset(this.$$success, validationErrorKey, controller);
    } else {
      if (state) {
        unset(this.$error, validationErrorKey, controller);
        set(this.$$success, validationErrorKey, controller);
      } else {
        set(this.$error, validationErrorKey, controller);
        unset(this.$$success, validationErrorKey, controller);
      }
    }
    if (this.$pending) {
      cachedToggleClass(this, PENDING_CLASS, true);
      this.$valid = this.$invalid = undefined;
      toggleValidationCss(this, '', null);
    } else {
      cachedToggleClass(this, PENDING_CLASS, false);
      this.$valid = isObjectEmpty(this.$error);
      this.$invalid = !this.$valid;
      toggleValidationCss(this, '', this.$valid);
    }

    // re-read the state as the set/unset methods could have
    // combined state in this.$error[validationError] (used for forms),
    // where setting/unsetting only increments/decrements the value,
    // and does not replace it.
    var combinedState;
    if (this.$pending && this.$pending[validationErrorKey]) {
      combinedState = undefined;
    } else if (this.$error[validationErrorKey]) {
      combinedState = false;
    } else if (this.$$success[validationErrorKey]) {
      combinedState = true;
    } else {
      combinedState = null;
    }

    toggleValidationCss(this, validationErrorKey, combinedState);
    this.$$parentForm.$setValidity(validationErrorKey, combinedState, this);
  };

  function createAndSet(ctrl, name, value, controller) {
    if (!ctrl[name]) {
      ctrl[name] = {};
    }
    set(ctrl[name], value, controller);
  }

  function unsetAndCleanup(ctrl, name, value, controller) {
    if (ctrl[name]) {
      unset(ctrl[name], value, controller);
    }
    if (isObjectEmpty(ctrl[name])) {
      ctrl[name] = undefined;
    }
  }

  function cachedToggleClass(ctrl, className, switchValue) {
    if (switchValue && !ctrl.$$classCache[className]) {
      ctrl.$$animate.addClass(ctrl.$$element, className);
      ctrl.$$classCache[className] = true;
    } else if (!switchValue && ctrl.$$classCache[className]) {
      ctrl.$$animate.removeClass(ctrl.$$element, className);
      ctrl.$$classCache[className] = false;
    }
  }

  function toggleValidationCss(ctrl, validationErrorKey, isValid) {
    validationErrorKey = validationErrorKey ? '-' + snake_case(validationErrorKey, '-') : '';

    cachedToggleClass(ctrl, VALID_CLASS + validationErrorKey, isValid === true);
    cachedToggleClass(ctrl, INVALID_CLASS + validationErrorKey, isValid === false);
  }
}

function isObjectEmpty(obj) {
  if (obj) {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        return false;
      }
    }
  }
  return true;
}


// Regex code was initially obtained from SO prior to modification: https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime#answer-3143231
var ISO_DATE_REGEXP = /^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/;
// See valid URLs in RFC3987 (http://tools.ietf.org/html/rfc3987)
// Note: We are being more lenient, because browsers are too.
//   1. Scheme
//   2. Slashes
//   3. Username
//   4. Password
//   5. Hostname
//   6. Port
//   7. Path
//   8. Query
//   9. Fragment
//                 1111111111111111 222   333333    44444        55555555555555555555555     666     77777777     8888888     999
var URL_REGEXP = /^[a-z][a-z\d.+-]*:\/*(?:[^:@]+(?::[^@]+)?@)?(?:[^\s:/?#]+|\[[a-f\d:]+])(?::\d+)?(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i;
// eslint-disable-next-line max-len
var EMAIL_REGEXP = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
var NUMBER_REGEXP = /^\s*(-|\+)?(\d+|(\d*(\.\d*)))([eE][+-]?\d+)?\s*$/;
var DATE_REGEXP = /^(\d{4,})-(\d{2})-(\d{2})$/;
var DATETIMELOCAL_REGEXP = /^(\d{4,})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(\.\d{1,3})?)?$/;
var WEEK_REGEXP = /^(\d{4,})-W(\d\d)$/;
var MONTH_REGEXP = /^(\d{4,})-(\d\d)$/;
var TIME_REGEXP = /^(\d\d):(\d\d)(?::(\d\d)(\.\d{1,3})?)?$/;

var PARTIAL_VALIDATION_EVENTS = 'keydown wheel mousedown';
var PARTIAL_VALIDATION_TYPES = createMap();
forEach('date,datetime-local,month,time,week'.split(','), function(type) {
  PARTIAL_VALIDATION_TYPES[type] = true;
});

var inputType = {

  'text': textInputType,

  'date': createDateInputType('date', DATE_REGEXP,
         createDateParser(DATE_REGEXP, ['yyyy', 'MM', 'dd']),
         'yyyy-MM-dd'),

  'datetime-local': createDateInputType('datetimelocal', DATETIMELOCAL_REGEXP,
      createDateParser(DATETIMELOCAL_REGEXP, ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss', 'sss']),
      'yyyy-MM-ddTHH:mm:ss.sss'),

  'time': createDateInputType('time', TIME_REGEXP,
      createDateParser(TIME_REGEXP, ['HH', 'mm', 'ss', 'sss']),
     'HH:mm:ss.sss'),

  'week': createDateInputType('week', WEEK_REGEXP, weekParser, 'yyyy-Www'),

  'month': createDateInputType('month', MONTH_REGEXP,
     createDateParser(MONTH_REGEXP, ['yyyy', 'MM']),
     'yyyy-MM'),

  'number': numberInputType,

  'url': urlInputType,

  'email': emailInputType,

  'radio': radioInputType,

  'range': rangeInputType,

  'checkbox': checkboxInputType,

  'hidden': noop,
  'button': noop,
  'submit': noop,
  'reset': noop,
  'file': noop
};

function stringBasedInputType(ctrl) {
  ctrl.$formatters.push(function(value) {
    return ctrl.$isEmpty(value) ? value : value.toString();
  });
}

function textInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  baseInputType(scope, element, attr, ctrl, $sniffer, $browser);
  stringBasedInputType(ctrl);
}

function baseInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  var type = lowercase(element[0].type);

  // In composition mode, users are still inputting intermediate text buffer,
  // hold the listener until composition is done.
  // More about composition events: https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent
  if (!$sniffer.android) {
    var composing = false;

    element.on('compositionstart', function() {
      composing = true;
    });

    element.on('compositionend', function() {
      composing = false;
      listener();
    });
  }

  var timeout;

  var listener = function(ev) {
    if (timeout) {
      $browser.defer.cancel(timeout);
      timeout = null;
    }
    if (composing) return;
    var value = element.val(),
        event = ev && ev.type;

    // By default we will trim the value
    // If the attribute ng-trim exists we will avoid trimming
    // If input type is 'password', the value is never trimmed
    if (type !== 'password' && (!attr.ngTrim || attr.ngTrim !== 'false')) {
      value = trim(value);
    }

    // If a control is suffering from bad input (due to native validators), browsers discard its
    // value, so it may be necessary to revalidate (by calling $setViewValue again) even if the
    // control's value is the same empty value twice in a row.
    if (ctrl.$viewValue !== value || (value === '' && ctrl.$$hasNativeValidators)) {
      ctrl.$setViewValue(value, event);
    }
  };

  // if the browser does support "input" event, we are fine - except on IE9 which doesn't fire the
  // input event on backspace, delete or cut
  if ($sniffer.hasEvent('input')) {
    element.on('input', listener);
  } else {
    var deferListener = function(ev, input, origValue) {
      if (!timeout) {
        timeout = $browser.defer(function() {
          timeout = null;
          if (!input || input.value !== origValue) {
            listener(ev);
          }
        });
      }
    };

    element.on('keydown', /** @this */ function(event) {
      var key = event.keyCode;

      // ignore
      //    command            modifiers                   arrows
      if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return;

      deferListener(event, this, this.value);
    });

    // if user modifies input value using context menu in IE, we need "paste" and "cut" events to catch it
    if ($sniffer.hasEvent('paste')) {
      element.on('paste cut', deferListener);
    }
  }

  // if user paste into input using mouse on older browser
  // or form autocomplete on newer browser, we need "change" event to catch it
  element.on('change', listener);

  // Some native input types (date-family) have the ability to change validity without
  // firing any input/change events.
  // For these event types, when native validators are present and the browser supports the type,
  // check for validity changes on various DOM events.
  if (PARTIAL_VALIDATION_TYPES[type] && ctrl.$$hasNativeValidators && type === attr.type) {
    element.on(PARTIAL_VALIDATION_EVENTS, /** @this */ function(ev) {
      if (!timeout) {
        var validity = this[VALIDITY_STATE_PROPERTY];
        var origBadInput = validity.badInput;
        var origTypeMismatch = validity.typeMismatch;
        timeout = $browser.defer(function() {
          timeout = null;
          if (validity.badInput !== origBadInput || validity.typeMismatch !== origTypeMismatch) {
            listener(ev);
          }
        });
      }
    });
  }

  ctrl.$render = function() {
    // Workaround for Firefox validation #12102.
    var value = ctrl.$isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue;
    if (element.val() !== value) {
      element.val(value);
    }
  };
}

function weekParser(isoWeek, existingDate) {
  if (isDate(isoWeek)) {
    return isoWeek;
  }

  if (isString(isoWeek)) {
    WEEK_REGEXP.lastIndex = 0;
    var parts = WEEK_REGEXP.exec(isoWeek);
    if (parts) {
      var year = +parts[1],
          week = +parts[2],
          hours = 0,
          minutes = 0,
          seconds = 0,
          milliseconds = 0,
          firstThurs = getFirstThursdayOfYear(year),
          addDays = (week - 1) * 7;

      if (existingDate) {
        hours = existingDate.getHours();
        minutes = existingDate.getMinutes();
        seconds = existingDate.getSeconds();
        milliseconds = existingDate.getMilliseconds();
      }

      return new Date(year, 0, firstThurs.getDate() + addDays, hours, minutes, seconds, milliseconds);
    }
  }

  return NaN;
}

function createDateParser(regexp, mapping) {
  return function(iso, date) {
    var parts, map;

    if (isDate(iso)) {
      return iso;
    }

    if (isString(iso)) {
      // When a date is JSON'ified to wraps itself inside of an extra
      // set of double quotes. This makes the date parsing code unable
      // to match the date string and parse it as a date.
      if (iso.charAt(0) === '"' && iso.charAt(iso.length - 1) === '"') {
        iso = iso.substring(1, iso.length - 1);
      }
      if (ISO_DATE_REGEXP.test(iso)) {
        return new Date(iso);
      }
      regexp.lastIndex = 0;
      parts = regexp.exec(iso);

      if (parts) {
        parts.shift();
        if (date) {
          map = {
            yyyy: date.getFullYear(),
            MM: date.getMonth() + 1,
            dd: date.getDate(),
            HH: date.getHours(),
            mm: date.getMinutes(),
            ss: date.getSeconds(),
            sss: date.getMilliseconds() / 1000
          };
        } else {
          map = { yyyy: 1970, MM: 1, dd: 1, HH: 0, mm: 0, ss: 0, sss: 0 };
        }

        forEach(parts, function(part, index) {
          if (index < mapping.length) {
            map[mapping[index]] = +part;
          }
        });
        return new Date(map.yyyy, map.MM - 1, map.dd, map.HH, map.mm, map.ss || 0, map.sss * 1000 || 0);
      }
    }

    return NaN;
  };
}

function createDateInputType(type, regexp, parseDate, format) {
  return function dynamicDateInputType(scope, element, attr, ctrl, $sniffer, $browser, $filter) {
    badInputChecker(scope, element, attr, ctrl);
    baseInputType(scope, element, attr, ctrl, $sniffer, $browser);
    var timezone = ctrl && ctrl.$options.getOption('timezone');
    var previousDate;

    ctrl.$$parserName = type;
    ctrl.$parsers.push(function(value) {
      if (ctrl.$isEmpty(value)) return null;
      if (regexp.test(value)) {
        // Note: We cannot read ctrl.$modelValue, as there might be a different
        // parser/formatter in the processing chain so that the model
        // contains some different data format!
        var parsedDate = parseDate(value, previousDate);
        if (timezone) {
          parsedDate = convertTimezoneToLocal(parsedDate, timezone);
        }
        return parsedDate;
      }
      return undefined;
    });

    ctrl.$formatters.push(function(value) {
      if (value && !isDate(value)) {
        throw ngModelMinErr('datefmt', 'Expected `{0}` to be a date', value);
      }
      if (isValidDate(value)) {
        previousDate = value;
        if (previousDate && timezone) {
          previousDate = convertTimezoneToLocal(previousDate, timezone, true);
        }
        return $filter('date')(value, format, timezone);
      } else {
        previousDate = null;
        return '';
      }
    });

    if (isDefined(attr.min) || attr.ngMin) {
      var minVal;
      ctrl.$validators.min = function(value) {
        return !isValidDate(value) || isUndefined(minVal) || parseDate(value) >= minVal;
      };
      attr.$observe('min', function(val) {
        minVal = parseObservedDateValue(val);
        ctrl.$validate();
      });
    }

    if (isDefined(attr.max) || attr.ngMax) {
      var maxVal;
      ctrl.$validators.max = function(value) {
        return !isValidDate(value) || isUndefined(maxVal) || parseDate(value) <= maxVal;
      };
      attr.$observe('max', function(val) {
        maxVal = parseObservedDateValue(val);
        ctrl.$validate();
      });
    }

    function isValidDate(value) {
      // Invalid Date: getTime() returns NaN
      return value && !(value.getTime && value.getTime() !== value.getTime());
    }

    function parseObservedDateValue(val) {
      return isDefined(val) && !isDate(val) ? parseDate(val) || undefined : val;
    }
  };
}

function badInputChecker(scope, element, attr, ctrl) {
  var node = element[0];
  var nativeValidation = ctrl.$$hasNativeValidators = isObject(node.validity);
  if (nativeValidation) {
    ctrl.$parsers.push(function(value) {
      var validity = element.prop(VALIDITY_STATE_PROPERTY) || {};
      return validity.badInput || validity.typeMismatch ? undefined : value;
    });
  }
}

function numberFormatterParser(ctrl) {
  ctrl.$$parserName = 'number';
  ctrl.$parsers.push(function(value) {
    if (ctrl.$isEmpty(value))      return null;
    if (NUMBER_REGEXP.test(value)) return parseFloat(value);
    return undefined;
  });

  ctrl.$formatters.push(function(value) {
    if (!ctrl.$isEmpty(value)) {
      if (!isNumber(value)) {
        throw ngModelMinErr('numfmt', 'Expected `{0}` to be a number', value);
      }
      value = value.toString();
    }
    return value;
  });
}

function parseNumberAttrVal(val) {
  if (isDefined(val) && !isNumber(val)) {
    val = parseFloat(val);
  }
  return !isNumberNaN(val) ? val : undefined;
}

function isNumberInteger(num) {
  // See http://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript#14794066
  // (minus the assumption that `num` is a number)

  // eslint-disable-next-line no-bitwise
  return (num | 0) === num;
}

function countDecimals(num) {
  var numString = num.toString();
  var decimalSymbolIndex = numString.indexOf('.');

  if (decimalSymbolIndex === -1) {
    if (-1 < num && num < 1) {
      // It may be in the exponential notation format (`1e-X`)
      var match = /e-(\d+)$/.exec(numString);

      if (match) {
        return Number(match[1]);
      }
    }

    return 0;
  }

  return numString.length - decimalSymbolIndex - 1;
}

function isValidForStep(viewValue, stepBase, step) {
  // At this point `stepBase` and `step` are expected to be non-NaN values
  // and `viewValue` is expected to be a valid stringified number.
  var value = Number(viewValue);

  var isNonIntegerValue = !isNumberInteger(value);
  var isNonIntegerStepBase = !isNumberInteger(stepBase);
  var isNonIntegerStep = !isNumberInteger(step);

  // Due to limitations in Floating Point Arithmetic (e.g. `0.3 - 0.2 !== 0.1` or
  // `0.5 % 0.1 !== 0`), we need to convert all numbers to integers.
  if (isNonIntegerValue || isNonIntegerStepBase || isNonIntegerStep) {
    var valueDecimals = isNonIntegerValue ? countDecimals(value) : 0;
    var stepBaseDecimals = isNonIntegerStepBase ? countDecimals(stepBase) : 0;
    var stepDecimals = isNonIntegerStep ? countDecimals(step) : 0;

    var decimalCount = Math.max(valueDecimals, stepBaseDecimals, stepDecimals);
    var multiplier = Math.pow(10, decimalCount);

    value = value * multiplier;
    stepBase = stepBase * multiplier;
    step = step * multiplier;

    if (isNonIntegerValue) value = Math.round(value);
    if (isNonIntegerStepBase) stepBase = Math.round(stepBase);
    if (isNonIntegerStep) step = Math.round(step);
  }

  return (value - stepBase) % step === 0;
}

function numberInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  badInputChecker(scope, element, attr, ctrl);
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl, $sniffer, $browser);

  var minVal;
  var maxVal;

  if (isDefined(attr.min) || attr.ngMin) {
    ctrl.$validators.min = function(value) {
      return ctrl.$isEmpty(value) || isUndefined(minVal) || value >= minVal;
    };

    attr.$observe('min', function(val) {
      minVal = parseNumberAttrVal(val);
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    });
  }

  if (isDefined(attr.max) || attr.ngMax) {
    ctrl.$validators.max = function(value) {
      return ctrl.$isEmpty(value) || isUndefined(maxVal) || value <= maxVal;
    };

    attr.$observe('max', function(val) {
      maxVal = parseNumberAttrVal(val);
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    });
  }

  if (isDefined(attr.step) || attr.ngStep) {
    var stepVal;
    ctrl.$validators.step = function(modelValue, viewValue) {
      return ctrl.$isEmpty(viewValue) || isUndefined(stepVal) ||
             isValidForStep(viewValue, minVal || 0, stepVal);
    };

    attr.$observe('step', function(val) {
      stepVal = parseNumberAttrVal(val);
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    });
  }
}

function rangeInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  badInputChecker(scope, element, attr, ctrl);
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl, $sniffer, $browser);

  var supportsRange = ctrl.$$hasNativeValidators && element[0].type === 'range',
      minVal = supportsRange ? 0 : undefined,
      maxVal = supportsRange ? 100 : undefined,
      stepVal = supportsRange ? 1 : undefined,
      validity = element[0].validity,
      hasMinAttr = isDefined(attr.min),
      hasMaxAttr = isDefined(attr.max),
      hasStepAttr = isDefined(attr.step);

  var originalRender = ctrl.$render;

  ctrl.$render = supportsRange && isDefined(validity.rangeUnderflow) && isDefined(validity.rangeOverflow) ?
    //Browsers that implement range will set these values automatically, but reading the adjusted values after
    //$render would cause the min / max validators to be applied with the wrong value
    function rangeRender() {
      originalRender();
      ctrl.$setViewValue(element.val());
    } :
    originalRender;

  if (hasMinAttr) {
    ctrl.$validators.min = supportsRange ?
      // Since all browsers set the input to a valid value, we don't need to check validity
      function noopMinValidator() { return true; } :
      // non-support browsers validate the min val
      function minValidator(modelValue, viewValue) {
        return ctrl.$isEmpty(viewValue) || isUndefined(minVal) || viewValue >= minVal;
      };

    setInitialValueAndObserver('min', minChange);
  }

  if (hasMaxAttr) {
    ctrl.$validators.max = supportsRange ?
      // Since all browsers set the input to a valid value, we don't need to check validity
      function noopMaxValidator() { return true; } :
      // non-support browsers validate the max val
      function maxValidator(modelValue, viewValue) {
        return ctrl.$isEmpty(viewValue) || isUndefined(maxVal) || viewValue <= maxVal;
      };

    setInitialValueAndObserver('max', maxChange);
  }

  if (hasStepAttr) {
    ctrl.$validators.step = supportsRange ?
      function nativeStepValidator() {
        // Currently, only FF implements the spec on step change correctly (i.e. adjusting the
        // input element value to a valid value). It's possible that other browsers set the stepMismatch
        // validity error instead, so we can at least report an error in that case.
        return !validity.stepMismatch;
      } :
      // ngStep doesn't set the setp attr, so the browser doesn't adjust the input value as setting step would
      function stepValidator(modelValue, viewValue) {
        return ctrl.$isEmpty(viewValue) || isUndefined(stepVal) ||
               isValidForStep(viewValue, minVal || 0, stepVal);
      };

    setInitialValueAndObserver('step', stepChange);
  }

  function setInitialValueAndObserver(htmlAttrName, changeFn) {
    // interpolated attributes set the attribute value only after a digest, but we need the
    // attribute value when the input is first rendered, so that the browser can adjust the
    // input value based on the min/max value
    element.attr(htmlAttrName, attr[htmlAttrName]);
    attr.$observe(htmlAttrName, changeFn);
  }

  function minChange(val) {
    minVal = parseNumberAttrVal(val);
    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      var elVal = element.val();
      // IE11 doesn't set the el val correctly if the minVal is greater than the element value
      if (minVal > elVal) {
        elVal = minVal;
        element.val(elVal);
      }
      ctrl.$setViewValue(elVal);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  function maxChange(val) {
    maxVal = parseNumberAttrVal(val);
    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      var elVal = element.val();
      // IE11 doesn't set the el val correctly if the maxVal is less than the element value
      if (maxVal < elVal) {
        element.val(maxVal);
        // IE11 and Chrome don't set the value to the minVal when max < min
        elVal = maxVal < minVal ? minVal : maxVal;
      }
      ctrl.$setViewValue(elVal);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  function stepChange(val) {
    stepVal = parseNumberAttrVal(val);
    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    // Some browsers don't adjust the input value correctly, but set the stepMismatch error
    if (supportsRange && ctrl.$viewValue !== element.val()) {
      ctrl.$setViewValue(element.val());
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }
}

function urlInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl, $sniffer, $browser);
  stringBasedInputType(ctrl);

  ctrl.$$parserName = 'url';
  ctrl.$validators.url = function(modelValue, viewValue) {
    var value = modelValue || viewValue;
    return ctrl.$isEmpty(value) || URL_REGEXP.test(value);
  };
}

function emailInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl, $sniffer, $browser);
  stringBasedInputType(ctrl);

  ctrl.$$parserName = 'email';
  ctrl.$validators.email = function(modelValue, viewValue) {
    var value = modelValue || viewValue;
    return ctrl.$isEmpty(value) || EMAIL_REGEXP.test(value);
  };
}

function radioInputType(scope, element, attr, ctrl) {
  var doTrim = !attr.ngTrim || trim(attr.ngTrim) !== 'false';
  // make the name unique, if not defined
  if (isUndefined(attr.name)) {
    element.attr('name', nextUid());
  }

  var listener = function(ev) {
    var value;
    if (element[0].checked) {
      value = attr.value;
      if (doTrim) {
        value = trim(value);
      }
      ctrl.$setViewValue(value, ev && ev.type);
    }
  };

  element.on('click', listener);

  ctrl.$render = function() {
    var value = attr.value;
    if (doTrim) {
      value = trim(value);
    }
    element[0].checked = (value === ctrl.$viewValue);
  };

  attr.$observe('value', ctrl.$render);
}

function parseConstantExpr($parse, context, name, expression, fallback) {
  var parseFn;
  if (isDefined(expression)) {
    parseFn = $parse(expression);
    if (!parseFn.constant) {
      throw ngModelMinErr('constexpr', 'Expected constant expression for `{0}`, but saw ' +
                                   '`{1}`.', name, expression);
    }
    return parseFn(context);
  }
  return fallback;
}

function checkboxInputType(scope, element, attr, ctrl, $sniffer, $browser, $filter, $parse) {
  var trueValue = parseConstantExpr($parse, scope, 'ngTrueValue', attr.ngTrueValue, true);
  var falseValue = parseConstantExpr($parse, scope, 'ngFalseValue', attr.ngFalseValue, false);

  var listener = function(ev) {
    ctrl.$setViewValue(element[0].checked, ev && ev.type);
  };

  element.on('click', listener);

  ctrl.$render = function() {
    element[0].checked = ctrl.$viewValue;
  };

  // Override the standard `$isEmpty` because the $viewValue of an empty checkbox is always set to `false`
  // This is because of the parser below, which compares the `$modelValue` with `trueValue` to convert
  // it to a boolean.
  ctrl.$isEmpty = function(value) {
    return value === false;
  };

  ctrl.$formatters.push(function(value) {
    return equals(value, trueValue);
  });

  ctrl.$parsers.push(function(value) {
    return value ? trueValue : falseValue;
  });
}

var inputDirective = ['$browser', '$sniffer', '$filter', '$parse',
    function($browser, $sniffer, $filter, $parse) {
  return {
    restrict: 'E',
    require: ['?ngModel'],
    link: {
      pre: function(scope, element, attr, ctrls) {
        if (ctrls[0]) {
          (inputType[lowercase(attr.type)] || inputType.text)(scope, element, attr, ctrls[0], $sniffer,
                                                              $browser, $filter, $parse);
        }
      }
    }
  };
}];



var CONSTANT_VALUE_REGEXP = /^(true|false|\d+)$/;

var ngValueDirective = function() {

  function updateElementValue(element, attr, value) {
    // Support: IE9 only
    // In IE9 values are converted to string (e.g. `input.value = null` results in `input.value === 'null'`).
    var propValue = isDefined(value) ? value : (msie === 9) ? '' : null;
    element.prop('value', propValue);
    attr.$set('value', value);
  }

  return {
    restrict: 'A',
    priority: 100,
    compile: function(tpl, tplAttr) {
      if (CONSTANT_VALUE_REGEXP.test(tplAttr.ngValue)) {
        return function ngValueConstantLink(scope, elm, attr) {
          var value = scope.$eval(attr.ngValue);
          updateElementValue(elm, attr, value);
        };
      } else {
        return function ngValueLink(scope, elm, attr) {
          scope.$watch(attr.ngValue, function valueWatchAction(value) {
            updateElementValue(elm, attr, value);
          });
        };
      }
    }
  };
};

var ngBindDirective = ['$compile', function($compile) {
  return {
    restrict: 'AC',
    compile: function ngBindCompile(templateElement) {
      $compile.$$addBindingClass(templateElement);
      return function ngBindLink(scope, element, attr) {
        $compile.$$addBindingInfo(element, attr.ngBind);
        element = element[0];
        scope.$watch(attr.ngBind, function ngBindWatchAction(value) {
          element.textContent = stringify(value);
        });
      };
    }
  };
}];

var ngBindTemplateDirective = ['$interpolate', '$compile', function($interpolate, $compile) {
  return {
    compile: function ngBindTemplateCompile(templateElement) {
      $compile.$$addBindingClass(templateElement);
      return function ngBindTemplateLink(scope, element, attr) {
        var interpolateFn = $interpolate(element.attr(attr.$attr.ngBindTemplate));
        $compile.$$addBindingInfo(element, interpolateFn.expressions);
        element = element[0];
        attr.$observe('ngBindTemplate', function(value) {
          element.textContent = isUndefined(value) ? '' : value;
        });
      };
    }
  };
}];

var ngBindHtmlDirective = ['$sce', '$parse', '$compile', function($sce, $parse, $compile) {
  return {
    restrict: 'A',
    compile: function ngBindHtmlCompile(tElement, tAttrs) {
      var ngBindHtmlGetter = $parse(tAttrs.ngBindHtml);
      var ngBindHtmlWatch = $parse(tAttrs.ngBindHtml, function sceValueOf(val) {
        // Unwrap the value to compare the actual inner safe value, not the wrapper object.
        return $sce.valueOf(val);
      });
      $compile.$$addBindingClass(tElement);

      return function ngBindHtmlLink(scope, element, attr) {
        $compile.$$addBindingInfo(element, attr.ngBindHtml);

        scope.$watch(ngBindHtmlWatch, function ngBindHtmlWatchAction() {
          // The watched value is the unwrapped value. To avoid re-escaping, use the direct getter.
          var value = ngBindHtmlGetter(scope);
          element.html($sce.getTrustedHtml(value) || '');
        });
      };
    }
  };
}];

var ngChangeDirective = valueFn({
  restrict: 'A',
  require: 'ngModel',
  link: function(scope, element, attr, ctrl) {
    ctrl.$viewChangeListeners.push(function() {
      scope.$eval(attr.ngChange);
    });
  }
});

function classDirective(name, selector) {
  name = 'ngClass' + name;
  var indexWatchExpression;

  return ['$parse', function($parse) {
    return {
      restrict: 'AC',
      link: function(scope, element, attr) {
        var classCounts = element.data('$classCounts');
        var oldModulo = true;
        var oldClassString;

        if (!classCounts) {
          // Use createMap() to prevent class assumptions involving property
          // names in Object.prototype
          classCounts = createMap();
          element.data('$classCounts', classCounts);
        }

        if (name !== 'ngClass') {
          if (!indexWatchExpression) {
            indexWatchExpression = $parse('$index', function moduloTwo($index) {
              // eslint-disable-next-line no-bitwise
              return $index & 1;
            });
          }

          scope.$watch(indexWatchExpression, ngClassIndexWatchAction);
        }

        scope.$watch($parse(attr[name], toClassString), ngClassWatchAction);

        function addClasses(classString) {
          classString = digestClassCounts(split(classString), 1);
          attr.$addClass(classString);
        }

        function removeClasses(classString) {
          classString = digestClassCounts(split(classString), -1);
          attr.$removeClass(classString);
        }

        function updateClasses(oldClassString, newClassString) {
          var oldClassArray = split(oldClassString);
          var newClassArray = split(newClassString);

          var toRemoveArray = arrayDifference(oldClassArray, newClassArray);
          var toAddArray = arrayDifference(newClassArray, oldClassArray);

          var toRemoveString = digestClassCounts(toRemoveArray, -1);
          var toAddString = digestClassCounts(toAddArray, 1);

          attr.$addClass(toAddString);
          attr.$removeClass(toRemoveString);
        }

        function digestClassCounts(classArray, count) {
          var classesToUpdate = [];

          forEach(classArray, function(className) {
            if (count > 0 || classCounts[className]) {
              classCounts[className] = (classCounts[className] || 0) + count;
              if (classCounts[className] === +(count > 0)) {
                classesToUpdate.push(className);
              }
            }
          });

          return classesToUpdate.join(' ');
        }

        function ngClassIndexWatchAction(newModulo) {
          // This watch-action should run before the `ngClassWatchAction()`, thus it
          // adds/removes `oldClassString`. If the `ngClass` expression has changed as well, the
          // `ngClassWatchAction()` will update the classes.
          if (newModulo === selector) {
            addClasses(oldClassString);
          } else {
            removeClasses(oldClassString);
          }

          oldModulo = newModulo;
        }

        function ngClassWatchAction(newClassString) {
          // When using a one-time binding the newClassString will return
          // the pre-interceptor value until the one-time is complete
          if (!isString(newClassString)) {
            newClassString = toClassString(newClassString);
          }

          if (oldModulo === selector) {
            updateClasses(oldClassString, newClassString);
          }

          oldClassString = newClassString;
        }
      }
    };
  }];

  // Helpers
  function arrayDifference(tokens1, tokens2) {
    if (!tokens1 || !tokens1.length) return [];
    if (!tokens2 || !tokens2.length) return tokens1;

    var values = [];

    outer:
    for (var i = 0; i < tokens1.length; i++) {
      var token = tokens1[i];
      for (var j = 0; j < tokens2.length; j++) {
        if (token === tokens2[j]) continue outer;
      }
      values.push(token);
    }

    return values;
  }

  function split(classString) {
    return classString && classString.split(' ');
  }

  function toClassString(classValue) {
    var classString = classValue;

    if (isArray(classValue)) {
      classString = classValue.map(toClassString).join(' ');
    } else if (isObject(classValue)) {
      classString = Object.keys(classValue).
        filter(function(key) { return classValue[key]; }).
        join(' ');
    }

    return classString;
  }
}

var ngClassDirective = classDirective('', true);

var ngClassOddDirective = classDirective('Odd', 0);

var ngClassEvenDirective = classDirective('Even', 1);

var ngCloakDirective = ngDirective({
  compile: function(element, attr) {
    attr.$set('ngCloak', undefined);
    element.removeClass('ng-cloak');
  }
});

var ngControllerDirective = [function() {
  return {
    restrict: 'A',
    scope: true,
    controller: '@',
    priority: 500
  };
}];

var ngEventDirectives = {};

// For events that might fire synchronously during DOM manipulation
// we need to execute their event handlers asynchronously using $evalAsync,
// so that they are not executed in an inconsistent state.
var forceAsyncEvents = {
  'blur': true,
  'focus': true
};
forEach(
  'click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste'.split(' '),
  function(eventName) {
    var directiveName = directiveNormalize('ng-' + eventName);
    ngEventDirectives[directiveName] = ['$parse', '$rootScope', function($parse, $rootScope) {
      return {
        restrict: 'A',
        compile: function($element, attr) {
          // NOTE:
          // We expose the powerful `$event` object on the scope that provides access to the Window,
          // etc. This is OK, because expressions are not sandboxed any more (and the expression
          // sandbox was never meant to be a security feature anyway).
          var fn = $parse(attr[directiveName]);
          return function ngEventHandler(scope, element) {
            element.on(eventName, function(event) {
              var callback = function() {
                fn(scope, {$event: event});
              };
              if (forceAsyncEvents[eventName] && $rootScope.$$phase) {
                scope.$evalAsync(callback);
              } else {
                scope.$apply(callback);
              }
            });
          };
        }
      };
    }];
  }
);

var ngIfDirective = ['$animate', '$compile', function($animate, $compile) {
  return {
    multiElement: true,
    transclude: 'element',
    priority: 600,
    terminal: true,
    restrict: 'A',
    $$tlb: true,
    link: function($scope, $element, $attr, ctrl, $transclude) {
        var block, childScope, previousElements;

	   console.log($attr.ngIf);
	   console.log($scope);

		$scope.$watch($attr.ngIf, function ngIfWatchAction(value) {




          if (value) {
            if (!childScope) {
              $transclude(function(clone, newScope) {
                childScope = newScope;
                clone[clone.length++] = $compile.$$createComment('end ngIf', $attr.ngIf);
                // Note: We only need the first/last node of the cloned nodes.
                // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                // by a directive with templateUrl when its template arrives.
                block = {
                  clone: clone
                };
                $animate.enter(clone, $element.parent(), $element);
              });
            }
          } else {
            if (previousElements) {
              previousElements.remove();
              previousElements = null;
            }
            if (childScope) {
              childScope.$destroy();
              childScope = null;
            }
            if (block) {
              previousElements = getBlockNodes(block.clone);
              $animate.leave(previousElements).done(function(response) {
                if (response !== false) previousElements = null;
              });
              block = null;
            }
          }
        });
    }
  };
}];

var ngIncludeDirective = ['$templateRequest', '$anchorScroll', '$animate',
                  function($templateRequest,   $anchorScroll,   $animate) {
  return {
    restrict: 'ECA',
    priority: 400,
    terminal: true,
    transclude: 'element',
    controller: angular.noop,
    compile: function(element, attr) {
      var srcExp = attr.ngInclude || attr.src,
          onloadExp = attr.onload || '',
          autoScrollExp = attr.autoscroll;

      return function(scope, $element, $attr, ctrl, $transclude) {
        var changeCounter = 0,
            currentScope,
            previousElement,
            currentElement;

        var cleanupLastIncludeContent = function() {
          if (previousElement) {
            previousElement.remove();
            previousElement = null;
          }
          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }
          if (currentElement) {
            $animate.leave(currentElement).done(function(response) {
              if (response !== false) previousElement = null;
            });
            previousElement = currentElement;
            currentElement = null;
          }
        };

        scope.$watch(srcExp, function ngIncludeWatchAction(src) {
          var afterAnimation = function(response) {
            if (response !== false && isDefined(autoScrollExp) &&
              (!autoScrollExp || scope.$eval(autoScrollExp))) {
                $anchorScroll();
            }
          };
          var thisChangeId = ++changeCounter;

          if (src) {
            //set the 2nd param to true to ignore the template request error so that the inner
            //contents and scope can be cleaned up.
            $templateRequest(src, true).then(function(response) {
              if (scope.$$destroyed) return;

              if (thisChangeId !== changeCounter) return;
              var newScope = scope.$new();
              ctrl.template = response;

              // Note: This will also link all children of ng-include that were contained in the original
              // html. If that content contains controllers, ... they could pollute/change the scope.
              // However, using ng-include on an element with additional content does not make sense...
              // Note: We can't remove them in the cloneAttchFn of $transclude as that
              // function is called before linking the content, which would apply child
              // directives to non existing elements.
              var clone = $transclude(newScope, function(clone) {
                cleanupLastIncludeContent();
                $animate.enter(clone, null, $element).done(afterAnimation);
              });

              currentScope = newScope;
              currentElement = clone;

              currentScope.$emit('$includeContentLoaded', src);
              scope.$eval(onloadExp);
            }, function() {
              if (scope.$$destroyed) return;

              if (thisChangeId === changeCounter) {
                cleanupLastIncludeContent();
                scope.$emit('$includeContentError', src);
              }
            });
            scope.$emit('$includeContentRequested', src);
          } else {
            cleanupLastIncludeContent();
            ctrl.template = null;
          }
        });
      };
    }
  };
}];

var ngIncludeFillContentDirective = ['$compile',
  function($compile) {
    return {
      restrict: 'ECA',
      priority: -400,
      require: 'ngInclude',
      link: function(scope, $element, $attr, ctrl) {
        if (toString.call($element[0]).match(/SVG/)) {
          // WebKit: https://bugs.webkit.org/show_bug.cgi?id=135698 --- SVG elements do not
          // support innerHTML, so detect this here and try to generate the contents
          // specially.
          $element.empty();
          $compile(jqLiteBuildFragment(ctrl.template, window.document).childNodes)(scope,
              function namespaceAdaptedClone(clone) {
            $element.append(clone);
          }, {futureParentElement: $element});
          return;
        }

        $element.html(ctrl.template);
        $compile($element.contents())(scope);
      }
    };
  }];

var ngInitDirective = ngDirective({
  priority: 450,
  compile: function() {
    return {
      pre: function(scope, element, attrs) {
        scope.$eval(attrs.ngInit);
      }
    };
  }
});

var ngListDirective = function() {
  return {
    restrict: 'A',
    priority: 100,
    require: 'ngModel',
    link: function(scope, element, attr, ctrl) {
      var ngList = attr.ngList || ', ';
      var trimValues = attr.ngTrim !== 'false';
      var separator = trimValues ? trim(ngList) : ngList;

      var parse = function(viewValue) {
        // If the viewValue is invalid (say required but empty) it will be `undefined`
        if (isUndefined(viewValue)) return;

        var list = [];

        if (viewValue) {
          forEach(viewValue.split(separator), function(value) {
            if (value) list.push(trimValues ? trim(value) : value);
          });
        }

        return list;
      };

      ctrl.$parsers.push(parse);
      ctrl.$formatters.push(function(value) {
        if (isArray(value)) {
          return value.join(ngList);
        }

        return undefined;
      });

      // Override the standard $isEmpty because an empty array means the input is empty.
      ctrl.$isEmpty = function(value) {
        return !value || !value.length;
      };
    }
  };
};

/* global VALID_CLASS: true,
  INVALID_CLASS: true,
  PRISTINE_CLASS: true,
  DIRTY_CLASS: true,
  UNTOUCHED_CLASS: true,
  TOUCHED_CLASS: true,
  PENDING_CLASS: true,
  addSetValidityMethod: true,
  setupValidity: true,
  defaultModelOptions: false
*/


var VALID_CLASS = 'ng-valid',
    INVALID_CLASS = 'ng-invalid',
    PRISTINE_CLASS = 'ng-pristine',
    DIRTY_CLASS = 'ng-dirty',
    UNTOUCHED_CLASS = 'ng-untouched',
    TOUCHED_CLASS = 'ng-touched',
    EMPTY_CLASS = 'ng-empty',
    NOT_EMPTY_CLASS = 'ng-not-empty';

var ngModelMinErr = minErr('ngModel');

NgModelController.$inject = ['$scope', '$exceptionHandler', '$attrs', '$element', '$parse', '$animate', '$timeout', '$q', '$interpolate'];
function NgModelController($scope, $exceptionHandler, $attr, $element, $parse, $animate, $timeout, $q, $interpolate) {
  this.$viewValue = Number.NaN;
  this.$modelValue = Number.NaN;
  this.$$rawModelValue = undefined; // stores the parsed modelValue / model set from scope regardless of validity.
  this.$validators = {};
  this.$asyncValidators = {};
  this.$parsers = [];
  this.$formatters = [];
  this.$viewChangeListeners = [];
  this.$untouched = true;
  this.$touched = false;
  this.$pristine = true;
  this.$dirty = false;
  this.$valid = true;
  this.$invalid = false;
  this.$error = {}; // keep invalid keys here
  this.$$success = {}; // keep valid keys here
  this.$pending = undefined; // keep pending keys here
  this.$name = $interpolate($attr.name || '', false)($scope);
  this.$$parentForm = nullFormCtrl;
  this.$options = defaultModelOptions;

  this.$$parsedNgModel = $parse($attr.ngModel);
  this.$$parsedNgModelAssign = this.$$parsedNgModel.assign;
  this.$$ngModelGet = this.$$parsedNgModel;
  this.$$ngModelSet = this.$$parsedNgModelAssign;
  this.$$pendingDebounce = null;
  this.$$parserValid = undefined;

  this.$$currentValidationRunId = 0;

  // https://github.com/angular/angular.js/issues/15833
  // Prevent `$$scope` from being iterated over by `copy` when NgModelController is deep watched
  Object.defineProperty(this, '$$scope', {value: $scope});
  this.$$attr = $attr;
  this.$$element = $element;
  this.$$animate = $animate;
  this.$$timeout = $timeout;
  this.$$parse = $parse;
  this.$$q = $q;
  this.$$exceptionHandler = $exceptionHandler;

  setupValidity(this);
  setupModelWatcher(this);
}

NgModelController.prototype = {
  $$initGetterSetters: function() {
    if (this.$options.getOption('getterSetter')) {
      var invokeModelGetter = this.$$parse(this.$$attr.ngModel + '()'),
          invokeModelSetter = this.$$parse(this.$$attr.ngModel + '($$$p)');

      this.$$ngModelGet = function($scope) {
        var modelValue = this.$$parsedNgModel($scope);
        if (isFunction(modelValue)) {
          modelValue = invokeModelGetter($scope);
        }
        return modelValue;
      };
      this.$$ngModelSet = function($scope, newValue) {
        if (isFunction(this.$$parsedNgModel($scope))) {
          invokeModelSetter($scope, {$$$p: newValue});
        } else {
          this.$$parsedNgModelAssign($scope, newValue);
        }
      };
    } else if (!this.$$parsedNgModel.assign) {
      throw ngModelMinErr('nonassign', 'Expression \'{0}\' is non-assignable. Element: {1}',
          this.$$attr.ngModel, startingTag(this.$$element));
    }
  },

  $render: noop,

  $isEmpty: function(value) {
    // eslint-disable-next-line no-self-compare
    return isUndefined(value) || value === '' || value === null || value !== value;
  },

  $$updateEmptyClasses: function(value) {
    if (this.$isEmpty(value)) {
      this.$$animate.removeClass(this.$$element, NOT_EMPTY_CLASS);
      this.$$animate.addClass(this.$$element, EMPTY_CLASS);
    } else {
      this.$$animate.removeClass(this.$$element, EMPTY_CLASS);
      this.$$animate.addClass(this.$$element, NOT_EMPTY_CLASS);
    }
  },

  $setPristine: function() {
    this.$dirty = false;
    this.$pristine = true;
    this.$$animate.removeClass(this.$$element, DIRTY_CLASS);
    this.$$animate.addClass(this.$$element, PRISTINE_CLASS);
  },

  $setDirty: function() {
    this.$dirty = true;
    this.$pristine = false;
    this.$$animate.removeClass(this.$$element, PRISTINE_CLASS);
    this.$$animate.addClass(this.$$element, DIRTY_CLASS);
    this.$$parentForm.$setDirty();
  },

  $setUntouched: function() {
    this.$touched = false;
    this.$untouched = true;
    this.$$animate.setClass(this.$$element, UNTOUCHED_CLASS, TOUCHED_CLASS);
  },

  $setTouched: function() {
    this.$touched = true;
    this.$untouched = false;
    this.$$animate.setClass(this.$$element, TOUCHED_CLASS, UNTOUCHED_CLASS);
  },

  $rollbackViewValue: function() {
    this.$$timeout.cancel(this.$$pendingDebounce);
    this.$viewValue = this.$$lastCommittedViewValue;
    this.$render();
  },

  $validate: function() {
    // ignore $validate before model is initialized
    if (isNumberNaN(this.$modelValue)) {
      return;
    }

    var viewValue = this.$$lastCommittedViewValue;
    // Note: we use the $$rawModelValue as $modelValue might have been
    // set to undefined during a view -> model update that found validation
    // errors. We can't parse the view here, since that could change
    // the model although neither viewValue nor the model on the scope changed
    var modelValue = this.$$rawModelValue;

    var prevValid = this.$valid;
    var prevModelValue = this.$modelValue;

    var allowInvalid = this.$options.getOption('allowInvalid');

    var that = this;
    this.$$runValidators(modelValue, viewValue, function(allValid) {
      // If there was no change in validity, don't update the model
      // This prevents changing an invalid modelValue to undefined
      if (!allowInvalid && prevValid !== allValid) {
        // Note: Don't check this.$valid here, as we could have
        // external validators (e.g. calculated on the server),
        // that just call $setValidity and need the model value
        // to calculate their validity.
        that.$modelValue = allValid ? modelValue : undefined;

        if (that.$modelValue !== prevModelValue) {
          that.$$writeModelToScope();
        }
      }
    });
  },

  $$runValidators: function(modelValue, viewValue, doneCallback) {
    this.$$currentValidationRunId++;
    var localValidationRunId = this.$$currentValidationRunId;
    var that = this;

    // check parser error
    if (!processParseErrors()) {
      validationDone(false);
      return;
    }
    if (!processSyncValidators()) {
      validationDone(false);
      return;
    }
    processAsyncValidators();

    function processParseErrors() {
      var errorKey = that.$$parserName || 'parse';
      if (isUndefined(that.$$parserValid)) {
        setValidity(errorKey, null);
      } else {
        if (!that.$$parserValid) {
          forEach(that.$validators, function(v, name) {
            setValidity(name, null);
          });
          forEach(that.$asyncValidators, function(v, name) {
            setValidity(name, null);
          });
        }
        // Set the parse error last, to prevent unsetting it, should a $validators key == parserName
        setValidity(errorKey, that.$$parserValid);
        return that.$$parserValid;
      }
      return true;
    }

    function processSyncValidators() {
      var syncValidatorsValid = true;
      forEach(that.$validators, function(validator, name) {
        var result = Boolean(validator(modelValue, viewValue));
        syncValidatorsValid = syncValidatorsValid && result;
        setValidity(name, result);
      });
      if (!syncValidatorsValid) {
        forEach(that.$asyncValidators, function(v, name) {
          setValidity(name, null);
        });
        return false;
      }
      return true;
    }

    function processAsyncValidators() {
      var validatorPromises = [];
      var allValid = true;
      forEach(that.$asyncValidators, function(validator, name) {
        var promise = validator(modelValue, viewValue);
        if (!isPromiseLike(promise)) {
          throw ngModelMinErr('nopromise',
            'Expected asynchronous validator to return a promise but got \'{0}\' instead.', promise);
        }
        setValidity(name, undefined);
        validatorPromises.push(promise.then(function() {
          setValidity(name, true);
        }, function() {
          allValid = false;
          setValidity(name, false);
        }));
      });
      if (!validatorPromises.length) {
        validationDone(true);
      } else {
        that.$$q.all(validatorPromises).then(function() {
          validationDone(allValid);
        }, noop);
      }
    }

    function setValidity(name, isValid) {
      if (localValidationRunId === that.$$currentValidationRunId) {
        that.$setValidity(name, isValid);
      }
    }

    function validationDone(allValid) {
      if (localValidationRunId === that.$$currentValidationRunId) {

        doneCallback(allValid);
      }
    }
  },

  $commitViewValue: function() {
    var viewValue = this.$viewValue;

    this.$$timeout.cancel(this.$$pendingDebounce);

    // If the view value has not changed then we should just exit, except in the case where there is
    // a native validator on the element. In this case the validation state may have changed even though
    // the viewValue has stayed empty.
    if (this.$$lastCommittedViewValue === viewValue && (viewValue !== '' || !this.$$hasNativeValidators)) {
      return;
    }
    this.$$updateEmptyClasses(viewValue);
    this.$$lastCommittedViewValue = viewValue;

    // change to dirty
    if (this.$pristine) {
      this.$setDirty();
    }
    this.$$parseAndValidate();
  },

  $$parseAndValidate: function() {
    var viewValue = this.$$lastCommittedViewValue;
    var modelValue = viewValue;
    var that = this;

    this.$$parserValid = isUndefined(modelValue) ? undefined : true;

    if (this.$$parserValid) {
      for (var i = 0; i < this.$parsers.length; i++) {
        modelValue = this.$parsers[i](modelValue);
        if (isUndefined(modelValue)) {
          this.$$parserValid = false;
          break;
        }
      }
    }
    if (isNumberNaN(this.$modelValue)) {
      // this.$modelValue has not been touched yet...
      this.$modelValue = this.$$ngModelGet(this.$$scope);
    }
    var prevModelValue = this.$modelValue;
    var allowInvalid = this.$options.getOption('allowInvalid');
    this.$$rawModelValue = modelValue;

    if (allowInvalid) {
      this.$modelValue = modelValue;
      writeToModelIfNeeded();
    }

    // Pass the $$lastCommittedViewValue here, because the cached viewValue might be out of date.
    // This can happen if e.g. $setViewValue is called from inside a parser
    this.$$runValidators(modelValue, this.$$lastCommittedViewValue, function(allValid) {
      if (!allowInvalid) {
        // Note: Don't check this.$valid here, as we could have
        // external validators (e.g. calculated on the server),
        // that just call $setValidity and need the model value
        // to calculate their validity.
        that.$modelValue = allValid ? modelValue : undefined;
        writeToModelIfNeeded();
      }
    });

    function writeToModelIfNeeded() {
      if (that.$modelValue !== prevModelValue) {
        that.$$writeModelToScope();
      }
    }
  },

  $$writeModelToScope: function() {
    this.$$ngModelSet(this.$$scope, this.$modelValue);
    forEach(this.$viewChangeListeners, function(listener) {
      try {
        listener();
      } catch (e) {
        // eslint-disable-next-line no-invalid-this
        this.$$exceptionHandler(e);
      }
    }, this);
  },

  $setViewValue: function(value, trigger) {
    this.$viewValue = value;
    if (this.$options.getOption('updateOnDefault')) {
      this.$$debounceViewValueCommit(trigger);
    }
  },

  $$debounceViewValueCommit: function(trigger) {
    var debounceDelay = this.$options.getOption('debounce');

    if (isNumber(debounceDelay[trigger])) {
      debounceDelay = debounceDelay[trigger];
    } else if (isNumber(debounceDelay['default'])) {
      debounceDelay = debounceDelay['default'];
    }

    this.$$timeout.cancel(this.$$pendingDebounce);
    var that = this;
    if (debounceDelay > 0) { // this fails if debounceDelay is an object
      this.$$pendingDebounce = this.$$timeout(function() {
        that.$commitViewValue();
      }, debounceDelay);
    } else if (this.$$scope.$root.$$phase) {
      this.$commitViewValue();
    } else {
      this.$$scope.$apply(function() {
        that.$commitViewValue();
      });
    }
  },

  $overrideModelOptions: function(options) {
    this.$options = this.$options.createChild(options);
  }
};

function setupModelWatcher(ctrl) {
  // model -> value
  // Note: we cannot use a normal scope.$watch as we want to detect the following:
  // 1. scope value is 'a'
  // 2. user enters 'b'
  // 3. ng-change kicks in and reverts scope value to 'a'
  //    -> scope value did not change since the last digest as
  //       ng-change executes in apply phase
  // 4. view should be changed back to 'a'
  ctrl.$$scope.$watch(function ngModelWatch(scope) {
    var modelValue = ctrl.$$ngModelGet(scope);

    // if scope model value and ngModel value are out of sync
    // TODO(perf): why not move this to the action fn?
    if (modelValue !== ctrl.$modelValue &&
       // checks for NaN is needed to allow setting the model to NaN when there's an asyncValidator
        // eslint-disable-next-line no-self-compare
       (ctrl.$modelValue === ctrl.$modelValue || modelValue === modelValue)
    ) {
      ctrl.$modelValue = ctrl.$$rawModelValue = modelValue;
      ctrl.$$parserValid = undefined;

      var formatters = ctrl.$formatters,
          idx = formatters.length;

      var viewValue = modelValue;
      while (idx--) {
        viewValue = formatters[idx](viewValue);
      }
      if (ctrl.$viewValue !== viewValue) {
        ctrl.$$updateEmptyClasses(viewValue);
        ctrl.$viewValue = ctrl.$$lastCommittedViewValue = viewValue;
        ctrl.$render();

        // It is possible that model and view value have been updated during render
        ctrl.$$runValidators(ctrl.$modelValue, ctrl.$viewValue, noop);
      }
    }

    return modelValue;
  });
}

addSetValidityMethod({
  clazz: NgModelController,
  set: function(object, property) {
    object[property] = true;
  },
  unset: function(object, property) {
    delete object[property];
  }
});


var ngModelDirective = ['$rootScope', function($rootScope) {
  return {
    restrict: 'A',
    require: ['ngModel', '^?form', '^?ngModelOptions'],
    controller: NgModelController,
    // Prelink needs to run before any input directive
    // so that we can set the NgModelOptions in NgModelController
    // before anyone else uses it.
    priority: 1,
    compile: function ngModelCompile(element) {
      // Setup initial state of the control
      element.addClass(PRISTINE_CLASS).addClass(UNTOUCHED_CLASS).addClass(VALID_CLASS);

      return {
        pre: function ngModelPreLink(scope, element, attr, ctrls) {
          var modelCtrl = ctrls[0],
              formCtrl = ctrls[1] || modelCtrl.$$parentForm,
              optionsCtrl = ctrls[2];

          if (optionsCtrl) {
            modelCtrl.$options = optionsCtrl.$options;
          }

          modelCtrl.$$initGetterSetters();

          // notify others, especially parent forms
          formCtrl.$addControl(modelCtrl);

          attr.$observe('name', function(newValue) {
            if (modelCtrl.$name !== newValue) {
              modelCtrl.$$parentForm.$$renameControl(modelCtrl, newValue);
            }
          });

          scope.$on('$destroy', function() {
            modelCtrl.$$parentForm.$removeControl(modelCtrl);
          });
        },
        post: function ngModelPostLink(scope, element, attr, ctrls) {
          var modelCtrl = ctrls[0];
          if (modelCtrl.$options.getOption('updateOn')) {
            element.on(modelCtrl.$options.getOption('updateOn'), function(ev) {
              modelCtrl.$$debounceViewValueCommit(ev && ev.type);
            });
          }

          function setTouched() {
            modelCtrl.$setTouched();
          }

          element.on('blur', function() {
            if (modelCtrl.$touched) return;

            if ($rootScope.$$phase) {
              scope.$evalAsync(setTouched);
            } else {
              scope.$apply(setTouched);
            }
          });
        }
      };
    }
  };
}];

/* exported defaultModelOptions */
var defaultModelOptions;
var DEFAULT_REGEXP = /(\s+|^)default(\s+|$)/;

function ModelOptions(options) {
  this.$$options = options;
}

ModelOptions.prototype = {

  getOption: function(name) {
    return this.$$options[name];
  },

  createChild: function(options) {
    var inheritAll = false;

    // make a shallow copy
    options = extend({}, options);

    // Inherit options from the parent if specified by the value `"$inherit"`
    forEach(options, /* @this */ function(option, key) {
      if (option === '$inherit') {
        if (key === '*') {
          inheritAll = true;
        } else {
          options[key] = this.$$options[key];
          // `updateOn` is special so we must also inherit the `updateOnDefault` option
          if (key === 'updateOn') {
            options.updateOnDefault = this.$$options.updateOnDefault;
          }
        }
      } else {
        if (key === 'updateOn') {
          // If the `updateOn` property contains the `default` event then we have to remove
          // it from the event list and set the `updateOnDefault` flag.
          options.updateOnDefault = false;
          options[key] = trim(option.replace(DEFAULT_REGEXP, function() {
            options.updateOnDefault = true;
            return ' ';
          }));
        }
      }
    }, this);

    if (inheritAll) {
      // We have a property of the form: `"*": "$inherit"`
      delete options['*'];
      defaults(options, this.$$options);
    }

    // Finally add in any missing defaults
    defaults(options, defaultModelOptions.$$options);

    return new ModelOptions(options);
  }
};


defaultModelOptions = new ModelOptions({
  updateOn: '',
  updateOnDefault: true,
  debounce: 0,
  getterSetter: false,
  allowInvalid: false,
  timezone: null
});


var ngModelOptionsDirective = function() {
  NgModelOptionsController.$inject = ['$attrs', '$scope'];
  function NgModelOptionsController($attrs, $scope) {
    this.$$attrs = $attrs;
    this.$$scope = $scope;
  }
  NgModelOptionsController.prototype = {
    $onInit: function() {
      var parentOptions = this.parentCtrl ? this.parentCtrl.$options : defaultModelOptions;
      var modelOptionsDefinition = this.$$scope.$eval(this.$$attrs.ngModelOptions);

      this.$options = parentOptions.createChild(modelOptionsDefinition);
    }
  };

  return {
    restrict: 'A',
    // ngModelOptions needs to run before ngModel and input directives
    priority: 10,
    require: {parentCtrl: '?^^ngModelOptions'},
    bindToController: true,
    controller: NgModelOptionsController
  };
};


// shallow copy over values from `src` that are not already specified on `dst`
function defaults(dst, src) {
  forEach(src, function(value, key) {
    if (!isDefined(dst[key])) {
      dst[key] = value;
    }
  });
}

var ngNonBindableDirective = ngDirective({ terminal: true, priority: 1000 });

/* exported ngOptionsDirective */

/* global jqLiteRemove */

var ngOptionsMinErr = minErr('ngOptions');

//                     //00001111111111000000000002222222222000000000000000000000333333333300000000000000000000000004444444444400000000000005555555555555000000000666666666666600000007777777777777000000000000000888888888800000000000000000009999999999
var NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
                        // 1: value expression (valueFn)
                        // 2: label expression (displayFn)
                        // 3: group by expression (groupByFn)
                        // 4: disable when expression (disableWhenFn)
                        // 5: array item variable name
                        // 6: object item key variable name
                        // 7: object item value variable name
                        // 8: collection expression
                        // 9: track by expression
/* eslint-enable */


var ngOptionsDirective = ['$compile', '$document', '$parse', function($compile, $document, $parse) {

  function parseOptionsExpression(optionsExp, selectElement, scope) {

    var match = optionsExp.match(NG_OPTIONS_REGEXP);
    if (!(match)) {
      throw ngOptionsMinErr('iexp',
        'Expected expression in form of ' +
        '\'_select_ (as _label_)? for (_key_,)?_value_ in _collection_\'' +
        ' but got \'{0}\'. Element: {1}',
        optionsExp, startingTag(selectElement));
    }

    // Extract the parts from the ngOptions expression

    // The variable name for the value of the item in the collection
    var valueName = match[5] || match[7];
    // The variable name for the key of the item in the collection
    var keyName = match[6];

    // An expression that generates the viewValue for an option if there is a label expression
    var selectAs = / as /.test(match[0]) && match[1];
    // An expression that is used to track the id of each object in the options collection
    var trackBy = match[9];
    // An expression that generates the viewValue for an option if there is no label expression
    var valueFn = $parse(match[2] ? match[1] : valueName);
    var selectAsFn = selectAs && $parse(selectAs);
    var viewValueFn = selectAsFn || valueFn;
    var trackByFn = trackBy && $parse(trackBy);

    // Get the value by which we are going to track the option
    // if we have a trackFn then use that (passing scope and locals)
    // otherwise just hash the given viewValue
    var getTrackByValueFn = trackBy ?
                              function(value, locals) { return trackByFn(scope, locals); } :
                              function getHashOfValue(value) { return hashKey(value); };
    var getTrackByValue = function(value, key) {
      return getTrackByValueFn(value, getLocals(value, key));
    };

    var displayFn = $parse(match[2] || match[1]);
    var groupByFn = $parse(match[3] || '');
    var disableWhenFn = $parse(match[4] || '');
    var valuesFn = $parse(match[8]);

    var locals = {};
    var getLocals = keyName ? function(value, key) {
      locals[keyName] = key;
      locals[valueName] = value;
      return locals;
    } : function(value) {
      locals[valueName] = value;
      return locals;
    };


    function Option(selectValue, viewValue, label, group, disabled) {
      this.selectValue = selectValue;
      this.viewValue = viewValue;
      this.label = label;
      this.group = group;
      this.disabled = disabled;
    }

    function getOptionValuesKeys(optionValues) {
      var optionValuesKeys;

      if (!keyName && isArrayLike(optionValues)) {
        optionValuesKeys = optionValues;
      } else {
        // if object, extract keys, in enumeration order, unsorted
        optionValuesKeys = [];
        for (var itemKey in optionValues) {
          if (optionValues.hasOwnProperty(itemKey) && itemKey.charAt(0) !== '$') {
            optionValuesKeys.push(itemKey);
          }
        }
      }
      return optionValuesKeys;
    }

    return {
      trackBy: trackBy,
      getTrackByValue: getTrackByValue,
      getWatchables: $parse(valuesFn, function(optionValues) {
        // Create a collection of things that we would like to watch (watchedArray)
        // so that they can all be watched using a single $watchCollection
        // that only runs the handler once if anything changes
        var watchedArray = [];
        optionValues = optionValues || [];

        var optionValuesKeys = getOptionValuesKeys(optionValues);
        var optionValuesLength = optionValuesKeys.length;
        for (var index = 0; index < optionValuesLength; index++) {
          var key = (optionValues === optionValuesKeys) ? index : optionValuesKeys[index];
          var value = optionValues[key];

          var locals = getLocals(value, key);
          var selectValue = getTrackByValueFn(value, locals);
          watchedArray.push(selectValue);

          // Only need to watch the displayFn if there is a specific label expression
          if (match[2] || match[1]) {
            var label = displayFn(scope, locals);
            watchedArray.push(label);
          }

          // Only need to watch the disableWhenFn if there is a specific disable expression
          if (match[4]) {
            var disableWhen = disableWhenFn(scope, locals);
            watchedArray.push(disableWhen);
          }
        }
        return watchedArray;
      }),

      getOptions: function() {

        var optionItems = [];
        var selectValueMap = {};

        // The option values were already computed in the `getWatchables` fn,
        // which must have been called to trigger `getOptions`
        var optionValues = valuesFn(scope) || [];
        var optionValuesKeys = getOptionValuesKeys(optionValues);
        var optionValuesLength = optionValuesKeys.length;

        for (var index = 0; index < optionValuesLength; index++) {
          var key = (optionValues === optionValuesKeys) ? index : optionValuesKeys[index];
          var value = optionValues[key];
          var locals = getLocals(value, key);
          var viewValue = viewValueFn(scope, locals);
          var selectValue = getTrackByValueFn(viewValue, locals);
          var label = displayFn(scope, locals);
          var group = groupByFn(scope, locals);
          var disabled = disableWhenFn(scope, locals);
          var optionItem = new Option(selectValue, viewValue, label, group, disabled);

          optionItems.push(optionItem);
          selectValueMap[selectValue] = optionItem;
        }

        return {
          items: optionItems,
          selectValueMap: selectValueMap,
          getOptionFromViewValue: function(value) {
            return selectValueMap[getTrackByValue(value)];
          },
          getViewValueFromOption: function(option) {
            // If the viewValue could be an object that may be mutated by the application,
            // we need to make a copy and not return the reference to the value on the option.
            return trackBy ? copy(option.viewValue) : option.viewValue;
          }
        };
      }
    };
  }


  // we can't just jqLite('<option>') since jqLite is not smart enough
  // to create it in <select> and IE barfs otherwise.
  var optionTemplate = window.document.createElement('option'),
      optGroupTemplate = window.document.createElement('optgroup');

    function ngOptionsPostLink(scope, selectElement, attr, ctrls) {

      var selectCtrl = ctrls[0];
      var ngModelCtrl = ctrls[1];
      var multiple = attr.multiple;

      // The emptyOption allows the application developer to provide their own custom "empty"
      // option when the viewValue does not match any of the option values.
      for (var i = 0, children = selectElement.children(), ii = children.length; i < ii; i++) {
        if (children[i].value === '') {
          selectCtrl.hasEmptyOption = true;
          selectCtrl.emptyOption = children.eq(i);
          break;
        }
      }

      var providedEmptyOption = !!selectCtrl.emptyOption;

      var unknownOption = jqLite(optionTemplate.cloneNode(false));
      unknownOption.val('?');

      var options;
      var ngOptions = parseOptionsExpression(attr.ngOptions, selectElement, scope);
      // This stores the newly created options before they are appended to the select.
      // Since the contents are removed from the fragment when it is appended,
      // we only need to create it once.
      var listFragment = $document[0].createDocumentFragment();

      // Overwrite the implementation. ngOptions doesn't use hashes
      selectCtrl.generateUnknownOptionValue = function(val) {
        return '?';
      };

      // Update the controller methods for multiple selectable options
      if (!multiple) {

        selectCtrl.writeValue = function writeNgOptionsValue(value) {
          var selectedOption = options.selectValueMap[selectElement.val()];
          var option = options.getOptionFromViewValue(value);

          // Make sure to remove the selected attribute from the previously selected option
          // Otherwise, screen readers might get confused
          if (selectedOption) selectedOption.element.removeAttribute('selected');

          if (option) {
            // Don't update the option when it is already selected.
            // For example, the browser will select the first option by default. In that case,
            // most properties are set automatically - except the `selected` attribute, which we
            // set always

            if (selectElement[0].value !== option.selectValue) {
              selectCtrl.removeUnknownOption();
              selectCtrl.unselectEmptyOption();

              selectElement[0].value = option.selectValue;
              option.element.selected = true;
            }

            option.element.setAttribute('selected', 'selected');
          } else {

            if (providedEmptyOption) {
              selectCtrl.selectEmptyOption();
            } else if (selectCtrl.unknownOption.parent().length) {
              selectCtrl.updateUnknownOption(value);
            } else {
              selectCtrl.renderUnknownOption(value);
            }
          }
        };

        selectCtrl.readValue = function readNgOptionsValue() {

          var selectedOption = options.selectValueMap[selectElement.val()];

          if (selectedOption && !selectedOption.disabled) {
            selectCtrl.unselectEmptyOption();
            selectCtrl.removeUnknownOption();
            return options.getViewValueFromOption(selectedOption);
          }
          return null;
        };

        // If we are using `track by` then we must watch the tracked value on the model
        // since ngModel only watches for object identity change
        // FIXME: When a user selects an option, this watch will fire needlessly
        if (ngOptions.trackBy) {
          scope.$watch(
            function() { return ngOptions.getTrackByValue(ngModelCtrl.$viewValue); },
            function() { ngModelCtrl.$render(); }
          );
        }

      } else {

        selectCtrl.writeValue = function writeNgOptionsMultiple(values) {
          // Only set `<option>.selected` if necessary, in order to prevent some browsers from
          // scrolling to `<option>` elements that are outside the `<select>` element's viewport.

          var selectedOptions = values && values.map(getAndUpdateSelectedOption) || [];

          options.items.forEach(function(option) {
            if (option.element.selected && !includes(selectedOptions, option)) {
              option.element.selected = false;
            }
          });
        };


        selectCtrl.readValue = function readNgOptionsMultiple() {
          var selectedValues = selectElement.val() || [],
              selections = [];

          forEach(selectedValues, function(value) {
            var option = options.selectValueMap[value];
            if (option && !option.disabled) selections.push(options.getViewValueFromOption(option));
          });

          return selections;
        };

        // If we are using `track by` then we must watch these tracked values on the model
        // since ngModel only watches for object identity change
        if (ngOptions.trackBy) {

          scope.$watchCollection(function() {
            if (isArray(ngModelCtrl.$viewValue)) {
              return ngModelCtrl.$viewValue.map(function(value) {
                return ngOptions.getTrackByValue(value);
              });
            }
          }, function() {
            ngModelCtrl.$render();
          });

        }
      }

      if (providedEmptyOption) {

        // we need to remove it before calling selectElement.empty() because otherwise IE will
        // remove the label from the element. wtf?
        selectCtrl.emptyOption.remove();

        // compile the element since there might be bindings in it
        $compile(selectCtrl.emptyOption)(scope);

        if (selectCtrl.emptyOption[0].nodeType === NODE_TYPE_COMMENT) {
          // This means the empty option has currently no actual DOM node, probably because
          // it has been modified by a transclusion directive.
          selectCtrl.hasEmptyOption = false;

          // Redefine the registerOption function, which will catch
          // options that are added by ngIf etc. (rendering of the node is async because of
          // lazy transclusion)
          selectCtrl.registerOption = function(optionScope, optionEl) {
            if (optionEl.val() === '') {
              selectCtrl.hasEmptyOption = true;
              selectCtrl.emptyOption = optionEl;
              selectCtrl.emptyOption.removeClass('ng-scope');
              // This ensures the new empty option is selected if previously no option was selected
              ngModelCtrl.$render();

              optionEl.on('$destroy', function() {
                selectCtrl.hasEmptyOption = false;
                selectCtrl.emptyOption = undefined;
              });
            }
          };

        } else {
          // remove the class, which is added automatically because we recompile the element and it
          // becomes the compilation root
          selectCtrl.emptyOption.removeClass('ng-scope');
        }

      }

      selectElement.empty();

      // We need to do this here to ensure that the options object is defined
      // when we first hit it in writeNgOptionsValue
      updateOptions();

      // We will re-render the option elements if the option values or labels change
      scope.$watchCollection(ngOptions.getWatchables, updateOptions);

      // ------------------------------------------------------------------ //

      function addOptionElement(option, parent) {
        var optionElement = optionTemplate.cloneNode(false);
        parent.appendChild(optionElement);
        updateOptionElement(option, optionElement);
      }

      function getAndUpdateSelectedOption(viewValue) {
        var option = options.getOptionFromViewValue(viewValue);
        var element = option && option.element;

        if (element && !element.selected) element.selected = true;

        return option;
      }

      function updateOptionElement(option, element) {
        option.element = element;
        element.disabled = option.disabled;
        // NOTE: The label must be set before the value, otherwise IE10/11/EDGE create unresponsive
        // selects in certain circumstances when multiple selects are next to each other and display
        // the option list in listbox style, i.e. the select is [multiple], or specifies a [size].
        // See https://github.com/angular/angular.js/issues/11314 for more info.
        // This is unfortunately untestable with unit / e2e tests
        if (option.label !== element.label) {
          element.label = option.label;
          element.textContent = option.label;
        }
        element.value = option.selectValue;
      }

      function updateOptions() {
        var previousValue = options && selectCtrl.readValue();

        // We must remove all current options, but cannot simply set innerHTML = null
        // since the providedEmptyOption might have an ngIf on it that inserts comments which we
        // must preserve.
        // Instead, iterate over the current option elements and remove them or their optgroup
        // parents
        if (options) {

          for (var i = options.items.length - 1; i >= 0; i--) {
            var option = options.items[i];
            if (isDefined(option.group)) {
              jqLiteRemove(option.element.parentNode);
            } else {
              jqLiteRemove(option.element);
            }
          }
        }

        options = ngOptions.getOptions();

        var groupElementMap = {};

        // Ensure that the empty option is always there if it was explicitly provided
        if (providedEmptyOption) {
          selectElement.prepend(selectCtrl.emptyOption);
        }

        options.items.forEach(function addOption(option) {
          var groupElement;

          if (isDefined(option.group)) {

            // This option is to live in a group
            // See if we have already created this group
            groupElement = groupElementMap[option.group];

            if (!groupElement) {

              groupElement = optGroupTemplate.cloneNode(false);
              listFragment.appendChild(groupElement);

              // Update the label on the group element
              // "null" is special cased because of Safari
              groupElement.label = option.group === null ? 'null' : option.group;

              // Store it for use later
              groupElementMap[option.group] = groupElement;
            }

            addOptionElement(option, groupElement);

          } else {

            // This option is not in a group
            addOptionElement(option, listFragment);
          }
        });

        selectElement[0].appendChild(listFragment);

        ngModelCtrl.$render();

        // Check to see if the value has changed due to the update to the options
        if (!ngModelCtrl.$isEmpty(previousValue)) {
          var nextValue = selectCtrl.readValue();
          var isNotPrimitive = ngOptions.trackBy || multiple;
          if (isNotPrimitive ? !equals(previousValue, nextValue) : previousValue !== nextValue) {
            ngModelCtrl.$setViewValue(nextValue);
            ngModelCtrl.$render();
          }
        }

      }
  }

  return {
    restrict: 'A',
    terminal: true,
    require: ['select', 'ngModel'],
    link: {
      pre: function ngOptionsPreLink(scope, selectElement, attr, ctrls) {
        // Deactivate the SelectController.register method to prevent
        // option directives from accidentally registering themselves
        // (and unwanted $destroy handlers etc.)
        ctrls[0].registerOption = noop;
      },
      post: ngOptionsPostLink
    }
  };
}];

var ngPluralizeDirective = ['$locale', '$interpolate', '$log', function($locale, $interpolate, $log) {
  var BRACE = /{}/g,
      IS_WHEN = /^when(Minus)?(.+)$/;

  return {
    link: function(scope, element, attr) {
      var numberExp = attr.count,
          whenExp = attr.$attr.when && element.attr(attr.$attr.when), // we have {{}} in attrs
          offset = attr.offset || 0,
          whens = scope.$eval(whenExp) || {},
          whensExpFns = {},
          startSymbol = $interpolate.startSymbol(),
          endSymbol = $interpolate.endSymbol(),
          braceReplacement = startSymbol + numberExp + '-' + offset + endSymbol,
          watchRemover = angular.noop,
          lastCount;

      forEach(attr, function(expression, attributeName) {
        var tmpMatch = IS_WHEN.exec(attributeName);
        if (tmpMatch) {
          var whenKey = (tmpMatch[1] ? '-' : '') + lowercase(tmpMatch[2]);
          whens[whenKey] = element.attr(attr.$attr[attributeName]);
        }
      });
      forEach(whens, function(expression, key) {
        whensExpFns[key] = $interpolate(expression.replace(BRACE, braceReplacement));

      });

      scope.$watch(numberExp, function ngPluralizeWatchAction(newVal) {
        var count = parseFloat(newVal);
        var countIsNaN = isNumberNaN(count);

        if (!countIsNaN && !(count in whens)) {
          // If an explicit number rule such as 1, 2, 3... is defined, just use it.
          // Otherwise, check it against pluralization rules in $locale service.
          count = $locale.pluralCat(count - offset);
        }

        // If both `count` and `lastCount` are NaN, we don't need to re-register a watch.
        // In JS `NaN !== NaN`, so we have to explicitly check.
        if ((count !== lastCount) && !(countIsNaN && isNumberNaN(lastCount))) {
          watchRemover();
          var whenExpFn = whensExpFns[count];
          if (isUndefined(whenExpFn)) {
            if (newVal != null) {
              $log.debug('ngPluralize: no rule defined for \'' + count + '\' in ' + whenExp);
            }
            watchRemover = noop;
            updateElementText();
          } else {
            watchRemover = scope.$watch(whenExpFn, updateElementText);
          }
          lastCount = count;
        }
      });

      function updateElementText(newText) {
        element.text(newText || '');
      }
    }
  };
}];

var ngRepeatDirective = ['$parse', '$animate', '$compile', function($parse, $animate, $compile) {
  var NG_REMOVED = '$$NG_REMOVED';
  var ngRepeatMinErr = minErr('ngRepeat');

  var updateScope = function(scope, index, valueIdentifier, value, keyIdentifier, key, arrayLength) {
    // TODO(perf): generate setters to shave off ~40ms or 1-1.5%
    scope[valueIdentifier] = value;
    if (keyIdentifier) scope[keyIdentifier] = key;
    scope.$index = index;
    scope.$first = (index === 0);
    scope.$last = (index === (arrayLength - 1));
    scope.$middle = !(scope.$first || scope.$last);
    // eslint-disable-next-line no-bitwise
    scope.$odd = !(scope.$even = (index & 1) === 0);
  };

  var getBlockStart = function(block) {
    return block.clone[0];
  };

  var getBlockEnd = function(block) {
    return block.clone[block.clone.length - 1];
  };


  return {
    restrict: 'A',
    multiElement: true,
    transclude: 'element',
    priority: 1000,
    terminal: true,
    $$tlb: true,
    compile: function ngRepeatCompile($element, $attr) {
      var expression = $attr.ngRepeat;
      var ngRepeatEndComment = $compile.$$createComment('end ngRepeat', expression);

      var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

      if (!match) {
        throw ngRepeatMinErr('iexp', 'Expected expression in form of \'_item_ in _collection_[ track by _id_]\' but got \'{0}\'.',
            expression);
      }

      var lhs = match[1];
      var rhs = match[2];
      var aliasAs = match[3];
      var trackByExp = match[4];

      match = lhs.match(/^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/);

      if (!match) {
        throw ngRepeatMinErr('iidexp', '\'_item_\' in \'_item_ in _collection_\' should be an identifier or \'(_key_, _value_)\' expression, but got \'{0}\'.',
            lhs);
      }
      var valueIdentifier = match[3] || match[1];
      var keyIdentifier = match[2];

      if (aliasAs && (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
          /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(aliasAs))) {
        throw ngRepeatMinErr('badident', 'alias \'{0}\' is invalid --- must be a valid JS identifier which is not a reserved name.',
          aliasAs);
      }

      var trackByExpGetter, trackByIdExpFn, trackByIdArrayFn, trackByIdObjFn;
      var hashFnLocals = {$id: hashKey};

      if (trackByExp) {
        trackByExpGetter = $parse(trackByExp);
      } else {
        trackByIdArrayFn = function(key, value) {
          return hashKey(value);
        };
        trackByIdObjFn = function(key) {
          return key;
        };
      }

      return function ngRepeatLink($scope, $element, $attr, ctrl, $transclude) {

        if (trackByExpGetter) {
          trackByIdExpFn = function(key, value, index) {
            // assign key, value, and $index to the locals so that they can be used in hash functions
            if (keyIdentifier) hashFnLocals[keyIdentifier] = key;
            hashFnLocals[valueIdentifier] = value;
            hashFnLocals.$index = index;
            return trackByExpGetter($scope, hashFnLocals);
          };
        }

        // Store a list of elements from previous run. This is a hash where key is the item from the
        // iterator, and the value is objects with following properties.
        //   - scope: bound scope
        //   - element: previous element.
        //   - index: position
        //
        // We are using no-proto object so that we don't need to guard against inherited props via
        // hasOwnProperty.
        var lastBlockMap = createMap();

        //watch props
        $scope.$watchCollection(rhs, function ngRepeatAction(collection) {
          var index, length,
              previousNode = $element[0],     // node that cloned nodes should be inserted after
                                              // initialized to the comment node anchor
              nextNode,
              // Same as lastBlockMap but it has the current state. It will become the
              // lastBlockMap on the next iteration.
              nextBlockMap = createMap(),
              collectionLength,
              key, value, // key/value of iteration
              trackById,
              trackByIdFn,
              collectionKeys,
              block,       // last object information {scope, element, id}
              nextBlockOrder,
              elementsToRemove;

          if (aliasAs) {
            $scope[aliasAs] = collection;
          }

          if (isArrayLike(collection)) {
            collectionKeys = collection;
            trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
          } else {
            trackByIdFn = trackByIdExpFn || trackByIdObjFn;
            // if object, extract keys, in enumeration order, unsorted
            collectionKeys = [];
            for (var itemKey in collection) {
              if (hasOwnProperty.call(collection, itemKey) && itemKey.charAt(0) !== '$') {
                collectionKeys.push(itemKey);
              }
            }
          }

          collectionLength = collectionKeys.length;
          nextBlockOrder = new Array(collectionLength);

          // locate existing items
          for (index = 0; index < collectionLength; index++) {
            key = (collection === collectionKeys) ? index : collectionKeys[index];
            value = collection[key];
            trackById = trackByIdFn(key, value, index);
            if (lastBlockMap[trackById]) {
              // found previously seen block
              block = lastBlockMap[trackById];
              delete lastBlockMap[trackById];
              nextBlockMap[trackById] = block;
              nextBlockOrder[index] = block;
            } else if (nextBlockMap[trackById]) {
              // if collision detected. restore lastBlockMap and throw an error
              forEach(nextBlockOrder, function(block) {
                if (block && block.scope) lastBlockMap[block.id] = block;
              });
              throw ngRepeatMinErr('dupes',
                  'Duplicates in a repeater are not allowed. Use \'track by\' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}, Duplicate value: {2}',
                  expression, trackById, value);
            } else {
              // new never before seen block
              nextBlockOrder[index] = {id: trackById, scope: undefined, clone: undefined};
              nextBlockMap[trackById] = true;
            }
          }

          // remove leftover items
          for (var blockKey in lastBlockMap) {
            block = lastBlockMap[blockKey];
            elementsToRemove = getBlockNodes(block.clone);
            $animate.leave(elementsToRemove);
            if (elementsToRemove[0].parentNode) {
              // if the element was not removed yet because of pending animation, mark it as deleted
              // so that we can ignore it later
              for (index = 0, length = elementsToRemove.length; index < length; index++) {
                elementsToRemove[index][NG_REMOVED] = true;
              }
            }
            block.scope.$destroy();
          }

          // we are not using forEach for perf reasons (trying to avoid #call)
          for (index = 0; index < collectionLength; index++) {
            key = (collection === collectionKeys) ? index : collectionKeys[index];
            value = collection[key];
            block = nextBlockOrder[index];

            if (block.scope) {
              // if we have already seen this object, then we need to reuse the
              // associated scope/element

              nextNode = previousNode;

              // skip nodes that are already pending removal via leave animation
              do {
                nextNode = nextNode.nextSibling;
              } while (nextNode && nextNode[NG_REMOVED]);

              if (getBlockStart(block) !== nextNode) {
                // existing item which got moved
                $animate.move(getBlockNodes(block.clone), null, previousNode);
              }
              previousNode = getBlockEnd(block);
              updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
            } else {
              // new item which we don't know about
              $transclude(function ngRepeatTransclude(clone, scope) {
                block.scope = scope;
                // http://jsperf.com/clone-vs-createcomment
                var endNode = ngRepeatEndComment.cloneNode(false);
                clone[clone.length++] = endNode;

                $animate.enter(clone, null, previousNode);
                previousNode = endNode;
                // Note: We only need the first/last node of the cloned nodes.
                // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                // by a directive with templateUrl when its template arrives.
                block.clone = clone;
                nextBlockMap[block.id] = block;
                updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
              });
            }
          }
          lastBlockMap = nextBlockMap;
        });
      };
    }
  };
}];

var NG_HIDE_CLASS = 'ng-hide';
var NG_HIDE_IN_PROGRESS_CLASS = 'ng-hide-animate';

var ngShowDirective = ['$animate', function($animate) {
  return {
    restrict: 'A',
    multiElement: true,
    link: function(scope, element, attr) {
      scope.$watch(attr.ngShow, function ngShowWatchAction(value) {
        // we're adding a temporary, animation-specific class for ng-hide since this way
        // we can control when the element is actually displayed on screen without having
        // to have a global/greedy CSS selector that breaks when other animations are run.
        // Read: https://github.com/angular/angular.js/issues/9103#issuecomment-58335845
        $animate[value ? 'removeClass' : 'addClass'](element, NG_HIDE_CLASS, {
          tempClasses: NG_HIDE_IN_PROGRESS_CLASS
        });
      });
    }
  };
}];

var ngHideDirective = ['$animate', function($animate) {
  return {
    restrict: 'A',
    multiElement: true,
    link: function(scope, element, attr) {
      scope.$watch(attr.ngHide, function ngHideWatchAction(value) {
        // The comment inside of the ngShowDirective explains why we add and
        // remove a temporary class for the show/hide animation
        $animate[value ? 'addClass' : 'removeClass'](element,NG_HIDE_CLASS, {
          tempClasses: NG_HIDE_IN_PROGRESS_CLASS
        });
      });
    }
  };
}];

var ngStyleDirective = ngDirective(function(scope, element, attr) {
  scope.$watch(attr.ngStyle, function ngStyleWatchAction(newStyles, oldStyles) {
    if (oldStyles && (newStyles !== oldStyles)) {
      forEach(oldStyles, function(val, style) { element.css(style, '');});
    }
    if (newStyles) element.css(newStyles);
  }, true);
});

var ngSwitchDirective = ['$animate', '$compile', function($animate, $compile) {
  return {
    require: 'ngSwitch',

    // asks for $scope to fool the BC controller module
    controller: ['$scope', function NgSwitchController() {
     this.cases = {};
    }],
    link: function(scope, element, attr, ngSwitchController) {
      var watchExpr = attr.ngSwitch || attr.on,
          selectedTranscludes = [],
          selectedElements = [],
          previousLeaveAnimations = [],
          selectedScopes = [];

      var spliceFactory = function(array, index) {
          return function(response) {
            if (response !== false) array.splice(index, 1);
          };
      };

      scope.$watch(watchExpr, function ngSwitchWatchAction(value) {
        var i, ii;

        // Start with the last, in case the array is modified during the loop
        while (previousLeaveAnimations.length) {
          $animate.cancel(previousLeaveAnimations.pop());
        }

        for (i = 0, ii = selectedScopes.length; i < ii; ++i) {
          var selected = getBlockNodes(selectedElements[i].clone);
          selectedScopes[i].$destroy();
          var runner = previousLeaveAnimations[i] = $animate.leave(selected);
          runner.done(spliceFactory(previousLeaveAnimations, i));
        }

        selectedElements.length = 0;
        selectedScopes.length = 0;

        if ((selectedTranscludes = ngSwitchController.cases['!' + value] || ngSwitchController.cases['?'])) {
          forEach(selectedTranscludes, function(selectedTransclude) {
            selectedTransclude.transclude(function(caseElement, selectedScope) {
              selectedScopes.push(selectedScope);
              var anchor = selectedTransclude.element;
              caseElement[caseElement.length++] = $compile.$$createComment('end ngSwitchWhen');
              var block = { clone: caseElement };

              selectedElements.push(block);
              $animate.enter(caseElement, anchor.parent(), anchor);
            });
          });
        }
      });
    }
  };
}];

var ngSwitchWhenDirective = ngDirective({
  transclude: 'element',
  priority: 1200,
  require: '^ngSwitch',
  multiElement: true,
  link: function(scope, element, attrs, ctrl, $transclude) {

    var cases = attrs.ngSwitchWhen.split(attrs.ngSwitchWhenSeparator).sort().filter(
      // Filter duplicate cases
      function(element, index, array) { return array[index - 1] !== element; }
    );

    forEach(cases, function(whenCase) {
      ctrl.cases['!' + whenCase] = (ctrl.cases['!' + whenCase] || []);
      ctrl.cases['!' + whenCase].push({ transclude: $transclude, element: element });
    });
  }
});

var ngSwitchDefaultDirective = ngDirective({
  transclude: 'element',
  priority: 1200,
  require: '^ngSwitch',
  multiElement: true,
  link: function(scope, element, attr, ctrl, $transclude) {
    ctrl.cases['?'] = (ctrl.cases['?'] || []);
    ctrl.cases['?'].push({ transclude: $transclude, element: element });
   }
});

var ngTranscludeMinErr = minErr('ngTransclude');
var ngTranscludeDirective = ['$compile', function($compile) {
  return {
    restrict: 'EAC',
    terminal: true,
    compile: function ngTranscludeCompile(tElement) {

      // Remove and cache any original content to act as a fallback
      var fallbackLinkFn = $compile(tElement.contents());
      tElement.empty();

      return function ngTranscludePostLink($scope, $element, $attrs, controller, $transclude) {

        if (!$transclude) {
          throw ngTranscludeMinErr('orphan',
          'Illegal use of ngTransclude directive in the template! ' +
          'No parent directive that requires a transclusion found. ' +
          'Element: {0}',
          startingTag($element));
        }


        // If the attribute is of the form: `ng-transclude="ng-transclude"` then treat it like the default
        if ($attrs.ngTransclude === $attrs.$attr.ngTransclude) {
          $attrs.ngTransclude = '';
        }
        var slotName = $attrs.ngTransclude || $attrs.ngTranscludeSlot;

        // If the slot is required and no transclusion content is provided then this call will throw an error
        $transclude(ngTranscludeCloneAttachFn, null, slotName);

        // If the slot is optional and no transclusion content is provided then use the fallback content
        if (slotName && !$transclude.isSlotFilled(slotName)) {
          useFallbackContent();
        }

        function ngTranscludeCloneAttachFn(clone, transcludedScope) {
          if (clone.length && notWhitespace(clone)) {
            $element.append(clone);
          } else {
            useFallbackContent();
            // There is nothing linked against the transcluded scope since no content was available,
            // so it should be safe to clean up the generated scope.
            transcludedScope.$destroy();
          }
        }

        function useFallbackContent() {
          // Since this is the fallback content rather than the transcluded content,
          // we link against the scope of this directive rather than the transcluded scope
          fallbackLinkFn($scope, function(clone) {
            $element.append(clone);
          });
        }

        function notWhitespace(nodes) {
          for (var i = 0, ii = nodes.length; i < ii; i++) {
            var node = nodes[i];
            if (node.nodeType !== NODE_TYPE_TEXT || node.nodeValue.trim()) {
              return true;
            }
          }
        }
      };
    }
  };
}];


var scriptDirective = ['$templateCache', function($templateCache) {
  return {
    restrict: 'E',
    terminal: true,
    compile: function(element, attr) {
      if (attr.type === 'text/ng-template') {
        var templateUrl = attr.id,
            text = element[0].text;

        $templateCache.put(templateUrl, text);
      }
    }
  };
}];

/* exported selectDirective, optionDirective */

var noopNgModelController = { $setViewValue: noop, $render: noop };

function setOptionSelectedStatus(optionEl, value) {
  optionEl.prop('selected', value); // needed for IE

  optionEl.attr('selected', value);
}

var SelectController =
        ['$element', '$scope', /** @this */ function($element, $scope) {

  var self = this,
      optionsMap = new NgMap();

  self.selectValueMap = {}; // Keys are the hashed values, values the original values

  // If the ngModel doesn't get provided then provide a dummy noop version to prevent errors
  self.ngModelCtrl = noopNgModelController;
  self.multiple = false;

  // The "unknown" option is one that is prepended to the list if the viewValue
  // does not match any of the options. When it is rendered the value of the unknown
  // option is '? XXX ?' where XXX is the hashKey of the value that is not known.
  //
  // We can't just jqLite('<option>') since jqLite is not smart enough
  // to create it in <select> and IE barfs otherwise.
  self.unknownOption = jqLite(window.document.createElement('option'));

  // The empty option is an option with the value '' that te application developer can
  // provide inside the select. When the model changes to a value that doesn't match an option,
  // it is selected - so if an empty option is provided, no unknown option is generated.
  // However, the empty option is not removed when the model matches an option. It is always selectable
  // and indicates that a "null" selection has been made.
  self.hasEmptyOption = false;
  self.emptyOption = undefined;

  self.renderUnknownOption = function(val) {
    var unknownVal = self.generateUnknownOptionValue(val);
    self.unknownOption.val(unknownVal);
    $element.prepend(self.unknownOption);
    setOptionSelectedStatus(self.unknownOption, true);
    $element.val(unknownVal);
  };

  self.updateUnknownOption = function(val) {
    var unknownVal = self.generateUnknownOptionValue(val);
    self.unknownOption.val(unknownVal);
    setOptionSelectedStatus(self.unknownOption, true);
    $element.val(unknownVal);
  };

  self.generateUnknownOptionValue = function(val) {
    return '? ' + hashKey(val) + ' ?';
  };

  self.removeUnknownOption = function() {
    if (self.unknownOption.parent()) self.unknownOption.remove();
  };

  self.selectEmptyOption = function() {
    if (self.emptyOption) {
      $element.val('');
      setOptionSelectedStatus(self.emptyOption, true);
    }
  };

  self.unselectEmptyOption = function() {
    if (self.hasEmptyOption) {
      self.emptyOption.removeAttr('selected');
    }
  };

  $scope.$on('$destroy', function() {
    // disable unknown option so that we don't do work when the whole select is being destroyed
    self.renderUnknownOption = noop;
  });

  // Read the value of the select control, the implementation of this changes depending
  // upon whether the select can have multiple values and whether ngOptions is at work.
  self.readValue = function readSingleValue() {
    var val = $element.val();
    // ngValue added option values are stored in the selectValueMap, normal interpolations are not
    var realVal = val in self.selectValueMap ? self.selectValueMap[val] : val;

    if (self.hasOption(realVal)) {
      return realVal;
    }

    return null;
  };


  // Write the value to the select control, the implementation of this changes depending
  // upon whether the select can have multiple values and whether ngOptions is at work.
  self.writeValue = function writeSingleValue(value) {
    // Make sure to remove the selected attribute from the previously selected option
    // Otherwise, screen readers might get confused
    var currentlySelectedOption = $element[0].options[$element[0].selectedIndex];
    if (currentlySelectedOption) setOptionSelectedStatus(jqLite(currentlySelectedOption), false);

    if (self.hasOption(value)) {
      self.removeUnknownOption();

      var hashedVal = hashKey(value);
      $element.val(hashedVal in self.selectValueMap ? hashedVal : value);

      // Set selected attribute and property on selected option for screen readers
      var selectedOption = $element[0].options[$element[0].selectedIndex];
      setOptionSelectedStatus(jqLite(selectedOption), true);
    } else {
      if (value == null && self.emptyOption) {
        self.removeUnknownOption();
        self.selectEmptyOption();
      } else if (self.unknownOption.parent().length) {
        self.updateUnknownOption(value);
      } else {
        self.renderUnknownOption(value);
      }
    }
  };


  // Tell the select control that an option, with the given value, has been added
  self.addOption = function(value, element) {
    // Skip comment nodes, as they only pollute the `optionsMap`
    if (element[0].nodeType === NODE_TYPE_COMMENT) return;

    assertNotHasOwnProperty(value, '"option value"');
    if (value === '') {
      self.hasEmptyOption = true;
      self.emptyOption = element;
    }
    var count = optionsMap.get(value) || 0;
    optionsMap.set(value, count + 1);
    // Only render at the end of a digest. This improves render performance when many options
    // are added during a digest and ensures all relevant options are correctly marked as selected
    scheduleRender();
  };

  // Tell the select control that an option, with the given value, has been removed
  self.removeOption = function(value) {
    var count = optionsMap.get(value);
    if (count) {
      if (count === 1) {
        optionsMap.delete(value);
        if (value === '') {
          self.hasEmptyOption = false;
          self.emptyOption = undefined;
        }
      } else {
        optionsMap.set(value, count - 1);
      }
    }
  };

  // Check whether the select control has an option matching the given value
  self.hasOption = function(value) {
    return !!optionsMap.get(value);
  };


  var renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    $scope.$$postDigest(function() {
      renderScheduled = false;
      self.ngModelCtrl.$render();
    });
  }

  var updateScheduled = false;
  function scheduleViewValueUpdate(renderAfter) {
    if (updateScheduled) return;

    updateScheduled = true;

    $scope.$$postDigest(function() {
      if ($scope.$$destroyed) return;

      updateScheduled = false;
      self.ngModelCtrl.$setViewValue(self.readValue());
      if (renderAfter) self.ngModelCtrl.$render();
    });
  }


  self.registerOption = function(optionScope, optionElement, optionAttrs, interpolateValueFn, interpolateTextFn) {

    if (optionAttrs.$attr.ngValue) {
      // The value attribute is set by ngValue
      var oldVal, hashedVal = NaN;
      optionAttrs.$observe('value', function valueAttributeObserveAction(newVal) {

        var removal;
        var previouslySelected = optionElement.prop('selected');

        if (isDefined(hashedVal)) {
          self.removeOption(oldVal);
          delete self.selectValueMap[hashedVal];
          removal = true;
        }

        hashedVal = hashKey(newVal);
        oldVal = newVal;
        self.selectValueMap[hashedVal] = newVal;
        self.addOption(newVal, optionElement);
        // Set the attribute directly instead of using optionAttrs.$set - this stops the observer
        // from firing a second time. Other $observers on value will also get the result of the
        // ngValue expression, not the hashed value
        optionElement.attr('value', hashedVal);

        if (removal && previouslySelected) {
          scheduleViewValueUpdate();
        }

      });
    } else if (interpolateValueFn) {
      // The value attribute is interpolated
      optionAttrs.$observe('value', function valueAttributeObserveAction(newVal) {
        // This method is overwritten in ngOptions and has side-effects!
        self.readValue();

        var removal;
        var previouslySelected = optionElement.prop('selected');

        if (isDefined(oldVal)) {
          self.removeOption(oldVal);
          removal = true;
        }
        oldVal = newVal;
        self.addOption(newVal, optionElement);

        if (removal && previouslySelected) {
          scheduleViewValueUpdate();
        }
      });
    } else if (interpolateTextFn) {
      // The text content is interpolated
      optionScope.$watch(interpolateTextFn, function interpolateWatchAction(newVal, oldVal) {
        optionAttrs.$set('value', newVal);
        var previouslySelected = optionElement.prop('selected');
        if (oldVal !== newVal) {
          self.removeOption(oldVal);
        }
        self.addOption(newVal, optionElement);

        if (oldVal && previouslySelected) {
          scheduleViewValueUpdate();
        }
      });
    } else {
      // The value attribute is static
      self.addOption(optionAttrs.value, optionElement);
    }


    optionAttrs.$observe('disabled', function(newVal) {

      // Since model updates will also select disabled options (like ngOptions),
      // we only have to handle options becoming disabled, not enabled

      if (newVal === 'true' || newVal && optionElement.prop('selected')) {
        if (self.multiple) {
          scheduleViewValueUpdate(true);
        } else {
          self.ngModelCtrl.$setViewValue(null);
          self.ngModelCtrl.$render();
        }
      }
    });

    optionElement.on('$destroy', function() {
      var currentValue = self.readValue();
      var removeValue = optionAttrs.value;

      self.removeOption(removeValue);
      scheduleRender();

      if (self.multiple && currentValue && currentValue.indexOf(removeValue) !== -1 ||
          currentValue === removeValue
      ) {
        // When multiple (selected) options are destroyed at the same time, we don't want
        // to run a model update for each of them. Instead, run a single update in the $$postDigest
        scheduleViewValueUpdate(true);
      }
    });
  };
}];

var selectDirective = function() {

  return {
    restrict: 'E',
    require: ['select', '?ngModel'],
    controller: SelectController,
    priority: 1,
    link: {
      pre: selectPreLink,
      post: selectPostLink
    }
  };

  function selectPreLink(scope, element, attr, ctrls) {

      var selectCtrl = ctrls[0];
      var ngModelCtrl = ctrls[1];

      // if ngModel is not defined, we don't need to do anything but set the registerOption
      // function to noop, so options don't get added internally
      if (!ngModelCtrl) {
        selectCtrl.registerOption = noop;
        return;
      }


      selectCtrl.ngModelCtrl = ngModelCtrl;

      // When the selected item(s) changes we delegate getting the value of the select control
      // to the `readValue` method, which can be changed if the select can have multiple
      // selected values or if the options are being generated by `ngOptions`
      element.on('change', function() {
        selectCtrl.removeUnknownOption();
        scope.$apply(function() {
          ngModelCtrl.$setViewValue(selectCtrl.readValue());
        });
      });

      // If the select allows multiple values then we need to modify how we read and write
      // values from and to the control; also what it means for the value to be empty and
      // we have to add an extra watch since ngModel doesn't work well with arrays - it
      // doesn't trigger rendering if only an item in the array changes.
      if (attr.multiple) {
        selectCtrl.multiple = true;

        // Read value now needs to check each option to see if it is selected
        selectCtrl.readValue = function readMultipleValue() {
          var array = [];
          forEach(element.find('option'), function(option) {
            if (option.selected && !option.disabled) {
              var val = option.value;
              array.push(val in selectCtrl.selectValueMap ? selectCtrl.selectValueMap[val] : val);
            }
          });
          return array;
        };

        // Write value now needs to set the selected property of each matching option
        selectCtrl.writeValue = function writeMultipleValue(value) {
          forEach(element.find('option'), function(option) {
            var shouldBeSelected = !!value && (includes(value, option.value) ||
                                               includes(value, selectCtrl.selectValueMap[option.value]));
            var currentlySelected = option.selected;

            // IE and Edge, adding options to the selection via shift+click/UP/DOWN,
            // will de-select already selected options if "selected" on those options was set
            // more than once (i.e. when the options were already selected)
            // So we only modify the selected property if neccessary.
            // Note: this behavior cannot be replicated via unit tests because it only shows in the
            // actual user interface.
            if (shouldBeSelected !== currentlySelected) {
              setOptionSelectedStatus(jqLite(option), shouldBeSelected);
            }

          });
        };

        // we have to do it on each watch since ngModel watches reference, but
        // we need to work of an array, so we need to see if anything was inserted/removed
        var lastView, lastViewRef = NaN;
        scope.$watch(function selectMultipleWatch() {
          if (lastViewRef === ngModelCtrl.$viewValue && !equals(lastView, ngModelCtrl.$viewValue)) {
            lastView = shallowCopy(ngModelCtrl.$viewValue);
            ngModelCtrl.$render();
          }
          lastViewRef = ngModelCtrl.$viewValue;
        });

        // If we are a multiple select then value is now a collection
        // so the meaning of $isEmpty changes
        ngModelCtrl.$isEmpty = function(value) {
          return !value || value.length === 0;
        };

      }
    }

    function selectPostLink(scope, element, attrs, ctrls) {
      // if ngModel is not defined, we don't need to do anything
      var ngModelCtrl = ctrls[1];
      if (!ngModelCtrl) return;

      var selectCtrl = ctrls[0];

      // We delegate rendering to the `writeValue` method, which can be changed
      // if the select can have multiple selected values or if the options are being
      // generated by `ngOptions`.
      // This must be done in the postLink fn to prevent $render to be called before
      // all nodes have been linked correctly.
      ngModelCtrl.$render = function() {
        selectCtrl.writeValue(ngModelCtrl.$viewValue);
      };
    }
};

var optionDirective = ['$interpolate', function($interpolate) {
  return {
    restrict: 'E',
    priority: 100,
    compile: function(element, attr) {

      var interpolateValueFn, interpolateTextFn;

      if (isDefined(attr.ngValue)) {
        // Will be handled by registerOption
      } else if (isDefined(attr.value)) {
        // If the value attribute is defined, check if it contains an interpolation
        interpolateValueFn = $interpolate(attr.value, true);
      } else {
        // If the value attribute is not defined then we fall back to the
        // text content of the option element, which may be interpolated
        interpolateTextFn = $interpolate(element.text(), true);
        if (!interpolateTextFn) {
          attr.$set('value', element.text());
        }
      }

      return function(scope, element, attr) {
        // This is an optimization over using ^^ since we don't want to have to search
        // all the way to the root of the DOM for every single option element
        var selectCtrlName = '$selectController',
            parent = element.parent(),
            selectCtrl = parent.data(selectCtrlName) ||
              parent.parent().data(selectCtrlName); // in case we are in optgroup

        if (selectCtrl) {
          selectCtrl.registerOption(scope, element, attr, interpolateValueFn, interpolateTextFn);
        }
      };
    }
  };
}];

var requiredDirective = function() {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, elm, attr, ctrl) {


	  if (!ctrl) return;
      attr.required = true; // force truthy in case we are on non input element

      ctrl.$validators.required = function(modelValue, viewValue) {
        return !attr.required || !ctrl.$isEmpty(viewValue);
      };

      attr.$observe('required', function() {
        ctrl.$validate();
      });
    }
  };
};

var patternDirective = function() {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, elm, attr, ctrl) {
      if (!ctrl) return;

      var regexp, patternExp = attr.ngPattern || attr.pattern;
      attr.$observe('pattern', function(regex) {
        if (isString(regex) && regex.length > 0) {
          regex = new RegExp('^' + regex + '$');
        }

        if (regex && !regex.test) {
          throw minErr('ngPattern')('noregexp',
            'Expected {0} to be a RegExp but was {1}. Element: {2}', patternExp,
            regex, startingTag(elm));
        }

        regexp = regex || undefined;
        ctrl.$validate();
      });

      ctrl.$validators.pattern = function(modelValue, viewValue) {
        // HTML5 pattern constraint validates the input value, so we validate the viewValue
        return ctrl.$isEmpty(viewValue) || isUndefined(regexp) || regexp.test(viewValue);
      };
    }
  };
};

var maxlengthDirective = function() {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, elm, attr, ctrl) {
      if (!ctrl) return;

      var maxlength = -1;
      attr.$observe('maxlength', function(value) {
        var intVal = toInt(value);
        maxlength = isNumberNaN(intVal) ? -1 : intVal;
        ctrl.$validate();
      });
      ctrl.$validators.maxlength = function(modelValue, viewValue) {
        return (maxlength < 0) || ctrl.$isEmpty(viewValue) || (viewValue.length <= maxlength);
      };
    }
  };
};

var minlengthDirective = function() {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, elm, attr, ctrl) {
      if (!ctrl) return;

      var minlength = 0;
      attr.$observe('minlength', function(value) {
        minlength = toInt(value) || 0;
        ctrl.$validate();
      });
      ctrl.$validators.minlength = function(modelValue, viewValue) {
        return ctrl.$isEmpty(viewValue) || viewValue.length >= minlength;
      };
    }
  };
};

if (window.angular.bootstrap) {
  // AngularJS is already loaded, so we can return here...
  if (window.console) {
    console.log('WARNING: Tried to load angular more than once.');
  }
  return;
}

// try to bind to jquery now so that one can write jqLite(fn)
// but we will rebind on bootstrap again.
bindJQuery();

publishExternalAPI(angular);

angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "AM",
      "PM"
    ],
    "DAY": [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ],
    "ERANAMES": [
      "Before Christ",
      "Anno Domini"
    ],
    "ERAS": [
      "BC",
      "AD"
    ],
    "FIRSTDAYOFWEEK": 6,
    "MONTH": [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    "SHORTDAY": [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ],
    "SHORTMONTH": [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],
    "STANDALONEMONTH": [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, MMMM d, y",
    "longDate": "MMMM d, y",
    "medium": "MMM d, y h:mm:ss a",
    "mediumDate": "MMM d, y",
    "mediumTime": "h:mm:ss a",
    "short": "M/d/yy h:mm a",
    "shortDate": "M/d/yy",
    "shortTime": "h:mm a"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "$",
    "DECIMAL_SEP": ".",
    "GROUP_SEP": ",",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-\u00a4",
        "negSuf": "",
        "posPre": "\u00a4",
        "posSuf": ""
      }
    ]
  },
  "id": "en-us",
  "localeID": "en_US",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (i == 1 && vf.v == 0) {    return PLURAL_CATEGORY.ONE;  }  return PLURAL_CATEGORY.OTHER;}
});
}]);

  jqLite(function() {
    angularInit(window.document, bootstrap);
  });

})(window);

!window.angular.$$csp().noInlineStyle && window.angular.element(document.head).prepend('<style type="text/css">@charset "UTF-8";[ng\\:cloak],[ng-cloak],[data-ng-cloak],[x-ng-cloak],.ng-cloak,.x-ng-cloak,.ng-hide:not(.ng-hide-animate){display:none !important;}ng\\:form{display:block;}.ng-animate-shim{visibility:hidden;}.ng-anchor{position:absolute;}</style>');
