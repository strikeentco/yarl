'use strict';

const fs = require('fs');
const url = require('url');
const should = require('should/as-function');

const app = require('./_server');
const yarl = require('../main');
const { path, port } = require('./_server');

const file = `${__dirname}/fixture/fixture.jpg`;

describe('yarl()', function () {
  this.timeout(10000);
  before(() => app.listen(port));

  /* DEFAULT */
  describe('default', () => {
    it('should be equal Ok', async () => {
      const { body } = await yarl(`${path}/get/ok`);
      should(body).be.eql('Ok');
    });

    it('should be ok', async () => {
      const { body } = await yarl(`${path}/post/form`, { body: { true: 'that' }, json: true });
      should(body).be.eql({ true: 'that' });
    });

    it('should throw TypeError', () =>
       yarl(`${path}/get/ok`, { download: 1 }).catch((e) => {
         should(e.message).be.eql('The options.download must be path or write stream');
       })
    );
  });

  /* GET */
  describe('.get', () => {
    const method = 'get';

    it('should be empty', async () => {
      const { body } = await yarl.get(`${path}/${method}/empty`);
      should(body).be.empty();
    });

    it('should be equal Ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/ok`);
      should(body).be.eql('Ok');
    });

    it('should be equal Ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/ok`, { query: { with: 'query' } });
      should(body).be.eql('Query ok');
    });

    it('should be equal Ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/ok?without=query`, { query: 'with=query' });
      should(body).be.eql('Query ok');
    });

    it('should be equal Ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/gzip`);
      should(body).be.eql('gzip: Ok');
    });

    it('should be equal Ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/gzip/noheaders`, { gzip: true });
      should(body).be.eql('gzip: Ok');
    });

    it('should be equal Ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/gzip/noheaders`, { deflate: true });
      should(body).be.eql('gzip: Ok');
    });

    it('should be with header', async () => {
      const { headers, body } = await yarl.get(`${path}/${method}/ok`, { includeHeaders: true });
      should(headers).be.an.Object();
      should(headers).have.keys('connection', 'date', 'x-powered-by', 'content-type', 'etag', 'content-length');
      should(body).be.eql('Ok');
    });

    it('should be json', async () => {
      const { body } = await yarl.get(`${path}/${method}/json`, { json: true });
      should(body).be.eql({ true: 'that' });
    });

    it('should be buffer', async () => {
      const { body } = await yarl.get(`${path}/${method}/json`, { buffer: true });
      should(Buffer.isBuffer(body)).be.true();
    });

    it('should be buffer', async () => {
      const { body } = await yarl.get(`${path}/${method}/json`, { json: true, buffer: true });
      should(Buffer.isBuffer(body)).be.true();
    });

    it('should redirect to /ok', async () => {
      const { body } = await yarl.get(`${path}/${method}/redirect`);
      should(body).be.eql('Ok');
    });

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

    it('should throw ParseError', () =>
       yarl.get(`${path}/${method}/ok`, { gzip: true }).catch((e) => {
         should(e.message).startWith('incorrect header check');
       })
    );

    it('should throw ParseError', () =>
       yarl.get(`${path}/${method}/ok`, { deflate: true }).catch((e) => {
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

    it('should be an Object', async () => {
      const { headers } = await yarl.head(`${path}/${method}/empty`);
      should(headers).be.an.Object();
      should(headers).have.keys('connection', 'date', 'x-powered-by');
    });

    it('should redirect to /ok', async () => {
      const { headers } = await yarl.head(`${path}/${method}/redirect`);
      should(headers).be.an.Object();
      should(headers).have.keys('connection', 'date', 'x-powered-by', 'content-type', 'etag', 'content-length');
    });

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

    it('should be empty', async () => {
      const { body } = await yarl.post(`${path}/${method}/form`, { body: '', json: true });
      should(body).be.empty();
    });

    it('should be file', async () => {
      const [{ body: body1 }, { body: body2 }] = await Promise.all([
        yarl.post(`${path}/${method}/file`, {
          body: {
            photo: {
              value: fs.createReadStream(file),
              options: {
                filename: 'anonim.jpg',
                contentType: 'image/jpeg'
              }
            }
          },
          multipart: true
        }),
        yarl.post(`${path}/${method}/file`, { body: {
          num: 12345,
          photo: fs.createReadStream(file)
        },
          json: true,
          multipart: true })
      ]);
      should(body1).be.eql('{"filename":"anonim.jpg","mime":"image/jpeg"}');
      should(body2).be.eql({ filename: 'fixture.jpg', mime: 'image/jpeg', field: '12345' });
    });

    it('should be json', async () => {
      const [{ body: body1 }, { body: body2 }] = await Promise.all([
        yarl.post(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true }),
        yarl.post(`${path}/${method}/form`, { body: { true: 'that' }, json: true, multipart: true })
      ]);
      should(body1).be.eql({ true: 'that' });
      should(body2).be.eql({ true: 'that' });
    });

    it(`should redirect to /${method}/form`, async () => {
      const { body } = await yarl.post(`${path}/${method}/redirect`, { body: { true: 'that' }, form: true, forceRedirect: true });
      should(body).be.eql('{"true":"that"}');
    });

    it('should send string', async () => {
      const { body } = await yarl.post(`${path}/${method}/json`, { body: 'string' });
      should(body).be.eql('{}');
    });

    it('should send json and get json', async () => {
      const { body } = await yarl.post(`${path}/${method}/json`, { headers: { 'transfer-encoding': 'chunked' }, body: { true: 'that' }, json: true });
      should(body).be.eql({ true: 'that' });
    });

    it('should send x-www-form-urlencoded and get json', async () => {
      const { body } = await yarl.post(`${path}/${method}/json`, { body: { true: 'that' }, json: true, form: true });
      should(body).be.eql({ true: 'that' });
    });

    it('should throw RedirectError', () =>
       yarl.post(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
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
         },
         multipart: true }).catch((e) => {
           should(e.message).startWith('connect ECONNREFUSED');
         })
    );

    it('should throw TypeError', () =>
       yarl.post(`${path}/${method}/file`, { body: [] }).catch((e) => {
         should(e.message).be.eql('options.body must be a String, Buffer or plain Object');
       })
    );

    it('should throw TypeError', () =>
       yarl.post(`${path}/${method}/file`, { body: 'string', form: true }).catch((e) => {
         should(e.message).be.eql('options.body must be a plain Object or Array when options.form or options.json is used');
       })
    );
  });

  /* PUT */
  describe('.put', () => {
    const method = 'put';

    it('should be empty', async () => {
      const { body } = await yarl.put(`${path}/${method}/form`, { body: '', json: true });
      should(body).be.empty();
    });

    it('should be json', async () => {
      const [{ body: body1 }, { body: body2 }] = await Promise.all([
        yarl.put(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true }),
        yarl.put(`${path}/${method}/form`, { body: { true: 'that' }, json: true, multipart: true })
      ]);
      should(body1).be.eql({ true: 'that' });
      should(body2).be.eql({ true: 'that' });
    });

    it(`should redirect to /${method}/ok`, async () => {
      const { body } = await yarl.put(`${path}/${method}/redirect`, { body: { true: 'that' }, form: true, forceRedirect: true });
      should(body).be.eql('{"true":"that"}');
    });

    it('should throw RedirectError', () =>
       yarl.put(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );
  });

  /* PATCH */
  describe('.patch', () => {
    const method = 'patch';

    it('should be empty', async () => {
      const { body } = await yarl.patch(`${path}/${method}/form`, { body: '', json: true });
      should(body).be.empty();
    });

    it('should be json', async () => {
      const { body } = await yarl.patch(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true });
      should(body).be.eql({ true: 'that' });
    });

    it(`should redirect to /${method}/ok`, async () => {
      const { body } = await yarl.patch(`${path}/${method}/redirect`, { body: { true: 'that' }, form: true, forceRedirect: true });
      should(body).be.eql('{"true":"that"}');
    });

    it('should throw RedirectError', () =>
       yarl.patch(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );
  });

  /* DELETE */
  describe('.delete', () => {
    const method = 'delete';

    it('should be empty', async () => {
      const { body } = await yarl.delete(`${path}/${method}/form`, { body: '', json: true });
      should(body).be.empty();
    });

    it('should be json', async () => {
      const { body } = await yarl.delete(url.parse(`http://${path}/${method}/form`), { body: { true: 'that' }, json: true });
      should(body).be.eql({ true: 'that' });
    });

    it(`should redirect to /${method}/ok`, async () => {
      const { body } = await yarl.delete(`${path}/${method}/redirect`, { body: { true: 'that' }, form: true, forceRedirect: true });
      should(body).be.eql('{"true":"that"}');
    });

    it('should throw RedirectError', () =>
       yarl.delete(`${path}/${method}/redirect`, { body: { true: 'that' }, json: true }).catch((e) => {
         should(e.message).be.eql('Unauthorized redirect');
       })
    );
  });

  /* DOWNLOAD */
  describe('.download', () => {
    it('should download', async () => {
      const { body } = await yarl.download('https://avatars1.githubusercontent.com/u/2401029', './test/uploads/anonim.jpg');
      should(body).be.eql('The data successfully written to file.');
    });

    it('should download', async () => {
      const { body } = await yarl.download('https://avatars1.githubusercontent.com/u/2401029', fs.createWriteStream('./test/uploads/anonim.jpg'));
      should(body).be.eql('The data successfully written to file.');
    });

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
