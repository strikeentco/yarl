yarl [![License](https://img.shields.io/npm/l/yarl.svg)](https://github.com/strikeentco/yarl/blob/master/LICENSE) [![npm](https://img.shields.io/npm/v/yarl.svg)](https://www.npmjs.com/package/yarl)
==========
[![Build Status](https://travis-ci.org/strikeentco/yarl.svg)](https://travis-ci.org/strikeentco/yarl) [![node](https://img.shields.io/node/v/yarl.svg)](https://www.npmjs.com/package/yarl) [![Test Coverage](https://codeclimate.com/github/strikeentco/yarl/badges/coverage.svg)](https://codeclimate.com/github/strikeentco/yarl/coverage) [![bitHound Score](https://www.bithound.io/github/strikeentco/yarl/badges/score.svg)](https://www.bithound.io/github/strikeentco/yarl)
> YARL, Carl!

`Promise` based, easy to use, with built-in `multipart/form-data` and `gzip/deflate` handling support - yet another request library (yarl).

## Features
* `Promise` based (i.e. `async/await` ready)
* Follows redirects
* `multipart/form-data` built-in support
* `json` parse
* `gzip/deflate` handling
* `download` method
* etc.

## Install
```sh
$ npm install yarl --save
```

## Usage
```js
const { get, download } = require('yarl');

get('https://api.github.com/users/strikeentco', { json: true })
  .then(({body}) => {
    body.name; // -> Alexey Bystrov
    return download(body.avatar_url, `./${body.login}.jpg`);
  })
  .then((res) => {
    res.body; // -> The data successfully written to file.
  });
```

```js
const { post } = require('yarl');
const { createReadStream } = require('fs');
const { get } = require('https');

post('127.0.0.1:3000', {
  body: {
    photo: get('https://avatars.githubusercontent.com/u/2401029'),
    fixture: createReadStream('./test/fixture/fixture.jpg')
  },
  multipart: true
});
```

# API

### yarl(url, [options])

By default it's a `GET` request, but you can change it in `options`.

If `http://` will be missed in `url`, it will be automatically added.

#### Params:
* **url** (*String|Object*) - The URL to request or a [`http.request` options](https://nodejs.org/api/http.html#http_http_request_options_callback) object.
* **[options]** (*Object*) - Any of the [`http.request` options](https://nodejs.org/api/http.html#http_http_request_options_callback) options and:
  * **query**  (*String|Object*) - Correct `urlencoded` string or query `Object`. `Object` will be stringified with [`querystring.stringify`](https://nodejs.org/api/querystring.html#querystring_querystring_stringify_obj_sep_eq_options). This will override the query string in `url`.
  * **body**  (*String|Object|Array|Buffer*) - Body that will be sent with a `POST`, `PUT`, `PATCH`, `DELETE` request. If `content-length` or `transfer-encoding` is not set in options.headers, `transfer-encoding` will be set as `chunked`.
  * **multipart** (*Boolean*) - If `true`, body object will be sent as `multipart/form-data`.
  * **form** (*Boolean*) - If `true`, body object will be sent as `application/x-www-form-urlencoded`.
  * **json** (*Boolean*) -  If `true`, body object will be sent as `application/json`. Parse response body with `JSON.parse` and set accept header to `application/json`. If used in conjunction with the `form` option, the `body` will the stringified as querystring and the response parsed as JSON.
  * **forceRedirect** (*Boolean*) - If `true`, will follow redirects for all methods, otherwise for `GET` and `HEAD` only.
  * **redirectCount** (*Number*) - Number of allowed redirects. By default 10.
  * **includeHeaders** (*Boolean*) - If `true`, `headers` property will be added to response object, otherwise only `body` will.
  * **buffer** (*Boolean*) - If `true`, the body is returned as a `Buffer`.
  * **download** (*String|WritableStream*) - Response body will be written to specified `WritableStream` or new `WritableStream` will be created with specified path.
  * **gzip** (*Boolean*) - Unzip response body with `gzip`. Useful when server doesn't specify `Content-Encoding` header.
  * **deflate** (*Boolean*) - Unzip response body with `deflate`. Useful when server doesn't specify `Content-Encoding` header.

### yarl.get(url, [options])

Simmilar to `yarl(url, { method: 'GET' })`.

### yarl.head(url, [options])

Simmilar to `yarl(url, { method: 'HEAD', includeHeaders: true })`.

### yarl.post(url, [options])

Simmilar to `yarl(url, { method: 'POST' })`.

### yarl.put(url, [options])

Simmilar to `yarl(url, { method: 'PUT' })`.

### yarl.patch(url, [options])

Simmilar to `yarl(url, { method: 'PATCH' })`.

### yarl.delete(url, [options])

Simmilar to `yarl(url, { method: 'DELETE' })`.

### yarl.download(url, path)

Simmilar to `yarl(url, { method: 'GET', download: path })`.

## XML

You can use the [`xml-parser`](https://github.com/segmentio/xml-parser) module to parse XML data:

```js
const yarl = require('yarl');
const parse = require('xml-parser');

function xmlParse(xml) {
  return Object.assign({}, xml, {
    body: parse(xml.body)
  });
}

yarl('http://api.openweathermap.org/data/2.5/weather?q=London&mode=xml').then(xmlParse).then((r) => {
  r.body.root.children[1].attributes.value; // -> temperature
});

// or

yarl('http://api.openweathermap.org/data/2.5/weather?q=London&mode=xml').then((r) => {
  parse(r.body).root.children[1].attributes.value; // -> temperature
});

```

## Proxies

You can use the [`tunnel`](https://github.com/koichik/node-tunnel) module with the `agent` option to work with proxies:

```js
const yarl = require('yarl');
const tunnel = require('tunnel');

yarl('github.com', {
  agent: tunnel.httpOverHttp({
    proxy: {
      host: 'localhost'
    }
  })
});
```

## Cookies

You can use the [`cookie`](https://github.com/jshttp/cookie) module to include cookies in a request:

```js
const yarl = require('yarl');
const cookie = require('cookie');

yarl('github.com', {
  headers: {
    cookie: cookie.serialize('foo', 'bar')
  }
});
```

## OAuth

You can use the [`oauth-1.0a`](https://github.com/ddo/oauth-1.0a) module to create a signed OAuth request:

```js
const yarl = require('yarl');
const crypto  = require('crypto');
const OAuth = require('oauth-1.0a');

const oauth = OAuth({
  consumer: {
    key: process.env.CONSUMER_KEY,
    secret: process.env.CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
});

const token = {
  key: process.env.ACCESS_TOKEN,
  secret: process.env.ACCESS_TOKEN_SECRET
};

const url = 'https://api.twitter.com/1.1/statuses/home_timeline.json';

yarl(url, {
  headers: oauth.toHeader(oauth.authorize({ url, method: 'GET' }, token)),
  json: true
});
```

## Other examples

```js
const yarl = require('yarl');

(async () => {
  const { body: photo } = await yarl('https://avatars.githubusercontent.com/u/2401029', { buffer: true });
  await yarl('127.0.0.1:3000', { body: { photo }, multipart: true })
})()
```

```js
const { createReadStream } = require('fs');
const { get } = require('https');
const { post } = require('yarl');

const options = {
  body: {
    photo: {
      value: [
        createReadStream('./test/fixture/fixture.jpg'),
        get('https://avatars.githubusercontent.com/u/2401029')
      ],
      options: { filename: 'photo.jpg' }
    },
    field: [1, 2, '3', 4, null]
  },
  multipart: true,
  json: true
};

post('127.0.0.1:3000', options);
```

## License

The MIT License (MIT)<br/>
Copyright (c) 2015-2017 Alexey Bystrov
