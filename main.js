'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const qs = require('querystring');
const { parse: urlParse } = require('url');
const { unzip } = require('zlib');

const Multipart = require('multi-part');
const pckg = require('./package.json');

/* helpers */
const {
  isStream, isWriteStream, isObject,
  isString, isRedirect, isRedirectAll,
  prependHTTP
} = require('./lib/helpers');

/* errors */
const {
  HTTPError, ParseError, MaxRedirectsError,
  RequestError, RedirectError, FileError
} = require('./lib/errors');

const BOUNDARY_PREFIX = 'YARLMultipartBoundary';

function catcher(fn, resolve, reject) {
  return (...args) => fn(...args).then(resolve).catch(reject);
}

function unzipAsync(buffer) {
  return new Promise((resolve, reject) =>
    unzip(buffer, (err, data) => ((err) ? reject(err) : resolve(data))));
}

async function prepareForm(data) {
  const form = new Multipart({ boundaryPrefix: BOUNDARY_PREFIX });

  // eslint-disable-next-line array-callback-return
  Object.keys(data.body).map((key) => {
    const field = data.body[key];
    if (field.value && field.options) {
      form.append(key, field.value, field.options);
    } else {
      form.append(key, field);
    }
  });

  return form.streamWithOptions(data);
}

async function normalize(url, opts) {
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
          throw new Error('String must be correct urlencoded string');
        }

        opts.path = `${opts.path.split('?')[0]}?${opts.query}`;
      }

      delete opts.query;
    } else {
      throw new TypeError('options.query must be a String or Object');
    }
  }

  if (opts.body) {
    if (
      !isString(opts.body) && !Buffer.isBuffer(opts.body) && !(opts.form || opts.json)
      && !(isObject(opts.body) && opts.multipart)
    ) {
      throw new TypeError('options.body must be a String, Buffer or plain Object');
    }

    if ((opts.form || opts.json) && !(isObject(opts.body) || Array.isArray(opts.body))) {
      throw new TypeError('options.body must be a plain Object or Array when options.form or options.json is used');
    }

    opts.method = opts.method || 'POST';
    if (opts.multipart && isObject(opts.body)) {
      opts = await prepareForm(opts);
    } else if (opts.form || opts.json) {
      opts.headers = opts.headers || {};
      if (opts.form) {
        opts.headers['content-type'] = opts.headers['content-type'] || 'application/x-www-form-urlencoded';
        opts.body = qs.stringify(opts.body);
      } else {
        opts.headers['content-type'] = opts.headers['content-type'] || 'application/json';
        opts.body = JSON.stringify(opts.body);
      }
    }
    opts.headers = opts.headers || {};
    if (opts.headers['transfer-encoding'] == null && opts.headers['content-length'] == null) {
      opts.headers['transfer-encoding'] = 'chunked';
    }
  } else {
    opts.method = opts.method || 'GET';
  }

  opts.headers = Object.assign({
    'user-agent': `${pckg.name}/${pckg.version} (https://github.com/strikeentco/yarl)`,
    'accept-encoding': 'gzip,deflate'
  }, opts.headers);

  if (opts.json && !opts.headers.accept) {
    opts.headers.accept = 'application/json';
  }

  return opts;
}

function request(opts, resolve, reject, redirectCount) {
  const fn = (opts.protocol === 'https:') ? https : http;
  const req = fn.request(opts, (res) => {
    const { statusCode } = res;
    if (isRedirect(statusCode) && 'location' in res.headers) {
      if (opts.forceRedirect || isRedirectAll(statusCode) || (opts.method === 'GET' || opts.method === 'HEAD')) {
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

    res.on('data', chunk => chunks.push(chunk));

    res.on('end', catcher(async () => {
      let body;
      const result = {};
      if (opts.gzip || opts.deflate || (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1 && req.method !== 'HEAD')) {
        try {
          body = await unzipAsync(Buffer.concat(chunks));
        } catch (e) {
          opts.body = Buffer.concat(chunks).toString(opts.encoding);
          opts.in = 'unzip';
          throw new ParseError(e, opts);
        }
      } else {
        body = Buffer.concat(chunks);
      }
      if (opts.includeHeaders) {
        result.headers = res.headers;
      }

      if (statusCode < 200 || statusCode > 299) {
        opts.body = body.toString(opts.encoding);
        throw new HTTPError(statusCode, opts);
      } else if (opts.download) {
        if (typeof opts.download === 'string') {
          opts.download = fs.createWriteStream(opts.download);
        } else if (!isWriteStream(opts.download)) {
          throw new TypeError('The options.download must be path or write stream');
        }

        // eslint-disable-next-line no-shadow
        return new Promise((resolve, reject) => {
          opts.download.on('error', e => reject(new FileError(e, opts)));

          opts.download.on('finish', () => {
            result.body = 'The data successfully written to file.';
            resolve(result);
          });

          opts.download.end(body);
        });
      } else if (opts.buffer) {
        result.body = body;
        return result;
      } else if (opts.json) {
        try {
          result.body = JSON.parse(body);
          return result;
        } catch (e) {
          opts.body = body.toString(opts.encoding);
          opts.in = 'JSON.parse';
          throw new ParseError(e, opts);
        }
      } else {
        result.body = body.toString(opts.encoding);
        return result;
      }
    }, resolve, reject));
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

// eslint-disable-next-line
const yarl = module.exports = (url, opts) => normalize(url, opts).then(options => new Promise((resolve, reject) => request(options, resolve, reject, 0)));

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
