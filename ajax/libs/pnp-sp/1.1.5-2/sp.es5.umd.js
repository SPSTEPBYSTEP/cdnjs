/**
@license
 * @pnp/sp v1.1.5-2 - pnp - provides a fluent api for working with SharePoint REST
 * MIT (https://github.com/pnp/pnpjs/blob/master/LICENSE)
 * Copyright (c) 2018 Microsoft
 * docs: https://pnp.github.io/pnpjs/
 * source: https:github.com/pnp/pnpjs
 * bugs: https://github.com/pnp/pnpjs/issues
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@pnp/common'), require('tslib'), require('@pnp/logging'), require('@pnp/odata')) :
    typeof define === 'function' && define.amd ? define(['exports', '@pnp/common', 'tslib', '@pnp/logging', '@pnp/odata'], factory) :
    (factory((global.pnp = global.pnp || {}, global.pnp.sp = {}),global.pnp.common,global.tslib_1,global.pnp.logging,global.pnp.odata));
}(this, (function (exports,common,tslib_1,logging,odata) { 'use strict';

    function extractWebUrl(candidateUrl) {
        if (common.stringIsNullOrEmpty(candidateUrl)) {
            return "";
        }
        var index = candidateUrl.indexOf("_api/");
        if (index < 0) {
            index = candidateUrl.indexOf("_vti_bin/");
        }
        if (index > -1) {
            return candidateUrl.substr(0, index);
        }
        // if all else fails just give them what they gave us back
        return candidateUrl;
    }

    function odataUrlFrom(candidate) {
        var parts = [];
        var s = ["odata.type", "odata.editLink", "__metadata", "odata.metadata"];
        if (common.hOP(candidate, s[0]) && candidate[s[0]] === "SP.Web") {
            // webs return an absolute url in the editLink
            if (common.hOP(candidate, s[1])) {
                parts.push(candidate[s[1]]);
            }
            else if (common.hOP(candidate, s[2])) {
                // we are dealing with verbose, which has an absolute uri
                parts.push(candidate.__metadata.uri);
            }
        }
        else {
            if (common.hOP(candidate, s[3]) && common.hOP(candidate, s[1])) {
                // we are dealign with minimal metadata (default)
                parts.push(extractWebUrl(candidate[s[3]]), "_api", candidate[s[1]]);
            }
            else if (common.hOP(candidate, s[1])) {
                parts.push("_api", candidate[s[1]]);
            }
            else if (common.hOP(candidate, s[2])) {
                // we are dealing with verbose, which has an absolute uri
                parts.push(candidate.__metadata.uri);
            }
        }
        if (parts.length < 1) {
            logging.Logger.write("No uri information found in ODataEntity parsing, chaining will fail for this object.", 2 /* Warning */);
            return "";
        }
        return common.combine.apply(void 0, parts);
    }
    var SPODataEntityParserImpl = /** @class */ (function (_super) {
        tslib_1.__extends(SPODataEntityParserImpl, _super);
        function SPODataEntityParserImpl(factory) {
            var _this = _super.call(this) || this;
            _this.factory = factory;
            _this.hydrate = function (d) {
                var o = new _this.factory(odataUrlFrom(d), null);
                return common.extend(o, d);
            };
            return _this;
        }
        SPODataEntityParserImpl.prototype.parse = function (r) {
            var _this = this;
            return _super.prototype.parse.call(this, r).then(function (d) {
                var o = new _this.factory(odataUrlFrom(d), null);
                return common.extend(o, d);
            });
        };
        return SPODataEntityParserImpl;
    }(odata.ODataParserBase));
    var SPODataEntityArrayParserImpl = /** @class */ (function (_super) {
        tslib_1.__extends(SPODataEntityArrayParserImpl, _super);
        function SPODataEntityArrayParserImpl(factory) {
            var _this = _super.call(this) || this;
            _this.factory = factory;
            _this.hydrate = function (d) {
                return d.map(function (v) {
                    var o = new _this.factory(odataUrlFrom(v), null);
                    return common.extend(o, v);
                });
            };
            return _this;
        }
        SPODataEntityArrayParserImpl.prototype.parse = function (r) {
            var _this = this;
            return _super.prototype.parse.call(this, r).then(function (d) {
                return d.map(function (v) {
                    var o = new _this.factory(odataUrlFrom(v), null);
                    return common.extend(o, v);
                });
            });
        };
        return SPODataEntityArrayParserImpl;
    }(odata.ODataParserBase));
    function spODataEntity(factory) {
        return new SPODataEntityParserImpl(factory);
    }
    function spODataEntityArray(factory) {
        return new SPODataEntityArrayParserImpl(factory);
    }

    function setup(config) {
        common.RuntimeConfig.extend(config);
    }
    var SPRuntimeConfigImpl = /** @class */ (function () {
        function SPRuntimeConfigImpl() {
        }
        Object.defineProperty(SPRuntimeConfigImpl.prototype, "headers", {
            get: function () {
                var spPart = common.RuntimeConfig.get("sp");
                if (spPart !== undefined && spPart.headers !== undefined) {
                    return spPart.headers;
                }
                return {};
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SPRuntimeConfigImpl.prototype, "baseUrl", {
            get: function () {
                var spPart = common.RuntimeConfig.get("sp");
                if (spPart !== undefined && spPart.baseUrl !== undefined) {
                    return spPart.baseUrl;
                }
                if (common.RuntimeConfig.spfxContext !== undefined && common.RuntimeConfig.spfxContext !== null) {
                    return common.RuntimeConfig.spfxContext.pageContext.web.absoluteUrl;
                }
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SPRuntimeConfigImpl.prototype, "fetchClientFactory", {
            get: function () {
                var spPart = common.RuntimeConfig.get("sp");
                // use a configured factory firt
                if (spPart !== undefined && spPart.fetchClientFactory !== undefined) {
                    return spPart.fetchClientFactory;
                }
                else {
                    return function () { return new common.FetchClient(); };
                }
            },
            enumerable: true,
            configurable: true
        });
        return SPRuntimeConfigImpl;
    }());
    var SPRuntimeConfig = new SPRuntimeConfigImpl();

    var CachedDigest = /** @class */ (function () {
        function CachedDigest() {
        }
        return CachedDigest;
    }());
    // allows for the caching of digests across all HttpClient's which each have their own DigestCache wrapper.
    var digests = new Map();
    var DigestCache = /** @class */ (function () {
        function DigestCache(_httpClient, _digests) {
            if (_digests === void 0) { _digests = digests; }
            this._httpClient = _httpClient;
            this._digests = _digests;
        }
        DigestCache.prototype.getDigest = function (webUrl) {
            var _this = this;
            var cachedDigest = this._digests.get(webUrl);
            if (cachedDigest !== undefined) {
                var now = new Date();
                if (now < cachedDigest.expiration) {
                    return Promise.resolve(cachedDigest.value);
                }
            }
            var url = common.combine(webUrl, "/_api/contextinfo");
            var headers = {
                "Accept": "application/json;odata=verbose",
                "Content-Type": "application/json;odata=verbose;charset=utf-8",
            };
            return this._httpClient.fetchRaw(url, {
                cache: "no-cache",
                credentials: "same-origin",
                headers: common.extend(headers, SPRuntimeConfig.headers, true),
                method: "POST",
            }).then(function (response) {
                var parser = new odata.ODataDefaultParser();
                return parser.parse(response).then(function (d) { return d.GetContextWebInformation; });
            }).then(function (data) {
                var newCachedDigest = new CachedDigest();
                newCachedDigest.value = data.FormDigestValue;
                var seconds = data.FormDigestTimeoutSeconds;
                var expiration = new Date();
                expiration.setTime(expiration.getTime() + 1000 * seconds);
                newCachedDigest.expiration = expiration;
                _this._digests.set(webUrl, newCachedDigest);
                return newCachedDigest.value;
            });
        };
        DigestCache.prototype.clear = function () {
            this._digests.clear();
        };
        return DigestCache;
    }());

    var SPHttpClient = /** @class */ (function () {
        function SPHttpClient(_impl) {
            if (_impl === void 0) { _impl = SPRuntimeConfig.fetchClientFactory(); }
            this._impl = _impl;
            this._digestCache = new DigestCache(this);
        }
        SPHttpClient.prototype.fetch = function (url, options) {
            var _this = this;
            if (options === void 0) { options = {}; }
            var opts = common.extend(options, { cache: "no-cache", credentials: "same-origin" }, true);
            var headers = new Headers();
            // first we add the global headers so they can be overwritten by any passed in locally to this call
            common.mergeHeaders(headers, SPRuntimeConfig.headers);
            // second we add the local options so we can overwrite the globals
            common.mergeHeaders(headers, options.headers);
            // lastly we apply any default headers we need that may not exist
            if (!headers.has("Accept")) {
                headers.append("Accept", "application/json");
            }
            if (!headers.has("Content-Type")) {
                headers.append("Content-Type", "application/json;odata=verbose;charset=utf-8");
            }
            if (!headers.has("X-ClientService-ClientTag")) {
                headers.append("X-ClientService-ClientTag", "PnPCoreJS:@pnp-1.1.5-2");
            }
            if (!headers.has("User-Agent")) {
                // this marks the requests for understanding by the service
                headers.append("User-Agent", "NONISV|SharePointPnP|PnPCoreJS/1.1.5-2");
            }
            opts = common.extend(opts, { headers: headers });
            if (opts.method && opts.method.toUpperCase() !== "GET") {
                // if we have either a request digest or an authorization header we don't need a digest
                if (!headers.has("X-RequestDigest") && !headers.has("Authorization")) {
                    return this._digestCache.getDigest(extractWebUrl(url))
                        .then(function (digest) {
                        headers.append("X-RequestDigest", digest);
                        return _this.fetchRaw(url, opts);
                    });
                }
            }
            return this.fetchRaw(url, opts);
        };
        SPHttpClient.prototype.fetchRaw = function (url, options) {
            var _this = this;
            if (options === void 0) { options = {}; }
            // here we need to normalize the headers
            var rawHeaders = new Headers();
            common.mergeHeaders(rawHeaders, options.headers);
            options = common.extend(options, { headers: rawHeaders });
            var retry = function (ctx) {
                _this._impl.fetch(url, options).then(function (response) { return ctx.resolve(response); }).catch(function (response) {
                    // Check if request was throttled - http status code 429
                    // Check if request failed due to server unavailable - http status code 503
                    if (response.status !== 429 && response.status !== 503) {
                        ctx.reject(response);
                    }
                    // grab our current delay
                    var delay = ctx.delay;
                    // Increment our counters.
                    ctx.delay *= 2;
                    ctx.attempts++;
                    // If we have exceeded the retry count, reject.
                    if (ctx.retryCount <= ctx.attempts) {
                        ctx.reject(response);
                    }
                    // Set our retry timeout for {delay} milliseconds.
                    setTimeout(common.getCtxCallback(_this, retry, ctx), delay);
                });
            };
            return new Promise(function (resolve, reject) {
                var retryContext = {
                    attempts: 0,
                    delay: 100,
                    reject: reject,
                    resolve: resolve,
                    retryCount: 7,
                };
                retry.call(_this, retryContext);
            });
        };
        SPHttpClient.prototype.get = function (url, options) {
            if (options === void 0) { options = {}; }
            var opts = common.extend(options, { method: "GET" });
            return this.fetch(url, opts);
        };
        SPHttpClient.prototype.post = function (url, options) {
            if (options === void 0) { options = {}; }
            var opts = common.extend(options, { method: "POST" });
            return this.fetch(url, opts);
        };
        SPHttpClient.prototype.patch = function (url, options) {
            if (options === void 0) { options = {}; }
            var opts = common.extend(options, { method: "PATCH" });
            return this.fetch(url, opts);
        };
        SPHttpClient.prototype.delete = function (url, options) {
            if (options === void 0) { options = {}; }
            var opts = common.extend(options, { method: "DELETE" });
            return this.fetch(url, opts);
        };
        return SPHttpClient;
    }());

    var global$1 = (typeof global !== "undefined" ? global :
                typeof self !== "undefined" ? self :
                typeof window !== "undefined" ? window : {});

    /**
     * Ensures that a given url is absolute for the current web based on context
     *
     * @param candidateUrl The url to make absolute
     *
     */
    function toAbsoluteUrl(candidateUrl) {
        return new Promise(function (resolve) {
            if (common.isUrlAbsolute(candidateUrl)) {
                // if we are already absolute, then just return the url
                return resolve(candidateUrl);
            }
            if (SPRuntimeConfig.baseUrl !== null) {
                // base url specified either with baseUrl of spfxContext config property
                return resolve(common.combine(SPRuntimeConfig.baseUrl, candidateUrl));
            }
            if (global$1._spPageContextInfo !== undefined) {
                // operating in classic pages
                if (common.hOP(global$1._spPageContextInfo, "webAbsoluteUrl")) {
                    return resolve(common.combine(global$1._spPageContextInfo.webAbsoluteUrl, candidateUrl));
                }
                else if (common.hOP(global$1._spPageContextInfo, "webServerRelativeUrl")) {
                    return resolve(common.combine(global$1._spPageContextInfo.webServerRelativeUrl, candidateUrl));
                }
            }
            // does window.location exist and have a certain path part in it?
            if (global$1.location !== undefined) {
                var baseUrl_1 = global$1.location.toString().toLowerCase();
                ["/_layouts/", "/siteassets/"].forEach(function (s) {
                    var index = baseUrl_1.indexOf(s);
                    if (index > 0) {
                        return resolve(common.combine(baseUrl_1.substr(0, index), candidateUrl));
                    }
                });
            }
            return resolve(candidateUrl);
        });
    }

    function metadata(type) {
        return {
            "__metadata": { "type": type },
        };
    }

    /**
     * SharePointQueryable Base Class
     *
     */
    var SharePointQueryable = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryable, _super);
        /**
         * Creates a new instance of the SharePointQueryable class
         *
         * @constructor
         * @param baseUrl A string or SharePointQueryable that should form the base part of the url
         *
         */
        function SharePointQueryable(baseUrl, path) {
            var _this = _super.call(this) || this;
            if (typeof baseUrl === "string") {
                // we need to do some extra parsing to get the parent url correct if we are
                // being created from just a string.
                if (common.isUrlAbsolute(baseUrl) || baseUrl.lastIndexOf("/") < 0) {
                    _this._parentUrl = baseUrl;
                    _this._url = common.combine(baseUrl, path);
                }
                else if (baseUrl.lastIndexOf("/") > baseUrl.lastIndexOf("(")) {
                    // .../items(19)/fields
                    var index = baseUrl.lastIndexOf("/");
                    _this._parentUrl = baseUrl.slice(0, index);
                    path = common.combine(baseUrl.slice(index), path);
                    _this._url = common.combine(_this._parentUrl, path);
                }
                else {
                    // .../items(19)
                    var index = baseUrl.lastIndexOf("(");
                    _this._parentUrl = baseUrl.slice(0, index);
                    _this._url = common.combine(baseUrl, path);
                }
            }
            else {
                _this.extend(baseUrl, path);
                var target = baseUrl.query.get("@target");
                if (target !== undefined) {
                    _this.query.set("@target", target);
                }
            }
            return _this;
        }
        /**
         * Creates a new instance of the supplied factory and extends this into that new instance
         *
         * @param factory constructor for the new SharePointQueryable
         */
        SharePointQueryable.prototype.as = function (factory) {
            var o = new factory(this._url, null);
            return common.extend(o, this, true);
        };
        /**
         * Gets the full url with query information
         *
         */
        SharePointQueryable.prototype.toUrlAndQuery = function () {
            var aliasedParams = new Map(this.query);
            var url = this.toUrl().replace(/'!(@.*?)::(.*?)'/ig, function (match, labelName, value) {
                logging.Logger.write("Rewriting aliased parameter from match " + match + " to label: " + labelName + " value: " + value, 0 /* Verbose */);
                aliasedParams.set(labelName, "'" + value + "'");
                return labelName;
            });
            url += "?" + Array.from(aliasedParams).map(function (v) { return v[0] + "=" + v[1]; }).join("&");
            return url;
        };
        /**
         * Choose which fields to return
         *
         * @param selects One or more fields to return
         */
        SharePointQueryable.prototype.select = function () {
            var selects = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                selects[_i] = arguments[_i];
            }
            if (selects.length > 0) {
                this.query.set("$select", selects.join(","));
            }
            return this;
        };
        /**
         * Expands fields such as lookups to get additional data
         *
         * @param expands The Fields for which to expand the values
         */
        SharePointQueryable.prototype.expand = function () {
            var expands = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                expands[_i] = arguments[_i];
            }
            if (expands.length > 0) {
                this.query.set("$expand", expands.join(","));
            }
            return this;
        };
        /**
         * Gets a parent for this instance as specified
         *
         * @param factory The contructor for the class to create
         */
        SharePointQueryable.prototype.getParent = function (factory, baseUrl, path, batch) {
            if (baseUrl === void 0) { baseUrl = this.parentUrl; }
            var parent = new factory(baseUrl, path).configure(this._options);
            var t = "@target";
            if (this.query.has(t)) {
                parent.query.set(t, this.query.get(t));
            }
            if (batch !== undefined) {
                parent = parent.inBatch(batch);
            }
            return parent;
        };
        /**
         * Clones this SharePointQueryable into a new SharePointQueryable instance of T
         * @param factory Constructor used to create the new instance
         * @param additionalPath Any additional path to include in the clone
         * @param includeBatch If true this instance's batch will be added to the cloned instance
         */
        SharePointQueryable.prototype.clone = function (factory, additionalPath, includeBatch) {
            if (includeBatch === void 0) { includeBatch = true; }
            var clone = new factory(this, additionalPath).configure(this._options);
            var t = "@target";
            if (this.query.has(t)) {
                clone.query.set(t, this.query.get(t));
            }
            if (includeBatch && this.hasBatch) {
                clone = clone.inBatch(this.batch);
            }
            return clone;
        };
        /**
         * Converts the current instance to a request context
         *
         * @param verb The request verb
         * @param options The set of supplied request options
         * @param parser The supplied ODataParser instance
         * @param pipeline Optional request processing pipeline
         */
        SharePointQueryable.prototype.toRequestContext = function (verb, options, parser, pipeline) {
            var _this = this;
            if (options === void 0) { options = {}; }
            var dependencyDispose = this.hasBatch ? this.addBatchDependency() : function () { return; };
            return toAbsoluteUrl(this.toUrlAndQuery()).then(function (url) {
                common.mergeOptions(options, _this._options);
                // build our request context
                var context = {
                    batch: _this.batch,
                    batchDependency: dependencyDispose,
                    cachingOptions: _this._cachingOptions,
                    clientFactory: function () { return new SPHttpClient(); },
                    isBatched: _this.hasBatch,
                    isCached: /^get$/i.test(verb) && _this._useCaching,
                    options: options,
                    parser: parser,
                    pipeline: pipeline,
                    requestAbsoluteUrl: url,
                    requestId: common.getGUID(),
                    verb: verb,
                };
                return context;
            });
        };
        return SharePointQueryable;
    }(odata.ODataQueryable));
    /**
     * Represents a REST collection which can be filtered, paged, and selected
     *
     */
    var SharePointQueryableCollection = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableCollection, _super);
        function SharePointQueryableCollection() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Filters the returned collection (https://msdn.microsoft.com/en-us/library/office/fp142385.aspx#bk_supported)
         *
         * @param filter The string representing the filter query
         */
        SharePointQueryableCollection.prototype.filter = function (filter) {
            this.query.set("$filter", filter);
            return this;
        };
        /**
         * Orders based on the supplied fields
         *
         * @param orderby The name of the field on which to sort
         * @param ascending If false DESC is appended, otherwise ASC (default)
         */
        SharePointQueryableCollection.prototype.orderBy = function (orderBy, ascending) {
            if (ascending === void 0) { ascending = true; }
            var o = "$orderby";
            var query = this.query.has(o) ? this.query.get(o).split(",") : [];
            query.push(orderBy + " " + (ascending ? "asc" : "desc"));
            this.query.set(o, query.join(","));
            return this;
        };
        /**
         * Skips the specified number of items
         *
         * @param skip The number of items to skip
         */
        SharePointQueryableCollection.prototype.skip = function (skip) {
            this.query.set("$skip", skip.toString());
            return this;
        };
        /**
         * Limits the query to only return the specified number of items
         *
         * @param top The query row limit
         */
        SharePointQueryableCollection.prototype.top = function (top) {
            this.query.set("$top", top.toString());
            return this;
        };
        /**
         * Curries the getById function
         *
         * @param factory Class to create for the id
         */
        SharePointQueryableCollection.prototype._getById = function (factory) {
            var _this = this;
            return function (id) {
                if (typeof id === "number") {
                    return (new factory(_this)).concat("(" + id + ")");
                }
                else {
                    return (new factory(_this)).concat("('" + id + "')");
                }
            };
        };
        return SharePointQueryableCollection;
    }(SharePointQueryable));
    /**
     * Represents an instance that can be selected
     *
     */
    var SharePointQueryableInstance = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableInstance, _super);
        function SharePointQueryableInstance() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Curries the update function into the common pieces
         *
         * @param type
         * @param mapper
         */
        SharePointQueryableInstance.prototype._update = function (type, mapper) {
            var _this = this;
            return function (props) { return _this.postCore({
                body: common.jsS(common.extend(metadata(type), props)),
                headers: {
                    "X-HTTP-Method": "MERGE",
                },
            }).then(function (d) { return mapper(d, props); }); };
        };
        /**
        * Deletes this instance
        *
        */
        SharePointQueryableInstance.prototype._delete = function () {
            return this.postCore({
                headers: {
                    "X-HTTP-Method": "DELETE",
                },
            });
        };
        /**
         * Deletes this instance with an etag value in the headers
         *
         * @param eTag eTag to delete
         */
        SharePointQueryableInstance.prototype._deleteWithETag = function (eTag) {
            if (eTag === void 0) { eTag = "*"; }
            return this.postCore({
                headers: {
                    "IF-Match": eTag,
                    "X-HTTP-Method": "DELETE",
                },
            });
        };
        return SharePointQueryableInstance;
    }(SharePointQueryable));
    /**
     * Decorator used to specify the default path for SharePointQueryable objects
     *
     * @param path
     */
    function defaultPath(path) {
        return function (target) {
            return /** @class */ (function (_super) {
                tslib_1.__extends(class_1, _super);
                function class_1() {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return _super.call(this, args[0], args.length > 1 && args[1] !== undefined ? args[1] : path) || this;
                }
                return class_1;
            }(target));
        };
    }

    /**
     * Describes a collection of all site collection users
     *
     */
    var SiteUsers = /** @class */ (function (_super) {
        tslib_1.__extends(SiteUsers, _super);
        function SiteUsers() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a user from the collection by id
             *
             * @param id The id of the user to retrieve
             */
            _this.getById = _this._getById(SiteUser);
            return _this;
        }
        SiteUsers_1 = SiteUsers;
        /**
         * Gets a user from the collection by email
         *
         * @param email The email address of the user to retrieve
         */
        SiteUsers.prototype.getByEmail = function (email) {
            return new SiteUser(this, "getByEmail('" + email + "')");
        };
        /**
         * Gets a user from the collection by login name
         *
         * @param loginName The login name of the user to retrieve
         */
        SiteUsers.prototype.getByLoginName = function (loginName) {
            var su = new SiteUser(this);
            su.concat("(@v)");
            su.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return su;
        };
        /**
         * Removes a user from the collection by id
         *
         * @param id The id of the user to remove
         */
        SiteUsers.prototype.removeById = function (id) {
            return this.clone(SiteUsers_1, "removeById(" + id + ")").postCore();
        };
        /**
         * Removes a user from the collection by login name
         *
         * @param loginName The login name of the user to remove
         */
        SiteUsers.prototype.removeByLoginName = function (loginName) {
            var o = this.clone(SiteUsers_1, "removeByLoginName(@v)");
            o.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return o.postCore();
        };
        /**
         * Adds a user to a group
         *
         * @param loginName The login name of the user to add to the group
         *
         */
        SiteUsers.prototype.add = function (loginName) {
            var _this = this;
            return this.clone(SiteUsers_1, null).postCore({
                body: common.jsS(common.extend(metadata("SP.User"), { LoginName: loginName })),
            }).then(function () { return _this.getByLoginName(loginName); });
        };
        SiteUsers = SiteUsers_1 = tslib_1.__decorate([
            defaultPath("siteusers")
        ], SiteUsers);
        return SiteUsers;
        var SiteUsers_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single user
     *
     */
    var SiteUser = /** @class */ (function (_super) {
        tslib_1.__extends(SiteUser, _super);
        function SiteUser() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
            * Updates this user instance with the supplied properties
            *
            * @param properties A plain object of property names and values to update for the user
            */
            _this.update = _this._update("SP.User", function (data) { return ({ data: data, user: _this }); });
            /**
             * Delete this user
             *
             */
            _this.delete = _this._delete;
            return _this;
        }
        Object.defineProperty(SiteUser.prototype, "groups", {
            /**
             * Gets the groups for this user
             *
             */
            get: function () {
                return new SiteGroups(this, "groups");
            },
            enumerable: true,
            configurable: true
        });
        return SiteUser;
    }(SharePointQueryableInstance));
    /**
     * Represents the current user
     */
    var CurrentUser = /** @class */ (function (_super) {
        tslib_1.__extends(CurrentUser, _super);
        function CurrentUser() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CurrentUser = tslib_1.__decorate([
            defaultPath("currentuser")
        ], CurrentUser);
        return CurrentUser;
    }(SharePointQueryableInstance));

    /**
     * Principal Type enum
     *
     */
    var PrincipalType;
    (function (PrincipalType) {
        PrincipalType[PrincipalType["None"] = 0] = "None";
        PrincipalType[PrincipalType["User"] = 1] = "User";
        PrincipalType[PrincipalType["DistributionList"] = 2] = "DistributionList";
        PrincipalType[PrincipalType["SecurityGroup"] = 4] = "SecurityGroup";
        PrincipalType[PrincipalType["SharePointGroup"] = 8] = "SharePointGroup";
        PrincipalType[PrincipalType["All"] = 15] = "All";
    })(PrincipalType || (PrincipalType = {}));
    /**
     * Describes a collection of site groups
     *
     */
    var SiteGroups = /** @class */ (function (_super) {
        tslib_1.__extends(SiteGroups, _super);
        function SiteGroups() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a group from the collection by id
             *
             * @param id The id of the group to retrieve
             */
            _this.getById = _this._getById(SiteGroup);
            return _this;
        }
        SiteGroups_1 = SiteGroups;
        /**
         * Adds a new group to the site collection
         *
         * @param props The group properties object of property names and values to be set for the group
         */
        SiteGroups.prototype.add = function (properties) {
            var _this = this;
            var postBody = common.jsS(common.extend(metadata("SP.Group"), properties));
            return this.postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    group: _this.getById(data.Id),
                };
            });
        };
        /**
         * Gets a group from the collection by name
         *
         * @param groupName The name of the group to retrieve
         */
        SiteGroups.prototype.getByName = function (groupName) {
            return new SiteGroup(this, "getByName('" + groupName + "')");
        };
        /**
         * Removes the group with the specified member id from the collection
         *
         * @param id The id of the group to remove
         */
        SiteGroups.prototype.removeById = function (id) {
            return this.clone(SiteGroups_1, "removeById('" + id + "')").postCore();
        };
        /**
         * Removes the cross-site group with the specified name from the collection
         *
         * @param loginName The name of the group to remove
         */
        SiteGroups.prototype.removeByLoginName = function (loginName) {
            return this.clone(SiteGroups_1, "removeByLoginName('" + loginName + "')").postCore();
        };
        SiteGroups = SiteGroups_1 = tslib_1.__decorate([
            defaultPath("sitegroups")
        ], SiteGroups);
        return SiteGroups;
        var SiteGroups_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single group
     *
     */
    var SiteGroup = /** @class */ (function (_super) {
        tslib_1.__extends(SiteGroup, _super);
        function SiteGroup() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.update = _this._update("SP.Group", function (d, p) {
                var retGroup = _this;
                if (common.hOP(p, "Title")) {
                    /* tslint:disable-next-line no-string-literal */
                    retGroup = _this.getParent(SiteGroup, _this.parentUrl, "getByName('" + p["Title"] + "')");
                }
                return {
                    data: d,
                    group: retGroup,
                };
            });
            return _this;
        }
        Object.defineProperty(SiteGroup.prototype, "users", {
            /**
             * Gets the users for this group
             *
             */
            get: function () {
                return new SiteUsers(this, "users");
            },
            enumerable: true,
            configurable: true
        });
        return SiteGroup;
    }(SharePointQueryableInstance));

    /**
     * Describes a set of role assignments for the current scope
     *
     */
    var RoleAssignments = /** @class */ (function (_super) {
        tslib_1.__extends(RoleAssignments, _super);
        function RoleAssignments() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets the role assignment associated with the specified principal id from the collection.
             *
             * @param id The id of the role assignment
             */
            _this.getById = _this._getById(RoleAssignment);
            return _this;
        }
        RoleAssignments_1 = RoleAssignments;
        /**
         * Adds a new role assignment with the specified principal and role definitions to the collection
         *
         * @param principalId The id of the user or group to assign permissions to
         * @param roleDefId The id of the role definition that defines the permissions to assign
         *
         */
        RoleAssignments.prototype.add = function (principalId, roleDefId) {
            return this.clone(RoleAssignments_1, "addroleassignment(principalid=" + principalId + ", roledefid=" + roleDefId + ")").postCore();
        };
        /**
         * Removes the role assignment with the specified principal and role definition from the collection
         *
         * @param principalId The id of the user or group in the role assignment
         * @param roleDefId The id of the role definition in the role assignment
         *
         */
        RoleAssignments.prototype.remove = function (principalId, roleDefId) {
            return this.clone(RoleAssignments_1, "removeroleassignment(principalid=" + principalId + ", roledefid=" + roleDefId + ")").postCore();
        };
        RoleAssignments = RoleAssignments_1 = tslib_1.__decorate([
            defaultPath("roleassignments")
        ], RoleAssignments);
        return RoleAssignments;
        var RoleAssignments_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a role assignment
     *
     */
    var RoleAssignment = /** @class */ (function (_super) {
        tslib_1.__extends(RoleAssignment, _super);
        function RoleAssignment() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Deletes this role assignment
             *
             */
            _this.delete = _this._delete;
            return _this;
        }
        Object.defineProperty(RoleAssignment.prototype, "groups", {
            /**
             * Gets the groups that directly belong to the access control list (ACL) for this securable object
             *
             */
            get: function () {
                return new SiteGroups(this, "groups");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RoleAssignment.prototype, "bindings", {
            /**
             * Gets the role definition bindings for this role assignment
             *
             */
            get: function () {
                return new RoleDefinitionBindings(this);
            },
            enumerable: true,
            configurable: true
        });
        return RoleAssignment;
    }(SharePointQueryableInstance));
    /**
     * Describes a collection of role definitions
     *
     */
    var RoleDefinitions = /** @class */ (function (_super) {
        tslib_1.__extends(RoleDefinitions, _super);
        function RoleDefinitions() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets the role definition with the specified id from the collection
             *
             * @param id The id of the role definition
             *
             */
            _this.getById = _this._getById(RoleDefinition);
            return _this;
        }
        /**
         * Gets the role definition with the specified name
         *
         * @param name The name of the role definition
         *
         */
        RoleDefinitions.prototype.getByName = function (name) {
            return new RoleDefinition(this, "getbyname('" + name + "')");
        };
        /**
         * Gets the role definition with the specified role type
         *
         * @param roleTypeKind The roletypekind of the role definition (None=0, Guest=1, Reader=2, Contributor=3, WebDesigner=4, Administrator=5, Editor=6, System=7)
         *
         */
        RoleDefinitions.prototype.getByType = function (roleTypeKind) {
            return new RoleDefinition(this, "getbytype(" + roleTypeKind + ")");
        };
        /**
         * Creates a role definition
         *
         * @param name The new role definition's name
         * @param description The new role definition's description
         * @param order The order in which the role definition appears
         * @param basePermissions The permissions mask for this role definition
         *
         */
        RoleDefinitions.prototype.add = function (name, description, order, basePermissions) {
            var _this = this;
            var postBody = common.jsS({
                BasePermissions: common.extend({ __metadata: { type: "SP.BasePermissions" } }, basePermissions),
                Description: description,
                Name: name,
                Order: order,
                __metadata: { "type": "SP.RoleDefinition" },
            });
            return this.postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    definition: _this.getById(data.Id),
                };
            });
        };
        RoleDefinitions = tslib_1.__decorate([
            defaultPath("roledefinitions")
        ], RoleDefinitions);
        return RoleDefinitions;
    }(SharePointQueryableCollection));
    /**
     * Describes a role definition
     *
     */
    var RoleDefinition = /** @class */ (function (_super) {
        tslib_1.__extends(RoleDefinition, _super);
        function RoleDefinition() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Deletes this role definition
             *
             */
            _this.delete = _this._delete;
            return _this;
            /* tslint:enable */
        }
        /**
         * Updates this role definition with the supplied properties
         *
         * @param properties A plain object hash of values to update for the role definition
         */
        /* tslint:disable no-string-literal */
        RoleDefinition.prototype.update = function (properties) {
            var _this = this;
            var s = ["BasePermissions"];
            if (common.hOP(properties, s[0]) !== undefined) {
                properties[s[0]] = common.extend({ __metadata: { type: "SP." + s[0] } }, properties[s[0]]);
            }
            var postBody = common.jsS(common.extend(metadata("SP.RoleDefinition"), properties));
            return this.postCore({
                body: postBody,
                headers: {
                    "X-HTTP-Method": "MERGE",
                },
            }).then(function (data) {
                var retDef = _this;
                if (common.hOP(properties, "Name")) {
                    var parent_1 = _this.getParent(RoleDefinitions, _this.parentUrl, "");
                    retDef = parent_1.getByName(properties["Name"]);
                }
                return {
                    data: data,
                    definition: retDef,
                };
            });
        };
        return RoleDefinition;
    }(SharePointQueryableInstance));
    /**
     * Describes the role definitons bound to a role assignment object
     *
     */
    var RoleDefinitionBindings = /** @class */ (function (_super) {
        tslib_1.__extends(RoleDefinitionBindings, _super);
        function RoleDefinitionBindings() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        RoleDefinitionBindings = tslib_1.__decorate([
            defaultPath("roledefinitionbindings")
        ], RoleDefinitionBindings);
        return RoleDefinitionBindings;
    }(SharePointQueryableCollection));

    /**
     * Determines the display mode of the given control or view
     */
    (function (ControlMode) {
        ControlMode[ControlMode["Display"] = 1] = "Display";
        ControlMode[ControlMode["Edit"] = 2] = "Edit";
        ControlMode[ControlMode["New"] = 3] = "New";
    })(exports.ControlMode || (exports.ControlMode = {}));
    (function (FieldTypes) {
        FieldTypes[FieldTypes["Invalid"] = 0] = "Invalid";
        FieldTypes[FieldTypes["Integer"] = 1] = "Integer";
        FieldTypes[FieldTypes["Text"] = 2] = "Text";
        FieldTypes[FieldTypes["Note"] = 3] = "Note";
        FieldTypes[FieldTypes["DateTime"] = 4] = "DateTime";
        FieldTypes[FieldTypes["Counter"] = 5] = "Counter";
        FieldTypes[FieldTypes["Choice"] = 6] = "Choice";
        FieldTypes[FieldTypes["Lookup"] = 7] = "Lookup";
        FieldTypes[FieldTypes["Boolean"] = 8] = "Boolean";
        FieldTypes[FieldTypes["Number"] = 9] = "Number";
        FieldTypes[FieldTypes["Currency"] = 10] = "Currency";
        FieldTypes[FieldTypes["URL"] = 11] = "URL";
        FieldTypes[FieldTypes["Computed"] = 12] = "Computed";
        FieldTypes[FieldTypes["Threading"] = 13] = "Threading";
        FieldTypes[FieldTypes["Guid"] = 14] = "Guid";
        FieldTypes[FieldTypes["MultiChoice"] = 15] = "MultiChoice";
        FieldTypes[FieldTypes["GridChoice"] = 16] = "GridChoice";
        FieldTypes[FieldTypes["Calculated"] = 17] = "Calculated";
        FieldTypes[FieldTypes["File"] = 18] = "File";
        FieldTypes[FieldTypes["Attachments"] = 19] = "Attachments";
        FieldTypes[FieldTypes["User"] = 20] = "User";
        FieldTypes[FieldTypes["Recurrence"] = 21] = "Recurrence";
        FieldTypes[FieldTypes["CrossProjectLink"] = 22] = "CrossProjectLink";
        FieldTypes[FieldTypes["ModStat"] = 23] = "ModStat";
        FieldTypes[FieldTypes["Error"] = 24] = "Error";
        FieldTypes[FieldTypes["ContentTypeId"] = 25] = "ContentTypeId";
        FieldTypes[FieldTypes["PageSeparator"] = 26] = "PageSeparator";
        FieldTypes[FieldTypes["ThreadIndex"] = 27] = "ThreadIndex";
        FieldTypes[FieldTypes["WorkflowStatus"] = 28] = "WorkflowStatus";
        FieldTypes[FieldTypes["AllDayEvent"] = 29] = "AllDayEvent";
        FieldTypes[FieldTypes["WorkflowEventType"] = 30] = "WorkflowEventType";
    })(exports.FieldTypes || (exports.FieldTypes = {}));
    (function (DateTimeFieldFormatType) {
        DateTimeFieldFormatType[DateTimeFieldFormatType["DateOnly"] = 0] = "DateOnly";
        DateTimeFieldFormatType[DateTimeFieldFormatType["DateTime"] = 1] = "DateTime";
    })(exports.DateTimeFieldFormatType || (exports.DateTimeFieldFormatType = {}));
    (function (AddFieldOptions) {
        /**
         *  Specify that a new field added to the list must also be added to the default content type in the site collection
         */
        AddFieldOptions[AddFieldOptions["DefaultValue"] = 0] = "DefaultValue";
        /**
         * Specify that a new field added to the list must also be added to the default content type in the site collection.
         */
        AddFieldOptions[AddFieldOptions["AddToDefaultContentType"] = 1] = "AddToDefaultContentType";
        /**
         * Specify that a new field must not be added to any other content type
         */
        AddFieldOptions[AddFieldOptions["AddToNoContentType"] = 2] = "AddToNoContentType";
        /**
         *  Specify that a new field that is added to the specified list must also be added to all content types in the site collection
         */
        AddFieldOptions[AddFieldOptions["AddToAllContentTypes"] = 4] = "AddToAllContentTypes";
        /**
         * Specify adding an internal field name hint for the purpose of avoiding possible database locking or field renaming operations
         */
        AddFieldOptions[AddFieldOptions["AddFieldInternalNameHint"] = 8] = "AddFieldInternalNameHint";
        /**
         * Specify that a new field that is added to the specified list must also be added to the default list view
         */
        AddFieldOptions[AddFieldOptions["AddFieldToDefaultView"] = 16] = "AddFieldToDefaultView";
        /**
         * Specify to confirm that no other field has the same display name
         */
        AddFieldOptions[AddFieldOptions["AddFieldCheckDisplayName"] = 32] = "AddFieldCheckDisplayName";
    })(exports.AddFieldOptions || (exports.AddFieldOptions = {}));
    (function (CalendarType) {
        CalendarType[CalendarType["Gregorian"] = 1] = "Gregorian";
        CalendarType[CalendarType["Japan"] = 3] = "Japan";
        CalendarType[CalendarType["Taiwan"] = 4] = "Taiwan";
        CalendarType[CalendarType["Korea"] = 5] = "Korea";
        CalendarType[CalendarType["Hijri"] = 6] = "Hijri";
        CalendarType[CalendarType["Thai"] = 7] = "Thai";
        CalendarType[CalendarType["Hebrew"] = 8] = "Hebrew";
        CalendarType[CalendarType["GregorianMEFrench"] = 9] = "GregorianMEFrench";
        CalendarType[CalendarType["GregorianArabic"] = 10] = "GregorianArabic";
        CalendarType[CalendarType["GregorianXLITEnglish"] = 11] = "GregorianXLITEnglish";
        CalendarType[CalendarType["GregorianXLITFrench"] = 12] = "GregorianXLITFrench";
        CalendarType[CalendarType["KoreaJapanLunar"] = 14] = "KoreaJapanLunar";
        CalendarType[CalendarType["ChineseLunar"] = 15] = "ChineseLunar";
        CalendarType[CalendarType["SakaEra"] = 16] = "SakaEra";
        CalendarType[CalendarType["UmAlQura"] = 23] = "UmAlQura";
    })(exports.CalendarType || (exports.CalendarType = {}));
    (function (UrlFieldFormatType) {
        UrlFieldFormatType[UrlFieldFormatType["Hyperlink"] = 0] = "Hyperlink";
        UrlFieldFormatType[UrlFieldFormatType["Image"] = 1] = "Image";
    })(exports.UrlFieldFormatType || (exports.UrlFieldFormatType = {}));
    (function (PermissionKind) {
        /**
         * Has no permissions on the Site. Not available through the user interface.
         */
        PermissionKind[PermissionKind["EmptyMask"] = 0] = "EmptyMask";
        /**
         * View items in lists, documents in document libraries, and Web discussion comments.
         */
        PermissionKind[PermissionKind["ViewListItems"] = 1] = "ViewListItems";
        /**
         * Add items to lists, documents to document libraries, and Web discussion comments.
         */
        PermissionKind[PermissionKind["AddListItems"] = 2] = "AddListItems";
        /**
         * Edit items in lists, edit documents in document libraries, edit Web discussion comments
         * in documents, and customize Web Part Pages in document libraries.
         */
        PermissionKind[PermissionKind["EditListItems"] = 3] = "EditListItems";
        /**
         * Delete items from a list, documents from a document library, and Web discussion
         * comments in documents.
         */
        PermissionKind[PermissionKind["DeleteListItems"] = 4] = "DeleteListItems";
        /**
         * Approve a minor version of a list item or document.
         */
        PermissionKind[PermissionKind["ApproveItems"] = 5] = "ApproveItems";
        /**
         * View the source of documents with server-side file handlers.
         */
        PermissionKind[PermissionKind["OpenItems"] = 6] = "OpenItems";
        /**
         * View past versions of a list item or document.
         */
        PermissionKind[PermissionKind["ViewVersions"] = 7] = "ViewVersions";
        /**
         * Delete past versions of a list item or document.
         */
        PermissionKind[PermissionKind["DeleteVersions"] = 8] = "DeleteVersions";
        /**
         * Discard or check in a document which is checked out to another user.
         */
        PermissionKind[PermissionKind["CancelCheckout"] = 9] = "CancelCheckout";
        /**
         * Create, change, and delete personal views of lists.
         */
        PermissionKind[PermissionKind["ManagePersonalViews"] = 10] = "ManagePersonalViews";
        /**
         * Create and delete lists, add or remove columns in a list, and add or remove public views of a list.
         */
        PermissionKind[PermissionKind["ManageLists"] = 12] = "ManageLists";
        /**
         * View forms, views, and application pages, and enumerate lists.
         */
        PermissionKind[PermissionKind["ViewFormPages"] = 13] = "ViewFormPages";
        /**
         * Make content of a list or document library retrieveable for anonymous users through SharePoint search.
         * The list permissions in the site do not change.
         */
        PermissionKind[PermissionKind["AnonymousSearchAccessList"] = 14] = "AnonymousSearchAccessList";
        /**
         * Allow users to open a Site, list, or folder to access items inside that container.
         */
        PermissionKind[PermissionKind["Open"] = 17] = "Open";
        /**
         * View pages in a Site.
         */
        PermissionKind[PermissionKind["ViewPages"] = 18] = "ViewPages";
        /**
         * Add, change, or delete HTML pages or Web Part Pages, and edit the Site using
         * a Windows SharePoint Services compatible editor.
         */
        PermissionKind[PermissionKind["AddAndCustomizePages"] = 19] = "AddAndCustomizePages";
        /**
         * Apply a theme or borders to the entire Site.
         */
        PermissionKind[PermissionKind["ApplyThemeAndBorder"] = 20] = "ApplyThemeAndBorder";
        /**
         * Apply a style sheet (.css file) to the Site.
         */
        PermissionKind[PermissionKind["ApplyStyleSheets"] = 21] = "ApplyStyleSheets";
        /**
         * View reports on Site usage.
         */
        PermissionKind[PermissionKind["ViewUsageData"] = 22] = "ViewUsageData";
        /**
         * Create a Site using Self-Service Site Creation.
         */
        PermissionKind[PermissionKind["CreateSSCSite"] = 23] = "CreateSSCSite";
        /**
         * Create subsites such as team sites, Meeting Workspace sites, and Document Workspace sites.
         */
        PermissionKind[PermissionKind["ManageSubwebs"] = 24] = "ManageSubwebs";
        /**
         * Create a group of users that can be used anywhere within the site collection.
         */
        PermissionKind[PermissionKind["CreateGroups"] = 25] = "CreateGroups";
        /**
         * Create and change permission levels on the Site and assign permissions to users
         * and groups.
         */
        PermissionKind[PermissionKind["ManagePermissions"] = 26] = "ManagePermissions";
        /**
         * Enumerate files and folders in a Site using Microsoft Office SharePoint Designer
         * and WebDAV interfaces.
         */
        PermissionKind[PermissionKind["BrowseDirectories"] = 27] = "BrowseDirectories";
        /**
         * View information about users of the Site.
         */
        PermissionKind[PermissionKind["BrowseUserInfo"] = 28] = "BrowseUserInfo";
        /**
         * Add or remove personal Web Parts on a Web Part Page.
         */
        PermissionKind[PermissionKind["AddDelPrivateWebParts"] = 29] = "AddDelPrivateWebParts";
        /**
         * Update Web Parts to display personalized information.
         */
        PermissionKind[PermissionKind["UpdatePersonalWebParts"] = 30] = "UpdatePersonalWebParts";
        /**
         * Grant the ability to perform all administration tasks for the Site as well as
         * manage content, activate, deactivate, or edit properties of Site scoped Features
         * through the object model or through the user interface (UI). When granted on the
         * root Site of a Site Collection, activate, deactivate, or edit properties of
         * site collection scoped Features through the object model. To browse to the Site
         * Collection Features page and activate or deactivate Site Collection scoped Features
         * through the UI, you must be a Site Collection administrator.
         */
        PermissionKind[PermissionKind["ManageWeb"] = 31] = "ManageWeb";
        /**
         * Content of lists and document libraries in the Web site will be retrieveable for anonymous users through
         * SharePoint search if the list or document library has AnonymousSearchAccessList set.
         */
        PermissionKind[PermissionKind["AnonymousSearchAccessWebLists"] = 32] = "AnonymousSearchAccessWebLists";
        /**
         * Use features that launch client applications. Otherwise, users must work on documents
         * locally and upload changes.
         */
        PermissionKind[PermissionKind["UseClientIntegration"] = 37] = "UseClientIntegration";
        /**
         * Use SOAP, WebDAV, or Microsoft Office SharePoint Designer interfaces to access the Site.
         */
        PermissionKind[PermissionKind["UseRemoteAPIs"] = 38] = "UseRemoteAPIs";
        /**
         * Manage alerts for all users of the Site.
         */
        PermissionKind[PermissionKind["ManageAlerts"] = 39] = "ManageAlerts";
        /**
         * Create e-mail alerts.
         */
        PermissionKind[PermissionKind["CreateAlerts"] = 40] = "CreateAlerts";
        /**
         * Allows a user to change his or her user information, such as adding a picture.
         */
        PermissionKind[PermissionKind["EditMyUserInfo"] = 41] = "EditMyUserInfo";
        /**
         * Enumerate permissions on Site, list, folder, document, or list item.
         */
        PermissionKind[PermissionKind["EnumeratePermissions"] = 63] = "EnumeratePermissions";
        /**
         * Has all permissions on the Site. Not available through the user interface.
         */
        PermissionKind[PermissionKind["FullMask"] = 65] = "FullMask";
    })(exports.PermissionKind || (exports.PermissionKind = {}));
    (function (PrincipalType) {
        /**
         * Enumeration whose value specifies no principal type.
         */
        PrincipalType[PrincipalType["None"] = 0] = "None";
        /**
         * Enumeration whose value specifies a user as the principal type.
         */
        PrincipalType[PrincipalType["User"] = 1] = "User";
        /**
         * Enumeration whose value specifies a distribution list as the principal type.
         */
        PrincipalType[PrincipalType["DistributionList"] = 2] = "DistributionList";
        /**
         * Enumeration whose value specifies a security group as the principal type.
         */
        PrincipalType[PrincipalType["SecurityGroup"] = 4] = "SecurityGroup";
        /**
         * Enumeration whose value specifies a group as the principal type.
         */
        PrincipalType[PrincipalType["SharePointGroup"] = 8] = "SharePointGroup";
        /**
         * Enumeration whose value specifies all principal types.
         */
        PrincipalType[PrincipalType["All"] = 15] = "All";
    })(exports.PrincipalType || (exports.PrincipalType = {}));
    (function (PrincipalSource) {
        /**
         * Enumeration whose value specifies no principal source.
         */
        PrincipalSource[PrincipalSource["None"] = 0] = "None";
        /**
         * Enumeration whose value specifies user information list as the principal source.
         */
        PrincipalSource[PrincipalSource["UserInfoList"] = 1] = "UserInfoList";
        /**
         * Enumeration whose value specifies Active Directory as the principal source.
         */
        PrincipalSource[PrincipalSource["Windows"] = 2] = "Windows";
        /**
         * Enumeration whose value specifies the current membership provider as the principal source.
         */
        PrincipalSource[PrincipalSource["MembershipProvider"] = 4] = "MembershipProvider";
        /**
         * Enumeration whose value specifies the current role provider as the principal source.
         */
        PrincipalSource[PrincipalSource["RoleProvider"] = 8] = "RoleProvider";
        /**
         * Enumeration whose value specifies all principal sources.
         */
        PrincipalSource[PrincipalSource["All"] = 15] = "All";
    })(exports.PrincipalSource || (exports.PrincipalSource = {}));
    (function (RoleType) {
        RoleType[RoleType["None"] = 0] = "None";
        RoleType[RoleType["Guest"] = 1] = "Guest";
        RoleType[RoleType["Reader"] = 2] = "Reader";
        RoleType[RoleType["Contributor"] = 3] = "Contributor";
        RoleType[RoleType["WebDesigner"] = 4] = "WebDesigner";
        RoleType[RoleType["Administrator"] = 5] = "Administrator";
    })(exports.RoleType || (exports.RoleType = {}));
    (function (PageType) {
        PageType[PageType["Invalid"] = -1] = "Invalid";
        PageType[PageType["DefaultView"] = 0] = "DefaultView";
        PageType[PageType["NormalView"] = 1] = "NormalView";
        PageType[PageType["DialogView"] = 2] = "DialogView";
        PageType[PageType["View"] = 3] = "View";
        PageType[PageType["DisplayForm"] = 4] = "DisplayForm";
        PageType[PageType["DisplayFormDialog"] = 5] = "DisplayFormDialog";
        PageType[PageType["EditForm"] = 6] = "EditForm";
        PageType[PageType["EditFormDialog"] = 7] = "EditFormDialog";
        PageType[PageType["NewForm"] = 8] = "NewForm";
        PageType[PageType["NewFormDialog"] = 9] = "NewFormDialog";
        PageType[PageType["SolutionForm"] = 10] = "SolutionForm";
        PageType[PageType["PAGE_MAXITEMS"] = 11] = "PAGE_MAXITEMS";
    })(exports.PageType || (exports.PageType = {}));
    (function (SharingLinkKind) {
        /**
         * Uninitialized link
         */
        SharingLinkKind[SharingLinkKind["Uninitialized"] = 0] = "Uninitialized";
        /**
         * Direct link to the object being shared
         */
        SharingLinkKind[SharingLinkKind["Direct"] = 1] = "Direct";
        /**
         * Organization-shareable link to the object being shared with view permissions
         */
        SharingLinkKind[SharingLinkKind["OrganizationView"] = 2] = "OrganizationView";
        /**
         * Organization-shareable link to the object being shared with edit permissions
         */
        SharingLinkKind[SharingLinkKind["OrganizationEdit"] = 3] = "OrganizationEdit";
        /**
         * View only anonymous link
         */
        SharingLinkKind[SharingLinkKind["AnonymousView"] = 4] = "AnonymousView";
        /**
         * Read/Write anonymous link
         */
        SharingLinkKind[SharingLinkKind["AnonymousEdit"] = 5] = "AnonymousEdit";
        /**
         * Flexible sharing Link where properties can change without affecting link URL
         */
        SharingLinkKind[SharingLinkKind["Flexible"] = 6] = "Flexible";
    })(exports.SharingLinkKind || (exports.SharingLinkKind = {}));
    (function (SharingRole) {
        SharingRole[SharingRole["None"] = 0] = "None";
        SharingRole[SharingRole["View"] = 1] = "View";
        SharingRole[SharingRole["Edit"] = 2] = "Edit";
        SharingRole[SharingRole["Owner"] = 3] = "Owner";
    })(exports.SharingRole || (exports.SharingRole = {}));
    (function (SharingOperationStatusCode) {
        /**
         * The share operation completed without errors.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["CompletedSuccessfully"] = 0] = "CompletedSuccessfully";
        /**
         * The share operation completed and generated requests for access.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["AccessRequestsQueued"] = 1] = "AccessRequestsQueued";
        /**
         * The share operation failed as there were no resolved users.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["NoResolvedUsers"] = -1] = "NoResolvedUsers";
        /**
         * The share operation failed due to insufficient permissions.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["AccessDenied"] = -2] = "AccessDenied";
        /**
         * The share operation failed when attempting a cross site share, which is not supported.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["CrossSiteRequestNotSupported"] = -3] = "CrossSiteRequestNotSupported";
        /**
         * The sharing operation failed due to an unknown error.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["UnknowError"] = -4] = "UnknowError";
        /**
         * The text you typed is too long. Please shorten it.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["EmailBodyTooLong"] = -5] = "EmailBodyTooLong";
        /**
         * The maximum number of unique scopes in the list has been exceeded.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["ListUniqueScopesExceeded"] = -6] = "ListUniqueScopesExceeded";
        /**
         * The share operation failed because a sharing capability is disabled in the site.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["CapabilityDisabled"] = -7] = "CapabilityDisabled";
        /**
         * The specified object for the share operation is not supported.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["ObjectNotSupported"] = -8] = "ObjectNotSupported";
        /**
         * A SharePoint group cannot contain another SharePoint group.
         */
        SharingOperationStatusCode[SharingOperationStatusCode["NestedGroupsNotSupported"] = -9] = "NestedGroupsNotSupported";
    })(exports.SharingOperationStatusCode || (exports.SharingOperationStatusCode = {}));
    (function (SPSharedObjectType) {
        SPSharedObjectType[SPSharedObjectType["Unknown"] = 0] = "Unknown";
        SPSharedObjectType[SPSharedObjectType["File"] = 1] = "File";
        SPSharedObjectType[SPSharedObjectType["Folder"] = 2] = "Folder";
        SPSharedObjectType[SPSharedObjectType["Item"] = 3] = "Item";
        SPSharedObjectType[SPSharedObjectType["List"] = 4] = "List";
        SPSharedObjectType[SPSharedObjectType["Web"] = 5] = "Web";
        SPSharedObjectType[SPSharedObjectType["Max"] = 6] = "Max";
    })(exports.SPSharedObjectType || (exports.SPSharedObjectType = {}));
    (function (SharingDomainRestrictionMode) {
        SharingDomainRestrictionMode[SharingDomainRestrictionMode["None"] = 0] = "None";
        SharingDomainRestrictionMode[SharingDomainRestrictionMode["AllowList"] = 1] = "AllowList";
        SharingDomainRestrictionMode[SharingDomainRestrictionMode["BlockList"] = 2] = "BlockList";
    })(exports.SharingDomainRestrictionMode || (exports.SharingDomainRestrictionMode = {}));
    (function (RenderListDataOptions) {
        RenderListDataOptions[RenderListDataOptions["None"] = 0] = "None";
        RenderListDataOptions[RenderListDataOptions["ContextInfo"] = 1] = "ContextInfo";
        RenderListDataOptions[RenderListDataOptions["ListData"] = 2] = "ListData";
        RenderListDataOptions[RenderListDataOptions["ListSchema"] = 4] = "ListSchema";
        RenderListDataOptions[RenderListDataOptions["MenuView"] = 8] = "MenuView";
        RenderListDataOptions[RenderListDataOptions["ListContentType"] = 16] = "ListContentType";
        RenderListDataOptions[RenderListDataOptions["FileSystemItemId"] = 32] = "FileSystemItemId";
        RenderListDataOptions[RenderListDataOptions["ClientFormSchema"] = 64] = "ClientFormSchema";
        RenderListDataOptions[RenderListDataOptions["QuickLaunch"] = 128] = "QuickLaunch";
        RenderListDataOptions[RenderListDataOptions["Spotlight"] = 256] = "Spotlight";
        RenderListDataOptions[RenderListDataOptions["Visualization"] = 512] = "Visualization";
        RenderListDataOptions[RenderListDataOptions["ViewMetadata"] = 1024] = "ViewMetadata";
        RenderListDataOptions[RenderListDataOptions["DisableAutoHyperlink"] = 2048] = "DisableAutoHyperlink";
        RenderListDataOptions[RenderListDataOptions["EnableMediaTAUrls"] = 4096] = "EnableMediaTAUrls";
        RenderListDataOptions[RenderListDataOptions["ParentInfo"] = 8192] = "ParentInfo";
        RenderListDataOptions[RenderListDataOptions["PageContextInfo"] = 16384] = "PageContextInfo";
        RenderListDataOptions[RenderListDataOptions["ClientSideComponentManifest"] = 32768] = "ClientSideComponentManifest";
    })(exports.RenderListDataOptions || (exports.RenderListDataOptions = {}));
    (function (FieldUserSelectionMode) {
        FieldUserSelectionMode[FieldUserSelectionMode["PeopleAndGroups"] = 1] = "PeopleAndGroups";
        FieldUserSelectionMode[FieldUserSelectionMode["PeopleOnly"] = 0] = "PeopleOnly";
    })(exports.FieldUserSelectionMode || (exports.FieldUserSelectionMode = {}));
    (function (ChoiceFieldFormatType) {
        ChoiceFieldFormatType[ChoiceFieldFormatType["Dropdown"] = 0] = "Dropdown";
        ChoiceFieldFormatType[ChoiceFieldFormatType["RadioButtons"] = 1] = "RadioButtons";
    })(exports.ChoiceFieldFormatType || (exports.ChoiceFieldFormatType = {}));
    (function (UrlZone) {
        /**
         * Specifies the default zone used for requests unless another zone is specified.
         */
        UrlZone[UrlZone["DefaultZone"] = 0] = "DefaultZone";
        /**
         * Specifies an intranet zone.
         */
        UrlZone[UrlZone["Intranet"] = 1] = "Intranet";
        /**
         * Specifies an Internet zone.
         */
        UrlZone[UrlZone["Internet"] = 2] = "Internet";
        /**
         * Specifies a custom zone.
         */
        UrlZone[UrlZone["Custom"] = 3] = "Custom";
        /**
         * Specifies an extranet zone.
         */
        UrlZone[UrlZone["Extranet"] = 4] = "Extranet";
    })(exports.UrlZone || (exports.UrlZone = {}));

    var SharePointQueryableSecurable = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableSecurable, _super);
        function SharePointQueryableSecurable() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(SharePointQueryableSecurable.prototype, "roleAssignments", {
            /**
             * Gets the set of role assignments for this item
             *
             */
            get: function () {
                return new RoleAssignments(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SharePointQueryableSecurable.prototype, "firstUniqueAncestorSecurableObject", {
            /**
             * Gets the closest securable up the security hierarchy whose permissions are applied to this list item
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "FirstUniqueAncestorSecurableObject");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets the effective permissions for the user supplied
         *
         * @param loginName The claims username for the user (ex: i:0#.f|membership|user@domain.com)
         */
        SharePointQueryableSecurable.prototype.getUserEffectivePermissions = function (loginName) {
            var q = this.clone(SharePointQueryable, "getUserEffectivePermissions(@user)");
            q.query.set("@user", "'" + encodeURIComponent(loginName) + "'");
            return q.get().then(function (r) {
                // handle verbose mode
                return common.hOP(r, "GetUserEffectivePermissions") ? r.GetUserEffectivePermissions : r;
            });
        };
        /**
         * Gets the effective permissions for the current user
         */
        SharePointQueryableSecurable.prototype.getCurrentUserEffectivePermissions = function () {
            var _this = this;
            // remove need to reference Web here, which created a circular build issue
            var w = new SharePointQueryableInstance("_api/web", "currentuser");
            return w.select("LoginName").get().then(function (user) {
                return _this.getUserEffectivePermissions(user.LoginName);
            });
        };
        /**
         * Breaks the security inheritance at this level optinally copying permissions and clearing subscopes
         *
         * @param copyRoleAssignments If true the permissions are copied from the current parent scope
         * @param clearSubscopes Optional. true to make all child securable objects inherit role assignments from the current object
         */
        SharePointQueryableSecurable.prototype.breakRoleInheritance = function (copyRoleAssignments, clearSubscopes) {
            if (copyRoleAssignments === void 0) { copyRoleAssignments = false; }
            if (clearSubscopes === void 0) { clearSubscopes = false; }
            return this.clone(SharePointQueryableSecurable, "breakroleinheritance(copyroleassignments=" + copyRoleAssignments + ", clearsubscopes=" + clearSubscopes + ")").postCore();
        };
        /**
         * Removes the local role assignments so that it re-inherit role assignments from the parent object.
         *
         */
        SharePointQueryableSecurable.prototype.resetRoleInheritance = function () {
            return this.clone(SharePointQueryableSecurable, "resetroleinheritance").postCore();
        };
        /**
         * Determines if a given user has the appropriate permissions
         *
         * @param loginName The user to check
         * @param permission The permission being checked
         */
        SharePointQueryableSecurable.prototype.userHasPermissions = function (loginName, permission) {
            var _this = this;
            return this.getUserEffectivePermissions(loginName).then(function (perms) {
                return _this.hasPermissions(perms, permission);
            });
        };
        /**
         * Determines if the current user has the requested permissions
         *
         * @param permission The permission we wish to check
         */
        SharePointQueryableSecurable.prototype.currentUserHasPermissions = function (permission) {
            var _this = this;
            return this.getCurrentUserEffectivePermissions().then(function (perms) {
                return _this.hasPermissions(perms, permission);
            });
        };
        /**
         * Taken from sp.js, checks the supplied permissions against the mask
         *
         * @param value The security principal's permissions on the given object
         * @param perm The permission checked against the value
         */
        /* tslint:disable:no-bitwise */
        SharePointQueryableSecurable.prototype.hasPermissions = function (value, perm) {
            if (!perm) {
                return true;
            }
            if (perm === exports.PermissionKind.FullMask) {
                return (value.High & 32767) === 32767 && value.Low === 65535;
            }
            perm = perm - 1;
            var num = 1;
            if (perm >= 0 && perm < 32) {
                num = num << perm;
                return 0 !== (value.Low & num);
            }
            else if (perm >= 32 && perm < 64) {
                num = num << perm - 32;
                return 0 !== (value.High & num);
            }
            return false;
        };
        return SharePointQueryableSecurable;
    }(SharePointQueryableInstance));

    /**
     * Internal helper class used to augment classes to include sharing functionality
     */
    var SharePointQueryableShareable = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableShareable, _super);
        function SharePointQueryableShareable() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Gets a sharing link for the supplied
         *
         * @param kind The kind of link to share
         * @param expiration The optional expiration for this link
         */
        SharePointQueryableShareable.prototype.getShareLink = function (kind, expiration) {
            if (expiration === void 0) { expiration = null; }
            // date needs to be an ISO string or null
            var expString = expiration !== null ? expiration.toISOString() : null;
            // clone using the factory and send the request
            return this.clone(SharePointQueryableShareable, "shareLink").postCore({
                body: common.jsS({
                    request: {
                        createLink: true,
                        emailData: null,
                        settings: {
                            expiration: expString,
                            linkKind: kind,
                        },
                    },
                }),
            });
        };
        /**
         * Shares this instance with the supplied users
         *
         * @param loginNames Resolved login names to share
         * @param role The role
         * @param requireSignin True to require the user is authenticated, otherwise false
         * @param propagateAcl True to apply this share to all children
         * @param emailData If supplied an email will be sent with the indicated properties
         */
        SharePointQueryableShareable.prototype.shareWith = function (loginNames, role, requireSignin, propagateAcl, emailData) {
            var _this = this;
            if (requireSignin === void 0) { requireSignin = false; }
            if (propagateAcl === void 0) { propagateAcl = false; }
            // handle the multiple input types
            if (!Array.isArray(loginNames)) {
                loginNames = [loginNames];
            }
            var userStr = common.jsS(loginNames.map(function (login) { return { Key: login }; }));
            var roleFilter = role === exports.SharingRole.Edit ? exports.RoleType.Contributor : exports.RoleType.Reader;
            // start by looking up the role definition id we need to set the roleValue
            // remove need to reference Web here, which created a circular build issue
            var w = new SharePointQueryableCollection("_api/web", "roledefinitions");
            return w.select("Id").filter("RoleTypeKind eq " + roleFilter).get().then(function (def) {
                if (!Array.isArray(def) || def.length < 1) {
                    throw new Error("Could not locate a role defintion with RoleTypeKind " + roleFilter);
                }
                var postBody = {
                    includeAnonymousLinkInEmail: requireSignin,
                    peoplePickerInput: userStr,
                    propagateAcl: propagateAcl,
                    roleValue: "role:" + def[0].Id,
                    useSimplifiedRoles: true,
                };
                if (emailData !== undefined) {
                    postBody = common.extend(postBody, {
                        emailBody: emailData.body,
                        emailSubject: emailData.subject !== undefined ? emailData.subject : "",
                        sendEmail: true,
                    });
                }
                return _this.clone(SharePointQueryableShareable, "shareObject").postCore({
                    body: common.jsS(postBody),
                });
            });
        };
        /**
         * Shares an object based on the supplied options
         *
         * @param options The set of options to send to the ShareObject method
         * @param bypass If true any processing is skipped and the options are sent directly to the ShareObject method
         */
        SharePointQueryableShareable.prototype.shareObject = function (options, bypass) {
            var _this = this;
            if (bypass === void 0) { bypass = false; }
            if (bypass) {
                // if the bypass flag is set send the supplied parameters directly to the service
                return this.sendShareObjectRequest(options);
            }
            // extend our options with some defaults
            options = common.extend(options, {
                group: null,
                includeAnonymousLinkInEmail: false,
                propagateAcl: false,
                useSimplifiedRoles: true,
            }, true);
            return this.getRoleValue(options.role, options.group).then(function (roleValue) {
                // handle the multiple input types
                if (!Array.isArray(options.loginNames)) {
                    options.loginNames = [options.loginNames];
                }
                var userStr = common.jsS(options.loginNames.map(function (login) { return { Key: login }; }));
                var postBody = {
                    peoplePickerInput: userStr,
                    roleValue: roleValue,
                    url: options.url,
                };
                if (options.emailData !== undefined && options.emailData !== null) {
                    postBody = common.extend(postBody, {
                        emailBody: options.emailData.body,
                        emailSubject: options.emailData.subject !== undefined ? options.emailData.subject : "Shared with you.",
                        sendEmail: true,
                    });
                }
                return _this.sendShareObjectRequest(postBody);
            });
        };
        /**
         * Calls the web's UnshareObject method
         *
         * @param url The url of the object to unshare
         */
        SharePointQueryableShareable.prototype.unshareObjectWeb = function (url) {
            return this.clone(SharePointQueryableShareable, "unshareObject").postCore({
                body: common.jsS({
                    url: url,
                }),
            });
        };
        /**
         * Checks Permissions on the list of Users and returns back role the users have on the Item.
         *
         * @param recipients The array of Entities for which Permissions need to be checked.
         */
        SharePointQueryableShareable.prototype.checkPermissions = function (recipients) {
            return this.clone(SharePointQueryableShareable, "checkPermissions").postCore({
                body: common.jsS({
                    recipients: recipients,
                }),
            });
        };
        /**
         * Get Sharing Information.
         *
         * @param request The SharingInformationRequest Object.
         */
        SharePointQueryableShareable.prototype.getSharingInformation = function (request) {
            if (request === void 0) { request = null; }
            return this.clone(SharePointQueryableShareable, "getSharingInformation").postCore({
                body: common.jsS({
                    request: request,
                }),
            });
        };
        /**
         * Gets the sharing settings of an item.
         *
         * @param useSimplifiedRoles Determines whether to use simplified roles.
         */
        SharePointQueryableShareable.prototype.getObjectSharingSettings = function (useSimplifiedRoles) {
            if (useSimplifiedRoles === void 0) { useSimplifiedRoles = true; }
            return this.clone(SharePointQueryableShareable, "getObjectSharingSettings").postCore({
                body: common.jsS({
                    useSimplifiedRoles: useSimplifiedRoles,
                }),
            });
        };
        /**
         * Unshares this object
         */
        SharePointQueryableShareable.prototype.unshareObject = function () {
            return this.clone(SharePointQueryableShareable, "unshareObject").postCore();
        };
        /**
         * Deletes a link by type
         *
         * @param kind Deletes a sharing link by the kind of link
         */
        SharePointQueryableShareable.prototype.deleteLinkByKind = function (kind) {
            return this.clone(SharePointQueryableShareable, "deleteLinkByKind").postCore({
                body: common.jsS({ linkKind: kind }),
            });
        };
        /**
         * Removes the specified link to the item.
         *
         * @param kind The kind of link to be deleted.
         * @param shareId
         */
        SharePointQueryableShareable.prototype.unshareLink = function (kind, shareId) {
            if (shareId === void 0) { shareId = "00000000-0000-0000-0000-000000000000"; }
            return this.clone(SharePointQueryableShareable, "unshareLink").postCore({
                body: common.jsS({ linkKind: kind, shareId: shareId }),
            });
        };
        /**
         * Calculates the roleValue string used in the sharing query
         *
         * @param role The Sharing Role
         * @param group The Group type
         */
        SharePointQueryableShareable.prototype.getRoleValue = function (role, group) {
            // we will give group precedence, because we had to make a choice
            if (group !== undefined && group !== null) {
                switch (group) {
                    case exports.RoleType.Contributor:
                        // remove need to reference Web here, which created a circular build issue
                        var memberGroup = new SharePointQueryableInstance("_api/web", "associatedmembergroup");
                        return memberGroup.select("Id").get().then(function (g) { return "group: " + g.Id; });
                    case exports.RoleType.Reader:
                    case exports.RoleType.Guest:
                        // remove need to reference Web here, which created a circular build issue
                        var visitorGroup = new SharePointQueryableInstance("_api/web", "associatedvisitorgroup");
                        return visitorGroup.select("Id").get().then(function (g) { return "group: " + g.Id; });
                    default:
                        throw new Error("Could not determine role value for supplied value. Contributor, Reader, and Guest are supported");
                }
            }
            else {
                var roleFilter = role === exports.SharingRole.Edit ? exports.RoleType.Contributor : exports.RoleType.Reader;
                // remove need to reference Web here, which created a circular build issue
                var roleDefs = new SharePointQueryableCollection("_api/web", "roledefinitions");
                return roleDefs.select("Id").top(1).filter("RoleTypeKind eq " + roleFilter).get().then(function (def) {
                    if (def.length < 1) {
                        throw new Error("Could not locate associated role definition for supplied role. Edit and View are supported");
                    }
                    return "role: " + def[0].Id;
                });
            }
        };
        SharePointQueryableShareable.prototype.getShareObjectWeb = function (candidate) {
            return Promise.resolve(new SharePointQueryableInstance(extractWebUrl(candidate), "/_api/SP.Web.ShareObject"));
        };
        SharePointQueryableShareable.prototype.sendShareObjectRequest = function (options) {
            return this.getShareObjectWeb(this.toUrl()).then(function (web) {
                return web.expand("UsersWithAccessRequests", "GroupsSharedWith").as(SharePointQueryableShareable).postCore({
                    body: common.jsS(options),
                });
            });
        };
        return SharePointQueryableShareable;
    }(SharePointQueryable));
    var SharePointQueryableShareableWeb = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableShareableWeb, _super);
        function SharePointQueryableShareableWeb() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Shares this web with the supplied users
         * @param loginNames The resolved login names to share
         * @param role The role to share this web
         * @param emailData Optional email data
         */
        SharePointQueryableShareableWeb.prototype.shareWith = function (loginNames, role, emailData) {
            var _this = this;
            if (role === void 0) { role = exports.SharingRole.View; }
            var dependency = this.addBatchDependency();
            // remove need to reference Web here, which created a circular build issue
            var web = new SharePointQueryableInstance(extractWebUrl(this.toUrl()), "/_api/web/url");
            return web.get().then(function (url) {
                dependency();
                return _this.shareObject(common.combine(url, "/_layouts/15/aclinv.aspx?forSharing=1&mbypass=1"), loginNames, role, emailData);
            });
        };
        /**
         * Provides direct access to the static web.ShareObject method
         *
         * @param url The url to share
         * @param loginNames Resolved loginnames string[] of a single login name string
         * @param roleValue Role value
         * @param emailData Optional email data
         * @param groupId Optional group id
         * @param propagateAcl
         * @param includeAnonymousLinkInEmail
         * @param useSimplifiedRoles
         */
        SharePointQueryableShareableWeb.prototype.shareObject = function (url, loginNames, role, emailData, group, propagateAcl, includeAnonymousLinkInEmail, useSimplifiedRoles) {
            if (propagateAcl === void 0) { propagateAcl = false; }
            if (includeAnonymousLinkInEmail === void 0) { includeAnonymousLinkInEmail = false; }
            if (useSimplifiedRoles === void 0) { useSimplifiedRoles = true; }
            return this.clone(SharePointQueryableShareable, null).shareObject({
                emailData: emailData,
                group: group,
                includeAnonymousLinkInEmail: includeAnonymousLinkInEmail,
                loginNames: loginNames,
                propagateAcl: propagateAcl,
                role: role,
                url: url,
                useSimplifiedRoles: useSimplifiedRoles,
            });
        };
        /**
         * Supplies a method to pass any set of arguments to ShareObject
         *
         * @param options The set of options to send to ShareObject
         */
        SharePointQueryableShareableWeb.prototype.shareObjectRaw = function (options) {
            return this.clone(SharePointQueryableShareable, null).shareObject(options, true);
        };
        /**
         * Unshares the object
         *
         * @param url The url of the object to stop sharing
         */
        SharePointQueryableShareableWeb.prototype.unshareObject = function (url) {
            return this.clone(SharePointQueryableShareable, null).unshareObjectWeb(url);
        };
        return SharePointQueryableShareableWeb;
    }(SharePointQueryableSecurable));
    var SharePointQueryableShareableItem = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableShareableItem, _super);
        function SharePointQueryableShareableItem() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Gets a link suitable for sharing for this item
         *
         * @param kind The type of link to share
         * @param expiration The optional expiration date
         */
        SharePointQueryableShareableItem.prototype.getShareLink = function (kind, expiration) {
            if (kind === void 0) { kind = exports.SharingLinkKind.OrganizationView; }
            if (expiration === void 0) { expiration = null; }
            return this.clone(SharePointQueryableShareable, null).getShareLink(kind, expiration);
        };
        /**
         * Shares this item with one or more users
         *
         * @param loginNames string or string[] of resolved login names to which this item will be shared
         * @param role The role (View | Edit) applied to the share
         * @param emailData Optional, if inlucded an email will be sent. Note subject currently has no effect.
         */
        SharePointQueryableShareableItem.prototype.shareWith = function (loginNames, role, requireSignin, emailData) {
            if (role === void 0) { role = exports.SharingRole.View; }
            if (requireSignin === void 0) { requireSignin = false; }
            return this.clone(SharePointQueryableShareable, null).shareWith(loginNames, role, requireSignin, false, emailData);
        };
        /**
         * Checks Permissions on the list of Users and returns back role the users have on the Item.
         *
         * @param recipients The array of Entities for which Permissions need to be checked.
         */
        SharePointQueryableShareableItem.prototype.checkSharingPermissions = function (recipients) {
            return this.clone(SharePointQueryableShareable, null).checkPermissions(recipients);
        };
        /**
         * Get Sharing Information.
         *
         * @param request The SharingInformationRequest Object.
         */
        SharePointQueryableShareableItem.prototype.getSharingInformation = function (request) {
            if (request === void 0) { request = null; }
            return this.clone(SharePointQueryableShareable, null).getSharingInformation(request);
        };
        /**
         * Gets the sharing settings of an item.
         *
         * @param useSimplifiedRoles Determines whether to use simplified roles.
         */
        SharePointQueryableShareableItem.prototype.getObjectSharingSettings = function (useSimplifiedRoles) {
            if (useSimplifiedRoles === void 0) { useSimplifiedRoles = true; }
            return this.clone(SharePointQueryableShareable, null).getObjectSharingSettings(useSimplifiedRoles);
        };
        /**
         * Unshare this item
         */
        SharePointQueryableShareableItem.prototype.unshare = function () {
            return this.clone(SharePointQueryableShareable, null).unshareObject();
        };
        /**
         * Deletes a sharing link by kind
         *
         * @param kind Deletes a sharing link by the kind of link
         */
        SharePointQueryableShareableItem.prototype.deleteSharingLinkByKind = function (kind) {
            return this.clone(SharePointQueryableShareable, null).deleteLinkByKind(kind);
        };
        /**
         * Removes the specified link to the item.
         *
         * @param kind The kind of link to be deleted.
         * @param shareId
         */
        SharePointQueryableShareableItem.prototype.unshareLink = function (kind, shareId) {
            return this.clone(SharePointQueryableShareable, null).unshareLink(kind, shareId);
        };
        return SharePointQueryableShareableItem;
    }(SharePointQueryableSecurable));
    var FileFolderShared = /** @class */ (function (_super) {
        tslib_1.__extends(FileFolderShared, _super);
        function FileFolderShared() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Gets a link suitable for sharing
         *
         * @param kind The kind of link to get
         * @param expiration Optional, an expiration for this link
         */
        FileFolderShared.prototype.getShareLink = function (kind, expiration) {
            if (kind === void 0) { kind = exports.SharingLinkKind.OrganizationView; }
            if (expiration === void 0) { expiration = null; }
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.getShareLink(kind, expiration);
            });
        };
        /**
             * Checks Permissions on the list of Users and returns back role the users have on the Item.
             *
             * @param recipients The array of Entities for which Permissions need to be checked.
             */
        FileFolderShared.prototype.checkSharingPermissions = function (recipients) {
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.checkPermissions(recipients);
            });
        };
        /**
         * Get Sharing Information.
         *
         * @param request The SharingInformationRequest Object.
         */
        FileFolderShared.prototype.getSharingInformation = function (request) {
            if (request === void 0) { request = null; }
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.getSharingInformation(request);
            });
        };
        /**
         * Gets the sharing settings of an item.
         *
         * @param useSimplifiedRoles Determines whether to use simplified roles.
         */
        FileFolderShared.prototype.getObjectSharingSettings = function (useSimplifiedRoles) {
            if (useSimplifiedRoles === void 0) { useSimplifiedRoles = true; }
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.getObjectSharingSettings(useSimplifiedRoles);
            });
        };
        /**
         * Unshare this item
         */
        FileFolderShared.prototype.unshare = function () {
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.unshareObject();
            });
        };
        /**
         * Deletes a sharing link by the kind of link
         *
         * @param kind The kind of link to be deleted.
         */
        FileFolderShared.prototype.deleteSharingLinkByKind = function (kind) {
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.deleteLinkByKind(kind);
            });
        };
        /**
         * Removes the specified link to the item.
         *
         * @param kind The kind of link to be deleted.
         * @param shareId The share id to delete
         */
        FileFolderShared.prototype.unshareLink = function (kind, shareId) {
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.unshareLink(kind, shareId);
            });
        };
        /**
         * For files and folders we need to use the associated item end point
         */
        FileFolderShared.prototype.getShareable = function () {
            var _this = this;
            // sharing only works on the item end point, not the file one - so we create a folder instance with the item url internally
            return this.clone(SharePointQueryableShareableFile, "listItemAllFields", false).select("odata.id").get().then(function (d) {
                var shareable = new SharePointQueryableShareable(odataUrlFrom(d));
                // we need to handle batching
                if (_this.hasBatch) {
                    shareable = shareable.inBatch(_this.batch);
                }
                return shareable;
            });
        };
        return FileFolderShared;
    }(SharePointQueryableInstance));
    var SharePointQueryableShareableFile = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableShareableFile, _super);
        function SharePointQueryableShareableFile() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Shares this item with one or more users
         *
         * @param loginNames string or string[] of resolved login names to which this item will be shared
         * @param role The role (View | Edit) applied to the share
         * @param shareEverything Share everything in this folder, even items with unique permissions.
         * @param requireSignin If true the user must signin to view link, otherwise anyone with the link can access the resource
         * @param emailData Optional, if inlucded an email will be sent. Note subject currently has no effect.
         */
        SharePointQueryableShareableFile.prototype.shareWith = function (loginNames, role, requireSignin, emailData) {
            if (role === void 0) { role = exports.SharingRole.View; }
            if (requireSignin === void 0) { requireSignin = false; }
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.shareWith(loginNames, role, requireSignin, false, emailData);
            });
        };
        return SharePointQueryableShareableFile;
    }(FileFolderShared));
    var SharePointQueryableShareableFolder = /** @class */ (function (_super) {
        tslib_1.__extends(SharePointQueryableShareableFolder, _super);
        function SharePointQueryableShareableFolder() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Shares this item with one or more users
         *
         * @param loginNames string or string[] of resolved login names to which this item will be shared
         * @param role The role (View | Edit) applied to the share
         * @param shareEverything Share everything in this folder, even items with unique permissions.
         * @param requireSignin If true the user must signin to view link, otherwise anyone with the link can access the resource
         * @param emailData Optional, if inlucded an email will be sent. Note subject currently has no effect.
         */
        SharePointQueryableShareableFolder.prototype.shareWith = function (loginNames, role, requireSignin, shareEverything, emailData) {
            if (role === void 0) { role = exports.SharingRole.View; }
            if (requireSignin === void 0) { requireSignin = false; }
            if (shareEverything === void 0) { shareEverything = false; }
            var dependency = this.addBatchDependency();
            return this.getShareable().then(function (shareable) {
                dependency();
                return shareable.shareWith(loginNames, role, requireSignin, shareEverything, emailData);
            });
        };
        return SharePointQueryableShareableFolder;
    }(FileFolderShared));

    var LimitedWebPartManager = /** @class */ (function (_super) {
        tslib_1.__extends(LimitedWebPartManager, _super);
        function LimitedWebPartManager() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(LimitedWebPartManager.prototype, "webparts", {
            /**
             * Gets the set of web part definitions contained by this web part manager
             *
             */
            get: function () {
                return new WebPartDefinitions(this, "webparts");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Exports a webpart definition
         *
         * @param id the GUID id of the definition to export
         */
        LimitedWebPartManager.prototype.export = function (id) {
            return this.clone(LimitedWebPartManager, "ExportWebPart").postCore({
                body: common.jsS({ webPartId: id }),
            });
        };
        /**
         * Imports a webpart
         *
         * @param xml webpart definition which must be valid XML in the .dwp or .webpart format
         */
        LimitedWebPartManager.prototype.import = function (xml) {
            return this.clone(LimitedWebPartManager, "ImportWebPart").postCore({
                body: common.jsS({ webPartXml: xml }),
            });
        };
        return LimitedWebPartManager;
    }(SharePointQueryable));
    var WebPartDefinitions = /** @class */ (function (_super) {
        tslib_1.__extends(WebPartDefinitions, _super);
        function WebPartDefinitions() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a web part definition from the collection by id
             *
             * @param id The storage ID of the SPWebPartDefinition to retrieve
             */
            _this.getById = _this._getById(WebPartDefinition);
            return _this;
        }
        /**
         * Gets a web part definition from the collection by storage id
         *
         * @param id The WebPart.ID of the SPWebPartDefinition to retrieve
         */
        WebPartDefinitions.prototype.getByControlId = function (id) {
            return new WebPartDefinition(this, "getByControlId('" + id + "')");
        };
        return WebPartDefinitions;
    }(SharePointQueryableCollection));
    var WebPartDefinition = /** @class */ (function (_super) {
        tslib_1.__extends(WebPartDefinition, _super);
        function WebPartDefinition() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(WebPartDefinition.prototype, "webpart", {
            /**
             * Gets the webpart information associated with this definition
             */
            get: function () {
                return new WebPart(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Saves changes to the Web Part made using other properties and methods on the SPWebPartDefinition object
         */
        WebPartDefinition.prototype.saveChanges = function () {
            return this.clone(WebPartDefinition, "SaveWebPartChanges").postCore();
        };
        /**
         * Moves the Web Part to a different location on a Web Part Page
         *
         * @param zoneId The ID of the Web Part Zone to which to move the Web Part
         * @param zoneIndex A Web Part zone index that specifies the position at which the Web Part is to be moved within the destination Web Part zone
         */
        WebPartDefinition.prototype.moveTo = function (zoneId, zoneIndex) {
            return this.clone(WebPartDefinition, "MoveWebPartTo(zoneID='" + zoneId + "', zoneIndex=" + zoneIndex + ")").postCore();
        };
        /**
         * Closes the Web Part. If the Web Part is already closed, this method does nothing
         */
        WebPartDefinition.prototype.close = function () {
            return this.clone(WebPartDefinition, "CloseWebPart").postCore();
        };
        /**
         * Opens the Web Part. If the Web Part is already closed, this method does nothing
         */
        WebPartDefinition.prototype.open = function () {
            return this.clone(WebPartDefinition, "OpenWebPart").postCore();
        };
        /**
         * Removes a webpart from a page, all settings will be lost
         */
        WebPartDefinition.prototype.delete = function () {
            return this.clone(WebPartDefinition, "DeleteWebPart").postCore();
        };
        return WebPartDefinition;
    }(SharePointQueryableInstance));
    var WebPart = /** @class */ (function (_super) {
        tslib_1.__extends(WebPart, _super);
        function WebPart() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        WebPart = tslib_1.__decorate([
            defaultPath("webpart")
        ], WebPart);
        return WebPart;
    }(SharePointQueryableInstance));

    /**
     * Describes a collection of Folder objects
     *
     */
    var Folders = /** @class */ (function (_super) {
        tslib_1.__extends(Folders, _super);
        function Folders() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Folders_1 = Folders;
        /**
         * Gets a folder by folder name
         *
         */
        Folders.prototype.getByName = function (name) {
            var f = new Folder(this);
            f.concat("('" + name + "')");
            return f;
        };
        /**
         * Adds a new folder to the current folder (relative) or any folder (absolute)
         *
         * @param url The relative or absolute url where the new folder will be created. Urls starting with a forward slash are absolute.
         * @returns The new Folder and the raw response.
         */
        Folders.prototype.add = function (url) {
            var _this = this;
            return this.clone(Folders_1, "add('" + url + "')").postCore().then(function (response) {
                return {
                    data: response,
                    folder: _this.getByName(url),
                };
            });
        };
        Folders = Folders_1 = tslib_1.__decorate([
            defaultPath("folders")
        ], Folders);
        return Folders;
        var Folders_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single Folder instance
     *
     */
    var Folder = /** @class */ (function (_super) {
        tslib_1.__extends(Folder, _super);
        function Folder() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.update = _this._update("SP.Folder", function (data) { return ({ data: data, folder: _this }); });
            return _this;
        }
        Object.defineProperty(Folder.prototype, "contentTypeOrder", {
            /**
             * Specifies the sequence in which content types are displayed.
             *
             */
            get: function () {
                return new SharePointQueryableCollection(this, "contentTypeOrder");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "files", {
            /**
             * Gets this folder's files
             *
             */
            get: function () {
                return new Files(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "folders", {
            /**
             * Gets this folder's sub folders
             *
             */
            get: function () {
                return new Folders(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "listItemAllFields", {
            /**
             * Gets this folder's list item field values
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "listItemAllFields");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "parentFolder", {
            /**
             * Gets the parent folder, if available
             *
             */
            get: function () {
                return new Folder(this, "parentFolder");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "properties", {
            /**
             * Gets this folder's properties
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "properties");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "serverRelativeUrl", {
            /**
             * Gets this folder's server relative url
             *
             */
            get: function () {
                return new SharePointQueryable(this, "serverRelativeUrl");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "uniqueContentTypeOrder", {
            /**
             * Gets a value that specifies the content type order.
             *
             */
            get: function () {
                return new SharePointQueryableCollection(this, "uniqueContentTypeOrder");
            },
            enumerable: true,
            configurable: true
        });
        /**
        * Delete this folder
        *
        * @param eTag Value used in the IF-Match header, by default "*"
        */
        Folder.prototype.delete = function (eTag) {
            if (eTag === void 0) { eTag = "*"; }
            return this.clone(Folder, null).postCore({
                headers: {
                    "IF-Match": eTag,
                    "X-HTTP-Method": "DELETE",
                },
            });
        };
        /**
         * Moves the folder to the Recycle Bin and returns the identifier of the new Recycle Bin item.
         */
        Folder.prototype.recycle = function () {
            return this.clone(Folder, "recycle").postCore();
        };
        /**
         * Gets the associated list item for this folder, loading the default properties
         */
        Folder.prototype.getItem = function () {
            var selects = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                selects[_i] = arguments[_i];
            }
            var q = this.listItemAllFields;
            return q.select.apply(q, selects).get().then(function (d) {
                return common.extend(new Item(odataUrlFrom(d)), d);
            });
        };
        /**
         * Moves a folder to destination path
         *
         * @param destUrl Absolute or relative URL of the destination path
         */
        Folder.prototype.moveTo = function (destUrl) {
            var _this = this;
            return this.select("ServerRelativeUrl").get().then(function (_a) {
                var srcUrl = _a.ServerRelativeUrl;
                var client = new SPHttpClient();
                var webBaseUrl = _this.toUrl().split("/_api")[0];
                var hostUrl = webBaseUrl.replace("://", "___").split("/")[0].replace("___", "://");
                var methodUrl = webBaseUrl + "/_api/SP.MoveCopyUtil.MoveFolder()";
                return client.post(methodUrl, {
                    body: common.jsS({
                        destUrl: destUrl.indexOf("http") === 0 ? destUrl : "" + hostUrl + destUrl,
                        srcUrl: "" + hostUrl + srcUrl,
                    }),
                }).then(function (r) { return r.json(); });
            });
        };
        return Folder;
    }(SharePointQueryableShareableFolder));

    /**
     * Describes a collection of content types
     *
     */
    var ContentTypes = /** @class */ (function (_super) {
        tslib_1.__extends(ContentTypes, _super);
        function ContentTypes() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(ContentType);
            return _this;
        }
        ContentTypes_1 = ContentTypes;
        /**
         * Adds an existing contenttype to a content type collection
         *
         * @param contentTypeId in the following format, for example: 0x010102
         */
        ContentTypes.prototype.addAvailableContentType = function (contentTypeId) {
            var _this = this;
            var postBody = common.jsS({
                "contentTypeId": contentTypeId,
            });
            return this.clone(ContentTypes_1, "addAvailableContentType").postCore({ body: postBody }).then(function (data) {
                return {
                    contentType: _this.getById(data.id),
                    data: data,
                };
            });
        };
        /**
         * Adds a new content type to the collection
         *
         * @param id The desired content type id for the new content type (also determines the parent content type)
         * @param name The name of the content type
         * @param description The description of the content type
         * @param group The group in which to add the content type
         * @param additionalSettings Any additional settings to provide when creating the content type
         *
         */
        ContentTypes.prototype.add = function (id, name, description, group, additionalSettings) {
            var _this = this;
            if (description === void 0) { description = ""; }
            if (group === void 0) { group = "Custom Content Types"; }
            if (additionalSettings === void 0) { additionalSettings = {}; }
            var postBody = common.jsS(Object.assign(metadata("SP.ContentType"), {
                "Description": description,
                "Group": group,
                "Id": { "StringValue": id },
                "Name": name,
            }, additionalSettings));
            return this.postCore({ body: postBody }).then(function (data) {
                return { contentType: _this.getById(data.id), data: data };
            });
        };
        ContentTypes = ContentTypes_1 = tslib_1.__decorate([
            defaultPath("contenttypes")
        ], ContentTypes);
        return ContentTypes;
        var ContentTypes_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single ContentType instance
     *
     */
    var ContentType = /** @class */ (function (_super) {
        tslib_1.__extends(ContentType, _super);
        function ContentType() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Delete this content type
             */
            _this.delete = _this._delete;
            return _this;
        }
        Object.defineProperty(ContentType.prototype, "fieldLinks", {
            /**
             * Gets the column (also known as field) references in the content type.
            */
            get: function () {
                return new FieldLinks(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContentType.prototype, "fields", {
            /**
             * Gets a value that specifies the collection of fields for the content type.
             */
            get: function () {
                return new SharePointQueryableCollection(this, "fields");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContentType.prototype, "parent", {
            /**
             * Gets the parent content type of the content type.
             */
            get: function () {
                return new ContentType(this, "parent");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContentType.prototype, "workflowAssociations", {
            /**
             * Gets a value that specifies the collection of workflow associations for the content type.
             */
            get: function () {
                return new SharePointQueryableCollection(this, "workflowAssociations");
            },
            enumerable: true,
            configurable: true
        });
        return ContentType;
    }(SharePointQueryableInstance));
    /**
     * Represents a collection of field link instances
     */
    var FieldLinks = /** @class */ (function (_super) {
        tslib_1.__extends(FieldLinks, _super);
        function FieldLinks() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(FieldLink);
            return _this;
        }
        FieldLinks = tslib_1.__decorate([
            defaultPath("fieldlinks")
        ], FieldLinks);
        return FieldLinks;
    }(SharePointQueryableCollection));
    /**
     * Represents a field link instance
     */
    var FieldLink = /** @class */ (function (_super) {
        tslib_1.__extends(FieldLink, _super);
        function FieldLink() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return FieldLink;
    }(SharePointQueryableInstance));

    /**
     * Describes a collection of Item objects
     *
     */
    var AttachmentFiles = /** @class */ (function (_super) {
        tslib_1.__extends(AttachmentFiles, _super);
        function AttachmentFiles() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        AttachmentFiles_1 = AttachmentFiles;
        /**
         * Gets a Attachment File by filename
         *
         * @param name The name of the file, including extension.
         */
        AttachmentFiles.prototype.getByName = function (name) {
            var f = new AttachmentFile(this);
            f.concat("('" + name + "')");
            return f;
        };
        /**
         * Adds a new attachment to the collection. Not supported for batching.
         *
         * @param name The name of the file, including extension.
         * @param content The Base64 file content.
         */
        AttachmentFiles.prototype.add = function (name, content) {
            var _this = this;
            return this.clone(AttachmentFiles_1, "add(FileName='" + name + "')", false).postCore({
                body: content,
            }).then(function (response) {
                return {
                    data: response,
                    file: _this.getByName(name),
                };
            });
        };
        /**
         * Adds multiple new attachment to the collection. Not supported for batching.
         *
         * @files name The collection of files to add
         */
        AttachmentFiles.prototype.addMultiple = function (files) {
            var _this = this;
            // add the files in series so we don't get update conflicts
            return files.reduce(function (chain, file) { return chain.then(function () { return _this.clone(AttachmentFiles_1, "add(FileName='" + file.name + "')", false).postCore({
                body: file.content,
            }); }); }, Promise.resolve());
        };
        /**
         * Delete multiple attachments from the collection. Not supported for batching.
         *
         * @files name The collection of files to delete
         */
        AttachmentFiles.prototype.deleteMultiple = function () {
            var _this = this;
            var files = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                files[_i] = arguments[_i];
            }
            return files.reduce(function (chain, file) { return chain.then(function () { return _this.getByName(file).delete(); }); }, Promise.resolve());
        };
        AttachmentFiles = AttachmentFiles_1 = tslib_1.__decorate([
            defaultPath("AttachmentFiles")
        ], AttachmentFiles);
        return AttachmentFiles;
        var AttachmentFiles_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single attachment file instance
     *
     */
    var AttachmentFile = /** @class */ (function (_super) {
        tslib_1.__extends(AttachmentFile, _super);
        function AttachmentFile() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.delete = _this._deleteWithETag;
            return _this;
        }
        /**
         * Gets the contents of the file as text
         *
         */
        AttachmentFile.prototype.getText = function () {
            return this.getParsed(new odata.TextParser());
        };
        /**
         * Gets the contents of the file as a blob, does not work in Node.js
         *
         */
        AttachmentFile.prototype.getBlob = function () {
            return this.getParsed(new odata.BlobParser());
        };
        /**
         * Gets the contents of a file as an ArrayBuffer, works in Node.js
         */
        AttachmentFile.prototype.getBuffer = function () {
            return this.getParsed(new odata.BufferParser());
        };
        /**
         * Gets the contents of a file as an ArrayBuffer, works in Node.js
         */
        AttachmentFile.prototype.getJSON = function () {
            return this.getParsed(new odata.JSONParser());
        };
        /**
         * Sets the content of a file. Not supported for batching
         *
         * @param content The value to set for the file contents
         */
        AttachmentFile.prototype.setContent = function (content) {
            var _this = this;
            return this.clone(AttachmentFile, "$value", false).postCore({
                body: content,
                headers: {
                    "X-HTTP-Method": "PUT",
                },
            }).then(function (_) { return new AttachmentFile(_this); });
        };
        // /**
        //  * Delete this attachment file
        //  *
        //  * @param eTag Value used in the IF-Match header, by default "*"
        //  */
        // public delete(eTag = "*"): Promise<void> {
        //     return this.postCore({
        //         headers: {
        //             "IF-Match": eTag,
        //             "X-HTTP-Method": "DELETE",
        //         },
        //     });
        // }
        AttachmentFile.prototype.getParsed = function (parser) {
            return this.clone(AttachmentFile, "$value", false).get(parser);
        };
        return AttachmentFile;
    }(SharePointQueryableInstance));

    /**
     * Describes the views available in the current context
     *
     */
    var Views = /** @class */ (function (_super) {
        tslib_1.__extends(Views, _super);
        function Views() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a view by guid id
             *
             * @param id The GUID id of the view
             */
            _this.getById = _this._getById(View);
            return _this;
        }
        Views_1 = Views;
        /**
         * Gets a view by title (case-sensitive)
         *
         * @param title The case-sensitive title of the view
         */
        Views.prototype.getByTitle = function (title) {
            return new View(this, "getByTitle('" + title + "')");
        };
        /**
         * Adds a new view to the collection
         *
         * @param title The new views's title
         * @param personalView True if this is a personal view, otherwise false, default = false
         * @param additionalSettings Will be passed as part of the view creation body
         */
        Views.prototype.add = function (title, personalView, additionalSettings) {
            var _this = this;
            if (personalView === void 0) { personalView = false; }
            if (additionalSettings === void 0) { additionalSettings = {}; }
            var postBody = common.jsS(Object.assign(metadata("SP.View"), {
                "PersonalView": personalView,
                "Title": title,
            }, additionalSettings));
            return this.clone(Views_1, null).postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    view: _this.getById(data.Id),
                };
            });
        };
        Views = Views_1 = tslib_1.__decorate([
            defaultPath("views")
        ], Views);
        return Views;
        var Views_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single View instance
     *
     */
    var View = /** @class */ (function (_super) {
        tslib_1.__extends(View, _super);
        function View() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Updates this view intance with the supplied properties
             *
             * @param properties A plain object hash of values to update for the view
             */
            _this.update = _this._update("SP.View", function (data) { return ({ data: data, view: _this }); });
            /**
             * Delete this view
             *
             */
            _this.delete = _this._delete;
            return _this;
        }
        Object.defineProperty(View.prototype, "fields", {
            get: function () {
                return new ViewFields(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Returns the list view as HTML.
         *
         */
        View.prototype.renderAsHtml = function () {
            return this.clone(SharePointQueryable, "renderashtml").get();
        };
        return View;
    }(SharePointQueryableInstance));
    var ViewFields = /** @class */ (function (_super) {
        tslib_1.__extends(ViewFields, _super);
        function ViewFields() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ViewFields_1 = ViewFields;
        /**
         * Gets a value that specifies the XML schema that represents the collection.
         */
        ViewFields.prototype.getSchemaXml = function () {
            return this.clone(SharePointQueryable, "schemaxml").get();
        };
        /**
         * Adds the field with the specified field internal name or display name to the collection.
         *
         * @param fieldTitleOrInternalName The case-sensitive internal name or display name of the field to add.
         */
        ViewFields.prototype.add = function (fieldTitleOrInternalName) {
            return this.clone(ViewFields_1, "addviewfield('" + fieldTitleOrInternalName + "')").postCore();
        };
        /**
         * Moves the field with the specified field internal name to the specified position in the collection.
         *
         * @param fieldInternalName The case-sensitive internal name of the field to move.
         * @param index The zero-based index of the new position for the field.
         */
        ViewFields.prototype.move = function (fieldInternalName, index) {
            return this.clone(ViewFields_1, "moveviewfieldto").postCore({
                body: common.jsS({ "field": fieldInternalName, "index": index }),
            });
        };
        /**
         * Removes all the fields from the collection.
         */
        ViewFields.prototype.removeAll = function () {
            return this.clone(ViewFields_1, "removeallviewfields").postCore();
        };
        /**
         * Removes the field with the specified field internal name from the collection.
         *
         * @param fieldInternalName The case-sensitive internal name of the field to remove from the view.
         */
        ViewFields.prototype.remove = function (fieldInternalName) {
            return this.clone(ViewFields_1, "removeviewfield('" + fieldInternalName + "')").postCore();
        };
        ViewFields = ViewFields_1 = tslib_1.__decorate([
            defaultPath("viewfields")
        ], ViewFields);
        return ViewFields;
        var ViewFields_1;
    }(SharePointQueryableCollection));

    /**
     * Describes a collection of Field objects
     *
     */
    var Fields = /** @class */ (function (_super) {
        tslib_1.__extends(Fields, _super);
        function Fields() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a list from the collection by guid id
             *
             * @param title The Id of the list
             */
            _this.getById = _this._getById(Field);
            return _this;
        }
        Fields_1 = Fields;
        /**
         * Gets a field from the collection by title
         *
         * @param title The case-sensitive title of the field
         */
        Fields.prototype.getByTitle = function (title) {
            return new Field(this, "getByTitle('" + title + "')");
        };
        /**
         * Gets a field from the collection by using internal name or title
         *
         * @param name The case-sensitive internal name or title of the field
         */
        Fields.prototype.getByInternalNameOrTitle = function (name) {
            return new Field(this, "getByInternalNameOrTitle('" + name + "')");
        };
        /**
         * Creates a field based on the specified schema
         */
        Fields.prototype.createFieldAsXml = function (xml) {
            var _this = this;
            var info;
            if (typeof xml === "string") {
                info = { SchemaXml: xml };
            }
            else {
                info = xml;
            }
            var postBody = common.jsS({
                "parameters": common.extend(metadata("SP.XmlSchemaFieldCreationInformation"), info),
            });
            return this.clone(Fields_1, "createfieldasxml").postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    field: _this.getById(data.Id),
                };
            });
        };
        /**
         * Adds a new field to the collection
         *
         * @param title The new field's title
         * @param fieldType The new field's type (ex: SP.FieldText)
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.add = function (title, fieldType, properties) {
            var _this = this;
            var postBody = common.jsS(Object.assign(metadata(fieldType), {
                "Title": title,
            }, properties));
            return this.clone(Fields_1, null).postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    field: _this.getById(data.Id),
                };
            });
        };
        /**
         * Adds a new SP.FieldText to the collection
         *
         * @param title The field title
         * @param maxLength The maximum number of characters allowed in the value of the field.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addText = function (title, maxLength, properties) {
            if (maxLength === void 0) { maxLength = 255; }
            var props = {
                FieldTypeKind: 2,
                MaxLength: maxLength,
            };
            return this.add(title, "SP.FieldText", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldCalculated to the collection
         *
         * @param title The field title.
         * @param formula The formula for the field.
         * @param dateFormat The date and time format that is displayed in the field.
         * @param outputType Specifies the output format for the field. Represents a FieldType value.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addCalculated = function (title, formula, dateFormat, outputType, properties) {
            if (outputType === void 0) { outputType = exports.FieldTypes.Text; }
            var props = {
                DateFormat: dateFormat,
                FieldTypeKind: 17,
                Formula: formula,
                OutputType: outputType,
            };
            return this.add(title, "SP.FieldCalculated", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldDateTime to the collection
         *
         * @param title The field title
         * @param displayFormat The format of the date and time that is displayed in the field.
         * @param calendarType Specifies the calendar type of the field.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addDateTime = function (title, displayFormat, calendarType, friendlyDisplayFormat, properties) {
            if (displayFormat === void 0) { displayFormat = exports.DateTimeFieldFormatType.DateOnly; }
            if (calendarType === void 0) { calendarType = exports.CalendarType.Gregorian; }
            if (friendlyDisplayFormat === void 0) { friendlyDisplayFormat = 0; }
            var props = {
                DateTimeCalendarType: calendarType,
                DisplayFormat: displayFormat,
                FieldTypeKind: 4,
                FriendlyDisplayFormat: friendlyDisplayFormat,
            };
            return this.add(title, "SP.FieldDateTime", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldNumber to the collection
         *
         * @param title The field title
         * @param minValue The field's minimum value
         * @param maxValue The field's maximum value
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addNumber = function (title, minValue, maxValue, properties) {
            var props = { FieldTypeKind: 9 };
            if (minValue !== undefined) {
                props = common.extend({ MinimumValue: minValue }, props);
            }
            if (maxValue !== undefined) {
                props = common.extend({ MaximumValue: maxValue }, props);
            }
            return this.add(title, "SP.FieldNumber", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldCurrency to the collection
         *
         * @param title The field title
         * @param minValue The field's minimum value
         * @param maxValue The field's maximum value
         * @param currencyLocalId Specifies the language code identifier (LCID) used to format the value of the field
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addCurrency = function (title, minValue, maxValue, currencyLocalId, properties) {
            if (currencyLocalId === void 0) { currencyLocalId = 1033; }
            var props = {
                CurrencyLocaleId: currencyLocalId,
                FieldTypeKind: 10,
            };
            if (minValue !== undefined) {
                props = common.extend({ MinimumValue: minValue }, props);
            }
            if (maxValue !== undefined) {
                props = common.extend({ MaximumValue: maxValue }, props);
            }
            return this.add(title, "SP.FieldCurrency", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldMultiLineText to the collection
         *
         * @param title The field title
         * @param numberOfLines Specifies the number of lines of text to display for the field.
         * @param richText Specifies whether the field supports rich formatting.
         * @param restrictedMode Specifies whether the field supports a subset of rich formatting.
         * @param appendOnly Specifies whether all changes to the value of the field are displayed in list forms.
         * @param allowHyperlink Specifies whether a hyperlink is allowed as a value of the field.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         *
         */
        Fields.prototype.addMultilineText = function (title, numberOfLines, richText, restrictedMode, appendOnly, allowHyperlink, properties) {
            if (numberOfLines === void 0) { numberOfLines = 6; }
            if (richText === void 0) { richText = true; }
            if (restrictedMode === void 0) { restrictedMode = false; }
            if (appendOnly === void 0) { appendOnly = false; }
            if (allowHyperlink === void 0) { allowHyperlink = true; }
            var props = {
                AllowHyperlink: allowHyperlink,
                AppendOnly: appendOnly,
                FieldTypeKind: 3,
                NumberOfLines: numberOfLines,
                RestrictedMode: restrictedMode,
                RichText: richText,
            };
            return this.add(title, "SP.FieldMultiLineText", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldUrl to the collection
         *
         * @param title The field title
         */
        Fields.prototype.addUrl = function (title, displayFormat, properties) {
            if (displayFormat === void 0) { displayFormat = exports.UrlFieldFormatType.Hyperlink; }
            var props = {
                DisplayFormat: displayFormat,
                FieldTypeKind: 11,
            };
            return this.add(title, "SP.FieldUrl", common.extend(props, properties));
        };
        /** Adds a user field to the colleciton
        *
        * @param title The new field's title
        * @param selectionMode The selection mode of the field
        * @param selectionGroup Value that specifies the identifier of the SharePoint group whose members can be selected as values of the field
        * @param properties
        */
        Fields.prototype.addUser = function (title, selectionMode, properties) {
            var props = {
                FieldTypeKind: 20,
                SelectionMode: selectionMode,
            };
            return this.add(title, "SP.FieldUser", common.extend(props, properties));
        };
        /**
         * Adds a SP.FieldLookup to the collection
         *
         * @param title The new field's title
         * @param lookupListId The guid id of the list where the source of the lookup is found
         * @param lookupFieldName The internal name of the field in the source list
         * @param properties Set of additional properties to set on the new field
         */
        Fields.prototype.addLookup = function (title, lookupListId, lookupFieldName, properties) {
            var _this = this;
            var postBody = common.jsS(Object.assign(metadata("SP.FieldCreationInformation"), {
                parameters: common.extend({
                    FieldTypeKind: 7,
                    LookupFieldName: lookupFieldName,
                    LookupListId: lookupListId,
                    Title: title,
                }, properties),
            }));
            return this.clone(Fields_1, "addfield").postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    field: _this.getById(data.Id),
                };
            });
        };
        /**
         * Adds a new SP.FieldChoice to the collection
         *
         * @param title The field title.
         * @param choices The choices for the field.
         * @param format The display format of the available options for the field.
         * @param fillIn Specifies whether the field allows fill-in values.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addChoice = function (title, choices, format, fillIn, properties) {
            if (format === void 0) { format = exports.ChoiceFieldFormatType.Dropdown; }
            var props = {
                Choices: {
                    results: choices,
                },
                EditFormat: format,
                FieldTypeKind: 6,
                FillInChoice: fillIn,
            };
            return this.add(title, "SP.FieldChoice", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldMultiChoice to the collection
         *
         * @param title The field title.
         * @param choices The choices for the field.
         * @param fillIn Specifies whether the field allows fill-in values.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addMultiChoice = function (title, choices, fillIn, properties) {
            var props = {
                Choices: {
                    results: choices,
                },
                FieldTypeKind: 15,
                FillInChoice: fillIn,
            };
            return this.add(title, "SP.FieldMultiChoice", common.extend(props, properties));
        };
        /**
         * Adds a new SP.FieldBoolean to the collection
         *
         * @param title The field title.
         * @param properties Differ by type of field being created (see: https://msdn.microsoft.com/en-us/library/office/dn600182.aspx)
         */
        Fields.prototype.addBoolean = function (title, properties) {
            var props = {
                FieldTypeKind: 8,
            };
            return this.add(title, "SP.Field", common.extend(props, properties));
        };
        Fields = Fields_1 = tslib_1.__decorate([
            defaultPath("fields")
        ], Fields);
        return Fields;
        var Fields_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single of Field instance
     *
     */
    var Field = /** @class */ (function (_super) {
        tslib_1.__extends(Field, _super);
        function Field() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Delete this fields
             *
             */
            _this.delete = _this._delete;
            return _this;
        }
        /**
         * Updates this field intance with the supplied properties
         *
         * @param properties A plain object hash of values to update for the list
         * @param fieldType The type value, required to update child field type properties
         */
        Field.prototype.update = function (properties, fieldType) {
            var _this = this;
            if (fieldType === void 0) { fieldType = "SP.Field"; }
            var postBody = common.jsS(common.extend(metadata(fieldType), properties));
            return this.postCore({
                body: postBody,
                headers: {
                    "X-HTTP-Method": "MERGE",
                },
            }).then(function (data) {
                return {
                    data: data,
                    field: _this,
                };
            });
        };
        /**
         * Sets the value of the ShowInDisplayForm property for this field.
         */
        Field.prototype.setShowInDisplayForm = function (show) {
            return this.clone(Field, "setshowindisplayform(" + show + ")").postCore();
        };
        /**
         * Sets the value of the ShowInEditForm property for this field.
         */
        Field.prototype.setShowInEditForm = function (show) {
            return this.clone(Field, "setshowineditform(" + show + ")").postCore();
        };
        /**
         * Sets the value of the ShowInNewForm property for this field.
         */
        Field.prototype.setShowInNewForm = function (show) {
            return this.clone(Field, "setshowinnewform(" + show + ")").postCore();
        };
        return Field;
    }(SharePointQueryableInstance));

    /**
     * Describes a collection of Field objects
     *
     */
    var Forms = /** @class */ (function (_super) {
        tslib_1.__extends(Forms, _super);
        function Forms() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(Form);
            return _this;
        }
        Forms = tslib_1.__decorate([
            defaultPath("forms")
        ], Forms);
        return Forms;
    }(SharePointQueryableCollection));
    /**
     * Describes a single of Form instance
     *
     */
    var Form = /** @class */ (function (_super) {
        tslib_1.__extends(Form, _super);
        function Form() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Form;
    }(SharePointQueryableInstance));

    /**
     * Describes a collection of webhook subscriptions
     *
     */
    var Subscriptions = /** @class */ (function (_super) {
        tslib_1.__extends(Subscriptions, _super);
        function Subscriptions() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Returns all the webhook subscriptions or the specified webhook subscription
             *
             * @param id The id of a specific webhook subscription to retrieve, omit to retrieve all the webhook subscriptions
             */
            _this.getById = _this._getById(Subscription);
            return _this;
        }
        /**
         * Creates a new webhook subscription
         *
         * @param notificationUrl The url to receive the notifications
         * @param expirationDate The date and time to expire the subscription in the form YYYY-MM-ddTHH:mm:ss+00:00 (maximum of 6 months)
         * @param clientState A client specific string (defaults to pnp-js-core-subscription when omitted)
         */
        Subscriptions.prototype.add = function (notificationUrl, expirationDate, clientState) {
            var _this = this;
            var postBody = common.jsS({
                "clientState": clientState || "pnp-js-core-subscription",
                "expirationDateTime": expirationDate,
                "notificationUrl": notificationUrl,
                "resource": this.toUrl(),
            });
            return this.postCore({ body: postBody, headers: { "Content-Type": "application/json" } }).then(function (result) {
                return { data: result, subscription: _this.getById(result.id) };
            });
        };
        Subscriptions = tslib_1.__decorate([
            defaultPath("subscriptions")
        ], Subscriptions);
        return Subscriptions;
    }(SharePointQueryableCollection));
    /**
     * Describes a single webhook subscription instance
     *
     */
    var Subscription = /** @class */ (function (_super) {
        tslib_1.__extends(Subscription, _super);
        function Subscription() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Renews this webhook subscription
         *
         * @param expirationDate The date and time to expire the subscription in the form YYYY-MM-ddTHH:mm:ss+00:00 (maximum of 6 months)
         */
        Subscription.prototype.update = function (expirationDate) {
            var _this = this;
            var postBody = common.jsS({
                "expirationDateTime": expirationDate,
            });
            return this.patchCore({ body: postBody, headers: { "Content-Type": "application/json" } }).then(function (data) {
                return { data: data, subscription: _this };
            });
        };
        /**
         * Removes this webhook subscription
         *
         */
        Subscription.prototype.delete = function () {
            return _super.prototype.deleteCore.call(this);
        };
        return Subscription;
    }(SharePointQueryableInstance));

    /**
     * Describes a collection of user custom actions
     *
     */
    var UserCustomActions = /** @class */ (function (_super) {
        tslib_1.__extends(UserCustomActions, _super);
        function UserCustomActions() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Returns the user custom action with the specified id
             *
             * @param id The GUID id of the user custom action to retrieve
             */
            _this.getById = _this._getById(UserCustomAction);
            return _this;
        }
        UserCustomActions_1 = UserCustomActions;
        /**
         * Creates a user custom action
         *
         * @param properties The information object of property names and values which define the new user custom action
         *
         */
        UserCustomActions.prototype.add = function (properties) {
            var _this = this;
            var postBody = common.jsS(common.extend({ __metadata: { "type": "SP.UserCustomAction" } }, properties));
            return this.postCore({ body: postBody }).then(function (data) {
                return {
                    action: _this.getById(data.Id),
                    data: data,
                };
            });
        };
        /**
         * Deletes all user custom actions in the collection
         *
         */
        UserCustomActions.prototype.clear = function () {
            return this.clone(UserCustomActions_1, "clear").postCore();
        };
        UserCustomActions = UserCustomActions_1 = tslib_1.__decorate([
            defaultPath("usercustomactions")
        ], UserCustomActions);
        return UserCustomActions;
        var UserCustomActions_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single user custom action
     *
     */
    var UserCustomAction = /** @class */ (function (_super) {
        tslib_1.__extends(UserCustomAction, _super);
        function UserCustomAction() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
            * Updates this user custom action with the supplied properties
            *
            * @param properties An information object of property names and values to update for this user custom action
            */
            _this.update = _this._update("SP.UserCustomAction", function (data) { return ({ data: data, action: _this }); });
            return _this;
        }
        /**
        * Removes this user custom action
        *
        */
        UserCustomAction.prototype.delete = function () {
            return _super.prototype.deleteCore.call(this);
        };
        return UserCustomAction;
    }(SharePointQueryableInstance));

    /**
     * Describes a collection of List objects
     *
     */
    var Lists = /** @class */ (function (_super) {
        tslib_1.__extends(Lists, _super);
        function Lists() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a list from the collection by guid id
             *
             * @param id The Id of the list (GUID)
             */
            _this.getById = _this._getById(List);
            return _this;
        }
        Lists_1 = Lists;
        /**
         * Gets a list from the collection by title
         *
         * @param title The title of the list
         */
        Lists.prototype.getByTitle = function (title) {
            return new List(this, "getByTitle('" + title + "')");
        };
        /**
         * Adds a new list to the collection
         *
         * @param title The new list's title
         * @param description The new list's description
         * @param template The list template value
         * @param enableContentTypes If true content types will be allowed and enabled, otherwise they will be disallowed and not enabled
         * @param additionalSettings Will be passed as part of the list creation body
         */
        Lists.prototype.add = function (title, description, template, enableContentTypes, additionalSettings) {
            var _this = this;
            if (description === void 0) { description = ""; }
            if (template === void 0) { template = 100; }
            if (enableContentTypes === void 0) { enableContentTypes = false; }
            if (additionalSettings === void 0) { additionalSettings = {}; }
            var addSettings = common.extend({
                "AllowContentTypes": enableContentTypes,
                "BaseTemplate": template,
                "ContentTypesEnabled": enableContentTypes,
                "Description": description,
                "Title": title,
                "__metadata": { "type": "SP.List" },
            }, additionalSettings);
            return this.postCore({ body: common.jsS(addSettings) }).then(function (data) {
                return { data: data, list: _this.getByTitle(addSettings.Title) };
            });
        };
        /**
         * Ensures that the specified list exists in the collection (note: this method not supported for batching)
         *
         * @param title The new list's title
         * @param description The new list's description
         * @param template The list template value
         * @param enableContentTypes If true content types will be allowed and enabled, otherwise they will be disallowed and not enabled
         * @param additionalSettings Will be passed as part of the list creation body or used to update an existing list
         */
        Lists.prototype.ensure = function (title, description, template, enableContentTypes, additionalSettings) {
            var _this = this;
            if (description === void 0) { description = ""; }
            if (template === void 0) { template = 100; }
            if (enableContentTypes === void 0) { enableContentTypes = false; }
            if (additionalSettings === void 0) { additionalSettings = {}; }
            if (this.hasBatch) {
                throw new Error("The ensure list method is not supported for use in a batch.");
            }
            return new Promise(function (resolve, reject) {
                var addOrUpdateSettings = common.extend(additionalSettings, { Title: title, Description: description, ContentTypesEnabled: enableContentTypes }, true);
                var list = _this.getByTitle(addOrUpdateSettings.Title);
                list.get().then(function (_) {
                    list.update(addOrUpdateSettings).then(function (d) {
                        resolve({ created: false, data: d, list: _this.getByTitle(addOrUpdateSettings.Title) });
                    }).catch(function (e) { return reject(e); });
                }).catch(function (_) {
                    _this.add(title, description, template, enableContentTypes, addOrUpdateSettings).then(function (r) {
                        resolve({ created: true, data: r.data, list: _this.getByTitle(addOrUpdateSettings.Title) });
                    }).catch(function (e) { return reject(e); });
                });
            });
        };
        /**
         * Gets a list that is the default asset location for images or other files, which the users upload to their wiki pages.
         */
        Lists.prototype.ensureSiteAssetsLibrary = function () {
            return this.clone(Lists_1, "ensuresiteassetslibrary").postCore().then(function (json) {
                return new List(odataUrlFrom(json));
            });
        };
        /**
         * Gets a list that is the default location for wiki pages.
         */
        Lists.prototype.ensureSitePagesLibrary = function () {
            return this.clone(Lists_1, "ensuresitepageslibrary").postCore().then(function (json) {
                return new List(odataUrlFrom(json));
            });
        };
        Lists = Lists_1 = tslib_1.__decorate([
            defaultPath("lists")
        ], Lists);
        return Lists;
        var Lists_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single List instance
     *
     */
    var List = /** @class */ (function (_super) {
        tslib_1.__extends(List, _super);
        function List() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(List.prototype, "contentTypes", {
            /**
             * Gets the content types in this list
             *
             */
            get: function () {
                return new ContentTypes(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "items", {
            /**
             * Gets the items in this list
             *
             */
            get: function () {
                return new Items(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "views", {
            /**
             * Gets the views in this list
             *
             */
            get: function () {
                return new Views(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "fields", {
            /**
             * Gets the fields in this list
             *
             */
            get: function () {
                return new Fields(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "forms", {
            /**
             * Gets the forms in this list
             *
             */
            get: function () {
                return new Forms(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "defaultView", {
            /**
             * Gets the default view of this list
             *
             */
            get: function () {
                return new View(this, "DefaultView");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "userCustomActions", {
            /**
             * Get all custom actions on a site collection
             *
             */
            get: function () {
                return new UserCustomActions(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "effectiveBasePermissions", {
            /**
             * Gets the effective base permissions of this list
             *
             */
            get: function () {
                return new SharePointQueryable(this, "EffectiveBasePermissions");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "eventReceivers", {
            /**
             * Gets the event receivers attached to this list
             *
             */
            get: function () {
                return new SharePointQueryableCollection(this, "EventReceivers");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "relatedFields", {
            /**
             * Gets the related fields of this list
             *
             */
            get: function () {
                return new SharePointQueryable(this, "getRelatedFields");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "informationRightsManagementSettings", {
            /**
             * Gets the IRM settings for this list
             *
             */
            get: function () {
                return new SharePointQueryable(this, "InformationRightsManagementSettings");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "subscriptions", {
            /**
             * Gets the webhook subscriptions of this list
             *
             */
            get: function () {
                return new Subscriptions(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(List.prototype, "rootFolder", {
            /**
             * The root folder of the list
             */
            get: function () {
                return new Folder(this, "rootFolder");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets a view by view guid id
         *
         */
        List.prototype.getView = function (viewId) {
            return new View(this, "getView('" + viewId + "')");
        };
        /**
         * Updates this list intance with the supplied properties
         *
         * @param properties A plain object hash of values to update for the list
         * @param eTag Value used in the IF-Match header, by default "*"
         */
        /* tslint:disable no-string-literal */
        List.prototype.update = function (properties, eTag) {
            var _this = this;
            if (eTag === void 0) { eTag = "*"; }
            var postBody = common.jsS(common.extend({
                "__metadata": { "type": "SP.List" },
            }, properties));
            return this.postCore({
                body: postBody,
                headers: {
                    "IF-Match": eTag,
                    "X-HTTP-Method": "MERGE",
                },
            }).then(function (data) {
                var retList = _this;
                if (common.hOP(properties, "Title")) {
                    retList = _this.getParent(List, _this.parentUrl, "getByTitle('" + properties["Title"] + "')");
                }
                return {
                    data: data,
                    list: retList,
                };
            });
        };
        /* tslint:enable */
        /**
         * Delete this list
         *
         * @param eTag Value used in the IF-Match header, by default "*"
         */
        List.prototype.delete = function (eTag) {
            if (eTag === void 0) { eTag = "*"; }
            return this.postCore({
                headers: {
                    "IF-Match": eTag,
                    "X-HTTP-Method": "DELETE",
                },
            });
        };
        /**
         * Returns the collection of changes from the change log that have occurred within the list, based on the specified query.
         */
        List.prototype.getChanges = function (query) {
            return this.clone(List, "getchanges").postCore({
                body: common.jsS({ "query": common.extend({ "__metadata": { "type": "SP.ChangeQuery" } }, query) }),
            });
        };
        /**
         * Returns a collection of items from the list based on the specified query.
         *
         * @param CamlQuery The Query schema of Collaborative Application Markup
         * Language (CAML) is used in various ways within the context of Microsoft SharePoint Foundation
         * to define queries against list data.
         * see:
         *
         * https://msdn.microsoft.com/en-us/library/office/ms467521.aspx
         *
         * @param expands A URI with a $expand System Query Option indicates that Entries associated with
         * the Entry or Collection of Entries identified by the Resource Path
         * section of the URI must be represented inline (i.e. eagerly loaded).
         * see:
         *
         * https://msdn.microsoft.com/en-us/library/office/fp142385.aspx
         *
         * http://www.odata.org/documentation/odata-version-2-0/uri-conventions/#ExpandSystemQueryOption
         */
        List.prototype.getItemsByCAMLQuery = function (query) {
            var expands = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                expands[_i - 1] = arguments[_i];
            }
            var q = this.clone(List, "getitems");
            return q.expand.apply(q, expands).postCore({
                body: common.jsS({ "query": common.extend({ "__metadata": { "type": "SP.CamlQuery" } }, query) }),
            });
        };
        /**
         * See: https://msdn.microsoft.com/en-us/library/office/dn292554.aspx
         */
        List.prototype.getListItemChangesSinceToken = function (query) {
            return this.clone(List, "getlistitemchangessincetoken").postCore({
                body: common.jsS({ "query": common.extend({ "__metadata": { "type": "SP.ChangeLogItemQuery" } }, query) }),
            }, { parse: function (r) { return r.text(); } });
        };
        /**
         * Moves the list to the Recycle Bin and returns the identifier of the new Recycle Bin item.
         */
        List.prototype.recycle = function () {
            return this.clone(List, "recycle").postCore().then(function (data) {
                if (common.hOP(data, "Recycle")) {
                    return data.Recycle;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Renders list data based on the view xml provided
         */
        List.prototype.renderListData = function (viewXml) {
            var q = this.clone(List, "renderlistdata(@viewXml)");
            q.query.set("@viewXml", "'" + viewXml + "'");
            return q.postCore().then(function (data) {
                // data will be a string, so we parse it again
                data = JSON.parse(data);
                if (common.hOP(data, "RenderListData")) {
                    return data.RenderListData;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Returns the data for the specified query view
         *
         * @param parameters The parameters to be used to render list data as JSON string.
         * @param overrideParameters The parameters that are used to override and extend the regular SPRenderListDataParameters.
         */
        List.prototype.renderListDataAsStream = function (parameters, overrideParameters) {
            if (overrideParameters === void 0) { overrideParameters = null; }
            var postBody = {
                overrideParameters: common.extend(metadata("SP.RenderListDataOverrideParameters"), overrideParameters),
                parameters: common.extend(metadata("SP.RenderListDataParameters"), parameters),
            };
            return this.clone(List, "RenderListDataAsStream", true).postCore({
                body: common.jsS(postBody),
            });
        };
        /**
         * Gets the field values and field schema attributes for a list item.
         */
        List.prototype.renderListFormData = function (itemId, formId, mode) {
            return this.clone(List, "renderlistformdata(itemid=" + itemId + ", formid='" + formId + "', mode='" + mode + "')").postCore().then(function (data) {
                // data will be a string, so we parse it again
                data = JSON.parse(data);
                if (common.hOP(data, "ListData")) {
                    return data.ListData;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Reserves a list item ID for idempotent list item creation.
         */
        List.prototype.reserveListItemId = function () {
            return this.clone(List, "reservelistitemid").postCore().then(function (data) {
                if (common.hOP(data, "ReserveListItemId")) {
                    return data.ReserveListItemId;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Returns the ListItemEntityTypeFullName for this list, used when adding/updating list items. Does not support batching.
         *
         */
        List.prototype.getListItemEntityTypeFullName = function () {
            return this.clone(List, null, false).select("ListItemEntityTypeFullName").get().then(function (o) { return o.ListItemEntityTypeFullName; });
        };
        /**
         * Creates an item using path (in a folder), validates and sets its field values.
         *
         * @param formValues The fields to change and their new values.
         * @param decodedUrl Path decoded url; folder's server relative path.
         * @param bNewDocumentUpdate true if the list item is a document being updated after upload; otherwise false.
         * @param checkInComment Optional check in comment.
         */
        List.prototype.addValidateUpdateItemUsingPath = function (formValues, decodedUrl, bNewDocumentUpdate, checkInComment) {
            if (bNewDocumentUpdate === void 0) { bNewDocumentUpdate = false; }
            return this.clone(List, "AddValidateUpdateItemUsingPath()").postCore({
                body: common.jsS({
                    bNewDocumentUpdate: bNewDocumentUpdate,
                    checkInComment: checkInComment,
                    formValues: formValues,
                    listItemCreateInfo: {
                        FolderPath: {
                            DecodedUrl: decodedUrl,
                            __metadata: { type: "SP.ResourcePath" },
                        },
                        __metadata: { type: "SP.ListItemCreationInformationUsingPath" },
                    },
                }),
            }).then(function (res) {
                if (typeof res.AddValidateUpdateItemUsingPath !== "undefined") {
                    return res.AddValidateUpdateItemUsingPath.results;
                }
                return res;
            });
        };
        return List;
    }(SharePointQueryableSecurable));

    /**
     * Represents a Collection of comments
     */
    var Comments = /** @class */ (function (_super) {
        tslib_1.__extends(Comments, _super);
        function Comments() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(Comment);
            return _this;
        }
        Comments_1 = Comments;
        /**
         * Adds a new comment to this collection
         *
         * @param info Comment information to add
         */
        Comments.prototype.add = function (info) {
            var _this = this;
            if (typeof info === "string") {
                info = { text: info };
            }
            var postBody = common.jsS(common.extend(metadata("Microsoft.SharePoint.Comments.comment"), info));
            return this.clone(Comments_1, null).postCore({ body: postBody }).then(function (d) {
                return common.extend(_this.getById(d.id), d);
            });
        };
        /**
         * Deletes all the comments in this collection
         */
        Comments.prototype.clear = function () {
            return this.clone(Comments_1, "DeleteAll").postCore();
        };
        Comments = Comments_1 = tslib_1.__decorate([
            defaultPath("comments")
        ], Comments);
        return Comments;
        var Comments_1;
    }(SharePointQueryableCollection));
    /**
     * Represents a comment
     */
    var Comment = /** @class */ (function (_super) {
        tslib_1.__extends(Comment, _super);
        function Comment() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(Comment.prototype, "replies", {
            get: function () {
                return new Replies(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Likes the comment as the current user
         */
        Comment.prototype.like = function () {
            return this.clone(Comment, "Like").postCore();
        };
        /**
         * Unlikes the comment as the current user
         */
        Comment.prototype.unlike = function () {
            return this.clone(Comment, "Unlike").postCore();
        };
        /**
         * Deletes this comment
         */
        Comment.prototype.delete = function () {
            return this.clone(Comment, "DeleteComment").postCore();
        };
        return Comment;
    }(SharePointQueryableInstance));
    /**
     * Represents a Collection of comments
     */
    var Replies = /** @class */ (function (_super) {
        tslib_1.__extends(Replies, _super);
        function Replies() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Replies_1 = Replies;
        /**
         * Adds a new reply to this collection
         *
         * @param info Comment information to add
         */
        Replies.prototype.add = function (info) {
            if (typeof info === "string") {
                info = { text: info };
            }
            var postBody = common.jsS(common.extend(metadata("Microsoft.SharePoint.Comments.comment"), info));
            return this.clone(Replies_1, null).postCore({ body: postBody }).then(function (d) {
                return common.extend(new Comment(odataUrlFrom(d)), d);
            });
        };
        Replies = Replies_1 = tslib_1.__decorate([
            defaultPath("replies")
        ], Replies);
        return Replies;
        var Replies_1;
    }(SharePointQueryableCollection));

    /**
     * Describes a collection of Item objects
     *
     */
    var Items = /** @class */ (function (_super) {
        tslib_1.__extends(Items, _super);
        function Items() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(Item);
            return _this;
        }
        Items_1 = Items;
        /**
         * Gets BCS Item by string id
         *
         * @param stringId The string id of the BCS item to retrieve
         */
        Items.prototype.getItemByStringId = function (stringId) {
            // creates an item with the parent list path and append out method call
            return new Item(this.parentUrl, "getItemByStringId('" + stringId + "')");
        };
        /**
         * Skips the specified number of items (https://msdn.microsoft.com/en-us/library/office/fp142385.aspx#sectionSection6)
         *
         * @param skip The starting id where the page should start, use with top to specify pages
         * @param reverse It true the PagedPrev=true parameter is added allowing backwards navigation in the collection
         */
        Items.prototype.skip = function (skip, reverse) {
            if (reverse === void 0) { reverse = false; }
            if (reverse) {
                this.query.set("$skiptoken", encodeURIComponent("Paged=TRUE&PagedPrev=TRUE&p_ID=" + skip));
            }
            else {
                this.query.set("$skiptoken", encodeURIComponent("Paged=TRUE&p_ID=" + skip));
            }
            return this;
        };
        /**
         * Gets a collection designed to aid in paging through data
         *
         */
        Items.prototype.getPaged = function () {
            return this.get(new PagedItemCollectionParser(this));
        };
        /**
         * Gets all the items in a list, regardless of count. Does not support batching or caching
         *
         *  @param requestSize Number of items to return in each request (Default: 2000)
         *  @param acceptHeader Allows for setting the value of the Accept header for SP 2013 support
         */
        Items.prototype.getAll = function (requestSize, acceptHeader) {
            if (requestSize === void 0) { requestSize = 2000; }
            if (acceptHeader === void 0) { acceptHeader = "application/json;odata=nometadata"; }
            logging.Logger.write("Calling items.getAll should be done sparingly. Ensure this is the correct choice. If you are unsure, it is not.", 2 /* Warning */);
            // this will be used for the actual query
            // and we set no metadata here to try and reduce traffic
            var items = new Items_1(this, "").top(requestSize).configure({
                headers: {
                    "Accept": acceptHeader,
                },
            });
            // let's copy over the odata query params that can be applied
            // $top - allow setting the page size this way (override what we did above)
            // $select - allow picking the return fields (good behavior)
            // $filter - allow setting a filter, though this may fail due for large lists
            this.query.forEach(function (v, k) {
                if (/^[\$select|\$filter|\$top|\$expand]$/i.test(k)) {
                    items.query.set(k, v);
                }
            });
            // give back the promise
            return new Promise(function (resolve, reject) {
                // this will eventually hold the items we return
                var itemsCollector = [];
                // action that will gather up our results recursively
                var gatherer = function (last) {
                    // collect that set of results
                    [].push.apply(itemsCollector, last.results);
                    // if we have more, repeat - otherwise resolve with the collected items
                    if (last.hasNext) {
                        last.getNext().then(gatherer).catch(reject);
                    }
                    else {
                        resolve(itemsCollector);
                    }
                };
                // start the cycle
                items.getPaged().then(gatherer).catch(reject);
            });
        };
        /**
         * Adds a new item to the collection
         *
         * @param properties The new items's properties
         * @param listItemEntityTypeFullName The type name of the list's entities
         */
        Items.prototype.add = function (properties, listItemEntityTypeFullName) {
            var _this = this;
            if (properties === void 0) { properties = {}; }
            if (listItemEntityTypeFullName === void 0) { listItemEntityTypeFullName = null; }
            var removeDependency = this.addBatchDependency();
            return this.ensureListItemEntityTypeName(listItemEntityTypeFullName).then(function (listItemEntityType) {
                var postBody = common.jsS(common.extend(metadata(listItemEntityType), properties));
                var promise = _this.clone(Items_1, "").postCore({ body: postBody }).then(function (data) {
                    return {
                        data: data,
                        item: _this.getById(data.Id),
                    };
                });
                removeDependency();
                return promise;
            });
        };
        /**
         * Ensures we have the proper list item entity type name, either from the value provided or from the list
         *
         * @param candidatelistItemEntityTypeFullName The potential type name
         */
        Items.prototype.ensureListItemEntityTypeName = function (candidatelistItemEntityTypeFullName) {
            return candidatelistItemEntityTypeFullName ?
                Promise.resolve(candidatelistItemEntityTypeFullName) :
                this.getParent(List).getListItemEntityTypeFullName();
        };
        Items = Items_1 = tslib_1.__decorate([
            defaultPath("items")
        ], Items);
        return Items;
        var Items_1;
    }(SharePointQueryableCollection));
    /**
     * Descrines a single Item instance
     *
     */
    var Item = /** @class */ (function (_super) {
        tslib_1.__extends(Item, _super);
        function Item() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Delete this item
             *
             * @param eTag Value used in the IF-Match header, by default "*"
             */
            _this.delete = _this._deleteWithETag;
            return _this;
        }
        Object.defineProperty(Item.prototype, "attachmentFiles", {
            /**
             * Gets the set of attachments for this item
             *
             */
            get: function () {
                return new AttachmentFiles(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "contentType", {
            /**
             * Gets the content type for this item
             *
             */
            get: function () {
                return new ContentType(this, "ContentType");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "comments", {
            /**
             * Gets the collection of comments associated with this list item
             */
            get: function () {
                return new Comments(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "effectiveBasePermissions", {
            /**
             * Gets the effective base permissions for the item
             *
             */
            get: function () {
                return new SharePointQueryable(this, "EffectiveBasePermissions");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "effectiveBasePermissionsForUI", {
            /**
             * Gets the effective base permissions for the item in a UI context
             *
             */
            get: function () {
                return new SharePointQueryable(this, "EffectiveBasePermissionsForUI");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "fieldValuesAsHTML", {
            /**
             * Gets the field values for this list item in their HTML representation
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "FieldValuesAsHTML");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "fieldValuesAsText", {
            /**
             * Gets the field values for this list item in their text representation
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "FieldValuesAsText");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "fieldValuesForEdit", {
            /**
             * Gets the field values for this list item for use in editing controls
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "FieldValuesForEdit");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "folder", {
            /**
             * Gets the folder associated with this list item (if this item represents a folder)
             *
             */
            get: function () {
                return new Folder(this, "folder");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "file", {
            /**
             * Gets the folder associated with this list item (if this item represents a folder)
             *
             */
            get: function () {
                return new File(this, "file");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Item.prototype, "versions", {
            /**
             * Gets the collection of versions associated with this item
             */
            get: function () {
                return new ItemVersions(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Updates this list intance with the supplied properties
         *
         * @param properties A plain object hash of values to update for the list
         * @param eTag Value used in the IF-Match header, by default "*"
         * @param listItemEntityTypeFullName The type name of the list's entities
         */
        Item.prototype.update = function (properties, eTag, listItemEntityTypeFullName) {
            var _this = this;
            if (eTag === void 0) { eTag = "*"; }
            if (listItemEntityTypeFullName === void 0) { listItemEntityTypeFullName = null; }
            return new Promise(function (resolve, reject) {
                var removeDependency = _this.addBatchDependency();
                return _this.ensureListItemEntityTypeName(listItemEntityTypeFullName).then(function (listItemEntityType) {
                    var postBody = common.jsS(common.extend(metadata(listItemEntityType), properties));
                    removeDependency();
                    return _this.postCore({
                        body: postBody,
                        headers: {
                            "IF-Match": eTag,
                            "X-HTTP-Method": "MERGE",
                        },
                    }, new ItemUpdatedParser()).then(function (data) {
                        resolve({
                            data: data,
                            item: _this,
                        });
                    });
                }).catch(function (e) { return reject(e); });
            });
        };
        /**
         * Gets the collection of people who have liked this item
         */
        Item.prototype.getLikedBy = function () {
            return this.clone(Item, "likedBy").postCore();
        };
        /**
         * Likes this item as the current user
         */
        Item.prototype.like = function () {
            return this.clone(Item, "like").postCore();
        };
        /**
         * Unlikes this item as the current user
         */
        Item.prototype.unlike = function () {
            return this.clone(Item, "unlike").postCore();
        };
        /**
         * Moves the list item to the Recycle Bin and returns the identifier of the new Recycle Bin item.
         */
        Item.prototype.recycle = function () {
            return this.clone(Item, "recycle").postCore();
        };
        /**
         * Gets a string representation of the full URL to the WOPI frame.
         * If there is no associated WOPI application, or no associated action, an empty string is returned.
         *
         * @param action Display mode: 0: view, 1: edit, 2: mobileView, 3: interactivePreview
         */
        Item.prototype.getWopiFrameUrl = function (action) {
            if (action === void 0) { action = 0; }
            var i = this.clone(Item, "getWOPIFrameUrl(@action)");
            i.query.set("@action", action);
            return i.postCore().then(function (data) {
                // handle verbose mode
                if (common.hOP(data, "GetWOPIFrameUrl")) {
                    return data.GetWOPIFrameUrl;
                }
                return data;
            });
        };
        /**
         * Validates and sets the values of the specified collection of fields for the list item.
         *
         * @param formValues The fields to change and their new values.
         * @param newDocumentUpdate true if the list item is a document being updated after upload; otherwise false.
         */
        Item.prototype.validateUpdateListItem = function (formValues, newDocumentUpdate) {
            if (newDocumentUpdate === void 0) { newDocumentUpdate = false; }
            return this.clone(Item, "validateupdatelistitem").postCore({
                body: common.jsS({ "formValues": formValues, bNewDocumentUpdate: newDocumentUpdate }),
            });
        };
        /**
         * Ensures we have the proper list item entity type name, either from the value provided or from the list
         *
         * @param candidatelistItemEntityTypeFullName The potential type name
         */
        Item.prototype.ensureListItemEntityTypeName = function (candidatelistItemEntityTypeFullName) {
            return candidatelistItemEntityTypeFullName ?
                Promise.resolve(candidatelistItemEntityTypeFullName) :
                this.getParent(List, this.parentUrl.substr(0, this.parentUrl.lastIndexOf("/"))).getListItemEntityTypeFullName();
        };
        return Item;
    }(SharePointQueryableShareableItem));
    /**
     * Describes a collection of Version objects
     *
     */
    var ItemVersions = /** @class */ (function (_super) {
        tslib_1.__extends(ItemVersions, _super);
        function ItemVersions() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(ItemVersion);
            return _this;
        }
        ItemVersions = tslib_1.__decorate([
            defaultPath("versions")
        ], ItemVersions);
        return ItemVersions;
    }(SharePointQueryableCollection));
    /**
     * Describes a single Version instance
     *
     */
    var ItemVersion = /** @class */ (function (_super) {
        tslib_1.__extends(ItemVersion, _super);
        function ItemVersion() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
            * Delete a specific version of a file.
            *
            * @param eTag Value used in the IF-Match header, by default "*"
            */
            _this.delete = _this._deleteWithETag;
            return _this;
        }
        return ItemVersion;
    }(SharePointQueryableInstance));
    /**
     * Provides paging functionality for list items
     */
    var PagedItemCollection = /** @class */ (function () {
        function PagedItemCollection(parent, nextUrl, results) {
            this.parent = parent;
            this.nextUrl = nextUrl;
            this.results = results;
        }
        Object.defineProperty(PagedItemCollection.prototype, "hasNext", {
            /**
             * If true there are more results available in the set, otherwise there are not
             */
            get: function () {
                return typeof this.nextUrl === "string" && this.nextUrl.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets the next set of results, or resolves to null if no results are available
         */
        PagedItemCollection.prototype.getNext = function () {
            if (this.hasNext) {
                var items = new Items(this.nextUrl, null).configureFrom(this.parent);
                return items.getPaged();
            }
            return new Promise(function (r) { return r(null); });
        };
        return PagedItemCollection;
    }());
    var PagedItemCollectionParser = /** @class */ (function (_super) {
        tslib_1.__extends(PagedItemCollectionParser, _super);
        function PagedItemCollectionParser(_parent) {
            var _this = _super.call(this) || this;
            _this._parent = _parent;
            return _this;
        }
        PagedItemCollectionParser.prototype.parse = function (r) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (_this.handleError(r, reject)) {
                    r.json().then(function (json) {
                        var nextUrl = common.hOP(json, "d") && common.hOP(json.d, "__next") ? json.d.__next : json["odata.nextLink"];
                        resolve(new PagedItemCollection(_this._parent, nextUrl, _this.parseODataJSON(json)));
                    });
                }
            });
        };
        return PagedItemCollectionParser;
    }(odata.ODataParserBase));
    var ItemUpdatedParser = /** @class */ (function (_super) {
        tslib_1.__extends(ItemUpdatedParser, _super);
        function ItemUpdatedParser() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ItemUpdatedParser.prototype.parse = function (r) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (_this.handleError(r, reject)) {
                    resolve({
                        "odata.etag": r.headers.get("etag"),
                    });
                }
            });
        };
        return ItemUpdatedParser;
    }(odata.ODataParserBase));

    /**
     * Describes a collection of File objects
     *
     */
    var Files = /** @class */ (function (_super) {
        tslib_1.__extends(Files, _super);
        function Files() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Files_1 = Files;
        /**
         * Gets a File by filename
         *
         * @param name The name of the file, including extension.
         */
        Files.prototype.getByName = function (name) {
            var f = new File(this);
            f.concat("('" + name + "')");
            return f;
        };
        /**
         * Uploads a file. Not supported for batching
         *
         * @param url The folder-relative url of the file.
         * @param content The file contents blob.
         * @param shouldOverWrite Should a file with the same name in the same location be overwritten? (default: true)
         * @returns The new File and the raw response.
         */
        Files.prototype.add = function (url, content, shouldOverWrite) {
            var _this = this;
            if (shouldOverWrite === void 0) { shouldOverWrite = true; }
            return new Files_1(this, "add(overwrite=" + shouldOverWrite + ",url='" + url + "')")
                .postCore({
                body: content,
            }).then(function (response) {
                return {
                    data: response,
                    file: _this.getByName(url),
                };
            });
        };
        /**
         * Uploads a file. Not supported for batching
         *
         * @param url The folder-relative url of the file.
         * @param content The Blob file content to add
         * @param progress A callback function which can be used to track the progress of the upload
         * @param shouldOverWrite Should a file with the same name in the same location be overwritten? (default: true)
         * @param chunkSize The size of each file slice, in bytes (default: 10485760)
         * @returns The new File and the raw response.
         */
        Files.prototype.addChunked = function (url, content, progress, shouldOverWrite, chunkSize) {
            var _this = this;
            if (shouldOverWrite === void 0) { shouldOverWrite = true; }
            if (chunkSize === void 0) { chunkSize = 10485760; }
            var adder = this.clone(Files_1, "add(overwrite=" + shouldOverWrite + ",url='" + url + "')", false);
            return adder.postCore()
                .then(function () { return _this.getByName(url); })
                .then(function (file) { return file.setContentChunked(content, progress, chunkSize); });
        };
        /**
         * Adds a ghosted file to an existing list or document library. Not supported for batching.
         *
         * @param fileUrl The server-relative url where you want to save the file.
         * @param templateFileType The type of use to create the file.
         * @returns The template file that was added and the raw response.
         */
        Files.prototype.addTemplateFile = function (fileUrl, templateFileType) {
            var _this = this;
            return this.clone(Files_1, "addTemplateFile(urloffile='" + fileUrl + "',templatefiletype=" + templateFileType + ")", false)
                .postCore().then(function (response) {
                return {
                    data: response,
                    file: _this.getByName(fileUrl),
                };
            });
        };
        Files = Files_1 = tslib_1.__decorate([
            defaultPath("files")
        ], Files);
        return Files;
        var Files_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single File instance
     *
     */
    var File = /** @class */ (function (_super) {
        tslib_1.__extends(File, _super);
        function File() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(File.prototype, "listItemAllFields", {
            /**
             * Gets a value that specifies the list item field values for the list item corresponding to the file.
             *
             */
            get: function () {
                return new SharePointQueryableInstance(this, "listItemAllFields");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(File.prototype, "versions", {
            /**
             * Gets a collection of versions
             *
             */
            get: function () {
                return new Versions(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Approves the file submitted for content approval with the specified comment.
         * Only documents in lists that are enabled for content approval can be approved.
         *
         * @param comment The comment for the approval.
         */
        File.prototype.approve = function (comment) {
            if (comment === void 0) { comment = ""; }
            return this.clone(File, "approve(comment='" + comment + "')").postCore();
        };
        /**
         * Stops the chunk upload session without saving the uploaded data. Does not support batching.
         * If the file doesn’t already exist in the library, the partially uploaded file will be deleted.
         * Use this in response to user action (as in a request to cancel an upload) or an error or exception.
         * Use the uploadId value that was passed to the StartUpload method that started the upload session.
         * This method is currently available only on Office 365.
         *
         * @param uploadId The unique identifier of the upload session.
         */
        File.prototype.cancelUpload = function (uploadId) {
            return this.clone(File, "cancelUpload(uploadId=guid'" + uploadId + "')", false).postCore();
        };
        /**
         * Checks the file in to a document library based on the check-in type.
         *
         * @param comment A comment for the check-in. Its length must be <= 1023.
         * @param checkinType The check-in type for the file.
         */
        File.prototype.checkin = function (comment, checkinType) {
            if (comment === void 0) { comment = ""; }
            if (checkinType === void 0) { checkinType = exports.CheckinType.Major; }
            if (comment.length > 1023) {
                throw new Error("The maximum comment length is 1023 characters.");
            }
            return this.clone(File, "checkin(comment='" + comment + "',checkintype=" + checkinType + ")").postCore();
        };
        /**
         * Checks out the file from a document library.
         */
        File.prototype.checkout = function () {
            return this.clone(File, "checkout").postCore();
        };
        /**
         * Copies the file to the destination url.
         *
         * @param url The absolute url or server relative url of the destination file path to copy to.
         * @param shouldOverWrite Should a file with the same name in the same location be overwritten?
         */
        File.prototype.copyTo = function (url, shouldOverWrite) {
            if (shouldOverWrite === void 0) { shouldOverWrite = true; }
            return this.clone(File, "copyTo(strnewurl='" + url + "',boverwrite=" + shouldOverWrite + ")").postCore();
        };
        /**
         * Delete this file.
         *
         * @param eTag Value used in the IF-Match header, by default "*"
         */
        File.prototype.delete = function (eTag) {
            if (eTag === void 0) { eTag = "*"; }
            return this.clone(File, null).postCore({
                headers: {
                    "IF-Match": eTag,
                    "X-HTTP-Method": "DELETE",
                },
            });
        };
        /**
         * Denies approval for a file that was submitted for content approval.
         * Only documents in lists that are enabled for content approval can be denied.
         *
         * @param comment The comment for the denial.
         */
        File.prototype.deny = function (comment) {
            if (comment === void 0) { comment = ""; }
            if (comment.length > 1023) {
                throw new Error("The maximum comment length is 1023 characters.");
            }
            return this.clone(File, "deny(comment='" + comment + "')").postCore();
        };
        /**
         * Specifies the control set used to access, modify, or add Web Parts associated with this Web Part Page and view.
         * An exception is thrown if the file is not an ASPX page.
         *
         * @param scope The WebPartsPersonalizationScope view on the Web Parts page.
         */
        File.prototype.getLimitedWebPartManager = function (scope) {
            if (scope === void 0) { scope = exports.WebPartsPersonalizationScope.Shared; }
            return new LimitedWebPartManager(this, "getLimitedWebPartManager(scope=" + scope + ")");
        };
        /**
         * Moves the file to the specified destination url.
         *
         * @param url The absolute url or server relative url of the destination file path to move to.
         * @param moveOperations The bitwise MoveOperations value for how to move the file.
         */
        File.prototype.moveTo = function (url, moveOperations) {
            if (moveOperations === void 0) { moveOperations = exports.MoveOperations.Overwrite; }
            return this.clone(File, "moveTo(newurl='" + url + "',flags=" + moveOperations + ")").postCore();
        };
        /**
         * Submits the file for content approval with the specified comment.
         *
         * @param comment The comment for the published file. Its length must be <= 1023.
         */
        File.prototype.publish = function (comment) {
            if (comment === void 0) { comment = ""; }
            if (comment.length > 1023) {
                throw new Error("The maximum comment length is 1023 characters.");
            }
            return this.clone(File, "publish(comment='" + comment + "')").postCore();
        };
        /**
         * Moves the file to the Recycle Bin and returns the identifier of the new Recycle Bin item.
         *
         * @returns The GUID of the recycled file.
         */
        File.prototype.recycle = function () {
            return this.clone(File, "recycle").postCore();
        };
        /**
         * Reverts an existing checkout for the file.
         *
         */
        File.prototype.undoCheckout = function () {
            return this.clone(File, "undoCheckout").postCore();
        };
        /**
         * Removes the file from content approval or unpublish a major version.
         *
         * @param comment The comment for the unpublish operation. Its length must be <= 1023.
         */
        File.prototype.unpublish = function (comment) {
            if (comment === void 0) { comment = ""; }
            if (comment.length > 1023) {
                throw new Error("The maximum comment length is 1023 characters.");
            }
            return this.clone(File, "unpublish(comment='" + comment + "')").postCore();
        };
        /**
         * Gets the contents of the file as text. Not supported in batching.
         *
         */
        File.prototype.getText = function () {
            return this.clone(File, "$value", false).get(new odata.TextParser(), { headers: { "binaryStringResponseBody": "true" } });
        };
        /**
         * Gets the contents of the file as a blob, does not work in Node.js. Not supported in batching.
         *
         */
        File.prototype.getBlob = function () {
            return this.clone(File, "$value", false).get(new odata.BlobParser(), { headers: { "binaryStringResponseBody": "true" } });
        };
        /**
         * Gets the contents of a file as an ArrayBuffer, works in Node.js. Not supported in batching.
         */
        File.prototype.getBuffer = function () {
            return this.clone(File, "$value", false).get(new odata.BufferParser(), { headers: { "binaryStringResponseBody": "true" } });
        };
        /**
         * Gets the contents of a file as an ArrayBuffer, works in Node.js. Not supported in batching.
         */
        File.prototype.getJSON = function () {
            return this.clone(File, "$value", false).get(new odata.JSONParser(), { headers: { "binaryStringResponseBody": "true" } });
        };
        /**
         * Sets the content of a file, for large files use setContentChunked. Not supported in batching.
         *
         * @param content The file content
         *
         */
        File.prototype.setContent = function (content) {
            var _this = this;
            return this.clone(File, "$value", false).postCore({
                body: content,
                headers: {
                    "X-HTTP-Method": "PUT",
                },
            }).then(function (_) { return new File(_this); });
        };
        /**
         * Gets the associated list item for this folder, loading the default properties
         */
        File.prototype.getItem = function () {
            var selects = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                selects[_i] = arguments[_i];
            }
            var q = this.listItemAllFields;
            return q.select.apply(q, selects).get().then(function (d) {
                return common.extend(new Item(odataUrlFrom(d)), d);
            });
        };
        /**
         * Sets the contents of a file using a chunked upload approach. Not supported in batching.
         *
         * @param file The file to upload
         * @param progress A callback function which can be used to track the progress of the upload
         * @param chunkSize The size of each file slice, in bytes (default: 10485760)
         */
        File.prototype.setContentChunked = function (file, progress, chunkSize) {
            var _this = this;
            if (chunkSize === void 0) { chunkSize = 10485760; }
            if (progress === undefined) {
                progress = function () { return null; };
            }
            var fileSize = file.size;
            var blockCount = parseInt((file.size / chunkSize).toString(), 10) + ((file.size % chunkSize === 0) ? 1 : 0);
            var uploadId = common.getGUID();
            // start the chain with the first fragment
            progress({ uploadId: uploadId, blockNumber: 1, chunkSize: chunkSize, currentPointer: 0, fileSize: fileSize, stage: "starting", totalBlocks: blockCount });
            var chain = this.startUpload(uploadId, file.slice(0, chunkSize));
            var _loop_1 = function (i) {
                chain = chain.then(function (pointer) {
                    progress({ uploadId: uploadId, blockNumber: i, chunkSize: chunkSize, currentPointer: pointer, fileSize: fileSize, stage: "continue", totalBlocks: blockCount });
                    return _this.continueUpload(uploadId, pointer, file.slice(pointer, pointer + chunkSize));
                });
            };
            // skip the first and last blocks
            for (var i = 2; i < blockCount; i++) {
                _loop_1(i);
            }
            return chain.then(function (pointer) {
                progress({ uploadId: uploadId, blockNumber: blockCount, chunkSize: chunkSize, currentPointer: pointer, fileSize: fileSize, stage: "finishing", totalBlocks: blockCount });
                return _this.finishUpload(uploadId, pointer, file.slice(pointer));
            });
        };
        /**
         * Starts a new chunk upload session and uploads the first fragment.
         * The current file content is not changed when this method completes.
         * The method is idempotent (and therefore does not change the result) as long as you use the same values for uploadId and stream.
         * The upload session ends either when you use the CancelUpload method or when you successfully
         * complete the upload session by passing the rest of the file contents through the ContinueUpload and FinishUpload methods.
         * The StartUpload and ContinueUpload methods return the size of the running total of uploaded data in bytes,
         * so you can pass those return values to subsequent uses of ContinueUpload and FinishUpload.
         * This method is currently available only on Office 365.
         *
         * @param uploadId The unique identifier of the upload session.
         * @param fragment The file contents.
         * @returns The size of the total uploaded data in bytes.
         */
        File.prototype.startUpload = function (uploadId, fragment) {
            return this.clone(File, "startUpload(uploadId=guid'" + uploadId + "')", false)
                .postCore({ body: fragment })
                .then(function (n) {
                // When OData=verbose the payload has the following shape:
                // { StartUpload: "10485760" }
                if (typeof n === "object") {
                    n = n.StartUpload;
                }
                return parseFloat(n);
            });
        };
        /**
         * Continues the chunk upload session with an additional fragment.
         * The current file content is not changed.
         * Use the uploadId value that was passed to the StartUpload method that started the upload session.
         * This method is currently available only on Office 365.
         *
         * @param uploadId The unique identifier of the upload session.
         * @param fileOffset The size of the offset into the file where the fragment starts.
         * @param fragment The file contents.
         * @returns The size of the total uploaded data in bytes.
         */
        File.prototype.continueUpload = function (uploadId, fileOffset, fragment) {
            return this.clone(File, "continueUpload(uploadId=guid'" + uploadId + "',fileOffset=" + fileOffset + ")", false)
                .postCore({ body: fragment })
                .then(function (n) {
                // When OData=verbose the payload has the following shape:
                // { ContinueUpload: "20971520" }
                if (typeof n === "object") {
                    n = n.ContinueUpload;
                }
                return parseFloat(n);
            });
        };
        /**
         * Uploads the last file fragment and commits the file. The current file content is changed when this method completes.
         * Use the uploadId value that was passed to the StartUpload method that started the upload session.
         * This method is currently available only on Office 365.
         *
         * @param uploadId The unique identifier of the upload session.
         * @param fileOffset The size of the offset into the file where the fragment starts.
         * @param fragment The file contents.
         * @returns The newly uploaded file.
         */
        File.prototype.finishUpload = function (uploadId, fileOffset, fragment) {
            return this.clone(File, "finishUpload(uploadId=guid'" + uploadId + "',fileOffset=" + fileOffset + ")", false)
                .postCore({ body: fragment })
                .then(function (response) {
                return {
                    data: response,
                    file: new File(odataUrlFrom(response)),
                };
            });
        };
        return File;
    }(SharePointQueryableShareableFile));
    /**
     * Describes a collection of Version objects
     *
     */
    var Versions = /** @class */ (function (_super) {
        tslib_1.__extends(Versions, _super);
        function Versions() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(Version);
            return _this;
        }
        Versions_1 = Versions;
        /**
         * Deletes all the file version objects in the collection.
         *
         */
        Versions.prototype.deleteAll = function () {
            return new Versions_1(this, "deleteAll").postCore();
        };
        /**
         * Deletes the specified version of the file.
         *
         * @param versionId The ID of the file version to delete.
         */
        Versions.prototype.deleteById = function (versionId) {
            return this.clone(Versions_1, "deleteById(vid=" + versionId + ")").postCore();
        };
        /**
         * Recycles the specified version of the file.
         *
         * @param versionId The ID of the file version to delete.
         */
        Versions.prototype.recycleByID = function (versionId) {
            return this.clone(Versions_1, "recycleByID(vid=" + versionId + ")").postCore();
        };
        /**
         * Deletes the file version object with the specified version label.
         *
         * @param label The version label of the file version to delete, for example: 1.2
         */
        Versions.prototype.deleteByLabel = function (label) {
            return this.clone(Versions_1, "deleteByLabel(versionlabel='" + label + "')").postCore();
        };
        /**
         * Recycles the file version object with the specified version label.
         *
         * @param label The version label of the file version to delete, for example: 1.2
         */
        Versions.prototype.recycleByLabel = function (label) {
            return this.clone(Versions_1, "recycleByLabel(versionlabel='" + label + "')").postCore();
        };
        /**
         * Creates a new file version from the file specified by the version label.
         *
         * @param label The version label of the file version to restore, for example: 1.2
         */
        Versions.prototype.restoreByLabel = function (label) {
            return this.clone(Versions_1, "restoreByLabel(versionlabel='" + label + "')").postCore();
        };
        Versions = Versions_1 = tslib_1.__decorate([
            defaultPath("versions")
        ], Versions);
        return Versions;
        var Versions_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a single Version instance
     *
     */
    var Version = /** @class */ (function (_super) {
        tslib_1.__extends(Version, _super);
        function Version() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
            * Delete a specific version of a file.
            *
            * @param eTag Value used in the IF-Match header, by default "*"
            */
            _this.delete = _this._deleteWithETag;
            return _this;
            // /**
            // * Delete a specific version of a file.
            // *
            // * @param eTag Value used in the IF-Match header, by default "*"
            // */
            // public delete(eTag = "*"): Promise<void> {
            //     return this.postCore({
            //         headers: {
            //             "IF-Match": eTag,
            //             "X-HTTP-Method": "DELETE",
            //         },
            //     });
            // }
        }
        return Version;
    }(SharePointQueryableInstance));
    (function (CheckinType) {
        CheckinType[CheckinType["Minor"] = 0] = "Minor";
        CheckinType[CheckinType["Major"] = 1] = "Major";
        CheckinType[CheckinType["Overwrite"] = 2] = "Overwrite";
    })(exports.CheckinType || (exports.CheckinType = {}));
    (function (WebPartsPersonalizationScope) {
        WebPartsPersonalizationScope[WebPartsPersonalizationScope["User"] = 0] = "User";
        WebPartsPersonalizationScope[WebPartsPersonalizationScope["Shared"] = 1] = "Shared";
    })(exports.WebPartsPersonalizationScope || (exports.WebPartsPersonalizationScope = {}));
    (function (MoveOperations) {
        MoveOperations[MoveOperations["Overwrite"] = 1] = "Overwrite";
        MoveOperations[MoveOperations["AllowBrokenThickets"] = 8] = "AllowBrokenThickets";
    })(exports.MoveOperations || (exports.MoveOperations = {}));
    (function (TemplateFileType) {
        TemplateFileType[TemplateFileType["StandardPage"] = 0] = "StandardPage";
        TemplateFileType[TemplateFileType["WikiPage"] = 1] = "WikiPage";
        TemplateFileType[TemplateFileType["FormPage"] = 2] = "FormPage";
        TemplateFileType[TemplateFileType["ClientSidePage"] = 3] = "ClientSidePage";
    })(exports.TemplateFileType || (exports.TemplateFileType = {}));

    /**
     * Represents an app catalog
     */
    var AppCatalog = /** @class */ (function (_super) {
        tslib_1.__extends(AppCatalog, _super);
        function AppCatalog(baseUrl, path) {
            if (path === void 0) { path = "_api/web/tenantappcatalog/AvailableApps"; }
            return _super.call(this, extractWebUrl(typeof baseUrl === "string" ? baseUrl : baseUrl.toUrl()), path) || this;
        }
        /**
         * Get details of specific app from the app catalog
         * @param id - Specify the guid of the app
         */
        AppCatalog.prototype.getAppById = function (id) {
            return new App(this, "getById('" + id + "')");
        };
        /**
         * Uploads an app package. Not supported for batching
         *
         * @param filename Filename to create.
         * @param content app package data (eg: the .app or .sppkg file).
         * @param shouldOverWrite Should an app with the same name in the same location be overwritten? (default: true)
         * @returns Promise<AppAddResult>
         */
        AppCatalog.prototype.add = function (filename, content, shouldOverWrite) {
            if (shouldOverWrite === void 0) { shouldOverWrite = true; }
            // you don't add to the availableapps collection
            var adder = new AppCatalog(extractWebUrl(this.toUrl()), "_api/web/tenantappcatalog/add(overwrite=" + shouldOverWrite + ",url='" + filename + "')");
            return adder.postCore({
                body: content,
            }).then(function (r) {
                return {
                    data: r,
                    file: new File(odataUrlFrom(r)),
                };
            });
        };
        return AppCatalog;
    }(SharePointQueryableCollection));
    /**
     * Represents the actions you can preform on a given app within the catalog
     */
    var App = /** @class */ (function (_super) {
        tslib_1.__extends(App, _super);
        function App() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * This method deploys an app on the app catalog.  It must be called in the context
         * of the tenant app catalog web or it will fail.
         */
        App.prototype.deploy = function () {
            return this.clone(App, "Deploy").postCore();
        };
        /**
         * This method retracts a deployed app on the app catalog.  It must be called in the context
         * of the tenant app catalog web or it will fail.
         */
        App.prototype.retract = function () {
            return this.clone(App, "Retract").postCore();
        };
        /**
         * This method allows an app which is already deployed to be installed on a web
         */
        App.prototype.install = function () {
            return this.clone(App, "Install").postCore();
        };
        /**
         * This method allows an app which is already insatlled to be uninstalled on a web
         */
        App.prototype.uninstall = function () {
            return this.clone(App, "Uninstall").postCore();
        };
        /**
         * This method allows an app which is already insatlled to be upgraded on a web
         */
        App.prototype.upgrade = function () {
            return this.clone(App, "Upgrade").postCore();
        };
        /**
         * This method removes an app from the app catalog.  It must be called in the context
         * of the tenant app catalog web or it will fail.
         */
        App.prototype.remove = function () {
            return this.clone(App, "Remove").postCore();
        };
        return App;
    }(SharePointQueryableInstance));

    (function (PromotedState) {
        /**
         * Regular client side page
         */
        PromotedState[PromotedState["NotPromoted"] = 0] = "NotPromoted";
        /**
         * Page that will be promoted as news article after publishing
         */
        PromotedState[PromotedState["PromoteOnPublish"] = 1] = "PromoteOnPublish";
        /**
         * Page that is promoted as news article
         */
        PromotedState[PromotedState["Promoted"] = 2] = "Promoted";
    })(exports.PromotedState || (exports.PromotedState = {}));
    /**
     * Gets the next order value 1 based for the provided collection
     *
     * @param collection Collection of orderable things
     */
    function getNextOrder(collection) {
        if (collection.length < 1) {
            return 1;
        }
        return Math.max.apply(null, collection.map(function (i) { return i.order; })) + 1;
    }
    /**
     * After https://stackoverflow.com/questions/273789/is-there-a-version-of-javascripts-string-indexof-that-allows-for-regular-expr/274094#274094
     *
     * @param this Types the called context this to a string in which the search will be conducted
     * @param regex A regex or string to match
     * @param startpos A starting position from which the search will begin
     */
    function regexIndexOf(regex, startpos) {
        if (startpos === void 0) { startpos = 0; }
        var indexOf = this.substring(startpos).search(regex);
        return (indexOf >= 0) ? (indexOf + (startpos)) : indexOf;
    }
    /**
     * Finds bounded blocks of markup bounded by divs, ensuring to match the ending div even with nested divs in the interstitial markup
     *
     * @param html HTML to search
     * @param boundaryStartPattern The starting pattern to find, typically a div with attribute
     * @param collector A func to take the found block and provide a way to form it into a useful return that is added into the return array
     */
    function getBoundedDivMarkup(html, boundaryStartPattern, collector) {
        var blocks = [];
        if (html === undefined || html === null) {
            return blocks;
        }
        // remove some extra whitespace if present
        var cleanedHtml = html.replace(/[\t\r\n]/g, "");
        // find the first div
        var startIndex = regexIndexOf.call(cleanedHtml, boundaryStartPattern);
        if (startIndex < 0) {
            // we found no blocks in the supplied html
            return blocks;
        }
        // this loop finds each of the blocks
        while (startIndex > -1) {
            // we have one open div counting from the one found above using boundaryStartPattern so we need to ensure we find it's close
            var openCounter = 1;
            var searchIndex = startIndex + 1;
            var nextDivOpen = -1;
            var nextCloseDiv = -1;
            // this loop finds the </div> tag that matches the opening of the control
            while (true) {
                // find both the next opening and closing div tags from our current searching index
                nextDivOpen = regexIndexOf.call(cleanedHtml, /<div[^>]*>/i, searchIndex);
                nextCloseDiv = regexIndexOf.call(cleanedHtml, /<\/div>/i, searchIndex);
                if (nextDivOpen < 0) {
                    // we have no more opening divs, just set this to simplify checks below
                    nextDivOpen = cleanedHtml.length + 1;
                }
                // determine which we found first, then increment or decrement our counter
                // and set the location to begin searching again
                if (nextDivOpen < nextCloseDiv) {
                    openCounter++;
                    searchIndex = nextDivOpen + 1;
                }
                else if (nextCloseDiv < nextDivOpen) {
                    openCounter--;
                    searchIndex = nextCloseDiv + 1;
                }
                // once we have no open divs back to the level of the opening control div
                // meaning we have all of the markup we intended to find
                if (openCounter === 0) {
                    // get the bounded markup, +6 is the size of the ending </div> tag
                    var markup = cleanedHtml.substring(startIndex, nextCloseDiv + 6).trim();
                    // save the control data we found to the array
                    blocks.push(collector(markup));
                    // get out of our while loop
                    break;
                }
                if (openCounter > 1000 || openCounter < 0) {
                    // this is an arbitrary cut-off but likely we will not have 1000 nested divs
                    // something has gone wrong above and we are probably stuck in our while loop
                    // let's get out of our while loop and not hang everything
                    throw new Error("getBoundedDivMarkup exceeded depth parameters.");
                }
            }
            // get the start of the next control
            startIndex = regexIndexOf.call(cleanedHtml, boundaryStartPattern, nextCloseDiv);
        }
        return blocks;
    }
    /**
     * Normalizes the order value for all the sections, columns, and controls to be 1 based and stepped (1, 2, 3...)
     *
     * @param collection The collection to normalize
     */
    function reindex(collection) {
        for (var i = 0; i < collection.length; i++) {
            collection[i].order = i + 1;
            if (common.hOP(collection[i], "columns")) {
                reindex(collection[i].columns);
            }
            else if (common.hOP(collection[i], "controls")) {
                reindex(collection[i].controls);
            }
        }
    }
    /**
     * Represents the data and methods associated with client side "modern" pages
     */
    var ClientSidePage = /** @class */ (function (_super) {
        tslib_1.__extends(ClientSidePage, _super);
        /**
         * Creates a new instance of the ClientSidePage class
         *
         * @param baseUrl The url or SharePointQueryable which forms the parent of this web collection
         * @param commentsDisabled Indicates if comments are disabled, not valid until load is called
         */
        function ClientSidePage(file, sections, commentsDisabled) {
            if (sections === void 0) { sections = []; }
            if (commentsDisabled === void 0) { commentsDisabled = false; }
            var _this = _super.call(this, file) || this;
            _this.sections = sections;
            _this.commentsDisabled = commentsDisabled;
            return _this;
        }
        /**
         * Creates a new blank page within the supplied library
         *
         * @param library The library in which to create the page
         * @param pageName Filename of the page, such as "page.aspx"
         * @param title The display title of the page
         * @param pageLayoutType Layout type of the page to use
         */
        ClientSidePage.create = function (library, pageName, title, pageLayoutType) {
            if (pageLayoutType === void 0) { pageLayoutType = "Article"; }
            // see if file exists, if not create it
            return library.rootFolder.files.select("Name").filter("Name eq '" + pageName + "'").get().then(function (fs) {
                if (fs.length > 0) {
                    throw new Error("A file with the name '" + pageName + "' already exists in the library '" + library.toUrl() + "'.");
                }
                // get our server relative path
                return library.rootFolder.select("ServerRelativePath").get().then(function (path) {
                    var pageServerRelPath = common.combine("/", path.ServerRelativePath.DecodedUrl, pageName);
                    // add the template file
                    return library.rootFolder.files.addTemplateFile(pageServerRelPath, exports.TemplateFileType.ClientSidePage).then(function (far) {
                        // get the item associated with the file
                        return far.file.getItem().then(function (i) {
                            // update the item to have the correct values to create the client side page
                            return i.update({
                                BannerImageUrl: {
                                    Url: "/_layouts/15/images/sitepagethumbnail.png",
                                },
                                CanvasContent1: "",
                                ClientSideApplicationId: "b6917cb1-93a0-4b97-a84d-7cf49975d4ec",
                                ContentTypeId: "0x0101009D1CB255DA76424F860D91F20E6C4118",
                                PageLayoutType: pageLayoutType,
                                PromotedState: 0 /* NotPromoted */,
                                Title: title,
                            }).then(function (iar) { return new ClientSidePage(iar.item.file, iar.item.CommentsDisabled); });
                        });
                    });
                });
            });
        };
        /**
         * Creates a new ClientSidePage instance from the provided html content string
         *
         * @param html HTML markup representing the page
         */
        ClientSidePage.fromFile = function (file) {
            var page = new ClientSidePage(file);
            return page.load().then(function (_) { return page; });
        };
        /**
         * Converts a json object to an escaped string appropriate for use in attributes when storing client-side controls
         *
         * @param json The json object to encode into a string
         */
        ClientSidePage.jsonToEscapedString = function (json) {
            return common.jsS(json)
                .replace(/"/g, "&quot;")
                .replace(/:/g, "&#58;")
                .replace(/{/g, "&#123;")
                .replace(/}/g, "&#125;")
                .replace(/\[/g, "\[")
                .replace(/\]/g, "\]")
                .replace(/\./g, "\.");
        };
        /**
         * Converts an escaped string from a client-side control attribute to a json object
         *
         * @param escapedString
         */
        ClientSidePage.escapedStringToJson = function (escapedString) {
            var unespace = function (escaped) {
                var mapDict = [
                    [/&quot;/g, "\""], [/&#58;/g, ":"], [/&#123;/g, "{"], [/&#125;/g, "}"],
                    [/\\\\/g, "\\"], [/\\\?/g, "?"], [/\\\./g, "."], [/\\\[/g, "["], [/\\\]/g, "]"],
                    [/\\\(/g, "("], [/\\\)/g, ")"], [/\\\|/g, "|"], [/\\\+/g, "+"],
                ];
                return mapDict.reduce(function (r, m) { return r.replace(m[0], m[1]); }, escaped);
            };
            return JSON.parse(unespace(escapedString));
        };
        /**
         * Add a section to this page
         */
        ClientSidePage.prototype.addSection = function () {
            var section = new CanvasSection(this, getNextOrder(this.sections));
            this.sections.push(section);
            return section;
        };
        /**
         * Converts this page's content to html markup
         */
        ClientSidePage.prototype.toHtml = function () {
            // trigger reindex of the entire tree
            reindex(this.sections);
            var html = [];
            html.push("<div>");
            for (var i = 0; i < this.sections.length; i++) {
                html.push(this.sections[i].toHtml());
            }
            html.push("</div>");
            return html.join("");
        };
        /**
         * Loads this page instance's content from the supplied html
         *
         * @param html html string representing the page's content
         */
        ClientSidePage.prototype.fromHtml = function (html) {
            var _this = this;
            // reset sections
            this.sections = [];
            // gather our controls from the supplied html
            getBoundedDivMarkup(html, /<div\b[^>]*data-sp-canvascontrol[^>]*?>/i, function (markup) {
                // get the control type
                var ct = /controlType&quot;&#58;(\d*?),/i.exec(markup);
                // if no control type is present this is a column which we give type 0 to let us process it
                var controlType = ct == null || ct.length < 2 ? 0 : parseInt(ct[1], 10);
                var control = null;
                switch (controlType) {
                    case 0:
                        // empty canvas column
                        control = new CanvasColumn(null, 0);
                        control.fromHtml(markup);
                        _this.mergeColumnToTree(control);
                        break;
                    case 3:
                        // client side webpart
                        control = new ClientSideWebpart("");
                        control.fromHtml(markup);
                        _this.mergePartToTree(control);
                        break;
                    case 4:
                        // client side text
                        control = new ClientSideText();
                        control.fromHtml(markup);
                        _this.mergePartToTree(control);
                        break;
                }
            });
            // refresh all the orders within the tree
            reindex(this.sections);
            return this;
        };
        /**
         * Loads this page's content from the server
         */
        ClientSidePage.prototype.load = function () {
            var _this = this;
            return this.getItem("CanvasContent1", "CommentsDisabled").then(function (item) {
                _this.fromHtml(item.CanvasContent1);
                _this.commentsDisabled = item.CommentsDisabled;
            });
        };
        /**
         * Persists the content changes (sections, columns, and controls)
         */
        ClientSidePage.prototype.save = function () {
            return this.updateProperties({ CanvasContent1: this.toHtml() });
        };
        /**
         * Enables comments on this page
         */
        ClientSidePage.prototype.enableComments = function () {
            var _this = this;
            return this.setCommentsOn(true).then(function (r) {
                _this.commentsDisabled = false;
                return r;
            });
        };
        /**
         * Disables comments on this page
         */
        ClientSidePage.prototype.disableComments = function () {
            var _this = this;
            return this.setCommentsOn(false).then(function (r) {
                _this.commentsDisabled = true;
                return r;
            });
        };
        /**
         * Finds a control by the specified instance id
         *
         * @param id Instance id of the control to find
         */
        ClientSidePage.prototype.findControlById = function (id) {
            return this.findControl(function (c) { return c.id === id; });
        };
        /**
         * Finds a control within this page's control tree using the supplied predicate
         *
         * @param predicate Takes a control and returns true or false, if true that control is returned by findControl
         */
        ClientSidePage.prototype.findControl = function (predicate) {
            // check all sections
            for (var i = 0; i < this.sections.length; i++) {
                // check all columns
                for (var j = 0; j < this.sections[i].columns.length; j++) {
                    // check all controls
                    for (var k = 0; k < this.sections[i].columns[j].controls.length; k++) {
                        // check to see if the predicate likes this control
                        if (predicate(this.sections[i].columns[j].controls[k])) {
                            return this.sections[i].columns[j].controls[k];
                        }
                    }
                }
            }
            // we found nothing so give nothing back
            return null;
        };
        /**
         * Sets the comments flag for a page
         *
         * @param on If true comments are enabled, false they are disabled
         */
        ClientSidePage.prototype.setCommentsOn = function (on) {
            return this.getItem().then(function (i) {
                var updater = new Item(i, "SetCommentsDisabled(" + !on + ")");
                return updater.update({});
            });
        };
        /**
         * Merges the control into the tree of sections and columns for this page
         *
         * @param control The control to merge
         */
        ClientSidePage.prototype.mergePartToTree = function (control) {
            var section = null;
            var column = null;
            var sections = this.sections.filter(function (s) { return s.order === control.controlData.position.zoneIndex; });
            if (sections.length < 1) {
                section = new CanvasSection(this, control.controlData.position.zoneIndex);
                this.sections.push(section);
            }
            else {
                section = sections[0];
            }
            var columns = section.columns.filter(function (c) { return c.order === control.controlData.position.sectionIndex; });
            if (columns.length < 1) {
                column = new CanvasColumn(section, control.controlData.position.sectionIndex, control.controlData.position.sectionFactor);
                section.columns.push(column);
            }
            else {
                column = columns[0];
            }
            control.column = column;
            column.addControl(control);
        };
        /**
         * Merges the supplied column into the tree
         *
         * @param column Column to merge
         * @param position The position data for the column
         */
        ClientSidePage.prototype.mergeColumnToTree = function (column) {
            var section = null;
            var sections = this.sections.filter(function (s) { return s.order === column.controlData.position.zoneIndex; });
            if (sections.length < 1) {
                section = new CanvasSection(this, column.controlData.position.zoneIndex);
                this.sections.push(section);
            }
            else {
                section = sections[0];
            }
            column.section = section;
            section.columns.push(column);
        };
        /**
         * Updates the properties of the underlying ListItem associated with this ClientSidePage
         *
         * @param properties Set of properties to update
         * @param eTag Value used in the IF-Match header, by default "*"
         */
        ClientSidePage.prototype.updateProperties = function (properties, eTag) {
            if (eTag === void 0) { eTag = "*"; }
            return this.getItem().then(function (i) { return i.update(properties, eTag); });
        };
        return ClientSidePage;
    }(File));
    var CanvasSection = /** @class */ (function () {
        function CanvasSection(page, order, columns) {
            if (columns === void 0) { columns = []; }
            this.page = page;
            this.order = order;
            this.columns = columns;
            this._memId = common.getGUID();
        }
        Object.defineProperty(CanvasSection.prototype, "defaultColumn", {
            /**
             * Default column (this.columns[0]) for this section
             */
            get: function () {
                if (this.columns.length < 1) {
                    this.addColumn(12);
                }
                return this.columns[0];
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Adds a new column to this section
         */
        CanvasSection.prototype.addColumn = function (factor) {
            var column = new CanvasColumn(this, getNextOrder(this.columns), factor);
            this.columns.push(column);
            return column;
        };
        /**
         * Adds a control to the default column for this section
         *
         * @param control Control to add to the default column
         */
        CanvasSection.prototype.addControl = function (control) {
            this.defaultColumn.addControl(control);
            return this;
        };
        CanvasSection.prototype.toHtml = function () {
            var html = [];
            for (var i = 0; i < this.columns.length; i++) {
                html.push(this.columns[i].toHtml());
            }
            return html.join("");
        };
        /**
         * Removes this section and all contained columns and controls from the collection
         */
        CanvasSection.prototype.remove = function () {
            var _this = this;
            this.page.sections = this.page.sections.filter(function (section) { return section._memId !== _this._memId; });
            reindex(this.page.sections);
        };
        return CanvasSection;
    }());
    var CanvasControl = /** @class */ (function () {
        function CanvasControl(controlType, dataVersion, column, order, id, controlData) {
            if (column === void 0) { column = null; }
            if (order === void 0) { order = 1; }
            if (id === void 0) { id = common.getGUID(); }
            if (controlData === void 0) { controlData = null; }
            this.controlType = controlType;
            this.dataVersion = dataVersion;
            this.column = column;
            this.order = order;
            this.id = id;
            this.controlData = controlData;
        }
        Object.defineProperty(CanvasControl.prototype, "jsonData", {
            /**
             * Value of the control's "data-sp-controldata" attribute
             */
            get: function () {
                return ClientSidePage.jsonToEscapedString(this.getControlData());
            },
            enumerable: true,
            configurable: true
        });
        CanvasControl.prototype.fromHtml = function (html) {
            this.controlData = ClientSidePage.escapedStringToJson(common.getAttrValueFromString(html, "data-sp-controldata"));
            this.dataVersion = common.getAttrValueFromString(html, "data-sp-canvasdataversion");
            this.controlType = this.controlData.controlType;
            this.id = this.controlData.id;
        };
        return CanvasControl;
    }());
    var CanvasColumn = /** @class */ (function (_super) {
        tslib_1.__extends(CanvasColumn, _super);
        function CanvasColumn(section, order, factor, controls, dataVersion) {
            if (factor === void 0) { factor = 12; }
            if (controls === void 0) { controls = []; }
            if (dataVersion === void 0) { dataVersion = "1.0"; }
            var _this = _super.call(this, 0, dataVersion) || this;
            _this.section = section;
            _this.order = order;
            _this.factor = factor;
            _this.controls = controls;
            return _this;
        }
        CanvasColumn.prototype.addControl = function (control) {
            control.column = this;
            this.controls.push(control);
            return this;
        };
        CanvasColumn.prototype.getControl = function (index) {
            return this.controls[index];
        };
        CanvasColumn.prototype.toHtml = function () {
            var html = [];
            if (this.controls.length < 1) {
                html.push("<div data-sp-canvascontrol=\"\" data-sp-canvasdataversion=\"" + this.dataVersion + "\" data-sp-controldata=\"" + this.jsonData + "\"></div>");
            }
            else {
                for (var i = 0; i < this.controls.length; i++) {
                    html.push(this.controls[i].toHtml(i + 1));
                }
            }
            return html.join("");
        };
        CanvasColumn.prototype.fromHtml = function (html) {
            _super.prototype.fromHtml.call(this, html);
            this.controlData = ClientSidePage.escapedStringToJson(common.getAttrValueFromString(html, "data-sp-controldata"));
            this.factor = this.controlData.position.sectionFactor;
            this.order = this.controlData.position.sectionIndex;
        };
        CanvasColumn.prototype.getControlData = function () {
            return {
                displayMode: 2,
                position: {
                    sectionFactor: this.factor,
                    sectionIndex: this.order,
                    zoneIndex: this.section.order,
                },
            };
        };
        /**
         * Removes this column and all contained controls from the collection
         */
        CanvasColumn.prototype.remove = function () {
            var _this = this;
            this.section.columns = this.section.columns.filter(function (column) { return column.id !== _this.id; });
            reindex(this.column.controls);
        };
        return CanvasColumn;
    }(CanvasControl));
    /**
     * Abstract class with shared functionality for parts
     */
    var ClientSidePart = /** @class */ (function (_super) {
        tslib_1.__extends(ClientSidePart, _super);
        function ClientSidePart() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Removes this column and all contained controls from the collection
         */
        ClientSidePart.prototype.remove = function () {
            var _this = this;
            this.column.controls = this.column.controls.filter(function (control) { return control.id !== _this.id; });
            reindex(this.column.controls);
        };
        return ClientSidePart;
    }(CanvasControl));
    var ClientSideText = /** @class */ (function (_super) {
        tslib_1.__extends(ClientSideText, _super);
        function ClientSideText(text) {
            if (text === void 0) { text = ""; }
            var _this = _super.call(this, 4, "1.0") || this;
            _this.text = text;
            return _this;
        }
        Object.defineProperty(ClientSideText.prototype, "text", {
            /**
             * The text markup of this control
             */
            get: function () {
                return this._text;
            },
            set: function (text) {
                if (!text.startsWith("<p>")) {
                    text = "<p>" + text + "</p>";
                }
                this._text = text;
            },
            enumerable: true,
            configurable: true
        });
        ClientSideText.prototype.getControlData = function () {
            return {
                controlType: this.controlType,
                editorType: "CKEditor",
                id: this.id,
                position: {
                    controlIndex: this.order,
                    sectionFactor: this.column.factor,
                    sectionIndex: this.column.order,
                    zoneIndex: this.column.section.order,
                },
            };
        };
        ClientSideText.prototype.toHtml = function (index) {
            // set our order to the value passed in
            this.order = index;
            var html = [];
            html.push("<div data-sp-canvascontrol=\"\" data-sp-canvasdataversion=\"" + this.dataVersion + "\" data-sp-controldata=\"" + this.jsonData + "\">");
            html.push("<div data-sp-rte=\"\">");
            html.push("" + this.text);
            html.push("</div>");
            html.push("</div>");
            return html.join("");
        };
        ClientSideText.prototype.fromHtml = function (html) {
            var _this = this;
            _super.prototype.fromHtml.call(this, html);
            this.text = "";
            getBoundedDivMarkup(html, /<div[^>]*data-sp-rte[^>]*>/i, function (s) {
                // now we need to grab the inner text between the divs
                var match = /<div[^>]*data-sp-rte[^>]*>(.*?)<\/div>$/i.exec(s);
                _this.text = match.length > 1 ? match[1] : "";
            });
        };
        return ClientSideText;
    }(ClientSidePart));
    var ClientSideWebpart = /** @class */ (function (_super) {
        tslib_1.__extends(ClientSideWebpart, _super);
        function ClientSideWebpart(title, description, propertieJson, webPartId, htmlProperties, serverProcessedContent, canvasDataVersion) {
            if (description === void 0) { description = ""; }
            if (propertieJson === void 0) { propertieJson = {}; }
            if (webPartId === void 0) { webPartId = ""; }
            if (htmlProperties === void 0) { htmlProperties = ""; }
            if (serverProcessedContent === void 0) { serverProcessedContent = null; }
            if (canvasDataVersion === void 0) { canvasDataVersion = "1.0"; }
            var _this = _super.call(this, 3, "1.0") || this;
            _this.title = title;
            _this.description = description;
            _this.propertieJson = propertieJson;
            _this.webPartId = webPartId;
            _this.htmlProperties = htmlProperties;
            _this.serverProcessedContent = serverProcessedContent;
            _this.canvasDataVersion = canvasDataVersion;
            return _this;
        }
        ClientSideWebpart.fromComponentDef = function (definition) {
            var part = new ClientSideWebpart("");
            part.import(definition);
            return part;
        };
        ClientSideWebpart.prototype.import = function (component) {
            this.webPartId = component.Id.replace(/^\{|\}$/g, "").toLowerCase();
            var manifest = JSON.parse(component.Manifest);
            this.title = manifest.preconfiguredEntries[0].title.default;
            this.description = manifest.preconfiguredEntries[0].description.default;
            this.dataVersion = "";
            this.propertieJson = this.parseJsonProperties(manifest.preconfiguredEntries[0].properties);
        };
        ClientSideWebpart.prototype.setProperties = function (properties) {
            this.propertieJson = common.extend(this.propertieJson, properties);
            return this;
        };
        ClientSideWebpart.prototype.getProperties = function () {
            return this.propertieJson;
        };
        ClientSideWebpart.prototype.toHtml = function (index) {
            // set our order to the value passed in
            this.order = index;
            // will form the value of the data-sp-webpartdata attribute
            var data = {
                dataVersion: this.dataVersion,
                description: this.description,
                id: this.webPartId,
                instanceId: this.id,
                properties: this.propertieJson,
                serverProcessedContent: this.serverProcessedContent,
                title: this.title,
            };
            var html = [];
            html.push("<div data-sp-canvascontrol=\"\" data-sp-canvasdataversion=\"" + this.canvasDataVersion + "\" data-sp-controldata=\"" + this.jsonData + "\">");
            html.push("<div data-sp-webpart=\"\" data-sp-webpartdataversion=\"" + this.dataVersion + "\" data-sp-webpartdata=\"" + ClientSidePage.jsonToEscapedString(data) + "\">");
            html.push("<div data-sp-componentid>");
            html.push(this.webPartId);
            html.push("</div>");
            html.push("<div data-sp-htmlproperties=\"\">");
            html.push(this.renderHtmlProperties());
            html.push("</div>");
            html.push("</div>");
            html.push("</div>");
            return html.join("");
        };
        ClientSideWebpart.prototype.fromHtml = function (html) {
            _super.prototype.fromHtml.call(this, html);
            var webPartData = ClientSidePage.escapedStringToJson(common.getAttrValueFromString(html, "data-sp-webpartdata"));
            this.title = webPartData.title;
            this.description = webPartData.description;
            this.webPartId = webPartData.id;
            this.canvasDataVersion = common.getAttrValueFromString(html, "data-sp-canvasdataversion").replace(/\\\./, ".");
            this.dataVersion = common.getAttrValueFromString(html, "data-sp-webpartdataversion").replace(/\\\./, ".");
            this.setProperties(webPartData.properties);
            if (webPartData.serverProcessedContent !== undefined) {
                this.serverProcessedContent = webPartData.serverProcessedContent;
            }
            // get our html properties
            var htmlProps = getBoundedDivMarkup(html, /<div\b[^>]*data-sp-htmlproperties[^>]*?>/i, function (markup) {
                return markup.replace(/^<div\b[^>]*data-sp-htmlproperties[^>]*?>/i, "").replace(/<\/div>$/i, "");
            });
            this.htmlProperties = htmlProps.length > 0 ? htmlProps[0] : "";
        };
        ClientSideWebpart.prototype.getControlData = function () {
            return {
                controlType: this.controlType,
                id: this.id,
                position: {
                    controlIndex: this.order,
                    sectionFactor: this.column.factor,
                    sectionIndex: this.column.order,
                    zoneIndex: this.column.section.order,
                },
                webPartId: this.webPartId,
            };
        };
        ClientSideWebpart.prototype.renderHtmlProperties = function () {
            var html = [];
            if (this.serverProcessedContent === undefined || this.serverProcessedContent === null) {
                html.push(this.htmlProperties);
            }
            else if (this.serverProcessedContent !== undefined) {
                if (this.serverProcessedContent.searchablePlainTexts !== undefined) {
                    var keys = Object.keys(this.serverProcessedContent.searchablePlainTexts);
                    for (var i = 0; i < keys.length; i++) {
                        html.push("<div data-sp-prop-name=\"" + keys[i] + "\" data-sp-searchableplaintext=\"true\">");
                        html.push(this.serverProcessedContent.searchablePlainTexts[keys[i]]);
                        html.push("</div>");
                    }
                }
                if (this.serverProcessedContent.imageSources !== undefined) {
                    var keys = Object.keys(this.serverProcessedContent.imageSources);
                    for (var i = 0; i < keys.length; i++) {
                        html.push("<img data-sp-prop-name=\"" + keys[i] + "\" src=\"" + this.serverProcessedContent.imageSources[keys[i]] + "\" />");
                    }
                }
                if (this.serverProcessedContent.links !== undefined) {
                    var keys = Object.keys(this.serverProcessedContent.links);
                    for (var i = 0; i < keys.length; i++) {
                        html.push("<a data-sp-prop-name=\"" + keys[i] + "\" href=\"" + this.serverProcessedContent.links[keys[i]] + "\"></a>");
                    }
                }
            }
            return html.join("");
        };
        ClientSideWebpart.prototype.parseJsonProperties = function (props) {
            // If the web part has the serverProcessedContent property then keep this one as it might be needed as input to render the web part HTML later on
            if (props.webPartData !== undefined && props.webPartData.serverProcessedContent !== undefined) {
                this.serverProcessedContent = props.webPartData.serverProcessedContent;
            }
            else if (props.serverProcessedContent !== undefined) {
                this.serverProcessedContent = props.serverProcessedContent;
            }
            else {
                this.serverProcessedContent = null;
            }
            if (props.webPartData !== undefined && props.webPartData.properties !== undefined) {
                return props.webPartData.properties;
            }
            else if (props.properties !== undefined) {
                return props.properties;
            }
            else {
                return props;
            }
        };
        return ClientSideWebpart;
    }(ClientSidePart));

    /**
     * Represents a collection of navigation nodes
     *
     */
    var NavigationNodes = /** @class */ (function (_super) {
        tslib_1.__extends(NavigationNodes, _super);
        function NavigationNodes() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.getById = _this._getById(NavigationNode);
            return _this;
        }
        /**
         * Adds a new node to the collection
         *
         * @param title Display name of the node
         * @param url The url of the node
         * @param visible If true the node is visible, otherwise it is hidden (default: true)
         */
        NavigationNodes.prototype.add = function (title, url, visible) {
            var _this = this;
            if (visible === void 0) { visible = true; }
            var postBody = common.jsS(common.extend(metadata("SP.NavigationNode"), {
                IsVisible: visible,
                Title: title,
                Url: url,
            }));
            return this.clone(NavigationNodes, null).postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    node: _this.getById(data.Id),
                };
            });
        };
        /**
         * Moves a node to be after another node in the navigation
         *
         * @param nodeId Id of the node to move
         * @param previousNodeId Id of the node after which we move the node specified by nodeId
         */
        NavigationNodes.prototype.moveAfter = function (nodeId, previousNodeId) {
            var postBody = common.jsS({
                nodeId: nodeId,
                previousNodeId: previousNodeId,
            });
            return this.clone(NavigationNodes, "MoveAfter").postCore({ body: postBody });
        };
        return NavigationNodes;
    }(SharePointQueryableCollection));
    /**
     * Represents an instance of a navigation node
     *
     */
    var NavigationNode = /** @class */ (function (_super) {
        tslib_1.__extends(NavigationNode, _super);
        function NavigationNode() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(NavigationNode.prototype, "children", {
            /**
             * Represents the child nodes of this node
             */
            get: function () {
                return new NavigationNodes(this, "Children");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Deletes this node and any child nodes
         */
        NavigationNode.prototype.delete = function () {
            return _super.prototype.deleteCore.call(this);
        };
        return NavigationNode;
    }(SharePointQueryableInstance));
    /**
     * Exposes the navigation components
     *
     */
    var Navigation = /** @class */ (function (_super) {
        tslib_1.__extends(Navigation, _super);
        function Navigation() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(Navigation.prototype, "quicklaunch", {
            /**
             * Gets the quicklaunch navigation nodes for the current context
             *
             */
            get: function () {
                return new NavigationNodes(this, "quicklaunch");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Navigation.prototype, "topNavigationBar", {
            /**
             * Gets the top bar navigation nodes for the current context
             *
             */
            get: function () {
                return new NavigationNodes(this, "topnavigationbar");
            },
            enumerable: true,
            configurable: true
        });
        Navigation = tslib_1.__decorate([
            defaultPath("navigation")
        ], Navigation);
        return Navigation;
    }(SharePointQueryable));
    /**
     * Represents the top level navigation service
     */
    var NavigationService = /** @class */ (function (_super) {
        tslib_1.__extends(NavigationService, _super);
        function NavigationService(path) {
            if (path === void 0) { path = null; }
            return _super.call(this, "_api/navigation", path) || this;
        }
        /**
         * The MenuState service operation returns a Menu-State (dump) of a SiteMapProvider on a site.
         *
         * @param menuNodeKey MenuNode.Key of the start node within the SiteMapProvider If no key is provided the SiteMapProvider.RootNode will be the root of the menu state.
         * @param depth Depth of the dump. If no value is provided a dump with the depth of 10 is returned
         * @param mapProviderName The name identifying the SiteMapProvider to be used
         * @param customProperties comma seperated list of custom properties to be returned.
         */
        NavigationService.prototype.getMenuState = function (menuNodeKey, depth, mapProviderName, customProperties) {
            if (menuNodeKey === void 0) { menuNodeKey = null; }
            if (depth === void 0) { depth = 10; }
            if (mapProviderName === void 0) { mapProviderName = null; }
            if (customProperties === void 0) { customProperties = null; }
            return (new NavigationService("MenuState")).postCore({
                body: common.jsS({
                    customProperties: customProperties,
                    depth: depth,
                    mapProviderName: mapProviderName,
                    menuNodeKey: menuNodeKey,
                }),
            });
        };
        /**
         * Tries to get a SiteMapNode.Key for a given URL within a site collection.
         *
         * @param currentUrl A url representing the SiteMapNode
         * @param mapProviderName The name identifying the SiteMapProvider to be used
         */
        NavigationService.prototype.getMenuNodeKey = function (currentUrl, mapProviderName) {
            if (mapProviderName === void 0) { mapProviderName = null; }
            return (new NavigationService("MenuNodeKey")).postCore({
                body: common.jsS({
                    currentUrl: currentUrl,
                    mapProviderName: mapProviderName,
                }),
            });
        };
        return NavigationService;
    }(SharePointQueryable));

    /**
     * Describes regional settings ODada object
     */
    var RegionalSettings = /** @class */ (function (_super) {
        tslib_1.__extends(RegionalSettings, _super);
        function RegionalSettings() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(RegionalSettings.prototype, "installedLanguages", {
            /**
             * Gets the collection of languages used in a server farm.
             */
            get: function () {
                return new InstalledLanguages(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegionalSettings.prototype, "globalInstalledLanguages", {
            /**
             * Gets the collection of language packs that are installed on the server.
             */
            get: function () {
                return new InstalledLanguages(this, "globalinstalledlanguages");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegionalSettings.prototype, "timeZone", {
            /**
             * Gets time zone
             */
            get: function () {
                return new TimeZone(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegionalSettings.prototype, "timeZones", {
            /**
             * Gets time zones
             */
            get: function () {
                return new TimeZones(this);
            },
            enumerable: true,
            configurable: true
        });
        RegionalSettings = tslib_1.__decorate([
            defaultPath("regionalsettings")
        ], RegionalSettings);
        return RegionalSettings;
    }(SharePointQueryableInstance));
    /**
     * Describes installed languages ODada queriable collection
     */
    var InstalledLanguages = /** @class */ (function (_super) {
        tslib_1.__extends(InstalledLanguages, _super);
        function InstalledLanguages() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        InstalledLanguages = tslib_1.__decorate([
            defaultPath("installedlanguages")
        ], InstalledLanguages);
        return InstalledLanguages;
    }(SharePointQueryableCollection));
    /**
     * Describes TimeZone ODada object
     */
    var TimeZone = /** @class */ (function (_super) {
        tslib_1.__extends(TimeZone, _super);
        function TimeZone() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        TimeZone_1 = TimeZone;
        /**
         * Gets an Local Time by UTC Time
         *
         * @param utcTime UTC Time as Date or ISO String
         */
        TimeZone.prototype.utcToLocalTime = function (utcTime) {
            var dateIsoString;
            if (typeof utcTime === "string") {
                dateIsoString = utcTime;
            }
            else {
                dateIsoString = utcTime.toISOString();
            }
            return this.clone(TimeZone_1, "utctolocaltime('" + dateIsoString + "')")
                .postCore()
                .then(function (res) { return common.hOP(res, "UTCToLocalTime") ? res.UTCToLocalTime : res; });
        };
        /**
         * Gets an UTC Time by Local Time
         *
         * @param localTime Local Time as Date or ISO String
         */
        TimeZone.prototype.localTimeToUTC = function (localTime) {
            var dateIsoString;
            if (typeof localTime === "string") {
                dateIsoString = localTime;
            }
            else {
                dateIsoString = common.dateAdd(localTime, "minute", localTime.getTimezoneOffset() * -1).toISOString();
            }
            return this.clone(TimeZone_1, "localtimetoutc('" + dateIsoString + "')")
                .postCore()
                .then(function (res) { return common.hOP(res, "LocalTimeToUTC") ? res.LocalTimeToUTC : res; });
        };
        TimeZone = TimeZone_1 = tslib_1.__decorate([
            defaultPath("timezone")
        ], TimeZone);
        return TimeZone;
        var TimeZone_1;
    }(SharePointQueryableInstance));
    /**
     * Describes time zones queriable collection
     */
    var TimeZones = /** @class */ (function (_super) {
        tslib_1.__extends(TimeZones, _super);
        function TimeZones() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        TimeZones_1 = TimeZones;
        // https://msdn.microsoft.com/en-us/library/office/jj247008.aspx - timezones ids
        /**
         * Gets an TimeZone by id
         *
         * @param id The integer id of the timezone to retrieve
         */
        TimeZones.prototype.getById = function (id) {
            // do the post and merge the result into a TimeZone instance so the data and methods are available
            return this.clone(TimeZones_1, "GetById(" + id + ")").postCore({}, spODataEntity(TimeZone));
        };
        TimeZones = TimeZones_1 = tslib_1.__decorate([
            defaultPath("timezones")
        ], TimeZones);
        return TimeZones;
        var TimeZones_1;
    }(SharePointQueryableCollection));

    var funcs = new Map([
        ["text", "Querytext"],
        ["template", "QueryTemplate"],
        ["sourceId", "SourceId"],
        ["trimDuplicatesIncludeId", ""],
        ["startRow", ""],
        ["rowLimit", ""],
        ["rankingModelId", ""],
        ["rowsPerPage", ""],
        ["selectProperties", ""],
        ["culture", ""],
        ["timeZoneId", ""],
        ["refinementFilters", ""],
        ["refiners", ""],
        ["hiddenConstraints", ""],
        ["sortList", ""],
        ["timeout", ""],
        ["hithighlightedProperties", ""],
        ["clientType", ""],
        ["personalizationData", ""],
        ["resultsURL", ""],
        ["queryTag", ""],
        ["properties", ""],
        ["queryTemplatePropertiesUrl", ""],
        ["reorderingRules", ""],
        ["hitHighlightedMultivaluePropertyLimit", ""],
        ["collapseSpecification", ""],
        ["uiLanguage", ""],
        ["desiredSnippetLength", ""],
        ["maxSnippetLength", ""],
        ["summaryLength", ""],
    ]);
    var props = new Map([]);
    // after: https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
    function toCamelCase(str) {
        return str
            .replace(/\s(.)/g, function ($1) { return $1.toUpperCase(); })
            .replace(/\s/g, "")
            .replace(/^(.)/, function ($1) { return $1.toLowerCase(); });
    }
    /**
     * Creates a new instance of the SearchQueryBuilder
     *
     * @param queryText Initial query text
     * @param _query Any initial query configuration
     */
    function SearchQueryBuilder(queryText, _query) {
        if (queryText === void 0) { queryText = ""; }
        if (_query === void 0) { _query = {}; }
        return new Proxy({
            query: Object.assign({
                Querytext: queryText,
            }, _query),
        }, {
            get: function (self, propertyKey, proxy) {
                var pk = propertyKey.toString();
                if (pk === "toSearchQuery") {
                    return function () { return self.query; };
                }
                if (funcs.has(pk)) {
                    return function () {
                        var value = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            value[_i] = arguments[_i];
                        }
                        var mappedPk = funcs.get(pk);
                        self.query[mappedPk.length > 0 ? mappedPk : toCamelCase(pk)] = value.length > 1 ? value : value[0];
                        return proxy;
                    };
                }
                var propKey = props.has(pk) ? props.get(pk) : toCamelCase(pk);
                self.query[propKey] = true;
                return proxy;
            },
        });
    }
    /**
     * Describes the search API
     *
     */
    var Search = /** @class */ (function (_super) {
        tslib_1.__extends(Search, _super);
        function Search() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * @returns Promise
         */
        Search.prototype.execute = function (query) {
            var _this = this;
            var formattedBody;
            formattedBody = query;
            if (formattedBody.SelectProperties) {
                formattedBody.SelectProperties = this.fixupProp(query.SelectProperties);
            }
            if (formattedBody.RefinementFilters) {
                formattedBody.RefinementFilters = this.fixupProp(query.RefinementFilters);
            }
            if (formattedBody.SortList) {
                formattedBody.SortList = this.fixupProp(query.SortList);
            }
            if (formattedBody.HithighlightedProperties) {
                formattedBody.HithighlightedProperties = this.fixupProp(query.HitHighlightedProperties);
            }
            if (formattedBody.ReorderingRules) {
                formattedBody.ReorderingRules = this.fixupProp(query.ReorderingRules);
            }
            if (formattedBody.Properties) {
                formattedBody.Properties = this.fixupProp(query.Properties);
            }
            var postBody = common.jsS({
                request: common.extend(metadata("Microsoft.Office.Server.Search.REST.SearchRequest"), formattedBody),
            });
            return this.postCore({ body: postBody }).then(function (data) { return new SearchResults(data, _this.toUrl(), query); });
        };
        /**
         * Fixes up properties that expect to consist of a "results" collection when needed
         *
         * @param prop property to fixup for container struct
         */
        Search.prototype.fixupProp = function (prop) {
            return common.hOP(prop, "results") ? prop : { results: prop };
        };
        Search = tslib_1.__decorate([
            defaultPath("_api/search/postquery")
        ], Search);
        return Search;
    }(SharePointQueryableInstance));
    /**
     * Describes the SearchResults class, which returns the formatted and raw version of the query response
     */
    var SearchResults = /** @class */ (function () {
        /**
         * Creates a new instance of the SearchResult class
         *
         */
        function SearchResults(rawResponse, _url, _query, _raw, _primary) {
            if (_raw === void 0) { _raw = null; }
            if (_primary === void 0) { _primary = null; }
            this._url = _url;
            this._query = _query;
            this._raw = _raw;
            this._primary = _primary;
            this._raw = rawResponse.postquery ? rawResponse.postquery : rawResponse;
        }
        Object.defineProperty(SearchResults.prototype, "ElapsedTime", {
            get: function () {
                return this.RawSearchResults.ElapsedTime;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SearchResults.prototype, "RowCount", {
            get: function () {
                return this.RawSearchResults.PrimaryQueryResult.RelevantResults.RowCount;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SearchResults.prototype, "TotalRows", {
            get: function () {
                return this.RawSearchResults.PrimaryQueryResult.RelevantResults.TotalRows;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SearchResults.prototype, "TotalRowsIncludingDuplicates", {
            get: function () {
                return this.RawSearchResults.PrimaryQueryResult.RelevantResults.TotalRowsIncludingDuplicates;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SearchResults.prototype, "RawSearchResults", {
            get: function () {
                return this._raw;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SearchResults.prototype, "PrimarySearchResults", {
            get: function () {
                if (this._primary === null) {
                    this._primary = this.formatSearchResults(this._raw.PrimaryQueryResult.RelevantResults.Table.Rows);
                }
                return this._primary;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets a page of results
         *
         * @param pageNumber Index of the page to return. Used to determine StartRow
         * @param pageSize Optional, items per page (default = 10)
         */
        SearchResults.prototype.getPage = function (pageNumber, pageSize) {
            // if we got all the available rows we don't have another page
            if (this.TotalRows < this.RowCount) {
                return Promise.resolve(null);
            }
            // if pageSize is supplied, then we use that regardless of any previous values
            // otherwise get the previous RowLimit or default to 10
            var rows = pageSize !== undefined ? pageSize : common.hOP(this._query, "RowLimit") ? this._query.RowLimit : 10;
            var query = common.extend(this._query, {
                RowLimit: rows,
                StartRow: rows * (pageNumber - 1),
            });
            // we have reached the end
            if (query.StartRow > this.TotalRows) {
                return Promise.resolve(null);
            }
            var search = new Search(this._url, null);
            return search.execute(query);
        };
        /**
         * Formats a search results array
         *
         * @param rawResults The array to process
         */
        SearchResults.prototype.formatSearchResults = function (rawResults) {
            var results = new Array();
            var tempResults = rawResults.results ? rawResults.results : rawResults;
            for (var _i = 0, tempResults_1 = tempResults; _i < tempResults_1.length; _i++) {
                var tempResult = tempResults_1[_i];
                var cells = tempResult.Cells.results ? tempResult.Cells.results : tempResult.Cells;
                results.push(cells.reduce(function (res, cell) {
                    Object.defineProperty(res, cell.Key, {
                        configurable: false,
                        enumerable: true,
                        value: cell.Value,
                        writable: false,
                    });
                    return res;
                }, {}));
            }
            return results;
        };
        return SearchResults;
    }());
    (function (SortDirection) {
        SortDirection[SortDirection["Ascending"] = 0] = "Ascending";
        SortDirection[SortDirection["Descending"] = 1] = "Descending";
        SortDirection[SortDirection["FQLFormula"] = 2] = "FQLFormula";
    })(exports.SortDirection || (exports.SortDirection = {}));
    (function (ReorderingRuleMatchType) {
        ReorderingRuleMatchType[ReorderingRuleMatchType["ResultContainsKeyword"] = 0] = "ResultContainsKeyword";
        ReorderingRuleMatchType[ReorderingRuleMatchType["TitleContainsKeyword"] = 1] = "TitleContainsKeyword";
        ReorderingRuleMatchType[ReorderingRuleMatchType["TitleMatchesKeyword"] = 2] = "TitleMatchesKeyword";
        ReorderingRuleMatchType[ReorderingRuleMatchType["UrlStartsWith"] = 3] = "UrlStartsWith";
        ReorderingRuleMatchType[ReorderingRuleMatchType["UrlExactlyMatches"] = 4] = "UrlExactlyMatches";
        ReorderingRuleMatchType[ReorderingRuleMatchType["ContentTypeIs"] = 5] = "ContentTypeIs";
        ReorderingRuleMatchType[ReorderingRuleMatchType["FileExtensionMatches"] = 6] = "FileExtensionMatches";
        ReorderingRuleMatchType[ReorderingRuleMatchType["ResultHasTag"] = 7] = "ResultHasTag";
        ReorderingRuleMatchType[ReorderingRuleMatchType["ManualCondition"] = 8] = "ManualCondition";
    })(exports.ReorderingRuleMatchType || (exports.ReorderingRuleMatchType = {}));
    (function (QueryPropertyValueType) {
        QueryPropertyValueType[QueryPropertyValueType["None"] = 0] = "None";
        QueryPropertyValueType[QueryPropertyValueType["StringType"] = 1] = "StringType";
        QueryPropertyValueType[QueryPropertyValueType["Int32Type"] = 2] = "Int32Type";
        QueryPropertyValueType[QueryPropertyValueType["BooleanType"] = 3] = "BooleanType";
        QueryPropertyValueType[QueryPropertyValueType["StringArrayType"] = 4] = "StringArrayType";
        QueryPropertyValueType[QueryPropertyValueType["UnSupportedType"] = 5] = "UnSupportedType";
    })(exports.QueryPropertyValueType || (exports.QueryPropertyValueType = {}));
    var SearchBuiltInSourceId = /** @class */ (function () {
        function SearchBuiltInSourceId() {
        }
        SearchBuiltInSourceId.Documents = "e7ec8cee-ded8-43c9-beb5-436b54b31e84";
        SearchBuiltInSourceId.ItemsMatchingContentType = "5dc9f503-801e-4ced-8a2c-5d1237132419";
        SearchBuiltInSourceId.ItemsMatchingTag = "e1327b9c-2b8c-4b23-99c9-3730cb29c3f7";
        SearchBuiltInSourceId.ItemsRelatedToCurrentUser = "48fec42e-4a92-48ce-8363-c2703a40e67d";
        SearchBuiltInSourceId.ItemsWithSameKeywordAsThisItem = "5c069288-1d17-454a-8ac6-9c642a065f48";
        SearchBuiltInSourceId.LocalPeopleResults = "b09a7990-05ea-4af9-81ef-edfab16c4e31";
        SearchBuiltInSourceId.LocalReportsAndDataResults = "203fba36-2763-4060-9931-911ac8c0583b";
        SearchBuiltInSourceId.LocalSharePointResults = "8413cd39-2156-4e00-b54d-11efd9abdb89";
        SearchBuiltInSourceId.LocalVideoResults = "78b793ce-7956-4669-aa3b-451fc5defebf";
        SearchBuiltInSourceId.Pages = "5e34578e-4d08-4edc-8bf3-002acf3cdbcc";
        SearchBuiltInSourceId.Pictures = "38403c8c-3975-41a8-826e-717f2d41568a";
        SearchBuiltInSourceId.Popular = "97c71db1-58ce-4891-8b64-585bc2326c12";
        SearchBuiltInSourceId.RecentlyChangedItems = "ba63bbae-fa9c-42c0-b027-9a878f16557c";
        SearchBuiltInSourceId.RecommendedItems = "ec675252-14fa-4fbe-84dd-8d098ed74181";
        SearchBuiltInSourceId.Wiki = "9479bf85-e257-4318-b5a8-81a180f5faa1";
        return SearchBuiltInSourceId;
    }());

    var SearchSuggest = /** @class */ (function (_super) {
        tslib_1.__extends(SearchSuggest, _super);
        function SearchSuggest() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SearchSuggest.prototype.execute = function (query) {
            this.mapQueryToQueryString(query);
            return this.get().then(function (response) {
                var mapper = common.hOP(response, "suggest") ? function (s) { return response.suggest[s].results; } : function (s) { return response[s]; };
                return {
                    PeopleNames: mapper("PeopleNames"),
                    PersonalResults: mapper("PersonalResults"),
                    Queries: mapper("Queries"),
                };
            });
        };
        SearchSuggest.prototype.mapQueryToQueryString = function (query) {
            var _this = this;
            var setProp = function (q) { return function (checkProp) { return function (sp) {
                if (common.hOP(q, checkProp)) {
                    _this.query.set(sp, q[checkProp].toString());
                }
            }; }; };
            this.query.set("querytext", "'" + query.querytext + "'");
            var querySetter = setProp(query);
            querySetter("count")("inumberofquerysuggestions");
            querySetter("personalCount")("inumberofresultsuggestions");
            querySetter("preQuery")("fprequerysuggestions");
            querySetter("hitHighlighting")("fhithighlighting");
            querySetter("capitalize")("fcapitalizefirstletters");
            querySetter("culture")("culture");
            querySetter("stemming")("enablestemming");
            querySetter("includePeople")("showpeoplenamesuggestions");
            querySetter("queryRules")("enablequeryrules");
            querySetter("prefixMatch")("fprefixmatchallterms");
        };
        SearchSuggest = tslib_1.__decorate([
            defaultPath("_api/search/suggest")
        ], SearchSuggest);
        return SearchSuggest;
    }(SharePointQueryableInstance));

    /**
     * Manages a batch of OData operations
     */
    var SPBatch = /** @class */ (function (_super) {
        tslib_1.__extends(SPBatch, _super);
        function SPBatch(baseUrl) {
            var _this = _super.call(this) || this;
            _this.baseUrl = baseUrl;
            return _this;
        }
        /**
         * Parses the response from a batch request into an array of Response instances
         *
         * @param body Text body of the response from the batch request
         */
        SPBatch.ParseResponse = function (body) {
            return new Promise(function (resolve, reject) {
                var responses = [];
                var header = "--batchresponse_";
                // Ex. "HTTP/1.1 500 Internal Server Error"
                var statusRegExp = new RegExp("^HTTP/[0-9.]+ +([0-9]+) +(.*)", "i");
                var lines = body.split("\n");
                var state = "batch";
                var status;
                var statusText;
                for (var i = 0; i < lines.length; ++i) {
                    var line = lines[i];
                    switch (state) {
                        case "batch":
                            if (line.substr(0, header.length) === header) {
                                state = "batchHeaders";
                            }
                            else {
                                if (line.trim() !== "") {
                                    throw new Error("Invalid response, line " + i);
                                }
                            }
                            break;
                        case "batchHeaders":
                            if (line.trim() === "") {
                                state = "status";
                            }
                            break;
                        case "status":
                            var parts = statusRegExp.exec(line);
                            if (parts.length !== 3) {
                                throw new Error("Invalid status, line " + i);
                            }
                            status = parseInt(parts[1], 10);
                            statusText = parts[2];
                            state = "statusHeaders";
                            break;
                        case "statusHeaders":
                            if (line.trim() === "") {
                                state = "body";
                            }
                            break;
                        case "body":
                            responses.push((status === 204) ? new Response() : new Response(line, { status: status, statusText: statusText }));
                            state = "batch";
                            break;
                    }
                }
                if (state !== "status") {
                    reject(new Error("Unexpected end of input"));
                }
                resolve(responses);
            });
        };
        SPBatch.prototype.executeImpl = function () {
            var _this = this;
            logging.Logger.write("[" + this.batchId + "] (" + (new Date()).getTime() + ") Executing batch with " + this.requests.length + " requests.", 1 /* Info */);
            // if we don't have any requests, don't bother sending anything
            // this could be due to caching further upstream, or just an empty batch
            if (this.requests.length < 1) {
                logging.Logger.write("Resolving empty batch.", 1 /* Info */);
                return Promise.resolve();
            }
            // creating the client here allows the url to be populated for nodejs client as well as potentially
            // any other hacks needed for other types of clients. Essentially allows the absoluteRequestUrl
            // below to be correct
            var client = new SPHttpClient();
            // due to timing we need to get the absolute url here so we can use it for all the individual requests
            // and for sending the entire batch
            return toAbsoluteUrl(this.baseUrl).then(function (absoluteRequestUrl) {
                // build all the requests, send them, pipe results in order to parsers
                var batchBody = [];
                var currentChangeSetId = "";
                for (var i = 0; i < _this.requests.length; i++) {
                    var reqInfo = _this.requests[i];
                    if (reqInfo.method === "GET") {
                        if (currentChangeSetId.length > 0) {
                            // end an existing change set
                            batchBody.push("--changeset_" + currentChangeSetId + "--\n\n");
                            currentChangeSetId = "";
                        }
                        batchBody.push("--batch_" + _this.batchId + "\n");
                    }
                    else {
                        if (currentChangeSetId.length < 1) {
                            // start new change set
                            currentChangeSetId = common.getGUID();
                            batchBody.push("--batch_" + _this.batchId + "\n");
                            batchBody.push("Content-Type: multipart/mixed; boundary=\"changeset_" + currentChangeSetId + "\"\n\n");
                        }
                        batchBody.push("--changeset_" + currentChangeSetId + "\n");
                    }
                    // common batch part prefix
                    batchBody.push("Content-Type: application/http\n");
                    batchBody.push("Content-Transfer-Encoding: binary\n\n");
                    var headers = new Headers();
                    // this is the url of the individual request within the batch
                    var url = common.isUrlAbsolute(reqInfo.url) ? reqInfo.url : common.combine(absoluteRequestUrl, reqInfo.url);
                    logging.Logger.write("[" + _this.batchId + "] (" + (new Date()).getTime() + ") Adding request " + reqInfo.method + " " + url + " to batch.", 0 /* Verbose */);
                    if (reqInfo.method !== "GET") {
                        var method = reqInfo.method;
                        var castHeaders = reqInfo.options.headers;
                        if (common.hOP(reqInfo, "options") && common.hOP(reqInfo.options, "headers") && castHeaders["X-HTTP-Method"] !== undefined) {
                            method = castHeaders["X-HTTP-Method"];
                            delete castHeaders["X-HTTP-Method"];
                        }
                        batchBody.push(method + " " + url + " HTTP/1.1\n");
                        headers.set("Content-Type", "application/json;odata=verbose;charset=utf-8");
                    }
                    else {
                        batchBody.push(reqInfo.method + " " + url + " HTTP/1.1\n");
                    }
                    // merge global config headers
                    common.mergeHeaders(headers, SPRuntimeConfig.headers);
                    // merge per-request headers
                    if (reqInfo.options) {
                        common.mergeHeaders(headers, reqInfo.options.headers);
                    }
                    // lastly we apply any default headers we need that may not exist
                    if (!headers.has("Accept")) {
                        headers.append("Accept", "application/json");
                    }
                    if (!headers.has("Content-Type")) {
                        headers.append("Content-Type", "application/json;odata=verbose;charset=utf-8");
                    }
                    if (!headers.has("X-ClientService-ClientTag")) {
                        headers.append("X-ClientService-ClientTag", "PnPCoreJS:@pnp-1.1.5-2");
                    }
                    // write headers into batch body
                    headers.forEach(function (value, name) {
                        batchBody.push(name + ": " + value + "\n");
                    });
                    batchBody.push("\n");
                    if (reqInfo.options.body) {
                        batchBody.push(reqInfo.options.body + "\n\n");
                    }
                }
                if (currentChangeSetId.length > 0) {
                    // Close the changeset
                    batchBody.push("--changeset_" + currentChangeSetId + "--\n\n");
                    currentChangeSetId = "";
                }
                batchBody.push("--batch_" + _this.batchId + "--\n");
                var batchOptions = {
                    "body": batchBody.join(""),
                    "headers": {
                        "Content-Type": "multipart/mixed; boundary=batch_" + _this.batchId,
                    },
                    "method": "POST",
                };
                logging.Logger.write("[" + _this.batchId + "] (" + (new Date()).getTime() + ") Sending batch request.", 1 /* Info */);
                return client.fetch(common.combine(absoluteRequestUrl, "/_api/$batch"), batchOptions)
                    .then(function (r) { return r.text(); })
                    .then(SPBatch.ParseResponse)
                    .then(function (responses) {
                    if (responses.length !== _this.requests.length) {
                        throw new Error("Could not properly parse responses to match requests in batch.");
                    }
                    logging.Logger.write("[" + _this.batchId + "] (" + (new Date()).getTime() + ") Resolving batched requests.", 1 /* Info */);
                    return responses.reduce(function (chain, response, index) {
                        var request = _this.requests[index];
                        logging.Logger.write("[" + request.id + "] (" + (new Date()).getTime() + ") Resolving request in batch " + _this.batchId + ".", 1 /* Info */);
                        return chain.then(function (_) { return request.parser.parse(response).then(request.resolve).catch(request.reject); });
                    }, Promise.resolve());
                });
            });
        };
        return SPBatch;
    }(odata.ODataBatch));

    /**
     * Describes a collection of List objects
     *
     */
    var Features = /** @class */ (function (_super) {
        tslib_1.__extends(Features, _super);
        function Features() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Gets a list from the collection by guid id
             *
             * @param id The Id of the feature (GUID)
             */
            _this.getById = _this._getById(Feature);
            return _this;
        }
        Features_1 = Features;
        /**
         * Adds a new list to the collection
         *
         * @param id The Id of the feature (GUID)
         * @param force If true the feature activation will be forced
         */
        Features.prototype.add = function (id, force) {
            var _this = this;
            if (force === void 0) { force = false; }
            return this.clone(Features_1, "add").postCore({
                body: common.jsS({
                    featdefScope: 0,
                    featureId: id,
                    force: force,
                }),
            }).then(function (data) {
                return {
                    data: data,
                    feature: _this.getById(id),
                };
            });
        };
        /**
         * Removes (deactivates) a feature from the collection
         *
         * @param id The Id of the feature (GUID)
         * @param force If true the feature deactivation will be forced
         */
        Features.prototype.remove = function (id, force) {
            if (force === void 0) { force = false; }
            return this.clone(Features_1, "remove").postCore({
                body: common.jsS({
                    featureId: id,
                    force: force,
                }),
            });
        };
        Features = Features_1 = tslib_1.__decorate([
            defaultPath("features")
        ], Features);
        return Features;
        var Features_1;
    }(SharePointQueryableCollection));
    var Feature = /** @class */ (function (_super) {
        tslib_1.__extends(Feature, _super);
        function Feature() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Removes (deactivates) a feature from the collection
         *
         * @param force If true the feature deactivation will be forced
         */
        Feature.prototype.deactivate = function (force) {
            var _this = this;
            if (force === void 0) { force = false; }
            var removeDependency = this.addBatchDependency();
            var idGet = new Feature(this).select("DefinitionId");
            return idGet.get().then(function (feature) {
                var promise = _this.getParent(Features, _this.parentUrl, "", _this.batch).remove(feature.DefinitionId, force);
                removeDependency();
                return promise;
            });
        };
        return Feature;
    }(SharePointQueryableInstance));

    var RelatedItemManagerImpl = /** @class */ (function (_super) {
        tslib_1.__extends(RelatedItemManagerImpl, _super);
        function RelatedItemManagerImpl() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        RelatedItemManagerImpl_1 = RelatedItemManagerImpl;
        RelatedItemManagerImpl.FromUrl = function (url) {
            if (url === null) {
                return new RelatedItemManagerImpl_1("");
            }
            var index = url.indexOf("_api/");
            if (index > -1) {
                return new RelatedItemManagerImpl_1(url.substr(0, index));
            }
            return new RelatedItemManagerImpl_1(url);
        };
        RelatedItemManagerImpl.prototype.getRelatedItems = function (sourceListName, sourceItemId) {
            var query = this.clone(RelatedItemManagerImpl_1, null);
            query.concat(".GetRelatedItems");
            return query.postCore({
                body: common.jsS({
                    SourceItemID: sourceItemId,
                    SourceListName: sourceListName,
                }),
            });
        };
        RelatedItemManagerImpl.prototype.getPageOneRelatedItems = function (sourceListName, sourceItemId) {
            var query = this.clone(RelatedItemManagerImpl_1, null);
            query.concat(".GetPageOneRelatedItems");
            return query.postCore({
                body: common.jsS({
                    SourceItemID: sourceItemId,
                    SourceListName: sourceListName,
                }),
            });
        };
        RelatedItemManagerImpl.prototype.addSingleLink = function (sourceListName, sourceItemId, sourceWebUrl, targetListName, targetItemID, targetWebUrl, tryAddReverseLink) {
            if (tryAddReverseLink === void 0) { tryAddReverseLink = false; }
            var query = this.clone(RelatedItemManagerImpl_1, null);
            query.concat(".AddSingleLink");
            return query.postCore({
                body: common.jsS({
                    SourceItemID: sourceItemId,
                    SourceListName: sourceListName,
                    SourceWebUrl: sourceWebUrl,
                    TargetItemID: targetItemID,
                    TargetListName: targetListName,
                    TargetWebUrl: targetWebUrl,
                    TryAddReverseLink: tryAddReverseLink,
                }),
            });
        };
        /**
         * Adds a related item link from an item specified by list name and item id, to an item specified by url
         *
         * @param sourceListName The source list name or list id
         * @param sourceItemId The source item id
         * @param targetItemUrl The target item url
         * @param tryAddReverseLink If set to true try to add the reverse link (will not return error if it fails)
         */
        RelatedItemManagerImpl.prototype.addSingleLinkToUrl = function (sourceListName, sourceItemId, targetItemUrl, tryAddReverseLink) {
            if (tryAddReverseLink === void 0) { tryAddReverseLink = false; }
            var query = this.clone(RelatedItemManagerImpl_1, null);
            query.concat(".AddSingleLinkToUrl");
            return query.postCore({
                body: common.jsS({
                    SourceItemID: sourceItemId,
                    SourceListName: sourceListName,
                    TargetItemUrl: targetItemUrl,
                    TryAddReverseLink: tryAddReverseLink,
                }),
            });
        };
        /**
         * Adds a related item link from an item specified by url, to an item specified by list name and item id
         *
         * @param sourceItemUrl The source item url
         * @param targetListName The target list name or list id
         * @param targetItemId The target item id
         * @param tryAddReverseLink If set to true try to add the reverse link (will not return error if it fails)
         */
        RelatedItemManagerImpl.prototype.addSingleLinkFromUrl = function (sourceItemUrl, targetListName, targetItemId, tryAddReverseLink) {
            if (tryAddReverseLink === void 0) { tryAddReverseLink = false; }
            var query = this.clone(RelatedItemManagerImpl_1, null);
            query.concat(".AddSingleLinkFromUrl");
            return query.postCore({
                body: common.jsS({
                    SourceItemUrl: sourceItemUrl,
                    TargetItemID: targetItemId,
                    TargetListName: targetListName,
                    TryAddReverseLink: tryAddReverseLink,
                }),
            });
        };
        RelatedItemManagerImpl.prototype.deleteSingleLink = function (sourceListName, sourceItemId, sourceWebUrl, targetListName, targetItemId, targetWebUrl, tryDeleteReverseLink) {
            if (tryDeleteReverseLink === void 0) { tryDeleteReverseLink = false; }
            var query = this.clone(RelatedItemManagerImpl_1, null);
            query.concat(".DeleteSingleLink");
            return query.postCore({
                body: common.jsS({
                    SourceItemID: sourceItemId,
                    SourceListName: sourceListName,
                    SourceWebUrl: sourceWebUrl,
                    TargetItemID: targetItemId,
                    TargetListName: targetListName,
                    TargetWebUrl: targetWebUrl,
                    TryDeleteReverseLink: tryDeleteReverseLink,
                }),
            });
        };
        RelatedItemManagerImpl = RelatedItemManagerImpl_1 = tslib_1.__decorate([
            defaultPath("_api/SP.RelatedItemManager")
        ], RelatedItemManagerImpl);
        return RelatedItemManagerImpl;
        var RelatedItemManagerImpl_1;
    }(SharePointQueryable));

    /**
     * Describes a collection of webs
     *
     */
    var Webs = /** @class */ (function (_super) {
        tslib_1.__extends(Webs, _super);
        function Webs() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Webs_1 = Webs;
        /**
         * Adds a new web to the collection
         *
         * @param title The new web's title
         * @param url The new web's relative url
         * @param description The new web's description
         * @param template The new web's template internal name (default = STS)
         * @param language The locale id that specifies the new web's language (default = 1033 [English, US])
         * @param inheritPermissions When true, permissions will be inherited from the new web's parent (default = true)
         */
        Webs.prototype.add = function (title, url, description, template, language, inheritPermissions) {
            if (description === void 0) { description = ""; }
            if (template === void 0) { template = "STS"; }
            if (language === void 0) { language = 1033; }
            if (inheritPermissions === void 0) { inheritPermissions = true; }
            var props = {
                Description: description,
                Language: language,
                Title: title,
                Url: url,
                UseSamePermissionsAsParentSite: inheritPermissions,
                WebTemplate: template,
            };
            var postBody = common.jsS({
                "parameters": common.extend({
                    "__metadata": { "type": "SP.WebCreationInformation" },
                }, props),
            });
            return this.clone(Webs_1, "add").postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    web: new Web(odataUrlFrom(data).replace(/_api\/web\/?/i, "")),
                };
            });
        };
        Webs = Webs_1 = tslib_1.__decorate([
            defaultPath("webs")
        ], Webs);
        return Webs;
        var Webs_1;
    }(SharePointQueryableCollection));
    /**
     * Describes a collection of web infos
     *
     */
    var WebInfos = /** @class */ (function (_super) {
        tslib_1.__extends(WebInfos, _super);
        function WebInfos() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        WebInfos = tslib_1.__decorate([
            defaultPath("webinfos")
        ], WebInfos);
        return WebInfos;
    }(SharePointQueryableCollection));
    /**
     * Describes a web
     *
     */
    var Web = /** @class */ (function (_super) {
        tslib_1.__extends(Web, _super);
        function Web() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Web_1 = Web;
        /**
         * Creates a new web instance from the given url by indexing the location of the /_api/
         * segment. If this is not found the method creates a new web with the entire string as
         * supplied.
         *
         * @param url
         */
        Web.fromUrl = function (url, path) {
            return new Web_1(extractWebUrl(url), path);
        };
        Object.defineProperty(Web.prototype, "webs", {
            /**
             * Gets this web's subwebs
             *
             */
            get: function () {
                return new Webs(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets this web's parent web and data
         *
         */
        Web.prototype.getParentWeb = function () {
            var _this = this;
            return this.select("ParentWeb/Id").expand("ParentWeb").get()
                .then(function (_a) {
                var ParentWeb = _a.ParentWeb;
                return new Site(_this.toUrlAndQuery().split("/_api")[0]).openWebById(ParentWeb.Id);
            });
        };
        /**
        * Returns a collection of objects that contain metadata about subsites of the current site in which the current user is a member.
        *
        * @param nWebTemplateFilter Specifies the site definition (default = -1)
        * @param nConfigurationFilter A 16-bit integer that specifies the identifier of a configuration (default = -1)
        */
        Web.prototype.getSubwebsFilteredForCurrentUser = function (nWebTemplateFilter, nConfigurationFilter) {
            if (nWebTemplateFilter === void 0) { nWebTemplateFilter = -1; }
            if (nConfigurationFilter === void 0) { nConfigurationFilter = -1; }
            return this.clone(Webs, "getSubwebsFilteredForCurrentUser(nWebTemplateFilter=" + nWebTemplateFilter + ",nConfigurationFilter=" + nConfigurationFilter + ")");
        };
        Object.defineProperty(Web.prototype, "allProperties", {
            /**
             * Allows access to the web's all properties collection
             */
            get: function () {
                return this.clone(SharePointQueryableCollection, "allproperties");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "webinfos", {
            /**
             * Gets a collection of WebInfos for this web's subwebs
             *
             */
            get: function () {
                return new WebInfos(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "contentTypes", {
            /**
             * Gets the content types available in this web
             *
             */
            get: function () {
                return new ContentTypes(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "lists", {
            /**
             * Gets the lists in this web
             *
             */
            get: function () {
                return new Lists(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "fields", {
            /**
             * Gets the fields in this web
             *
             */
            get: function () {
                return new Fields(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "features", {
            /**
             * Gets the active features for this web
             *
             */
            get: function () {
                return new Features(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "availablefields", {
            /**
             * Gets the available fields in this web
             *
             */
            get: function () {
                return new Fields(this, "availablefields");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "navigation", {
            /**
             * Gets the navigation options in this web
             *
             */
            get: function () {
                return new Navigation(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "siteUsers", {
            /**
             * Gets the site users
             *
             */
            get: function () {
                return new SiteUsers(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "siteGroups", {
            /**
             * Gets the site groups
             *
             */
            get: function () {
                return new SiteGroups(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "siteUserInfoList", {
            /**
             * Gets site user info list
             *
             */
            get: function () {
                return new List(this, "siteuserinfolist");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "regionalSettings", {
            /**
             * Gets regional settings
             *
             */
            get: function () {
                return new RegionalSettings(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "currentUser", {
            /**
             * Gets the current user
             */
            get: function () {
                return new CurrentUser(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "folders", {
            /**
             * Gets the top-level folders in this web
             *
             */
            get: function () {
                return new Folders(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "userCustomActions", {
            /**
             * Gets all user custom actions for this web
             *
             */
            get: function () {
                return new UserCustomActions(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "roleDefinitions", {
            /**
             * Gets the collection of RoleDefinition resources
             *
             */
            get: function () {
                return new RoleDefinitions(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "relatedItems", {
            /**
             * Provides an interface to manage related items
             *
             */
            get: function () {
                return RelatedItemManagerImpl.FromUrl(this.toUrl());
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Creates a new batch for requests within the context of this web
         *
         */
        Web.prototype.createBatch = function () {
            return new SPBatch(this.parentUrl);
        };
        Object.defineProperty(Web.prototype, "rootFolder", {
            /**
             * Gets the root folder of this web
             *
             */
            get: function () {
                return new Folder(this, "rootFolder");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "associatedOwnerGroup", {
            /**
             * Gets the associated owner group for this web
             *
             */
            get: function () {
                return new SiteGroup(this, "associatedownergroup");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "associatedMemberGroup", {
            /**
             * Gets the associated member group for this web
             *
             */
            get: function () {
                return new SiteGroup(this, "associatedmembergroup");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Web.prototype, "associatedVisitorGroup", {
            /**
             * Gets the associated visitor group for this web
             *
             */
            get: function () {
                return new SiteGroup(this, "associatedvisitorgroup");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets a folder by server relative url
         *
         * @param folderRelativeUrl The server relative path to the folder (including /sites/ if applicable)
         */
        Web.prototype.getFolderByServerRelativeUrl = function (folderRelativeUrl) {
            return new Folder(this, "getFolderByServerRelativeUrl('" + folderRelativeUrl + "')");
        };
        /**
         * Gets a folder by server relative relative path if your folder name contains # and % characters
         * you need to first encode the file name using encodeURIComponent() and then pass the url
         * let url = "/sites/test/Shared Documents/" + encodeURIComponent("%123");
         * This works only in SharePoint online.
         *
         * @param folderRelativeUrl The server relative path to the folder (including /sites/ if applicable)
         */
        Web.prototype.getFolderByServerRelativePath = function (folderRelativeUrl) {
            return new Folder(this, "getFolderByServerRelativePath(decodedUrl='" + folderRelativeUrl + "')");
        };
        /**
         * Gets a file by server relative url
         *
         * @param fileRelativeUrl The server relative path to the file (including /sites/ if applicable)
         */
        Web.prototype.getFileByServerRelativeUrl = function (fileRelativeUrl) {
            return new File(this, "getFileByServerRelativeUrl('" + fileRelativeUrl + "')");
        };
        /**
         * Gets a file by server relative url if your file name contains # and % characters
         * you need to first encode the file name using encodeURIComponent() and then pass the url
         * let url = "/sites/test/Shared Documents/" + encodeURIComponent("%123.docx");
         *
         * @param fileRelativeUrl The server relative path to the file (including /sites/ if applicable)
         */
        Web.prototype.getFileByServerRelativePath = function (fileRelativeUrl) {
            return new File(this, "getFileByServerRelativePath(decodedUrl='" + fileRelativeUrl + "')");
        };
        /**
         * Gets a list by server relative url (list's root folder)
         *
         * @param listRelativeUrl The server relative path to the list's root folder (including /sites/ if applicable)
         */
        Web.prototype.getList = function (listRelativeUrl) {
            return new List(this, "getList('" + listRelativeUrl + "')");
        };
        /**
         * Updates this web instance with the supplied properties
         *
         * @param properties A plain object hash of values to update for the web
         */
        Web.prototype.update = function (properties) {
            var _this = this;
            var postBody = common.jsS(common.extend({
                "__metadata": { "type": "SP.Web" },
            }, properties));
            return this.postCore({
                body: postBody,
                headers: {
                    "X-HTTP-Method": "MERGE",
                },
            }).then(function (data) {
                return {
                    data: data,
                    web: _this,
                };
            });
        };
        /**
         * Deletes this web
         *
         */
        Web.prototype.delete = function () {
            return _super.prototype.deleteCore.call(this);
        };
        /**
         * Applies the theme specified by the contents of each of the files specified in the arguments to the site
         *
         * @param colorPaletteUrl The server-relative URL of the color palette file
         * @param fontSchemeUrl The server-relative URL of the font scheme
         * @param backgroundImageUrl The server-relative URL of the background image
         * @param shareGenerated When true, the generated theme files are stored in the root site. When false, they are stored in this web
         */
        Web.prototype.applyTheme = function (colorPaletteUrl, fontSchemeUrl, backgroundImageUrl, shareGenerated) {
            var postBody = common.jsS({
                backgroundImageUrl: backgroundImageUrl,
                colorPaletteUrl: colorPaletteUrl,
                fontSchemeUrl: fontSchemeUrl,
                shareGenerated: shareGenerated,
            });
            return this.clone(Web_1, "applytheme").postCore({ body: postBody });
        };
        /**
         * Applies the specified site definition or site template to the Web site that has no template applied to it
         *
         * @param template Name of the site definition or the name of the site template
         */
        Web.prototype.applyWebTemplate = function (template) {
            var q = this.clone(Web_1, "applywebtemplate");
            q.concat("(@t)");
            q.query.set("@t", template);
            return q.postCore();
        };
        /**
         * Checks whether the specified login name belongs to a valid user in the web. If the user doesn't exist, adds the user to the web.
         *
         * @param loginName The login name of the user (ex: i:0#.f|membership|user@domain.onmicrosoft.com)
         */
        Web.prototype.ensureUser = function (loginName) {
            var postBody = common.jsS({
                logonName: loginName,
            });
            return this.clone(Web_1, "ensureuser").postCore({ body: postBody }).then(function (data) {
                return {
                    data: data,
                    user: new SiteUser(odataUrlFrom(data)),
                };
            });
        };
        /**
         * Returns a collection of site templates available for the site
         *
         * @param language The locale id of the site templates to retrieve (default = 1033 [English, US])
         * @param includeCrossLanguage When true, includes language-neutral site templates; otherwise false (default = true)
         */
        Web.prototype.availableWebTemplates = function (language, includeCrossLanugage) {
            if (language === void 0) { language = 1033; }
            if (includeCrossLanugage === void 0) { includeCrossLanugage = true; }
            return new SharePointQueryableCollection(this, "getavailablewebtemplates(lcid=" + language + ", doincludecrosslanguage=" + includeCrossLanugage + ")");
        };
        /**
         * Returns the list gallery on the site
         *
         * @param type The gallery type - WebTemplateCatalog = 111, WebPartCatalog = 113 ListTemplateCatalog = 114,
         * MasterPageCatalog = 116, SolutionCatalog = 121, ThemeCatalog = 123, DesignCatalog = 124, AppDataCatalog = 125
         */
        Web.prototype.getCatalog = function (type) {
            return this.clone(Web_1, "getcatalog(" + type + ")").select("Id").get().then(function (data) {
                return new List(odataUrlFrom(data));
            });
        };
        /**
         * Returns the collection of changes from the change log that have occurred within the list, based on the specified query
         *
         * @param query The change query
         */
        Web.prototype.getChanges = function (query) {
            var postBody = common.jsS({ "query": common.extend({ "__metadata": { "type": "SP.ChangeQuery" } }, query) });
            return this.clone(Web_1, "getchanges").postCore({ body: postBody });
        };
        Object.defineProperty(Web.prototype, "customListTemplate", {
            /**
             * Gets the custom list templates for the site
             *
             */
            get: function () {
                return new SharePointQueryableCollection(this, "getcustomlisttemplates");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Returns the user corresponding to the specified member identifier for the current site
         *
         * @param id The id of the user
         */
        Web.prototype.getUserById = function (id) {
            return new SiteUser(this, "getUserById(" + id + ")");
        };
        /**
         * Returns the name of the image file for the icon that is used to represent the specified file
         *
         * @param filename The file name. If this parameter is empty, the server returns an empty string
         * @param size The size of the icon: 16x16 pixels = 0, 32x32 pixels = 1 (default = 0)
         * @param progId The ProgID of the application that was used to create the file, in the form OLEServerName.ObjectName
         */
        Web.prototype.mapToIcon = function (filename, size, progId) {
            if (size === void 0) { size = 0; }
            if (progId === void 0) { progId = ""; }
            return this.clone(Web_1, "maptoicon(filename='" + filename + "', progid='" + progId + "', size=" + size + ")").get();
        };
        /**
         * Returns the tenant property corresponding to the specified key in the app catalog site
         *
         * @param key Id of storage entity to be set
         */
        Web.prototype.getStorageEntity = function (key) {
            return this.clone(Web_1, "getStorageEntity('" + key + "')").get();
        };
        /**
         * This will set the storage entity identified by the given key (MUST be called in the context of the app catalog)
         *
         * @param key Id of storage entity to be set
         * @param value Value of storage entity to be set
         * @param description Description of storage entity to be set
         * @param comments Comments of storage entity to be set
         */
        Web.prototype.setStorageEntity = function (key, value, description, comments) {
            if (description === void 0) { description = ""; }
            if (comments === void 0) { comments = ""; }
            return this.clone(Web_1, "setStorageEntity").postCore({
                body: common.jsS({
                    comments: comments,
                    description: description,
                    key: key,
                    value: value,
                }),
            });
        };
        /**
         * This will remove the storage entity identified by the given key
         *
         * @param key Id of storage entity to be removed
         */
        Web.prototype.removeStorageEntity = function (key) {
            return this.clone(Web_1, "removeStorageEntity('" + key + "')").postCore();
        };
        /**
         * Gets the app catalog for this web
         *
         * @param url Optional url or web containing the app catalog (default: current web)
         */
        Web.prototype.getAppCatalog = function (url) {
            return new AppCatalog(url || this);
        };
        /**
         * Gets the collection of available client side web parts for this web instance
         */
        Web.prototype.getClientSideWebParts = function () {
            return this.clone(SharePointQueryableCollection, "GetClientSideWebParts").get();
        };
        /**
         * Creates a new client side page
         *
         * @param pageName Name of the new page
         * @param title Display title of the new page
         * @param libraryTitle Title of the library in which to create the new page. Default: "Site Pages"
         */
        Web.prototype.addClientSidePage = function (pageName, title, libraryTitle) {
            if (title === void 0) { title = pageName.replace(/\.[^/.]+$/, ""); }
            if (libraryTitle === void 0) { libraryTitle = "Site Pages"; }
            return ClientSidePage.create(this.lists.getByTitle(libraryTitle), pageName, title);
        };
        /**
         * Creates a new client side page using the library path
         *
         * @param pageName Name of the new page
         * @param listRelativePath The server relative path to the list's root folder (including /sites/ if applicable)
         * @param title Display title of the new page
         */
        Web.prototype.addClientSidePageByPath = function (pageName, listRelativePath, title) {
            if (title === void 0) { title = pageName.replace(/\.[^/.]+$/, ""); }
            return ClientSidePage.create(this.getList(listRelativePath), pageName, title);
        };
        Web = Web_1 = tslib_1.__decorate([
            defaultPath("_api/web")
        ], Web);
        return Web;
        var Web_1;
    }(SharePointQueryableShareableWeb));

    /**
     * Describes a site collection
     *
     */
    var Site = /** @class */ (function (_super) {
        tslib_1.__extends(Site, _super);
        function Site() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Site_1 = Site;
        Object.defineProperty(Site.prototype, "rootWeb", {
            /**
             * Gets the root web of the site collection
             *
             */
            get: function () {
                return new Web(this, "rootweb");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Site.prototype, "features", {
            /**
             * Gets the active features for this site collection
             *
             */
            get: function () {
                return new Features(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Site.prototype, "userCustomActions", {
            /**
             * Gets all custom actions for this site collection
             *
             */
            get: function () {
                return new UserCustomActions(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets a Web instance representing the root web of the site collection
         * correctly setup for chaining within the library
         */
        Site.prototype.getRootWeb = function () {
            return this.rootWeb.select("Url").get().then(function (web) { return new Web(web.Url); });
        };
        /**
         * Gets the context information for this site collection
         */
        Site.prototype.getContextInfo = function () {
            var q = new Site_1(this.parentUrl, "_api/contextinfo");
            return q.postCore().then(function (data) {
                if (common.hOP(data, "GetContextWebInformation")) {
                    var info = data.GetContextWebInformation;
                    info.SupportedSchemaVersions = info.SupportedSchemaVersions.results;
                    return info;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Gets the document libraries on a site. Static method. (SharePoint Online only)
         *
         * @param absoluteWebUrl The absolute url of the web whose document libraries should be returned
         */
        Site.prototype.getDocumentLibraries = function (absoluteWebUrl) {
            var q = new SharePointQueryable("", "_api/sp.web.getdocumentlibraries(@v)");
            q.query.set("@v", "'" + absoluteWebUrl + "'");
            return q.get().then(function (data) {
                if (common.hOP(data, "GetDocumentLibraries")) {
                    return data.GetDocumentLibraries;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Gets the site url from a page url
         *
         * @param absolutePageUrl The absolute url of the page
         */
        Site.prototype.getWebUrlFromPageUrl = function (absolutePageUrl) {
            var q = new SharePointQueryable("", "_api/sp.web.getweburlfrompageurl(@v)");
            q.query.set("@v", "'" + absolutePageUrl + "'");
            return q.get().then(function (data) {
                if (common.hOP(data, "GetWebUrlFromPageUrl")) {
                    return data.GetWebUrlFromPageUrl;
                }
                else {
                    return data;
                }
            });
        };
        /**
         * Creates a new batch for requests within the context of this site collection
         *
         */
        Site.prototype.createBatch = function () {
            return new SPBatch(this.parentUrl);
        };
        /**
         * Opens a web by id (using POST)
         *
         * @param webId The GUID id of the web to open
         */
        Site.prototype.openWebById = function (webId) {
            return this.clone(Site_1, "openWebById('" + webId + "')").postCore().then(function (d) { return ({
                data: d,
                web: Web.fromUrl(d["odata.id"] || d.__metadata.uri),
            }); });
        };
        Site = Site_1 = tslib_1.__decorate([
            defaultPath("_api/site")
        ], Site);
        return Site;
        var Site_1;
    }(SharePointQueryableInstance));

    var UserProfileQuery = /** @class */ (function (_super) {
        tslib_1.__extends(UserProfileQuery, _super);
        /**
         * Creates a new instance of the UserProfileQuery class
         *
         * @param baseUrl The url or SharePointQueryable which forms the parent of this user profile query
         */
        function UserProfileQuery(baseUrl, path) {
            if (path === void 0) { path = "_api/sp.userprofiles.peoplemanager"; }
            var _this = _super.call(this, baseUrl, path) || this;
            _this.clientPeoplePickerQuery = new ClientPeoplePickerQuery(baseUrl);
            _this.profileLoader = new ProfileLoader(baseUrl);
            return _this;
        }
        Object.defineProperty(UserProfileQuery.prototype, "editProfileLink", {
            /**
             * The url of the edit profile page for the current user
             */
            get: function () {
                return this.clone(UserProfileQuery, "EditProfileLink").get();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(UserProfileQuery.prototype, "isMyPeopleListPublic", {
            /**
             * A boolean value that indicates whether the current user's "People I'm Following" list is public
             */
            get: function () {
                return this.clone(UserProfileQuery, "IsMyPeopleListPublic").get();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * A boolean value that indicates whether the current user is being followed by the specified user
         *
         * @param loginName The account name of the user
         */
        UserProfileQuery.prototype.amIFollowedBy = function (loginName) {
            var q = this.clone(UserProfileQuery, "amifollowedby(@v)");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.get();
        };
        /**
         * A boolean value that indicates whether the current user is following the specified user
         *
         * @param loginName The account name of the user
         */
        UserProfileQuery.prototype.amIFollowing = function (loginName) {
            var q = this.clone(UserProfileQuery, "amifollowing(@v)");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.get();
        };
        /**
         * Gets tags that the current user is following
         *
         * @param maxCount The maximum number of tags to retrieve (default is 20)
         */
        UserProfileQuery.prototype.getFollowedTags = function (maxCount) {
            if (maxCount === void 0) { maxCount = 20; }
            return this.clone(UserProfileQuery, "getfollowedtags(" + maxCount + ")").get();
        };
        /**
         * Gets the people who are following the specified user
         *
         * @param loginName The account name of the user
         */
        UserProfileQuery.prototype.getFollowersFor = function (loginName) {
            var q = this.clone(UserProfileQuery, "getfollowersfor(@v)");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.get();
        };
        Object.defineProperty(UserProfileQuery.prototype, "myFollowers", {
            /**
             * Gets the people who are following the current user
             *
             */
            get: function () {
                return new SharePointQueryableCollection(this, "getmyfollowers");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(UserProfileQuery.prototype, "myProperties", {
            /**
             * Gets user properties for the current user
             *
             */
            get: function () {
                return new UserProfileQuery(this, "getmyproperties");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets the people who the specified user is following
         *
         * @param loginName The account name of the user.
         */
        UserProfileQuery.prototype.getPeopleFollowedBy = function (loginName) {
            var q = this.clone(UserProfileQuery, "getpeoplefollowedby(@v)");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.get();
        };
        /**
         * Gets user properties for the specified user.
         *
         * @param loginName The account name of the user.
         */
        UserProfileQuery.prototype.getPropertiesFor = function (loginName) {
            var q = this.clone(UserProfileQuery, "getpropertiesfor(@v)");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.get();
        };
        Object.defineProperty(UserProfileQuery.prototype, "trendingTags", {
            /**
             * Gets the 20 most popular hash tags over the past week, sorted so that the most popular tag appears first
             *
             */
            get: function () {
                var q = this.clone(UserProfileQuery, null);
                q.concat(".gettrendingtags");
                return q.get();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets the specified user profile property for the specified user
         *
         * @param loginName The account name of the user
         * @param propertyName The case-sensitive name of the property to get
         */
        UserProfileQuery.prototype.getUserProfilePropertyFor = function (loginName, propertyName) {
            var q = this.clone(UserProfileQuery, "getuserprofilepropertyfor(accountname=@v, propertyname='" + propertyName + "')");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.get();
        };
        /**
         * Removes the specified user from the user's list of suggested people to follow
         *
         * @param loginName The account name of the user
         */
        UserProfileQuery.prototype.hideSuggestion = function (loginName) {
            var q = this.clone(UserProfileQuery, "hidesuggestion(@v)");
            q.query.set("@v", "'" + encodeURIComponent(loginName) + "'");
            return q.postCore();
        };
        /**
         * A boolean values that indicates whether the first user is following the second user
         *
         * @param follower The account name of the user who might be following the followee
         * @param followee The account name of the user who might be followed by the follower
         */
        UserProfileQuery.prototype.isFollowing = function (follower, followee) {
            var q = this.clone(UserProfileQuery, null);
            q.concat(".isfollowing(possiblefolloweraccountname=@v, possiblefolloweeaccountname=@y)");
            q.query.set("@v", "'" + encodeURIComponent(follower) + "'");
            q.query.set("@y", "'" + encodeURIComponent(followee) + "'");
            return q.get();
        };
        /**
         * Uploads and sets the user profile picture (Users can upload a picture to their own profile only). Not supported for batching.
         *
         * @param profilePicSource Blob data representing the user's picture in BMP, JPEG, or PNG format of up to 4.76MB
         */
        UserProfileQuery.prototype.setMyProfilePic = function (profilePicSource) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var buffer = null;
                var reader = new FileReader();
                reader.onload = function (e) { return buffer = e.target.result; };
                reader.readAsArrayBuffer(profilePicSource);
                var request = new UserProfileQuery(_this, "setmyprofilepicture");
                request.postCore({
                    body: String.fromCharCode.apply(null, new Uint16Array(buffer)),
                }).then(function (_) { return resolve(); }).catch(function (e) { return reject(e); });
            });
        };
        /**
         * Sets single value User Profile property
         *
         * @param accountName The account name of the user
         * @param propertyName Property name
         * @param propertyValue Property value
         */
        UserProfileQuery.prototype.setSingleValueProfileProperty = function (accountName, propertyName, propertyValue) {
            var postBody = common.jsS({
                accountName: accountName,
                propertyName: propertyName,
                propertyValue: propertyValue,
            });
            return this.clone(UserProfileQuery, "SetSingleValueProfileProperty")
                .postCore({ body: postBody });
        };
        /**
         * Sets multi valued User Profile property
         *
         * @param accountName The account name of the user
         * @param propertyName Property name
         * @param propertyValues Property values
         */
        UserProfileQuery.prototype.setMultiValuedProfileProperty = function (accountName, propertyName, propertyValues) {
            var postBody = common.jsS({
                accountName: accountName,
                propertyName: propertyName,
                propertyValues: propertyValues,
            });
            return this.clone(UserProfileQuery, "SetMultiValuedProfileProperty")
                .postCore({ body: postBody });
        };
        /**
         * Provisions one or more users' personal sites. (My Site administrator on SharePoint Online only)
         *
         * @param emails The email addresses of the users to provision sites for
         */
        UserProfileQuery.prototype.createPersonalSiteEnqueueBulk = function () {
            var emails = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                emails[_i] = arguments[_i];
            }
            return this.profileLoader.createPersonalSiteEnqueueBulk(emails);
        };
        Object.defineProperty(UserProfileQuery.prototype, "ownerUserProfile", {
            /**
             * Gets the user profile of the site owner
             *
             */
            get: function () {
                return this.profileLoader.ownerUserProfile;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(UserProfileQuery.prototype, "userProfile", {
            /**
             * Gets the user profile for the current user
             */
            get: function () {
                return this.profileLoader.userProfile;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Enqueues creating a personal site for this user, which can be used to share documents, web pages, and other files
         *
         * @param interactiveRequest true if interactively (web) initiated request, or false (default) if non-interactively (client) initiated request
         */
        UserProfileQuery.prototype.createPersonalSite = function (interactiveRequest) {
            if (interactiveRequest === void 0) { interactiveRequest = false; }
            return this.profileLoader.createPersonalSite(interactiveRequest);
        };
        /**
         * Sets the privacy settings for this profile
         *
         * @param share true to make all social data public; false to make all social data private
         */
        UserProfileQuery.prototype.shareAllSocialData = function (share) {
            return this.profileLoader.shareAllSocialData(share);
        };
        /**
         * Resolves user or group using specified query parameters
         *
         * @param queryParams The query parameters used to perform resolve
         */
        UserProfileQuery.prototype.clientPeoplePickerResolveUser = function (queryParams) {
            return this.clientPeoplePickerQuery.clientPeoplePickerResolveUser(queryParams);
        };
        /**
         * Searches for users or groups using specified query parameters
         *
         * @param queryParams The query parameters used to perform search
         */
        UserProfileQuery.prototype.clientPeoplePickerSearchUser = function (queryParams) {
            return this.clientPeoplePickerQuery.clientPeoplePickerSearchUser(queryParams);
        };
        return UserProfileQuery;
    }(SharePointQueryableInstance));
    var ProfileLoader = /** @class */ (function (_super) {
        tslib_1.__extends(ProfileLoader, _super);
        function ProfileLoader() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ProfileLoader_1 = ProfileLoader;
        /**
         * Provisions one or more users' personal sites. (My Site administrator on SharePoint Online only) Doesn't support batching
         *
         * @param emails The email addresses of the users to provision sites for
         */
        ProfileLoader.prototype.createPersonalSiteEnqueueBulk = function (emails) {
            return this.clone(ProfileLoader_1, "createpersonalsiteenqueuebulk", false).postCore({
                body: common.jsS({ "emailIDs": emails }),
            });
        };
        Object.defineProperty(ProfileLoader.prototype, "ownerUserProfile", {
            /**
             * Gets the user profile of the site owner.
             *
             */
            get: function () {
                var q = this.getParent(ProfileLoader_1, this.parentUrl, "_api/sp.userprofiles.profileloader.getowneruserprofile");
                if (this.hasBatch) {
                    q = q.inBatch(this.batch);
                }
                return q.postCore();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ProfileLoader.prototype, "userProfile", {
            /**
             * Gets the user profile of the current user.
             *
             */
            get: function () {
                return this.clone(ProfileLoader_1, "getuserprofile").postCore();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Enqueues creating a personal site for this user, which can be used to share documents, web pages, and other files.
         *
         * @param interactiveRequest true if interactively (web) initiated request, or false (default) if non-interactively (client) initiated request
         */
        ProfileLoader.prototype.createPersonalSite = function (interactiveRequest) {
            if (interactiveRequest === void 0) { interactiveRequest = false; }
            return this.clone(ProfileLoader_1, "getuserprofile/createpersonalsiteenque(" + interactiveRequest + ")").postCore();
        };
        /**
         * Sets the privacy settings for this profile
         *
         * @param share true to make all social data public; false to make all social data private.
         */
        ProfileLoader.prototype.shareAllSocialData = function (share) {
            return this.clone(ProfileLoader_1, "getuserprofile/shareallsocialdata(" + share + ")").postCore();
        };
        ProfileLoader = ProfileLoader_1 = tslib_1.__decorate([
            defaultPath("_api/sp.userprofiles.profileloader.getprofileloader")
        ], ProfileLoader);
        return ProfileLoader;
        var ProfileLoader_1;
    }(SharePointQueryable));
    var ClientPeoplePickerQuery = /** @class */ (function (_super) {
        tslib_1.__extends(ClientPeoplePickerQuery, _super);
        function ClientPeoplePickerQuery() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ClientPeoplePickerQuery_1 = ClientPeoplePickerQuery;
        /**
         * Resolves user or group using specified query parameters
         *
         * @param queryParams The query parameters used to perform resolve
         */
        ClientPeoplePickerQuery.prototype.clientPeoplePickerResolveUser = function (queryParams) {
            var q = this.clone(ClientPeoplePickerQuery_1, null);
            q.concat(".clientpeoplepickerresolveuser");
            return q.postCore({
                body: this.createClientPeoplePickerQueryParametersRequestBody(queryParams),
            })
                .then(function (res) {
                if (typeof res === "object") {
                    return res.ClientPeoplePickerResolveUser;
                }
                return res;
            })
                .then(JSON.parse);
        };
        /**
         * Searches for users or groups using specified query parameters
         *
         * @param queryParams The query parameters used to perform search
         */
        ClientPeoplePickerQuery.prototype.clientPeoplePickerSearchUser = function (queryParams) {
            var q = this.clone(ClientPeoplePickerQuery_1, null);
            q.concat(".clientpeoplepickersearchuser");
            return q.postCore({
                body: this.createClientPeoplePickerQueryParametersRequestBody(queryParams),
            })
                .then(function (res) {
                if (typeof res === "object") {
                    return res.ClientPeoplePickerSearchUser;
                }
                return res;
            })
                .then(JSON.parse);
        };
        /**
         * Creates ClientPeoplePickerQueryParameters request body
         *
         * @param queryParams The query parameters to create request body
         */
        ClientPeoplePickerQuery.prototype.createClientPeoplePickerQueryParametersRequestBody = function (queryParams) {
            return common.jsS({
                "queryParams": common.extend(metadata("SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters"), queryParams),
            });
        };
        ClientPeoplePickerQuery = ClientPeoplePickerQuery_1 = tslib_1.__decorate([
            defaultPath("_api/sp.ui.applicationpages.clientpeoplepickerwebserviceinterface")
        ], ClientPeoplePickerQuery);
        return ClientPeoplePickerQuery;
        var ClientPeoplePickerQuery_1;
    }(SharePointQueryable));

    /**
     * Exposes social following methods
     */
    var SocialQuery = /** @class */ (function (_super) {
        tslib_1.__extends(SocialQuery, _super);
        function SocialQuery() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SocialQuery_1 = SocialQuery;
        Object.defineProperty(SocialQuery.prototype, "my", {
            get: function () {
                return new MySocialQuery(this);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets a URI to a site that lists the current user's followed sites.
         */
        SocialQuery.prototype.getFollowedSitesUri = function () {
            return this.clone(SocialQuery_1, "FollowedSitesUri").get().then(function (r) {
                return r.FollowedSitesUri || r;
            });
        };
        /**
         * Gets a URI to a site that lists the current user's followed documents.
         */
        SocialQuery.prototype.getFollowedDocumentsUri = function () {
            return this.clone(SocialQuery_1, "FollowedDocumentsUri").get().then(function (r) {
                return r.FollowedDocumentsUri || r;
            });
        };
        /**
         * Makes the current user start following a user, document, site, or tag
         *
         * @param actorInfo The actor to start following
         */
        SocialQuery.prototype.follow = function (actorInfo) {
            return this.clone(SocialQuery_1, "follow").postCore({ body: this.createSocialActorInfoRequestBody(actorInfo) });
        };
        /**
         * Indicates whether the current user is following a specified user, document, site, or tag
         *
         * @param actorInfo The actor to find the following status for
         */
        SocialQuery.prototype.isFollowed = function (actorInfo) {
            return this.clone(SocialQuery_1, "isfollowed").postCore({ body: this.createSocialActorInfoRequestBody(actorInfo) });
        };
        /**
         * Makes the current user stop following a user, document, site, or tag
         *
         * @param actorInfo The actor to stop following
         */
        SocialQuery.prototype.stopFollowing = function (actorInfo) {
            return this.clone(SocialQuery_1, "stopfollowing").postCore({ body: this.createSocialActorInfoRequestBody(actorInfo) });
        };
        /**
         * Creates SocialActorInfo request body
         *
         * @param actorInfo The actor to create request body
         */
        SocialQuery.prototype.createSocialActorInfoRequestBody = function (actorInfo) {
            return common.jsS({
                "actor": Object.assign(metadata("SP.Social.SocialActorInfo"), {
                    Id: null,
                }, actorInfo),
            });
        };
        SocialQuery = SocialQuery_1 = tslib_1.__decorate([
            defaultPath("_api/social.following")
        ], SocialQuery);
        return SocialQuery;
        var SocialQuery_1;
    }(SharePointQueryableInstance));
    var MySocialQuery = /** @class */ (function (_super) {
        tslib_1.__extends(MySocialQuery, _super);
        function MySocialQuery() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MySocialQuery_1 = MySocialQuery;
        /**
         * Gets users, documents, sites, and tags that the current user is following.
         *
         * @param types Bitwise set of SocialActorTypes to retrieve
         */
        MySocialQuery.prototype.followed = function (types) {
            return this.clone(MySocialQuery_1, "followed(types=" + types + ")").get().then(function (r) {
                return common.hOP(r, "Followed") ? r.Followed.results : r;
            });
        };
        /**
         * Gets the count of users, documents, sites, and tags that the current user is following.
         *
         * @param types Bitwise set of SocialActorTypes to retrieve
         */
        MySocialQuery.prototype.followedCount = function (types) {
            return this.clone(MySocialQuery_1, "followedcount(types=" + types + ")").get().then(function (r) {
                return r.FollowedCount || r;
            });
        };
        /**
         * Gets the users who are following the current user.
         */
        MySocialQuery.prototype.followers = function () {
            return this.clone(MySocialQuery_1, "followers").get().then(function (r) {
                return common.hOP(r, "Followers") ? r.Followers.results : r;
            });
        };
        /**
         * Gets users who the current user might want to follow.
         */
        MySocialQuery.prototype.suggestions = function () {
            return this.clone(MySocialQuery_1, "suggestions").get().then(function (r) {
                return common.hOP(r, "Suggestions") ? r.Suggestions.results : r;
            });
        };
        MySocialQuery = MySocialQuery_1 = tslib_1.__decorate([
            defaultPath("my")
        ], MySocialQuery);
        return MySocialQuery;
        var MySocialQuery_1;
    }(SharePointQueryableInstance));
    (function (SocialActorType) {
        SocialActorType[SocialActorType["User"] = 0] = "User";
        SocialActorType[SocialActorType["Document"] = 1] = "Document";
        SocialActorType[SocialActorType["Site"] = 2] = "Site";
        SocialActorType[SocialActorType["Tag"] = 3] = "Tag";
    })(exports.SocialActorType || (exports.SocialActorType = {}));
    (function (SocialActorTypes) {
        SocialActorTypes[SocialActorTypes["None"] = 0] = "None";
        SocialActorTypes[SocialActorTypes["User"] = 1] = "User";
        SocialActorTypes[SocialActorTypes["Document"] = 2] = "Document";
        SocialActorTypes[SocialActorTypes["Site"] = 4] = "Site";
        SocialActorTypes[SocialActorTypes["Tag"] = 8] = "Tag";
        /**
         * The set excludes documents and sites that do not have feeds.
         */
        SocialActorTypes[SocialActorTypes["ExcludeContentWithoutFeeds"] = 268435456] = "ExcludeContentWithoutFeeds";
        /**
         * The set includes group sites
         */
        SocialActorTypes[SocialActorTypes["IncludeGroupsSites"] = 536870912] = "IncludeGroupsSites";
        /**
         * The set includes only items created within the last 24 hours
         */
        SocialActorTypes[SocialActorTypes["WithinLast24Hours"] = 1073741824] = "WithinLast24Hours";
    })(exports.SocialActorTypes || (exports.SocialActorTypes = {}));
    (function (SocialFollowResult) {
        SocialFollowResult[SocialFollowResult["Ok"] = 0] = "Ok";
        SocialFollowResult[SocialFollowResult["AlreadyFollowing"] = 1] = "AlreadyFollowing";
        SocialFollowResult[SocialFollowResult["LimitReached"] = 2] = "LimitReached";
        SocialFollowResult[SocialFollowResult["InternalError"] = 3] = "InternalError";
    })(exports.SocialFollowResult || (exports.SocialFollowResult = {}));
    (function (SocialStatusCode) {
        /**
         * The operation completed successfully
         */
        SocialStatusCode[SocialStatusCode["OK"] = 0] = "OK";
        /**
         * The request is invalid.
         */
        SocialStatusCode[SocialStatusCode["InvalidRequest"] = 1] = "InvalidRequest";
        /**
         *  The current user is not authorized to perform the operation.
         */
        SocialStatusCode[SocialStatusCode["AccessDenied"] = 2] = "AccessDenied";
        /**
         * The target of the operation was not found.
         */
        SocialStatusCode[SocialStatusCode["ItemNotFound"] = 3] = "ItemNotFound";
        /**
         * The operation is invalid for the target's current state.
         */
        SocialStatusCode[SocialStatusCode["InvalidOperation"] = 4] = "InvalidOperation";
        /**
         * The operation completed without modifying the target.
         */
        SocialStatusCode[SocialStatusCode["ItemNotModified"] = 5] = "ItemNotModified";
        /**
         * The operation failed because an internal error occurred.
         */
        SocialStatusCode[SocialStatusCode["InternalError"] = 6] = "InternalError";
        /**
         * The operation failed because the server could not access the distributed cache.
         */
        SocialStatusCode[SocialStatusCode["CacheReadError"] = 7] = "CacheReadError";
        /**
         * The operation succeeded but the server could not update the distributed cache.
         */
        SocialStatusCode[SocialStatusCode["CacheUpdateError"] = 8] = "CacheUpdateError";
        /**
         * No personal site exists for the current user, and no further information is available.
         */
        SocialStatusCode[SocialStatusCode["PersonalSiteNotFound"] = 9] = "PersonalSiteNotFound";
        /**
         * No personal site exists for the current user, and a previous attempt to create one failed.
         */
        SocialStatusCode[SocialStatusCode["FailedToCreatePersonalSite"] = 10] = "FailedToCreatePersonalSite";
        /**
         * No personal site exists for the current user, and a previous attempt to create one was not authorized.
         */
        SocialStatusCode[SocialStatusCode["NotAuthorizedToCreatePersonalSite"] = 11] = "NotAuthorizedToCreatePersonalSite";
        /**
         * No personal site exists for the current user, and no attempt should be made to create one.
         */
        SocialStatusCode[SocialStatusCode["CannotCreatePersonalSite"] = 12] = "CannotCreatePersonalSite";
        /**
         * The operation was rejected because an internal limit had been reached.
         */
        SocialStatusCode[SocialStatusCode["LimitReached"] = 13] = "LimitReached";
        /**
         * The operation failed because an error occurred during the processing of the specified attachment.
         */
        SocialStatusCode[SocialStatusCode["AttachmentError"] = 14] = "AttachmentError";
        /**
         * The operation succeeded with recoverable errors; the returned data is incomplete.
         */
        SocialStatusCode[SocialStatusCode["PartialData"] = 15] = "PartialData";
        /**
         * A required SharePoint feature is not enabled.
         */
        SocialStatusCode[SocialStatusCode["FeatureDisabled"] = 16] = "FeatureDisabled";
        /**
         * The site's storage quota has been exceeded.
         */
        SocialStatusCode[SocialStatusCode["StorageQuotaExceeded"] = 17] = "StorageQuotaExceeded";
        /**
         * The operation failed because the server could not access the database.
         */
        SocialStatusCode[SocialStatusCode["DatabaseError"] = 18] = "DatabaseError";
    })(exports.SocialStatusCode || (exports.SocialStatusCode = {}));

    /**
     * Allows for calling of the static SP.Utilities.Utility methods by supplying the method name
     */
    var UtilityMethod = /** @class */ (function (_super) {
        tslib_1.__extends(UtilityMethod, _super);
        /**
         * Creates a new instance of the Utility method class
         *
         * @param baseUrl The parent url provider
         * @param methodName The static method name to call on the utility class
         */
        function UtilityMethod(baseUrl, methodName) {
            return _super.call(this, UtilityMethod.getBaseUrl(baseUrl), "_api/SP.Utilities.Utility." + methodName) || this;
        }
        UtilityMethod.getBaseUrl = function (candidate) {
            if (typeof candidate === "string") {
                return candidate;
            }
            var c = candidate;
            var url = c.toUrl();
            var index = url.indexOf("_api/");
            if (index < 0) {
                return url;
            }
            return url.substr(0, index);
        };
        UtilityMethod.prototype.excute = function (props) {
            return this.postCore({
                body: common.jsS(props),
            });
        };
        /**
         * Sends an email based on the supplied properties
         *
         * @param props The properties of the email to send
         */
        UtilityMethod.prototype.sendEmail = function (props) {
            var params = {
                properties: common.extend(metadata("SP.Utilities.EmailProperties"), {
                    Body: props.Body,
                    From: props.From,
                    Subject: props.Subject,
                }),
            };
            if (props.To && props.To.length > 0) {
                params.properties = common.extend(params.properties, {
                    To: { results: props.To },
                });
            }
            if (props.CC && props.CC.length > 0) {
                params.properties = common.extend(params.properties, {
                    CC: { results: props.CC },
                });
            }
            if (props.BCC && props.BCC.length > 0) {
                params.properties = common.extend(params.properties, {
                    BCC: { results: props.BCC },
                });
            }
            if (props.AdditionalHeaders) {
                params.properties = common.extend(params.properties, {
                    AdditionalHeaders: props.AdditionalHeaders,
                });
            }
            return this.clone(UtilityMethod, "SendEmail", true).excute(params);
        };
        UtilityMethod.prototype.getCurrentUserEmailAddresses = function () {
            return this.clone(UtilityMethod, "GetCurrentUserEmailAddresses", true).excute({});
        };
        UtilityMethod.prototype.resolvePrincipal = function (input, scopes, sources, inputIsEmailOnly, addToUserInfoList, matchUserInfoList) {
            if (matchUserInfoList === void 0) { matchUserInfoList = false; }
            var params = {
                addToUserInfoList: addToUserInfoList,
                input: input,
                inputIsEmailOnly: inputIsEmailOnly,
                matchUserInfoList: matchUserInfoList,
                scopes: scopes,
                sources: sources,
            };
            return this.clone(UtilityMethod, "ResolvePrincipalInCurrentContext", true).excute(params);
        };
        UtilityMethod.prototype.searchPrincipals = function (input, scopes, sources, groupName, maxCount) {
            var params = {
                groupName: groupName,
                input: input,
                maxCount: maxCount,
                scopes: scopes,
                sources: sources,
            };
            return this.clone(UtilityMethod, "SearchPrincipalsUsingContextWeb", true).excute(params);
        };
        UtilityMethod.prototype.createEmailBodyForInvitation = function (pageAddress) {
            var params = {
                pageAddress: pageAddress,
            };
            return this.clone(UtilityMethod, "CreateEmailBodyForInvitation", true).excute(params);
        };
        UtilityMethod.prototype.expandGroupsToPrincipals = function (inputs, maxCount) {
            if (maxCount === void 0) { maxCount = 30; }
            var params = {
                inputs: inputs,
                maxCount: maxCount,
            };
            return this.clone(UtilityMethod, "ExpandGroupsToPrincipals", true).excute(params);
        };
        UtilityMethod.prototype.createWikiPage = function (info) {
            return this.clone(UtilityMethod, "CreateWikiPageInContextWeb", true).excute({
                parameters: info,
            }).then(function (r) {
                return {
                    data: r,
                    file: new File(odataUrlFrom(r)),
                };
            });
        };
        return UtilityMethod;
    }(SharePointQueryable));

    /**
     * Root of the SharePoint REST module
     */
    var SPRest = /** @class */ (function () {
        /**
         * Creates a new instance of the SPRest class
         *
         * @param options Additional options
         * @param baseUrl A string that should form the base part of the url
         */
        function SPRest(_options, _baseUrl) {
            if (_options === void 0) { _options = {}; }
            if (_baseUrl === void 0) { _baseUrl = ""; }
            this._options = _options;
            this._baseUrl = _baseUrl;
        }
        /**
         * Configures instance with additional options and baseUrl.
         * Provided configuration used by other objects in a chain
         *
         * @param options Additional options
         * @param baseUrl A string that should form the base part of the url
         */
        SPRest.prototype.configure = function (options, baseUrl) {
            if (baseUrl === void 0) { baseUrl = ""; }
            return new SPRest(options, baseUrl);
        };
        /**
         * Global SharePoint configuration options
         *
         * @param config The SharePoint configuration to apply
         */
        SPRest.prototype.setup = function (config) {
            setup(config);
        };
        /**
         * Executes a search against this web context
         *
         * @param query The SearchQuery definition
         */
        SPRest.prototype.searchSuggest = function (query) {
            var finalQuery;
            if (typeof query === "string") {
                finalQuery = { querytext: query };
            }
            else {
                finalQuery = query;
            }
            return this.create(SearchSuggest).execute(finalQuery);
        };
        /**
         * Executes a search against this web context
         *
         * @param query The SearchQuery definition
         */
        SPRest.prototype.search = function (query) {
            var finalQuery;
            if (typeof query === "string") {
                finalQuery = { Querytext: query };
            }
            else if (common.hOP(query, "_query")) {
                finalQuery = query.toSearchQuery();
            }
            else {
                finalQuery = query;
            }
            return this.create(Search).execute(finalQuery);
        };
        Object.defineProperty(SPRest.prototype, "site", {
            /**
             * Begins a site collection scoped REST request
             *
             */
            get: function () {
                return this.create(Site);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SPRest.prototype, "web", {
            /**
             * Begins a web scoped REST request
             *
             */
            get: function () {
                return this.create(Web);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SPRest.prototype, "profiles", {
            /**
             * Access to user profile methods
             *
             */
            get: function () {
                return this.create(UserProfileQuery);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SPRest.prototype, "social", {
            /**
             * Access to social methods
             */
            get: function () {
                return this.create(SocialQuery);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SPRest.prototype, "navigation", {
            /**
             * Access to the site collection level navigation service
             */
            get: function () {
                return new NavigationService();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Creates a new batch object for use with the SharePointQueryable.addToBatch method
         *
         */
        SPRest.prototype.createBatch = function () {
            return this.web.createBatch();
        };
        Object.defineProperty(SPRest.prototype, "utility", {
            /**
             * Static utilities methods from SP.Utilities.Utility
             */
            get: function () {
                return this.create(UtilityMethod, "");
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Handles creating and configuring the objects returned from this class
         *
         * @param fm The factory method used to create the instance
         * @param path Optional additional path information to pass to the factory method
         */
        SPRest.prototype.create = function (fm, path) {
            return new fm(this._baseUrl, path).configure(this._options);
        };
        return SPRest;
    }());
    var sp = new SPRest();

    exports.odataUrlFrom = odataUrlFrom;
    exports.spODataEntity = spODataEntity;
    exports.spODataEntityArray = spODataEntityArray;
    exports.SharePointQueryable = SharePointQueryable;
    exports.SharePointQueryableInstance = SharePointQueryableInstance;
    exports.SharePointQueryableCollection = SharePointQueryableCollection;
    exports.SharePointQueryableSecurable = SharePointQueryableSecurable;
    exports.FileFolderShared = FileFolderShared;
    exports.SharePointQueryableShareable = SharePointQueryableShareable;
    exports.SharePointQueryableShareableFile = SharePointQueryableShareableFile;
    exports.SharePointQueryableShareableFolder = SharePointQueryableShareableFolder;
    exports.SharePointQueryableShareableItem = SharePointQueryableShareableItem;
    exports.SharePointQueryableShareableWeb = SharePointQueryableShareableWeb;
    exports.AppCatalog = AppCatalog;
    exports.App = App;
    exports.ContentType = ContentType;
    exports.ContentTypes = ContentTypes;
    exports.FieldLink = FieldLink;
    exports.FieldLinks = FieldLinks;
    exports.Field = Field;
    exports.Fields = Fields;
    exports.File = File;
    exports.Files = Files;
    exports.Folder = Folder;
    exports.Folders = Folders;
    exports.SPHttpClient = SPHttpClient;
    exports.Item = Item;
    exports.Items = Items;
    exports.ItemVersion = ItemVersion;
    exports.ItemVersions = ItemVersions;
    exports.PagedItemCollection = PagedItemCollection;
    exports.NavigationNodes = NavigationNodes;
    exports.NavigationNode = NavigationNode;
    exports.NavigationService = NavigationService;
    exports.List = List;
    exports.Lists = Lists;
    exports.RegionalSettings = RegionalSettings;
    exports.InstalledLanguages = InstalledLanguages;
    exports.TimeZone = TimeZone;
    exports.TimeZones = TimeZones;
    exports.sp = sp;
    exports.SPRest = SPRest;
    exports.RoleDefinitionBindings = RoleDefinitionBindings;
    exports.Search = Search;
    exports.SearchQueryBuilder = SearchQueryBuilder;
    exports.SearchResults = SearchResults;
    exports.SearchBuiltInSourceId = SearchBuiltInSourceId;
    exports.SearchSuggest = SearchSuggest;
    exports.Site = Site;
    exports.UserProfileQuery = UserProfileQuery;
    exports.toAbsoluteUrl = toAbsoluteUrl;
    exports.extractWebUrl = extractWebUrl;
    exports.UtilityMethod = UtilityMethod;
    exports.View = View;
    exports.Views = Views;
    exports.ViewFields = ViewFields;
    exports.WebPartDefinitions = WebPartDefinitions;
    exports.WebPartDefinition = WebPartDefinition;
    exports.WebPart = WebPart;
    exports.Web = Web;
    exports.ClientSidePage = ClientSidePage;
    exports.CanvasSection = CanvasSection;
    exports.CanvasControl = CanvasControl;
    exports.CanvasColumn = CanvasColumn;
    exports.ClientSidePart = ClientSidePart;
    exports.ClientSideText = ClientSideText;
    exports.ClientSideWebpart = ClientSideWebpart;
    exports.Comments = Comments;
    exports.Comment = Comment;
    exports.Replies = Replies;
    exports.SocialQuery = SocialQuery;
    exports.MySocialQuery = MySocialQuery;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=sp.es5.umd.js.map
