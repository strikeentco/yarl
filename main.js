'use strict';

var fs = require('fs');
var url = require('url');
var http = require('http');
var https = require('https');
var qs = require('querystring');
var objectAssign = require('object-assign');
var Multipart = require('multi-part');

/* helpers */
var helpers = require('./lib/helpers');
var isStream = helpers.isStream;
var isWriteStream = helpers.isWriteStream;
var isObject = helpers.isObject;
var isString = helpers.isString;
var isRedirect = helpers.isRedirect;
var prependHTTP = helpers.prependHTTP;

/* errors */
var errors = require('./lib/errors');
var HTTPError = errors.HTTPError;
var ParseError = errors.ParseError;
var MaxRedirectsError = errors.MaxRedirectsError;
var RequestError = errors.RequestError;
var RedirectError = errors.RedirectError;
var FileError = errors.FileError;

function prepareForm(data) {
  var form = new Multipart({chunked: data.chunked, boundaryPrefix: 'YARLMultipartBoundary'});

  for (var key in data.body) {
    var field = data.body[key];
    if (field.value && field.options) {
      form.append(key, field.value, field.options);
    } else {
      form.append(key, field);
    }
  }

  return Promise.resolve(form.getWithOptions(data));
}

function normalize(_url, opts) {
  return new Promise(function(resolve, reject) {
    var temp;
    opts = objectAssign(
      {protocol: 'http:', path: '', encoding: 'utf8', redirectCount: 10},
      typeof _url === 'string' ? url.parse(prependHTTP(_url), true) : _url,
      opts
    );

    if (opts.query) {
      if (isObject(opts.query)) {
        opts.query = qs.stringify(opts.query);
      }

      if (isString(opts.query)) {
        if (opts.query.length) {
          temp = qs.stringify(qs.parse(opts.query));
          if (temp === opts.query) {
            opts.query = temp;
          } else {
            reject(new Error('String must be correct urlencoded string'));
            return;
          }

          opts.path = opts.path.split('?')[0] + '?' + opts.query;
        }

        delete opts.query;
      } else {
        reject(new TypeError('options.query must be a String or Object'));
        return;
      }
    }

    if (opts.body) {
      if (!isString(opts.body) && !isObject(opts.body)) {
        reject(new TypeError('options.body must be a String or Object'));
        return;
      }

      opts.method || (opts.method = 'POST');

      if (isObject(opts.body)) {
        if (opts.multipart) {
          return prepareForm(opts, reject).then(function(options) {
            options.headers = objectAssign(options.headers, {
              'user-agent': 'https://github.com/strikeentco/yarl'
            }, opts.headers);

            if (options.json) {
              options.headers.accept || (options.headers.accept = 'application/json');
            }

            resolve(options);
          }).catch(reject);
        } else {
          opts.body = qs.stringify(opts.body);
        }
      } else {
        temp = qs.stringify(qs.parse(opts.body));
        if (temp === opts.body) {
          opts.body = temp;
        } else {
          reject(new Error('String must be correct x-www-form-urlencoded string'));
          return;
        }
      }

      opts.headers || (opts.headers = {});

      if (opts.chunked !== false) {
        opts.headers['transfer-encoding'] = 'chunked';
      }

      opts.headers['content-type'] = 'application/x-www-form-urlencoded';

      if (!opts.headers['content-length'] && !opts.headers['transfer-encoding']) {
        opts.headers['content-length'] = Buffer.byteLength(opts.body);
      }
    }

    opts.headers = objectAssign({
      'user-agent': 'https://github.com/strikeentco/yarl'
    }, opts.headers);

    if (opts.json) {
      opts.headers.accept || (opts.headers.accept = 'application/json');
    }

    opts.method || (opts.method = 'GET');

    resolve(opts);
  });
}

var yarl = module.exports = function(_url, opts) {
  var redirectCount = 0;
  return new Promise(function(resolve, reject) {
    normalize(_url, opts).then(function(opts) {
      var _req = function(opts) {
        var fn = (opts.protocol === 'https:') ? https : http;
        var req = fn.request(opts, function(res) {
          var statusCode = res.statusCode;
          if (isRedirect(statusCode) && 'location' in res.headers) {
            if (opts.forceRedirect || opts.method === 'GET' || opts.method === 'HEAD') {
              if (++redirectCount > opts.redirectCount) {
                opts.location = res.headers.location;
                reject(new MaxRedirectsError(statusCode, opts));
                return;
              }

              var redirectOpts = objectAssign(opts, url.parse(res.headers.location));
              _req(redirectOpts);
              return;
            } else {
              opts.location = res.headers.location;
              reject(new RedirectError(statusCode, opts));
              return;
            }
          }

          var chunks = [];

          res.on('data', function(chunk) {
            chunks.push(chunk);
          });

          res.on('end', function() {
            var result = {};
            if (opts.includeHeaders) {
              result.headers = res.headers;
            }

            if (statusCode < 200 || statusCode > 299) {
              opts.body = Buffer.concat(chunks).toString(opts.encoding);
              reject(new HTTPError(statusCode, opts));
            } else if (opts.download) {
              if (typeof opts.download === 'string') {
                opts.download = fs.createWriteStream(opts.download);
              } else if (!isWriteStream(opts.download)) {
                reject(new TypeError('The options.download must be path or write stream'));
                return;
              }

              opts.download.on('error', function(e) {
                reject(new FileError(e, opts));
              });

              opts.download.on('finish', function() {
                result.body = 'The data successfully written to file.';
                resolve(result);
              });

              opts.download.end(Buffer.concat(chunks));
            } else if (opts.buffer) {
              result.body = Buffer.concat(chunks);
              resolve(result);
            } else if (opts.json) {
              try {
                result.body = JSON.parse(Buffer.concat(chunks));
                resolve(result);
              } catch (e) {
                opts.body = Buffer.concat(chunks).toString(opts.encoding);
                reject(new ParseError(e, opts));
              }
            } else {
              result.body = Buffer.concat(chunks).toString(opts.encoding);
              resolve(result);
            }
          });
        });

        if (opts.body) {
          if (isStream(opts.body)) {
            opts.body.on('error', function(e) {
              req.destroy();
              reject(e);
            });

            opts.body.pipe(req);
          } else {
            req.end(opts.body);
          }
        } else {
          req.end();
        }

        req.on('error', function(e) {
          reject(new RequestError(e, opts));
        });
      };

      _req(opts);
    }).catch(reject);
  });
};

module.exports.get = function(_url, opts) {
  return yarl(_url, objectAssign({}, opts, {method: 'GET'}));
};

module.exports.download = function(_url, path) {
  if (typeof path === 'string' || isWriteStream(path)) {
    return yarl(_url, {method: 'GET', download: path});
  } else {
    return Promise.reject(new TypeError('The second argument must be path or write stream'));
  }
};

module.exports.head = function(_url, opts) {
  return yarl(_url, objectAssign({}, opts, {method: 'HEAD', includeHeaders: true, json: false}));
};

module.exports.post = function(_url, opts) {
  return yarl(_url, objectAssign({}, opts, {method: 'POST'}));
};

module.exports.put = function(_url, opts) {
  return yarl(_url, objectAssign({}, opts, {method: 'PUT'}));
};

module.exports.patch = function(_url, opts) {
  return yarl(_url, objectAssign({}, opts, {method: 'PATCH'}));
};

module.exports.delete = function(_url, opts) {
  return yarl(_url, objectAssign({}, opts, {method: 'DELETE'}));
};
