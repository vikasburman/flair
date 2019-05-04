/**
 * @preserve
 * Flair.js
 * True Object Oriented JavaScript
 * 
 * Assembly: flair.client
 *     File: ./flair.client.js
 *  Version: 0.50.32
 *  Sat, 04 May 2019 18:35:15 GMT
 * 
 * (c) 2017-2019 Vikas Burman
 * Licensed under MIT
 */
 // members

/* eslint-disable */
/* page.js - start */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.page = factory());
}(this, (function () { 'use strict';

var isarray = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

/**
 * Expose `pathToRegexp`.
 */
var pathToRegexp_1 = pathToRegexp;
var parse_1 = parse;
var compile_1 = compile;
var tokensToFunction_1 = tokensToFunction;
var tokensToRegExp_1 = tokensToRegExp;

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var res;

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
    }

    var prefix = res[2];
    var name = res[3];
    var capture = res[4];
    var group = res[5];
    var suffix = res[6];
    var asterisk = res[7];

    var repeat = suffix === '+' || suffix === '*';
    var optional = suffix === '?' || suffix === '*';
    var delimiter = prefix || '/';
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    });
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index);
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path);
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length);

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$');
    }
  }

  return function (obj) {
    var path = '';
    var data = obj || {};

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        path += token;

        continue
      }

      var value = data[token.name];
      var segment;

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j]);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment;
        }

        continue
      }

      segment = encodeURIComponent(value);

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment;
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys;
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      });
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path);
  var re = tokensToRegExp(tokens, options);

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i]);
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var route = '';
  var lastToken = tokens[tokens.length - 1];
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      var prefix = escapeString(token.prefix);
      var capture = token.pattern;

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*';
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?';
        } else {
          capture = '(' + capture + ')?';
        }
      } else {
        capture = prefix + '(' + capture + ')';
      }

      route += capture;
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || [];

  if (!isarray(keys)) {
    options = keys;
    keys = [];
  } else if (!options) {
    options = {};
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

pathToRegexp_1.parse = parse_1;
pathToRegexp_1.compile = compile_1;
pathToRegexp_1.tokensToFunction = tokensToFunction_1;
pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

/**
   * Module dependencies.
   */

  

  /**
   * Short-cuts for global-object checks
   */

  var hasDocument = ('undefined' !== typeof document);
  var hasWindow = ('undefined' !== typeof window);
  var hasHistory = ('undefined' !== typeof history);
  var hasProcess = typeof process !== 'undefined';

  /**
   * Detect click event
   */
  var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var isLocation = hasWindow && !!(window.history.location || window.location);

  /**
   * The page instance
   * @api private
   */
  function Page() {
    // public things
    this.callbacks = [];
    this.exits = [];
    this.current = '';
    this.len = 0;

    // private things
    this._decodeURLComponents = true;
    this._base = '';
    this._strict = false;
    this._running = false;
    this._hashbang = false;

    // bound functions
    this.clickHandler = this.clickHandler.bind(this);
    this._onpopstate = this._onpopstate.bind(this);
  }

  /**
   * Configure the instance of page. This can be called multiple times.
   *
   * @param {Object} options
   * @api public
   */

  Page.prototype.configure = function(options) {
    var opts = options || {};

    this._window = opts.window || (hasWindow && window);
    this._decodeURLComponents = opts.decodeURLComponents !== false;
    this._popstate = opts.popstate !== false && hasWindow;
    this._click = opts.click !== false && hasDocument;
    this._hashbang = !!opts.hashbang;

    var _window = this._window;
    if(this._popstate) {
      _window.addEventListener('popstate', this._onpopstate, false);
    } else if(hasWindow) {
      _window.removeEventListener('popstate', this._onpopstate, false);
    }

    if (this._click) {
      _window.document.addEventListener(clickEvent, this.clickHandler, false);
    } else if(hasDocument) {
      _window.document.removeEventListener(clickEvent, this.clickHandler, false);
    }

    if(this._hashbang && hasWindow && !hasHistory) {
      _window.addEventListener('hashchange', this._onpopstate, false);
    } else if(hasWindow) {
      _window.removeEventListener('hashchange', this._onpopstate, false);
    }
  };

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  Page.prototype.base = function(path) {
    if (0 === arguments.length) return this._base;
    this._base = path;
  };

  /**
   * Gets the `base`, which depends on whether we are using History or
   * hashbang routing.

   * @api private
   */
  Page.prototype._getBase = function() {
    var base = this._base;
    if(!!base) return base;
    var loc = hasWindow && this._window && this._window.location;

    if(hasWindow && this._hashbang && loc && loc.protocol === 'file:') {
      base = loc.pathname;
    }

    return base;
  };

  /**
   * Get or set strict path matching to `enable`
   *
   * @param {boolean} enable
   * @api public
   */

  Page.prototype.strict = function(enable) {
    if (0 === arguments.length) return this._strict;
    this._strict = enable;
  };


  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  Page.prototype.start = function(options) {
    var opts = options || {};
    this.configure(opts);

    if (false === opts.dispatch) return;
    this._running = true;

    var url;
    if(isLocation) {
      var window = this._window;
      var loc = window.location;

      if(this._hashbang && ~loc.hash.indexOf('#!')) {
        url = loc.hash.substr(2) + loc.search;
      } else if (this._hashbang) {
        url = loc.search + loc.hash;
      } else {
        url = loc.pathname + loc.search + loc.hash;
      }
    }

    this.replace(url, null, true, opts.dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  Page.prototype.stop = function() {
    if (!this._running) return;
    this.current = '';
    this.len = 0;
    this._running = false;

    var window = this._window;
    this._click && window.document.removeEventListener(clickEvent, this.clickHandler, false);
    hasWindow && window.removeEventListener('popstate', this._onpopstate, false);
    hasWindow && window.removeEventListener('hashchange', this._onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  Page.prototype.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state, this),
      prev = this.prevContext;
    this.prevContext = ctx;
    this.current = ctx.path;
    if (false !== dispatch) this.dispatch(ctx, prev);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  Page.prototype.back = function(path, state) {
    var page = this;
    if (this.len > 0) {
      var window = this._window;
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      hasHistory && window.history.back();
      this.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    } else {
      setTimeout(function() {
        page.show(page._getBase(), state);
      });
    }
  };

  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  Page.prototype.redirect = function(from, to) {
    var inst = this;

    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page.call(this, from, function(e) {
        setTimeout(function() {
          inst.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        inst.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  Page.prototype.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state, this),
      prev = this.prevContext;
    this.prevContext = ctx;
    this.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) this.dispatch(ctx, prev);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */

  Page.prototype.dispatch = function(ctx, prev) {
    var i = 0, j = 0, page = this;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled.call(page, ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  Page.prototype.exit = function(path, fn) {
    if (typeof path === 'function') {
      return this.exit('*', path);
    }

    var route = new Route(path, null, this);
    for (var i = 1; i < arguments.length; ++i) {
      this.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Handle "click" events.
   */

  /* jshint +W054 */
  Page.prototype.clickHandler = function(e) {
    if (1 !== this._which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    // ensure link
    // use shadow dom when available if not, fall back to composedPath()
    // for browsers that only have shady
    var el = e.target;
    var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

    if(eventPath) {
      for (var i = 0; i < eventPath.length; i++) {
        if (!eventPath[i].nodeName) continue;
        if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
        if (!eventPath[i].href) continue;

        el = eventPath[i];
        break;
      }
    }

    // continue ensure link
    // el.nodeName for svg links are 'a' instead of 'A'
    while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
    if (!el || 'A' !== el.nodeName.toUpperCase()) return;

    // check if link is inside an svg
    // in this case, both href and target are always inside an object
    var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if(!this._hashbang && this._samePath(el) && (el.hash || '#' === link)) return;

    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    // svg target is an object and its desired value is in .baseVal property
    if (svg ? el.target.baseVal : el.target) return;

    // x-origin
    // note: svg links that are not relative don't call click events (and skip page.js)
    // consequently, all svg links tested inside page.js are relative and in the same origin
    if (!svg && !this.sameOrigin(el.href)) return;

    // rebuild path
    // There aren't .pathname and .search properties in svg links, so we use href
    // Also, svg href is an object and its desired value is in .baseVal property
    var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

    path = path[0] !== '/' ? '/' + path : path;

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;
    var pageBase = this._getBase();

    if (path.indexOf(pageBase) === 0) {
      path = path.substr(pageBase.length);
    }

    if (this._hashbang) path = path.replace('#!', '');

    if (pageBase && orig === path && (!isLocation || this._window.location.protocol !== 'file:')) {
      return;
    }

    e.preventDefault();
    this.show(orig);
  };

  /**
   * Handle "populate" events.
   * @api private
   */

  Page.prototype._onpopstate = (function () {
    var loaded = false;
    if ( ! hasWindow ) {
      return function () {};
    }
    if (hasDocument && document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      var page = this;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else if (isLocation) {
        var loc = page._window.location;
        page.show(loc.pathname + loc.search + loc.hash, undefined, undefined, false);
      }
    };
  })();

  /**
   * Event button.
   */
  Page.prototype._which = function(e) {
    e = e || (hasWindow && this._window.event);
    return null == e.which ? e.button : e.which;
  };

  /**
   * Convert to a URL object
   * @api private
   */
  Page.prototype._toURL = function(href) {
    var window = this._window;
    if(typeof URL === 'function' && isLocation) {
      return new URL(href, window.location.toString());
    } else if (hasDocument) {
      var anc = window.document.createElement('a');
      anc.href = href;
      return anc;
    }
  };

  /**
   * Check if `href` is the same origin.
   * @param {string} href
   * @api public
   */

  Page.prototype.sameOrigin = function(href) {
    if(!href || !isLocation) return false;

    var url = this._toURL(href);
    var window = this._window;

    var loc = window.location;
    return loc.protocol === url.protocol &&
      loc.hostname === url.hostname &&
      loc.port === url.port;
  };

  /**
   * @api private
   */
  Page.prototype._samePath = function(url) {
    if(!isLocation) return false;
    var window = this._window;
    var loc = window.location;
    return url.pathname === loc.pathname &&
      url.search === loc.search;
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   * @api private
   */
  Page.prototype._decodeURLEncodedURIComponent = function(val) {
    if (typeof val !== 'string') { return val; }
    return this._decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  };

  /**
   * Create a new `page` instance and function
   */
  function createPage() {
    var pageInstance = new Page();

    function pageFn(/* args */) {
      return page.apply(pageInstance, arguments);
    }

    // Copy all of the things over. In 2.0 maybe we use setPrototypeOf
    pageFn.callbacks = pageInstance.callbacks;
    pageFn.exits = pageInstance.exits;
    pageFn.base = pageInstance.base.bind(pageInstance);
    pageFn.strict = pageInstance.strict.bind(pageInstance);
    pageFn.start = pageInstance.start.bind(pageInstance);
    pageFn.stop = pageInstance.stop.bind(pageInstance);
    pageFn.show = pageInstance.show.bind(pageInstance);
    pageFn.back = pageInstance.back.bind(pageInstance);
    pageFn.redirect = pageInstance.redirect.bind(pageInstance);
    pageFn.replace = pageInstance.replace.bind(pageInstance);
    pageFn.dispatch = pageInstance.dispatch.bind(pageInstance);
    pageFn.exit = pageInstance.exit.bind(pageInstance);
    pageFn.configure = pageInstance.configure.bind(pageInstance);
    pageFn.sameOrigin = pageInstance.sameOrigin.bind(pageInstance);
    pageFn.clickHandler = pageInstance.clickHandler.bind(pageInstance);

    pageFn.create = createPage;

    Object.defineProperty(pageFn, 'len', {
      get: function(){
        return pageInstance.len;
      },
      set: function(val) {
        pageInstance.len = val;
      }
    });

    Object.defineProperty(pageFn, 'current', {
      get: function(){
        return pageInstance.current;
      },
      set: function(val) {
        pageInstance.current = val;
      }
    });

    // In 2.0 these can be named exports
    pageFn.Context = Context;
    pageFn.Route = Route;

    return pageFn;
  }

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page.call(this, '*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path), null, this);
      for (var i = 1; i < arguments.length; ++i) {
        this.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      this['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      this.start(path);
    }
  }

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;
    var page = this;
    var window = page._window;

    if (page._hashbang) {
      current = isLocation && this._getBase() + window.location.hash.replace('#!', '');
    } else {
      current = isLocation && window.location.pathname + window.location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    isLocation && (window.location.href = ctx.canonicalPath);
  }

  /**
   * Escapes RegExp characters in the given string.
   *
   * @param {string} s
   * @api private
   */
  function escapeRegExp(s) {
    return s.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state, pageInstance) {
    var _page = this.page = pageInstance || page;
    var window = _page._window;
    var hashbang = _page._hashbang;

    var pageBase = _page._getBase();
    if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    var re = new RegExp('^' + escapeRegExp(pageBase));
    this.path = path.replace(re, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = (hasDocument && window.document.title);
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? _page._decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = _page._decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = this.pathname = parts[0];
      this.hash = _page._decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    var page = this.page;
    var window = page._window;
    var hashbang = page._hashbang;

    page.len++;
    if (hasHistory) {
        window.history.pushState(this.state, this.title,
          hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
    }
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    var page = this.page;
    if (hasHistory) {
        page._window.history.replaceState(this.state, this.title,
          page._hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
    }
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options, page) {
    var _page = this.page = page || globalPage;
    var opts = options || {};
    opts.strict = opts.strict || page._strict;
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathToRegexp_1(this.path, this.keys = [], opts);
  }

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = this.page._decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Module exports.
   */

  var globalPage = createPage();
  var page_js = globalPage;
  var default_1 = globalPage;

page_js.default = default_1;

return page_js;

})));

/* page.js - end */
/* eslint-enable */

(() => {
'use strict';

/* eslint-disable no-unused-vars */
const flair = (typeof global !== 'undefined' ? require('flairjs') : (typeof WorkerGlobalScope !== 'undefined' ? WorkerGlobalScope.flair : window.flair));
const { Class, Struct, Enum, Interface, Mixin, Aspects, AppDomain, $$, attr, bring, Container, include, Port, on, post, telemetry,
				Reflector, Serializer, Tasks, as, is, isComplies, isDerivedFrom, isAbstract, isSealed, isStatic, isSingleton, isDeprecated,
				isImplements, isInstanceOf, isMixed, getAssembly, getAttr, getContext, getResource, getRoute, getType, ns, getTypeOf,
				getTypeName, typeOf, dispose, using, Args, Exception, noop, nip, nim, nie, event } = flair;
const { TaskInfo } = flair.Tasks;
const { env } = flair.options;
const DOC = ((env.isServer || env.isWorker) ? null : window.document);
const { forEachAsync, replaceAll, splitAndTrim, findIndexByProp, findItemByProp, which, guid, isArrowFunc, isASyncFunc, sieve,
				b64EncodeUnicode, b64DecodeUnicode } = flair.utils;
const { $$static, $$abstract, $$virtual, $$override, $$sealed, $$private, $$privateSet, $$protected, $$protectedSet, $$readonly, $$async,
				$$overload, $$enumerate, $$dispose, $$post, $$on, $$timer, $$type, $$args, $$inject, $$resource, $$asset, $$singleton, $$serialize,
				$$deprecate, $$session, $$state, $$conditional, $$noserialize, $$ns } = $$;

// define current context name
const __currentContextName = AppDomain.context.current().name;

// define loadPathOf this assembly
let __currentFile = (env.isServer ? __filename : window.document.currentScript.src.replace(window.document.location.href, './'));
let __currentPath = __currentFile.substr(0, __currentFile.lastIndexOf('/') + 1);
AppDomain.loadPathOf('flair.client', __currentPath)

// assembly level error handler
const __asmError = (err) => { AppDomain.onError(err); };
/* eslint-enable no-unused-vars */

// load assembly settings from settings file
let settings = JSON.parse('{"el":"main","title":"","viewTransition":"","components":[],"transitions":[],"filters":[],"mixins":[],"directives":[],"plugins":[],"pluginOptions":{},"url":{"404":"/404","home":"/"},"mounts":{"main":"/"},"main-options":[],"main-interceptors":[]}'); // eslint-disable-line no-unused-vars
let settingsReader = flair.Port('settingsReader');
if (typeof settingsReader === 'function') {
let externalSettings = settingsReader('flair.client');
if (externalSettings) { settings = Object.assign(settings, externalSettings); }}
settings = Object.freeze(settings);

// default assembly config
let config = {}; // eslint-disable-line no-unused-vars
config = Object.freeze(config);

AppDomain.context.current().currentAssemblyBeingLoaded('./flair.client{.min}.js');

try{

(async () => { // ./src/flair.client/flair.ui/@1-ViewTransition.js
try{
/**
 * @name ViewTransition
 * @description GUI View Transition
 */
$$('ns', 'flair.ui');
Class('ViewTransition', function() {
    $$('virtual');
    $$('async');
    this.enter = noop;

    $$('virtual');
    $$('async');
    this.leave = noop;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/@1-VueComponentMembers.js
try{
const Vue = await include('vue/vue{.min}.js');
const { ViewState } = ns('flair.ui');
const { VueFilter, VueMixin, VueDirective } = ns('flair.ui.vue');

/**
 * @name VueComponentMembers
 * @description Vue Component Members
 */
$$('ns', 'flair.ui.vue');
Mixin('VueComponentMembers', function() {
    $$('private');
    this.define = async () => {
        let viewState = new ViewState(),
            component = {};

        // get port
        let clientFileLoader = Port('clientFile');  

        // load style content in property
        if (this.style && this.style.endsWith('.css')) { // if style file is defined via $$('asset', '<fileName>');
            this.style = await clientFileLoader(this.style);
        }

        // load html content in property
        if (this.html && this.html.endsWith('.html')) { // if html file is defined via $$('asset', '<fileName>');
            this.html = await clientFileLoader(this.html);
        }

        // template
        // https://vuejs.org/v2/api/#template
        // either manually defined, or loaded from html and style combination as fallback
        if (this.template) {
            component.template = this.template;
        } else {
            if (this.style && this.html) {
                component.template = '<div><style scoped>' + this.style.trim() +'</style><div>' + this.html.trim() + '</div></div>';
            } else if (this.html) {
                component.template = this.html.trim();
            }
        }
        
        // render
        // https://vuejs.org/v2/api/#render
        // https://vuejs.org/v2/guide/render-function.html#Functional-Components
        if (this.render && typeof this.render === 'function') {
            component.render = this.render;
        }

        // functional
        // https://vuejs.org/v2/api/#functional
        // https://vuejs.org/v2/guide/render-function.html#Functional-Components
        if (typeof this.functional === 'boolean') { 
            component.functional = this.functional;
        }

        // computed 
        // https://vuejs.org/v2/guide/computed.html#Computed-Properties
        // https://vuejs.org/v2/guide/computed.html#Computed-Setter
        // https://vuejs.org/v2/api/#computed
        if (this.computed) {
            for(let p in this.computed) {
                if (this.computed.hasOwnProperty(p)) {
                    component.computed = component.computed || {};
                    component.computed[p] = this.computed[p];
                }
            }
        }
        
        // state 
        // global state properties are added as computed properties
        // with get/set working over global ViewState store
        // each state property is defined as in the array
        // { "path": "path", "name": "name", "value": value }
        if(this.state && Array.isArray(this.state)) {
            for(let p of this.state) {
                if (component.computed[p.name]) { throw Exception.InvalidDefinition(`Computed (state) property already defined. (${p.name})`); }
                component.computed = component.computed || {};
                component.computed[p.name] = {
                    get: function() { return (viewState.get(p.path, p.name) || p.value); },
                    set: function(val) { viewState.set(p.path, p.name, val); }
                };
            }          
        }

        // methods
        // https://vuejs.org/v2/api/#methods
        if (this.methods) {
            for(let m in this.methods) {
                if (this.methods.hasOwnProperty(m)) {
                    component.methods = component.methods || {};
                    component.methods[m] = this.methods[m];
                }
            }
        }        

        // watch
        // https://vuejs.org/v2/guide/computed.html#Computed-vs-Watched-Property
        // https://vuejs.org/v2/guide/computed.html#Watchers
        // https://vuejs.org/v2/api/#watch
        if (this.watch) {
            for(let p in this.watch) {
                if (this.watch.hasOwnProperty(p)) {
                    component.watch = component.watch || {};
                    component.watch[p] = this.watch[p];
                }
            }
        }
        
        // lifecycle
        // https://vuejs.org/v2/guide/instance.html#Instance-Lifecycle-Hooks
        // https://vuejs.org/v2/api/#Options-Lifecycle-Hooks
        if (this.lifecycle) {
            for(let m in this.lifecycle) {
                if (this.lifecycle.hasOwnProperty(m)) {
                    component[m] = this.lifecycle[m];
                }
            }
        }

        // components
        // each component in array is defined as:
        // { "name": "name", "type": "ns.typeName" }        
        // https://vuejs.org/v2/guide/components-registration.html#Local-Registration
        // https://vuejs.org/v2/api/#components
        if (this.components && Array.isArray(this.components)) {
            let ComponentType = null,
                component = null;
            const { VueComponent } = ns('flair.ui.vue');
            for(let item in this.components) {
                if (!item.name) { throw Exception.OperationFailed(`Component name cannot be empty. (${item.type})`); }
                if (!item.type) { throw Exception.OperationFailed(`Component type cannot be empty. (${item.name})`); }

                
                ComponentType = as(await include(item.name), VueComponent);
                if (ComponentType) {
                    try {
                        component = new ComponentType();

                        // check for duplicate (global & local)
                        if (Vue.options.components[item.name]) { throw Exception.Duplicate(`Component already registered. (${item.name})`); }
                        if (component.components && component.components[item.name]) { throw Exception.Duplicate(`Component already registered. (${item.name})`); }

                        // register locally
                        component.components = component.components || {};
                        component.components[item.name] = await component.factory();
                    } catch (err) {
                        throw Exception.OperationFailed(`Component registration failed. (${item.type})`, err);
                    }
                } else {
                    throw Exception.InvalidArgument(item.type);
                }
            }   
        }

        // mixins
        // each mixin in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        // https://vuejs.org/v2/guide/mixins.html
        // https://vuejs.org/v2/api/#mixins
        if (this.mixins && Array.isArray(this.mixins)) {
            let MixinType = null,
                mixin = null;
            for(let item in this.mixins) {
                if (!item.name) { throw Exception.OperationFailed(`Mixin name cannot be empty. (${item.type})`); }
                if (!item.type) { throw Exception.OperationFailed(`Mixin type cannot be empty. (${item.name})`); }

                MixinType = as(await include(item.type), VueMixin);
                if (MixinType) {
                    try {
                        mixin = new MixinType();

                        // check for duplicate 
                        if (component.mixins && component.mixins[item.name]) { throw Exception.Duplicate(`Mixin already registered. (${item.name})`); }

                        // register locally
                        component.mixins = component.mixins || {};
                        component.mixins[item.name] = await mixin.factory();
                    } catch (err) {
                        throw Exception.OperationFailed(`Mixin registration failed. (${item.type})`, err);
                    }
                } else {
                    throw Exception.InvalidArgument(item.type);
                }
            }
        }

        // directives
        // each directive in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        // https://vuejs.org/v2/guide/custom-directive.html
        // https://vuejs.org/v2/api/#directives
        if (this.directives && Array.isArray(this.directives)) {
            let DirectiveType = null,
            directive = null;
            for(let item in this.directives) {
                if (!item.name) { throw Exception.OperationFailed(`Directive name cannot be empty. (${item.type})`); }
                if (!item.type) { throw Exception.OperationFailed(`Directive type cannot be empty. (${item.name})`); }

                DirectiveType = as(await include(item.type), VueDirective);
                if (DirectiveType) {
                    try {
                        directive = new DirectiveType();

                        // check for duplicate 
                        if (component.directives && component.directives[item.name]) { throw Exception.Duplicate(`Directive already registered. (${item.name})`); }

                        // register locally
                        component.directives = component.directives || {};
                        component.directives[item.name] = await directive.factory();
                    } catch (err) {
                        throw Exception.OperationFailed(`Directive registration failed. (${item.type})`, err);
                    }
                } else {
                    throw Exception.InvalidArgument(item.type);
                }
            }
        }        

        // filters
        // each filter in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        // https://vuejs.org/v2/guide/filters.html
        // https://vuejs.org/v2/api/#filters
        if (this.filters && Array.isArray(this.filters)) {
            let FilterType = null,
                filter = null;
            for(let item in this.filters) {
                if (!item.name) { throw Exception.OperationFailed(`Filter name cannot be empty. (${item.type})`); }
                if (!item.type) { throw Exception.OperationFailed(`Filter type cannot be empty. (${item.name})`); }
                
                FilterType = as(await include(item.type), VueFilter);
                if (FilterType) {
                    try {
                        filter = new FilterType();
                        
                        // check for duplicate 
                        if (component.filters && component.filters[item.name]) { throw Exception.Duplicate(`Filter already registered. (${item.name})`); }

                        // register locally
                        component.filters = component.filters || {};
                        component.filters[item.name] = await filter.factory();
                    } catch (err) {
                        throw Exception.OperationFailed(`Filter registration failed. (${item.type})`, err);
                    }
                } else {
                    throw Exception.InvalidArgument(item.type);
                }
            }             
        }

        // DI: provide and inject
        // https://vuejs.org/v2/guide/components-edge-cases.html#Dependency-Injection
        // https://vuejs.org/v2/api/#provide-inject
        // provided methods must be defined in this.methods
        // a shortcut is taken, so that method don't need to be define twice
        // therefore instead of defining provide as a function, define provide as an array
        // of method names, same as in inject elsewhere
        if (this.provide && Array.isArray(this.provide)) {
            component.provide = this.provide;
        }
        if (this.inject && Array.isArray(this.inject)) {
            component.inject = this.inject;
        }

        // done
        return component;
    };    
    
    $$('protected');
    this.style = '';

    $$('protected');
    this.html = ''; 

    $$('protected');
    this.template = null;

    $$('protected');
    this.render = null;

    $$('protected');
    this.functional = false;    

    $$('protected');
    this.computed = null;

    $$('protected');
    this.state = null;

    $$('protected');
    this.methods = null;

    $$('protected');
    this.watch = null;    

    $$('protected');
    this.lifecycle = null;    

    $$('protected');
    this.components = null;

    $$('protected');
    this.mixins = null;    

    $$('protected');
    this.directives = null;     

    $$('protected');
    this.filters = null;      
    
    $$('protected');
    this.provide = null;

    $$('protected');
    this.inject = null;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.app/ClientHost.js
try{
const { Host } = ns('flair.app');

/**
 * @name ClientHost
 * @description Client host implementation
 */
$$('sealed');
$$('ns', 'flair.app');
Class('ClientHost', Host, function() {
    let mountedApps = {},
        page = window.page,
        hashChangeHandler = null;

    $$('override');
    this.construct = (base) => {
        base('Page', '1.x'); // https://www.npmjs.com/package/page
    };

    this.app = () => { return this.mounts['main']; } // main page app
    this.mounts = { // all mounted page apps
        get: () => { return mountedApps; },
        set: noop
    };

    $$('override');
    this.boot = async (base) => { // mount all page app and pseudo sub-apps
        base();

        let appOptions = null,
            mountPath = '',
            mount = null;
        const getOptions = (mountName) => {
            let appOptions = {};
            // app options: https://www.npmjs.com/package/page#pageoptions
            // each item is: { name: '', value:  }
            // name: as in above link (as-is)
            // value: as defined in above link
            let pageOptions = settings[`${mountName}-options`];
            if (pageOptions && pageOptions.length > 0) {
                for(let pageOption of pageOptions) {
                    appOptions[pageOption.name] = pageOption.value;
                }
            }   

            // inbuilt fixed options, overwrite even if defined outside
            appOptions.click = false;
            appOptions.popstate = false;
            appOptions.dispatch = false;
            appOptions.hashbang = false;
            appOptions.decodeURLComponents = true;

            return appOptions;         
        };

        // create main app instance of page
        // 'page' variable is already loaded, as page.js is bundled in fliar.app
        appOptions = getOptions('main');
        let mainApp = page(appOptions);
        mainApp.strict(appOptions.strict);
        mainApp.base('/');

        // create one instance of page app for each mounted path
        for(let mountName of Object.keys(settings.mounts)) {
            if (mountName === 'main') {
                mountPath = '/';
                mount = mainApp;
            } else {
                appOptions = getOptions(mountName);
                mountPath = settings.mounts[mountName];
                mount = page.create(appOptions); // create a sub-app
                mount.strict(appOptions.strict);
                mount.base(mountPath);
            }

            // attach
            mountedApps[mountName] = Object.freeze({
                name: mountName,
                root: mountPath,
                app: mount
            });
        }

        // store
        mountedApps = Object.freeze(mountedApps);       
    };

    $$('override');
    this.start = async (base) => { // configure hashchange handler
        base();

        hashChangeHandler = () => {
            // get clean path
            let path = window.location.hash;
            if (path.substr(0, 3) === '#!/') { path = path.substr(3); }
            if (path.substr(0, 2) === '#!') { path = path.substr(2); }
            if (path.substr(0, 2) === '#/') { path = path.substr(2); }
            if (path.substr(0, 1) === '#') { path = path.substr(1); }
            
            // route this path to most suitable mounted app
            let app = null,
                mountName = '';
            for(let mount of this.mounts) {
                if (path.startsWith(mount.root)) { 
                    app = mount.app; 
                    path = path.substr(mount.root.length); // remove all base path, so it becomes at part the way paths were added to this app
                    mountName = mount;
                    break; 
                }
            }
            if (!app) { // when nothing matches, give it to main
                mountName = 'main';
                app = this.mounts[mountName]; 
            } 
            
            // add initial /
            if (path.substr(0, 1) !== '/') { path = '/' + path; }

            // run app to initiate routing
            setTimeout(() => { 
                try {
                    app(path);
                } catch (err) {
                    this.error(err); // pass-through event
                }
            }, 0); 
        };
    };

    $$('override');
    this.ready = async (base) => { // start listening hashchange event
        base();

        // attach event handler
        window.addEventListener('hashchange', hashChangeHandler);

        // navigate to home
        this.app.redirect(settings.url.home);

        // ready
        console.log(`${AppDomain.app().info.name}, v${AppDomain.app().info.version}`); // eslint-disable-line no-console
    };

    $$('override');
    this.stop = async (base) => { // stop listening hashchange event
        base();

        // detach event handler
        window.removeEventListener('hashchange', hashChangeHandler);
    };

    $$('override');
    this.dispose = (base) => {
        base();

        mountedApps = null;
    };
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.boot/ClientRouter.js
try{
const { Bootware } = ns('flair.app');
const { ViewHandler, ViewInterceptor } = ns('flair.ui');

/**
 * @name ClientRouter
 * @description Client Router Configuration Setup
 */
$$('sealed');
$$('ns', 'flair.boot');
Class('ClientRouter', Bootware, function () {
    let routes = null;
    $$('override');
    this.construct = (base) => {
        base('Client Router', true); // mount specific 
    };

    $$('override');
    this.boot = async (mount) => {
        // get all registered routes, and sort by index, if was not already done in previous call
        if (!routes) {
            routes = AppDomain.context.current().allRoutes(true);
            routes.sort((a, b) => {
                if (a.index < b.index) {
                    return -1;
                }
                if (a.index > b.index) {
                    return 1;
                }
                return 0;
            });
        }

        const runInterceptor = (IC, ctx) => {
            return new Promise((resolve, reject) => {
                try {
                    let aic = new IC();
                    aic.run(ctx).then(() => {
                        if (ctx.$stop) {
                            reject();
                        } else {
                            resolve();
                        }
                    }).catch(reject);
                } catch (err) {
                    reject(err);
                }
            });
        };
        const runInterceptors = (interceptors, ctx) => {
            return forEachAsync(interceptors, (resolve, reject, ic) => {
                include(ic).then((theType) => {
                    let RequiredICType = as(theType, ViewInterceptor);
                    if (RequiredICType) {
                        runInterceptor(RequiredICType, ctx).then(resolve).catch(reject);
                    } else {
                        reject(Exception.InvalidDefinition(`Invalid interceptor type. (${ic})`));
                    }
                }).catch(reject);
            });
        };

        // add routes related to current mount
        let verb = 'view'; // only view verb is supported on client
        for (let route of routes) {
            if (route.mount === mount.name) { // add route-handler
                // NOTE: verbs are ignored for client routing, only 'view' verb is processed
                mount.app(route.path, (ctx) => { // mount.app = page object/func
                    const onError = (err) => {
                        AppDomain.host().raiseError(err);
                    };
                    const onRedirect = (url) => {
                        mount.app.redirect(url);
                    };
                    const handleRoute = () => {
                        include(route.handler).then((theType) => {
                            let RouteHandler = as(theType, ViewHandler);
                            if (RouteHandler) {
                                try {
                                    using(new RouteHandler(), (routeHandler) => {
                                        // ctx.params has all the route parameters.
                                        // e.g., for route "/users/:userId/books/:bookId" ctx.params will 
                                        // have "ctx.params: { "userId": "34", "bookId": "8989" }"
                                        routeHandler[verb](ctx).then(() => {
                                            ctx.handled = true;
                                            if (ctx.$redirect) {
                                                onRedirect(ctx.$redirect);
                                            }
                                        }).catch(onError);
                                    });
                                } catch (err) {
                                    onError(err);
                                }
                            } else {
                                onError(Exception.InvalidDefinition(`Invalid route handler. (${route.handler})`));
                            }
                        }).catch(onError);
                    };

                    // add special properties to context
                    ctx.$stop = false;
                    ctx.$redirect = '';

                    // run mount specific interceptors
                    // each interceptor is derived from ViewInterceptor and
                    // run method of it takes ctx, can update it
                    // each item is: "InterceptorTypeQualifiedName"
                    let mountInterceptors = settings[`${mount.name}-interceptors`] || [];
                    runInterceptors(mountInterceptors, ctx).then(() => {
                        if (!ctx.$stop) {
                            handleRoute();
                        } else {
                            ctx.handled = true;
                            if (ctx.$redirect) {
                                onRedirect(ctx.$redirect);
                            }
                        }
                    }).catch((err) => {
                        if (ctx.$stop) { // reject might also be because of stop done by an interceptor
                            ctx.handled = true;
                            if (ctx.$redirect) {
                                onRedirect(ctx.$redirect);
                            }
                        } else {
                            onError(err);
                        }
                    });
                });
            }
        }

        // catch 404 for this mount and forward to error handler
        mount.app("*", (ctx) => { // mount.app = page object/func
            // redirect to 404 route, which has to be defined route
            let url404 = settings.url['404'];
            if (url404) {
                ctx.handled = true;
                mount.app.redirect(url404);
            } else {
                window.history.back(); // nothing else can be done
            }
        });
    };
});} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui/ViewHandler.js
try{
const { Handler } = ns('flair.app');
const { ViewTransition } = ns('flair.ui');

/**
 * @name ViewHandler
 * @description GUI View Handler
 */
$$('ns', 'flair.ui');
Class('ViewHandler', Handler, function() {
    let mainEl = '';

    $$('override');
    this.construct = (base, el, title, transition) => {
        base();

        mainEl = el || 'main';
        this.viewTransition = transition;
        this.title = this.title + (title ? ' - ' + title : '');
    };

    $$('privateSet');
    this.viewTransition = '';

    $$('protectedSet');
    this.name = '';

    $$('protectedSet');
    this.title = '';

    // each meta in array can be defined as:
    // { "<nameOfAttribute>": "<contentOfAttribute>", "<nameOfAttribute>": "<contentOfAttribute>", ... }
    $$('protectedSet');
    this.meta = null;

    this.view = async (ctx) => {
        // give it a unique name, if not already given
        this.name = this.name || (this.$self.id + '_' + guid());

        // load view transition
        if (this.viewTransition) {
            let ViewTransitionType = as(await include(this.viewTransition), ViewTransition);
            if (ViewTransitionType) {
                this.viewTransition = new ViewTransitionType();
            } else {
                this.viewTransition = '';
            }
        }

        // add view el to parent
        let el = DOC.createElement('div'),
            parentEl = DOC.getElementById(mainEl);
        el.id = this.name;
        el.setAttribute('hidden', '');
        parentEl.appendChild(el);
        
        // load view
        this.load(ctx, el);

        // swap views (old one is replaced with this new one)
        await this.swap();
    };

    $$('protected');
    $$('virtual');
    $$('async');
    this.loadView = noop;

    $$('private');
    this.swap = async () => {
        let thisViewEl = DOC.getElementById(this.name);

        // outgoing view
        if (this.$static.currentView) {
            let currentViewEl = DOC.getElementById(this.$static.currentView);

            // remove outgoing view meta   
            for(let meta of this.meta) {
                DOC.head.removeChild(DOC.querySelector('meta[name="' + meta + '"]'));
            }
                
            // apply transitions
            if (this.viewTransition) {
                // leave outgoing, enter incoming
                await this.viewTransition.leave(currentViewEl, thisViewEl);
                await this.viewTransition.enter(thisViewEl, currentViewEl);
            } else {
                // default is no transition
                currentViewEl.hidden = true;
                thisViewEl.hidden = false;
            }

            // remove outgoing view
            let parentEl = DOC.getElementById(mainEl);            
            parentEl.removeChild(currentViewEl);
        }

        // add incoming view meta
        for(let meta of this.meta) {
            var metaEl = document.createElement('meta');
            for(let metaAttr in meta) {
                metaEl[metaAttr] = meta[metaAttr];
            }
            DOC.head.appendChild(metaEl);
        }

        // in case there was no previous view
        if (!this.$static.currentView) {
            thisViewEl.hidden = false;
        }

        // update title
        DOC.title = this.title;

        // set new current
        this.$static.currentView = this.name;
        this.$static.currentViewMeta = this.meta;
    };

    $$('static');
    this.currentView = '';

    $$('static');
    this.currentViewMeta = [];
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui/ViewInterceptor.js
try{
/**
 * @name ViewInterceptor
 * @description GUI View Interceptor
 */
$$('ns', 'flair.ui');
Class('ViewInterceptor', function() {
    $$('virtual');
    $$('async');
    this.run = noop;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui/ViewState.js
try{
/**
 * @name ViewState
 * @description GUI View State Global Store
 */
$$('singleton');
$$('ns', 'flair.ui');
Class('ViewState', function() {
    $$('state');
    $$('private');
    this.store = {};

    this.get = (path, name) => {
        path = path || ''; name = name || '';
        return this.store[path + '/' + name] || null;
    };
    this.set = (path, name, value) => {
        path = path || ''; name = name || '';
        if (typeof value !== 'boolean' && !value) {
            delete this.store[path + '/' + name]; return;
        }
        this.store[path + '/' + name] = value;
    };

    this.clear = () => { this.store = null; }
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueComponent.js
try{
const { VueComponentMembers } = ns('flair.ui.vue');

/**
 * @name VueComponent
 * @description Vue Component
 */
$$('ns', 'flair.ui.vue');
Class('VueComponent', [VueComponentMembers], function() {
    this.factory = async () => {
        // shared between view and component both
        // coming from VueComponentMembers mixin
        let component = this.define();

        // props
        // https://vuejs.org/v2/guide/components-props.html
        // https://vuejs.org/v2/api/#props
        // these names can then be defined as attribute on component's html node
        if (this.props && Array.isArray(this.props)) {
            component.props = this.props;
        }

        // data
        // https://vuejs.org/v2/api/#data
        if (this.data && typeof this.data === 'function') { 
            component.data = this.data;
        }

        // name
        // https://vuejs.org/v2/api/#name
        if (this.name) {
            component.name = this.name;
        }

        // model
        // https://vuejs.org/v2/api/#model
        if (this.model) {
            component.model = this.model;
        }

        // inheritAttrs
        // https://vuejs.org/v2/api/#inheritAttrs
        if (typeof this.inheritAttrs === 'boolean') { 
            component.inheritAttrs = this.inheritAttrs;
        }

        // done
        return component;
    };

    $$('protected');
    this.props = null;

    $$('protected');
    this.data = null;    

    $$('protected');
    this.model = null;    

    $$('protected');
    this.inheritAttrs = null;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueDirective.js
try{
/**
 * @name VueDirective
 * @description Vue Directive
 */
$$('ns', 'flair.ui.vue');
Class('VueDirective', function() {
    $$('virtual');
    $$('async');
    this.factory = noop;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueFilter.js
try{
/**
 * @name VueFilter
 * @description Vue Filter
 */
$$('ns', 'flair.ui.vue');
Class('VueFilter', function() {
    $$('virtual');
    $$('async');
    this.factory = noop;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueLayout.js
try{
/**
 * @name VueLayout
 * @description Vue Layout
 */
$$('ns', 'flair.ui.vue');
Class('VueLayout', function() {
    $$('protected');
    this.html = '';

    $$('protected');
    this.style = '';

    // this is the "div-id" (in defined html) where actual view's html will come
    $$('protected');
    this.viewArea = 'view';

    // each area here can be as:
    // { "area: "", component": "", "type": "" } 
    // "area" is the div-id (in defined html) where the component needs to be placed
    // "component" is the name of the component
    // "type" is the qualified component type name
    $$('protectedSet');
    this.areas = [];

    this.merge = async (viewHtml) => {
        // get port
        let clientFileLoader = Port('clientFile');  

        // load style content in property
        if (this.style && this.style.endsWith('.css')) { // if style file is defined via $$('asset', '<fileName>');
            this.style = await clientFileLoader(this.style);
        }

        // load html content in property
        if (this.html && this.html.endsWith('.html')) { // if html file is defined via $$('asset', '<fileName>');
            this.html = await clientFileLoader(this.html);
        }

        // root
        let rootEl = DOC.createElement('div');
        if (this.style) {
            let styleEl = DOC.createElement('style');
            styleEl.innerHTML = this.style.trim();
            styleEl.setAttribute('scoped', '');
            rootEl.append(styleEl);
        } 
        if (this.html) {
            let htmlEl = DOC.createElement('div');
            htmlEl.innerHTML = this.html.trim();
            rootEl.append(htmlEl);
        }
        
        // merge view area
        this.viewArea = this.viewArea || 'view'; // inbuilt default value
        let viewAreaEl = rootEl.content.getElementById(this.viewArea);
        if (viewAreaEl) { viewAreaEl.innerHTML = viewHtml; }

        // merge all other areas with component name placeholders
        // each area here can be as:
        // { "area: "", component": "", "type": "" } 
        // "area" is the div-id (in defined html) where the component needs to be placed
        // "component" is the name of the component
        // "type" is the qualified component type name         
        let areaEl = null;
        if (this.layout && this.layout.areas && Array.isArray(this.layout.areas)) {
            for(let area of this.layout.areas) {
                areaEl = rootEl.content.getElementById(area.area);
                if (areaEl) { 
                    let componentEl = DOC.createElement('component');
                    componentEl.setAttribute('is', area.component);
                    areaEl.append(componentEl);
                }
            }
        }       
        
        // done
        return rootEl.innerHTML;
    };
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueMixin.js
try{
/**
 * @name VueMixin
 * @description Vue Mixin
 */
$$('ns', 'flair.ui.vue');
Class('VueMixin', function() {
    $$('virtual');
    $$('async');
    this.factory = noop;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VuePlugin.js
try{
/**
 * @name VuePlugin
 * @description Vue Plugin
 */
$$('ns', 'flair.ui.vue');
Class('VuePlugin', function() {
    this.construct = (name) => {
        // load options, if name and corresponding options are defined
        if (settings.pluginOptions[name]) {
            this.options = Object.assign({}, settings.pluginOptions[name]); // keep a copy
        }
    };

    $$('virtual');
    $$('async');
    this.factory = noop;

    this.options = null;
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueSetup.js
try{
const { Bootware } = ns('flair.app');
const Vue = await include('vue/vue{.min}.js');
const { VueComponent, VueFilter, VueDirective, VuePlugin, VueMixin } = ns('flair.ui.vue');

/**
 * @name VueSetup
 * @description Vue initializer
 */
$$('ns', 'flair.ui.vue');
Class('VueSetup', Bootware, function() {
    $$('override');
    this.construct = (base) => {
        base('Vue Setup');
    };

    $$('override');
    this.boot = async () => {
        // setup Vue configuration
        // TODO:

        // load Vue global plugins
        // each plugin in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        let plugins = settings.plugins,
            PluginType = null,
            plugin = null;
        for(let item in plugins) {
            if (!item.name) { throw Exception.OperationFailed(`Plugin name cannot be empty. (${item.type})`); }
            if (!item.type) { throw Exception.OperationFailed(`Plugin type cannot be empty. (${item.name})`); }

            PluginType = as(await include(item.type), VuePlugin);
            if (PluginType) {
                try {
                    plugin = new PluginType(item.name);
                    Vue.use(await plugin.factory(), plugin.options || {});
                } catch (err) {
                    throw Exception.OperationFailed(`Plugin registration failed. (${item.type})`, err);
                }
            } else {
                throw Exception.InvalidArgument(item.type);
            }
        }  

        // load Vue global mixins
        // each mixin in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        let mixins = settings.mixins,
            MixinType = null,
            mixin = null;
        for(let item in mixins) {
            if (!item.name) { throw Exception.OperationFailed(`Mixin name cannot be empty. (${item.type})`); }
            if (!item.type) { throw Exception.OperationFailed(`Mixin type cannot be empty. (${item.name})`); }

            MixinType = as(await include(item.type), VueMixin);
            if (MixinType) {
                try {
                    mixin = new MixinType();
                    Vue.mixin(await mixin.factory());
                } catch (err) {
                    throw Exception.OperationFailed(`Mixin registration failed. (${item.type})`, err);
                }
            } else {
                throw Exception.InvalidArgument(item.type);
            }
        }         

        // load Vue global directives
        // each directive in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        let directives = settings.directives,
            DirectiveType = null,
            directive = null;
        for(let item in directives) {
            if (!item.name) { throw Exception.OperationFailed(`Directive name cannot be empty. (${item.type})`); }
            if (!item.type) { throw Exception.OperationFailed(`Directive type cannot be empty. (${item.name})`); }

            DirectiveType = as(await include(item.type), VueDirective);
            if (DirectiveType) {
                try {
                    directive = new DirectiveType();
                    Vue.directive(item.name, await directive.factory());
                } catch (err) {
                    throw Exception.OperationFailed(`Directive registration failed. (${item.type})`, err);
                }
            } else {
                throw Exception.InvalidArgument(item.type);
            }
        }         

        // load Vue global filters 
        // each filter in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        let filters = settings.filters,
            FilterType = null,
            filter = null;
        for(let item in filters) {
            if (!item.name) { throw Exception.OperationFailed(`Filter name cannot be empty. (${item.type})`); }
            if (!item.type) { throw Exception.OperationFailed(`Filter type cannot be empty. (${item.name})`); }
            FilterType = as(await include(item.type), VueFilter);
            if (FilterType) {
                try {
                    filter = new FilterType();
                    // TODO: prevent duplicate filter registration, as done for components
                    Vue.filter(item.name, await filter.factory());
                } catch (err) {
                    throw Exception.OperationFailed(`Filter registration failed. (${item.type})`, err);
                }
            } else {
                throw Exception.InvalidArgument(item.type);
            }
        } 

        // register global components
        // each component in array is defined as:
        // { "name": "name", "type": "ns.typeName" }
        let components = settings.components,
            ComponentType = null,
            component = null;
        for(let item in components) {
            if (!item.name) { throw Exception.OperationFailed(`Component name cannot be empty. (${item.type})`); }
            if (!item.type) { throw Exception.OperationFailed(`Component type cannot be empty. (${item.name})`); }

            ComponentType = as(await include(item.name), VueComponent);
            if (ComponentType) {
                try {
                    component = new ComponentType();

                    // check for duplicate
                    if (Vue.options.components[item.name]) { throw Exception.Duplicate(`Component already registered. (${item.name})`); }
                
                    // register globally
                    Vue.component(item.name, await component.factory());
                } catch (err) {
                    throw Exception.OperationFailed(`Component registration failed. (${item.type})`, err);
                }
            } else {
                throw Exception.InvalidArgument(item.type);
            }
        }   
    };   
});
} catch(err) {
	__asmError(err);
}
})();

(async () => { // ./src/flair.client/flair.ui.vue/VueView.js
try{
const { ViewHandler } = ns('flair.ui');
const { VueComponentMembers } = ns('flair.ui.vue');
const Vue = await include('vue/vue{.min}.js');

/**
 * @name VueView
 * @description Vue View
 */
$$('ns', 'flair.ui.vue');
Class('VueView', ViewHandler, [VueComponentMembers], function() {
    let isLoaded = false;

    $$('override');
    this.construct = (base) => {
        base(settings.el, settings.title, settings.viewTransition);
    };

    $$('private');
    this.factory = async () => {
        // merge layout's components
        // each area here can be as:
        // { "area: "", component": "", "type": "" } 
        // "area" is the div-id (in defined html) where the component needs to be placed
        // "component" is the name of the component
        // "type" is the qualified component type name      
        if (this.layout && this.layout.areas && Array.isArray(this.layout.areas)) {
            this.components = this.components || [];
            for(let area of this.layout.areas) {
                // each component arrat item is: { "name": "name", "type": "ns.typeName" }
                this.components.push({ name: area.component, type: area.type });
            }
        }

        // shared between view and component both
        // coming from VueComponentMembers mixin
        let component = this.define();

        // el
        // https://vuejs.org/v2/api/#el
        component.el = '#' + this.name;

        // propsData
        // https://vuejs.org/v2/api/#propsData
        if (this.propsData) {
            component.propsData = this.propsData;
        }

        // data
        // https://vuejs.org/v2/api/#data
        if (this.data && typeof this.data !== 'function') {
            component.data = this.data;
        }

        // merge view and view' layout's template
        if (this.layout) {
            component.template = await this.layout.merge(component.template);
        }

        // done
        return component;
    };    
    
    $$('protected');
    $$('override');
    $$('sealed');
    this.loadView = async (ctx, el) => {
        if (!isLoaded) {
            isLoaded = true;

            // custom load op
            await this.load(ctx, el);

            // setup Vue view instance
            new Vue(await this.factory());
        }
    };

    $$('protected');
    $$('virtual');
    $$('async');
    this.load = noop;

    $$('protected');
    this.el = null;

    $$('protected');
    this.propsData = null;

    $$('protected');
    this.data = null;

    $$('protected');
    this.layout = null;
});
} catch(err) {
	__asmError(err);
}
})();

} catch(err) {
	__asmError(err);
}

AppDomain.context.current().currentAssemblyBeingLoaded('');

AppDomain.registerAdo('{"name":"flair.client","file":"./flair.client{.min}.js","mainAssembly":"flair","desc":"True Object Oriented JavaScript","title":"Flair.js","version":"0.50.32","lupdate":"Sat, 04 May 2019 18:35:15 GMT","builder":{"name":"<<name>>","version":"<<version>>","format":"fasm","formatVersion":"1","contains":["initializer","functions","types","enclosureVars","enclosedTypes","resources","assets","routes","selfreg"]},"copyright":"(c) 2017-2019 Vikas Burman","license":"MIT","types":["flair.ui.ViewTransition","flair.ui.vue.VueComponentMembers","flair.app.ClientHost","flair.boot.ClientRouter","flair.ui.ViewHandler","flair.ui.ViewInterceptor","flair.ui.ViewState","flair.ui.vue.VueComponent","flair.ui.vue.VueDirective","flair.ui.vue.VueFilter","flair.ui.vue.VueLayout","flair.ui.vue.VueMixin","flair.ui.vue.VuePlugin","flair.ui.vue.VueSetup","flair.ui.vue.VueView"],"resources":[],"assets":[],"routes":[{"name":"flair.ui.vue.test2","mount":"main","index":101,"verbs":[],"path":"test/:id","handler":"abc.xyz.Test"},{"name":"flair.ui.vue.exit2","mount":"main","index":103,"verbs":[],"path":"exit","handler":"abc.xyz.Exit"}]}');

if(typeof onLoadComplete === 'function'){ onLoadComplete(); onLoadComplete = noop; } // eslint-disable-line no-undef

})();