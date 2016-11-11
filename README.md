yarl [![License](https://img.shields.io/npm/l/yarl.svg)](https://github.com/strikeentco/yarl/blob/master/LICENSE) [![npm](https://img.shields.io/npm/v/yarl.svg)](https://www.npmjs.com/package/yarl)
==========
[![Build Status](https://travis-ci.org/strikeentco/yarl.svg)](https://travis-ci.org/strikeentco/yarl) [![node](https://img.shields.io/node/v/yarl.svg)](https://www.npmjs.com/package/yarl) [![Test Coverage](https://codeclimate.com/github/strikeentco/yarl/badges/coverage.svg)](https://codeclimate.com/github/strikeentco/yarl/coverage) [![bitHound Score](https://www.bithound.io/github/strikeentco/yarl/badges/score.svg)](https://www.bithound.io/github/strikeentco/yarl)
> YARL, Carl!

`Promise` based, easy to use, with built-in `multipart/form-data` support - yet another request library (yarl).

## Features
* `Promise` based
* Follows redirects
* `multipart/form-data` built-in support
* `json` parse
* `download` method
* etc.

## Install
```sh
$ npm install yarl --save
```

## Usage
```js
const yarl = require('yarl');

yarl
  .get('https://api.github.com/users/strikeentco', { json: true })
  .then((res) => {
    console.log(res.body.name); // => Alexey Bystrov
    return yarl.download(res.body.avatar_url, `./${res.body.login}.jpg`);
  })
  .then((res) => {
    console.log(res.body); // => The data successfully written to file.
  })
  .catch((e) => {
    console.error('Ohh maan:', e);
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
  * **body**  (*String|Object*) - Correct `x-www-form-urlencoded` string or `Object`. `Object` will be stringified with [`querystring.stringify`](https://nodejs.org/api/querystring.html#querystring_querystring_stringify_obj_sep_eq_options) and sent as `application/x-www-form-urlencoded`.
  * **multipart** (*Boolean*) - If `true`, body object will be sent as `multipart/form-data`, otherwise as `application/x-www-form-urlencoded`.
  * **forceRedirect** (*Boolean*) - If `true`, will follow redirects for all methods, otherwise for `GET` and `HEAD` only.
  * **redirectCount** (*Number*) - Number of allowed redirects. By default 10.
  * **includeHeaders** (*Boolean*) - If `true`, `headers` property will be added to response object, otherwise only `body` will.
  * **chunked** (*Boolean*) - If `false`, `content-length` will be added, otherwise `transfer-encoding` will be added as `chunked`.
  * **json** (*Boolean*) - Parse response body with `JSON.parse` and set accept header to `application/json`.
  * **buffer** (*Boolean*) - If `true`, the body is returned as a `Buffer`.
  * **download** (*String|WritableStream*) - Response body will be written to specified `WritableStream` or new `WritableStream` will be created with specified path.

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

## Examples

```js
const yarl = require('yarl');

yarl('https://avatars.githubusercontent.com/u/2401029', { buffer: true })
  .then(res => yarl('127.0.0.1:3000', { body: { photo: res.body }, multipart: true }))
  .catch((e) => {
    console.error('Ohh maan:', e);
  });
```

```js
const fs = require('fs');
const https = require('https');
const post = require('yarl').post;

const options = {
  body: {
    photo: {
      value: [
        fs.createReadStream('./test/fixture/fixture.jpg'),
        https.get('https://avatars.githubusercontent.com/u/2401029')
      ],
      options: { filename: 'photo.jpg' }
    },
    field: [1, 2, '3', 4, null]
  },
  multipart: true,
  json: true
};

post('127.0.0.1:3000', options)
  .then((res) => {
    console.log(res.body);
  })
  .catch((e) => {
    console.error('Ohh maan:', e);
  });
```

## License

The MIT License (MIT)<br/>
Copyright (c) 2015-2016 Alexey Bystrov
