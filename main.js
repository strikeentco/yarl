'use strict';

const fs = require('fs');
const urlParse = require('url').parse;
const http = require('http');
const https = require('https');
const qs = require('querystring');
const Multipart = require('multi-part');
const helpers = require('./lib/helpers');
const errors = require('./lib/errors');

/* helpers */
const isStream = helpers.isStream;
const isWriteStream = helpers.isWriteStream;
const isObject = helpers.isObject;
const isString = helpers.isString;
const isRedirect = helpers.isRedirect;
const prependHTTP = helpers.prependHTTP;

/* errors */
const HTTPError = errors.HTTPError;
const ParseError = errors.ParseError;
const MaxRedirectsError = errors.MaxRedirectsError;
const RequestError = errors.RequestError;
const RedirectError = errors.RedirectError;
const FileError = errors.FileError;

const BOUNDARY_PREFIX = 'YARLMultipartBoundary';

function prepareForm(data) {
  const form = new Multipart({ chunked: data.chunked, boundaryPrefix: BOUNDARY_PREFIX });

  for (const key in data.body) { // eslint-disable-line guard-for-in
    const field = data.body[key];
    if (field.value && field.options) {
      form.append(key, field.value, field.options);
    } else {
      form.append(key, field);
    }
  }

  return Promise.resolve(form.streamWithOptions(data));
}

function normalize(url, opts) {
  return new Promise((resolve, reject) => {
    opts = Object.assign(
      { protocol: 'http:', path: '', encoding: 'utf8', redirectCount: 10 },
      typeof url === 'string' ? urlParse(prependHTTP(url), true) : url,
      opts
    );

    if (opts.query) {
      if (isObject(opts.query)) {
        opts.query = qs.stringify(opts.query);
      }

      if (isString(opts.query)) {
        if (opts.query.length) {
          const temp = qs.stringify(qs.parse(opts.query));
          if (temp === opts.query) {
            opts.query = temp;
          } else {
            return reject(new Error('String must be correct urlencoded string'));
          }

          opts.path = `${opts.path.split('?')[0]}?${opts.query}`;
        }

        delete opts.query;
      } else {
        return reject(new TypeError('options.query must be a String or Object'));
      }
    }

    if (opts.body) {
      if (!isString(opts.body) && !isObject(opts.body)) {
        return reject(new TypeError('options.body must be a String or Object'));
      }

      if (!opts.method) {
        opts.method = 'POST';
      }

      if (isObject(opts.body)) {
        if (opts.multipart) {
          return prepareForm(opts, reject).then((options) => {
            options.headers = Object.assign(options.headers, {
              'user-agent': 'https://github.com/strikeentco/yarl'
            }, opts.headers);

            if (options.json && !options.headers.accept) {
              options.headers.accept = 'application/json';
            }

            resolve(options);
          }).catch(reject);
        }
        opts.body = qs.stringify(opts.body);
      } else {
        const temp = qs.stringify(qs.parse(opts.body));
        if (temp === opts.body) {
          opts.body = temp;
        } else {
          return reject(new Error('String must be correct x-www-form-urlencoded string'));
        }
      }

      if (!opts.headers) {
        opts.headers = {};
      }

      if (opts.chunked !== false) {
        opts.headers['transfer-encoding'] = 'chunked';
      }

      opts.headers['content-type'] = 'application/x-www-form-urlencoded';

      if (!opts.headers['content-length'] && !opts.headers['transfer-encoding']) {
        opts.headers['content-length'] = Buffer.byteLength(opts.body);
      }
    }

    opts.headers = Object.assign({
      'user-agent': 'https://github.com/strikeentco/yarl'
    }, opts.headers);

    if (opts.json && !opts.headers.accept) {
      opts.headers.accept = 'application/json';
    }

    if (!opts.method) {
      opts.method = 'GET';
    }

    return resolve(opts);
  });
}

function request(opts, resolve, reject, redirectCount) {
  const fn = (opts.protocol === 'https:') ? https : http;
  const req = fn.request(opts, (res) => {
    const statusCode = res.statusCode;
    if (isRedirect(statusCode) && 'location' in res.headers) {
      if (opts.forceRedirect || opts.method === 'GET' || opts.method === 'HEAD') {
        if (++redirectCount > opts.redirectCount) {
          opts.location = res.headers.location;
          return reject(new MaxRedirectsError(statusCode, opts));
        }
        return request(Object.assign(opts,
          urlParse(res.headers.location)), resolve, reject, redirectCount);
      }
      opts.location = res.headers.location;
      return reject(new RedirectError(statusCode, opts));
    }

    const chunks = [];

    res.on('data', (chunk) => {
      chunks.push(chunk);
    });

    res.on('end', () => {
      const result = {};
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
          return reject(new TypeError('The options.download must be path or write stream'));
        }

        opts.download.on('error', (e) => {
          reject(new FileError(e, opts));
        });

        opts.download.on('finish', () => {
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
      opts.body.on('error', (e) => {
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

  req.on('error', (e) => {
    reject(new RequestError(e, opts));
  });
}

const yarl = module.exports = (url, opts) => normalize(url, opts).then(options =>
  new Promise((resolve, reject) => {
    request(options, resolve, reject, 0);
  }));

module.exports.get = (url, opts) => yarl(url, Object.assign({}, opts, { method: 'GET' }));

module.exports.download = (url, path) => {
  if (typeof path === 'string' || isWriteStream(path)) {
    return yarl(url, { method: 'GET', download: path });
  }
  return Promise.reject(new TypeError('The second argument must be path or write stream'));
};

module.exports.head = (url, opts) => yarl(url, Object.assign({}, opts, { method: 'HEAD', includeHeaders: true, json: false }));

module.exports.post = (url, opts) => yarl(url, Object.assign({}, opts, { method: 'POST' }));

module.exports.put = (url, opts) => yarl(url, Object.assign({}, opts, { method: 'PUT' }));

module.exports.patch = (url, opts) => yarl(url, Object.assign({}, opts, { method: 'PATCH' }));

module.exports.delete = (url, opts) => yarl(url, Object.assign({}, opts, { method: 'DELETE' }));
