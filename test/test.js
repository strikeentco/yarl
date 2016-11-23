'use strict';

const fs = require('fs');
const url = require('url');
const should = require('should/as-function');
const app = require('./_server');
const yarl = require('../main');
const path = require('./_server').path;
const port = require('./_server').port;

const file = `${__dirname}/fixture/fixture.jpg`;

describe('yarl()', function () {
  this.timeout(10000);
  before(() => {
    app.listen(port);
  });

  /* DEFAULT */
  describe('default', () => {
    it('should be equal Ok', () =>
       yarl(`${path}/get/ok`).then((res) => {
         should(res.body).be.eql('Ok');
       })
    );

    it('should be ok', () =>
       yarl(`${path}/post/form`, { body: 'true=that', json: true }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
       })
    );

    it('should throw TypeError', () =>
       yarl(`${path}/get/ok`, { download: 1 }).catch((e) => {
         should(e.message).be.eql('The options.download must be path or write stream');
       })
    );
  });

  /* GET */
  describe('.get', () => {
    const method = 'get';

    it('should be empty', () =>
       yarl.get(`${path}/${method}/empty`).then((res) => {
         should(res.body).be.empty();
       })
    );

    it('should be equal Ok', () =>
       yarl.get(`${path}/${method}/ok`).then((res) => {
         should(res.body).be.eql('Ok');
       })
    );

    it('should be equal Ok', () =>
       yarl.get(`${path}/${method}/ok`, { query: { with: 'query' } }).then((res) => {
         should(res.body).be.eql('Query ok');
       })
    );

    it('should be equal Ok', () =>
       yarl.get(`${path}/${method}/ok?without=query`, { query: 'with=query' }).then((res) => {
         should(res.body).be.eql('Query ok');
       })
    );

    it('should be equal Ok', () =>
       yarl.get(`${path}/${method}/gzip`).then((res) => {
         should(res.body).be.eql('gzip: Ok');
       })
    );

    it('should be with header', () =>
       yarl.get(`${path}/${method}/ok`, { includeHeaders: true }).then((res) => {
         should(res.headers).be.an.Object();
         should(res.headers).have.keys('connection', 'date', 'x-powered-by', 'content-type', 'etag', 'content-length');
         should(res.body).be.eql('Ok');
       })
    );

    it('should be json', () =>
       yarl.get(`${path}/${method}/json`, { json: true }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
       })
    );

    it('should be buffer', () =>
       yarl.get(`${path}/${method}/json`, { buffer: true }).then((res) => {
         should(Buffer.isBuffer(res.body)).be.true();
       })
    );

    it('should be buffer', () =>
       yarl.get(`${path}/${method}/json`, { json: true, buffer: true }).then((res) => {
         should(Buffer.isBuffer(res.body)).be.true();
       })
    );

    it('should redirect to /ok', () =>
       yarl.get(`${path}/${method}/redirect`).then((res) => {
         should(res.body).be.eql('Ok');
       })
    );

    it('should throw Error', () =>
       yarl.get(`${path}/${method}/ok`, { query: 'test=test&&t=123' }).catch((e) => {
         should(e.message).be.eql('String must be correct urlencoded string');
       })
    );

    it('should throw TypeError', () =>
       yarl.get(`${path}/${method}/ok`, { query: true }).catch((e) => {
         should(e.message).be.eql('options.query must be a String or Object');
       })
    );

    it('should throw HTTPError', () =>
       yarl.get(`${path}/${method}/404`).catch((e) => {
         should(e.message).be.eql('Response code 404 (Not Found)');
       })
    );

    it('should throw ParseError', () =>
       yarl.get(`${path}/${method}/ok`, { json: true }).catch((e) => {
         should(e.message).startWith('Unexpected token O');
       })
    );

    it('should throw ParseError', () =>
       yarl.get(`${path}/${method}/wrongzip`).catch((e) => {
         should(e.message).startWith('incorrect header check');
       })
    );

    it('should throw MaxRedirectsError', () =>
       yarl.get(`${path}/${method}/infinity`).catch((e) => {
         should(e.message).be.eql('Max redirects error');
         return yarl.get(`${path}/${method}/infinity`, { redirectCount: 5 });
       }).catch((e) => {
         should(e.message).be.eql('Max redirects error');
       })
    );
  });

  /* HEAD */
  describe('.head', () => {
    const method = 'get';

    it('should be an Object', () =>
       yarl.head(`${path}/${method}/empty`).then((res) => {
         should(res.headers).be.an.Object();
         should(res.headers).have.keys('connection', 'date', 'x-powered-by');
       })
    );

    it('should redirect to /ok', () =>
       yarl.head(`${path}/${method}/redirect`).then((res) => {
         should(res.headers).be.an.Object();
         should(res.headers).have.keys('connection', 'date', 'x-powered-by', 'content-type', 'etag', 'content-length');
       })
    );

    it('should throw HTTPError', () =>
       yarl.head(`${path}/${method}/404`).catch((e) => {
         should(e.message).be.eql('Response code 404 (Not Found)');
       })
    );

    it('should throw MaxRedirectsError', () =>
       yarl.head(`${path}/${method}/infinity`).catch((e) => {
         should(e.message).be.eql('Max redirects error');
         return yarl.head(`${path}/${method}/infinity`, { redirectCount: 5 });
       }).catch((e) => {
         should(e.message).be.eql('Max redirects error');
       })
    );
  });

  /* POST */
  describe('.post', () => {
    const method = 'post';

    it('should be empty', () =>
       yarl.post(`${path}/${method}/form`, { body: '', json: true }).then((res) => {
         should(res.body).be.empty();
       })
    );

    it('should be file', () =>
       yarl.post(`${path}/${method}/file`, {
         body: {
           photo: {
             value: fs.createReadStream(file),
             options: {
               filename: 'anonim.jpg',
               contentType: 'image/jpeg'
             }
           }
         }, multipart: true, chunked: false
       }).then((res) => {
         should(res.body).be.eql('{"filename":"anonim.jpg","mime":"image/jpeg"}');
         return yarl.post(`${path}/${method}/file`, { body: {
           num: 12345,
           photo: fs.createReadStream(file)
         }, json: true, multipart: true });
       }).then((res) => {
         should(res.body).be.eql({ filename: 'fixture.jpg', mime: 'image/jpeg', field: '12345' });
       })
    );

    it('should be json', () =>
       yarl.post(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.post(`${path}/${method}/form`, { body: 'true=that', json: true, chunked: false, headers: {} });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.post(`${path}/${method}/form`, { body: { true: 'that' }, json: true, multipart: true });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.post(`${path}/${method}/form`, { body: 'true=that', json: true, multipart: true, chunked: false });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
       })
    );

    it(`should redirect to /${method}/form`, () =>
       yarl.post(`${path}/${method}/redirect`, { body: { true: 'that' }, forceRedirect: true }).then((res) => {
         should(res.body).be.eql('{"true":"that"}');
       })
    );

    it('should throw Error', () =>
       yarl.post(path, { body: 'test=test&&t=123' }).catch((e) => {
         should(e.message).be.eql('String must be correct x-www-form-urlencoded string');
       })
    );

    it('should throw RedirectError', () =>
       yarl.post(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );

    it('should throw TypeError', () =>
       yarl.post(path, { body: [{ true: 'that' }], json: true }).catch((e) => {
         should(e.message).be.eql('options.body must be a String or Object');
       })
    );

    it('should throw RequestError', () =>
       yarl.post(`https://${path}`).catch((e) => {
         should(e.message).be.eql('socket hang up');
       })
    );

    it('should throw RequestError', () =>
       yarl.post(`${path}/${method}/file`, {
         body: {
           photo: require('http').request({ hostname: '127.0.0.1' })
         }, multipart: true }).catch((e) => {
           should(e.message).startWith('connect ECONNREFUSED');
         })
    );
  });

  /* PUT */
  describe('.put', () => {
    const method = 'put';

    it('should be empty', () =>
       yarl.put(`${path}/${method}/form`, { body: '', json: true }).then((res) => {
         should(res.body).be.empty();
       })
    );

    it('should be json', () =>
       yarl.put(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.put(`${path}/${method}/form`, { body: 'true=that', json: true, chunked: false });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.put(`${path}/${method}/form`, { body: { true: 'that' }, json: true, multipart: true });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.put(`${path}/${method}/form`, { body: 'true=that', json: true, multipart: true, chunked: false });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
       })
    );

    it(`should redirect to /${method}/ok`, () =>
       yarl.put(`${path}/${method}/redirect`, { body: { true: 'that' }, forceRedirect: true }).then((res) => {
         should(res.body).be.eql('{"true":"that"}');
       })
    );

    it('should throw RedirectError', () =>
       yarl.put(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );
  });

  /* PATCH */
  describe('.patch', () => {
    const method = 'patch';

    it('should be empty', () =>
       yarl.patch(`${path}/${method}/form`, { body: '', json: true }).then((res) => {
         should(res.body).be.empty();
       })
    );

    it('should be json', () =>
       yarl.patch(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.patch(`${path}/${method}/form`, { body: 'true=that', json: true, chunked: false });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
       })
    );

    it(`should redirect to /${method}/ok`, () =>
       yarl.patch(`${path}/${method}/redirect`, { body: { true: 'that' }, forceRedirect: true }).then((res) => {
         should(res.body).be.eql('{"true":"that"}');
       })
    );

    it('should throw RedirectError', () =>
       yarl.patch(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );
  });

  /* DELETE */
  describe('.delete', () => {
    const method = 'delete';

    it('should be empty', () =>
       yarl.delete(`${path}/${method}/form`, { body: '', json: true }).then((res) => {
         should(res.body).be.empty();
       })
    );

    it('should be json', () =>
       yarl.delete(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
         return yarl.delete(`${path}/${method}/form`, { body: 'true=that', json: true, chunked: false });
       }).then((res) => {
         should(res.body).be.eql({ true: 'that' });
       })
    );

    it(`should redirect to /${method}/ok`, () =>
       yarl.delete(`${path}/${method}/redirect`, { body: { true: 'that' }, forceRedirect: true }).then((res) => {
         should(res.body).be.eql('{"true":"that"}');
       })
    );

    it('should throw RedirectError', () =>
       yarl.delete(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );
  });

  /* DOWNLOAD */
  describe('.download', () => {
    it('should download', () =>
       yarl.download('https://avatars1.githubusercontent.com/u/2401029', './test/uploads/anonim.jpg').then((res) => {
         should(res.body).be.eql('The data successfully written to file.');
       })
    );

    it('should download', () =>
       yarl.download('https://avatars1.githubusercontent.com/u/2401029', fs.createWriteStream('./test/uploads/anonim.jpg')).then((res) => {
         should(res.body).be.eql('The data successfully written to file.');
       })
    );

    it('should throw FileError', () =>
       yarl.download('https://avatars1.githubusercontent.com/u/2401029', './uploads/anonim.jpg').catch((e) => {
         should(e.message).startWith('ENOENT');
       })
    );

    it('should throw TypeError', () =>
       yarl.download('127.0.0.1', null).catch((e) => {
         should(e.message).be.eql('The second argument must be path or write stream');
       })
    );
  });
});
