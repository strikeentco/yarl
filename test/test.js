'use strict';

var fs = require('fs');
var should = require('should/as-function');
var app = require('./_server');
var yarl = require('../main');
var path = require('./_server').path;
var port = require('./_server').port;
var file = __dirname + '/anonim.jpg';

function chunkSync(data, length) {
  var buf = new Buffer(length);
  var fd = fs.openSync(data.path, data.flags || 'r');

  fs.readSync(fd, buf, 0, length);
  fs.closeSync(fd);

  return buf;
}

describe('yarl()', function() {
  this.timeout(10000);
  before(function() {
    app.listen(port);
  });

  /*DEFAULT*/
  describe('default', function() {
    it('should be equal Ok', function() {
      return yarl(path + '/get/ok').then(function(res) {
        should(res.body).be.eql('Ok');
      });
    });

    it('should be ok', function() {
      return yarl(path + '/post/form', {body: 'true=that', json: true}).then(function(res) {
        should(res.body).be.eql({true: 'that'});
      });
    });

    it('should throw TypeError', function() {
      return yarl(path + '/get/ok', {download: 1}).catch(function(e) {
        should(e.message).be.eql('The options.download must be path or write stream');
      });
    });
  });

  /*GET*/
  describe('.get', function() {
    var method = 'get';

    it('should be empty', function() {
      return yarl.get(path + '/' + method + '/empty').then(function(res) {
        should(res.body).be.empty();
      });
    });

    it('should be equal Ok', function() {
      return yarl.get(path + '/' + method + '/ok').then(function(res) {
        should(res.body).be.eql('Ok');
      });
    });

    it('should be equal Ok', function() {
      return yarl.get(path + '/' + method + '/ok', {query: {with: 'query'}}).then(function(res) {
        should(res.body).be.eql('Query ok');
      });
    });

    it('should be equal Ok', function() {
      return yarl.get(path + '/' + method + '/ok?without=query', {query: 'with=query'}).then(function(res) {
        should(res.body).be.eql('Query ok');
      });
    });

    it('should be with header', function() {
      return yarl.get(path + '/' + method + '/ok', {includeHeaders: true}).then(function(res) {
        should(res.headers).be.an.Object();
        should(res.headers).have.keys('connection', 'date', 'x-powered-by', 'content-type', 'etag', 'content-length');
        should(res.body).be.eql('Ok');
      });
    });

    it('should be json', function() {
      return yarl.get(path + '/' + method + '/json', {json: true}).then(function(res) {
        should(res.body).be.eql({true: 'that'});
      });
    });

    it('should be buffer', function() {
      return yarl.get(path + '/' + method + '/json', {buffer: true}).then(function(res) {
        should(Buffer.isBuffer(res.body)).be.true();
      });
    });

    it('should be buffer', function() {
      return yarl.get(path + '/' + method + '/json', {json: true, buffer: true}).then(function(res) {
        should(Buffer.isBuffer(res.body)).be.true();
      });
    });

    it('should redirect to /ok', function() {
      return yarl.get(path + '/' + method + '/redirect').then(function(res) {
        should(res.body).be.eql('Ok');
      });
    });

    it('should throw Error', function() {
      return yarl.get(path + '/' + method + '/ok', {query: 'test=test&&t=123'}).catch(function(e) {
        should(e.message).be.eql('String must be correct urlencoded string');
      });
    });

    it('should throw TypeError', function() {
      return yarl.get(path + '/' + method + '/ok', {query: true}).catch(function(e) {
        should(e.message).be.eql('options.query must be a String or Object');
      });
    });

    it('should throw HTTPError', function() {
      return yarl.get(path + '/' + method + '/404').catch(function(e) {
        should(e.message).be.eql('Response code 404 (Not Found)');
      });
    });

    it('should throw ParseError', function() {
      return yarl.get(path + '/' + method + '/ok', {json: true}).catch(function(e) {
        should(e.message).be.eql('Unexpected token O');
      });
    });

    it('should throw MaxRedirectsError', function() {
      return yarl.get(path + '/' + method + '/infinity').catch(function(e) {
        should(e.message).be.eql('Max redirects error');
        return yarl.get(path + '/' + method + '/infinity', {redirectCount: 5});
      }).catch(function(e) {
        should(e.message).be.eql('Max redirects error');
      });
    });
  });

  /*HEAD*/
  describe('.head', function() {
    var method = 'get';

    it('should be an Object', function() {
      return yarl.head(path + '/' + method + '/empty').then(function(res) {
        should(res.headers).be.an.Object();
        should(res.headers).have.keys('connection', 'date', 'x-powered-by');
      });
    });

    it('should redirect to /ok', function() {
      return yarl.head(path + '/' + method + '/redirect').then(function(res) {
        should(res.headers).be.an.Object();
        should(res.headers).have.keys('connection', 'date', 'x-powered-by', 'content-type', 'etag', 'content-length');
      });
    });

    it('should throw HTTPError', function() {
      return yarl.head(path + '/' + method + '/404').catch(function(e) {
        should(e.message).be.eql('Response code 404 (Not Found)');
      });
    });

    it('should throw MaxRedirectsError', function() {
      return yarl.head(path + '/' + method + '/infinity').catch(function(e) {
        should(e.message).be.eql('Max redirects error');
        return yarl.head(path + '/' + method + '/infinity', {redirectCount: 5});
      }).catch(function(e) {
        should(e.message).be.eql('Max redirects error');
      });
    });
  });

  /*POST*/
  describe('.post', function() {
    var method = 'post';

    it('should be empty', function() {
      return yarl.post(path + '/' + method + '/form', {body:'', json: true}).then(function(res) {
        should(res.body).be.empty();
      });
    });

    it('should be file', function() {
      return yarl.post(path + '/' + method + '/file', {
        body: {
          photo: {
            value: fs.createReadStream(file),
            options: {
              filename: 'anonim.jpg',
              contentType: 'image/jpeg'
            }
          }
        }, multipart: true, chunked: false
      }).then(function(res) {
        should(res.body).be.eql('{"filename":"anonim.jpg","mime":"image/jpeg"}');
        return yarl.post(path + '/' + method + '/file', {body: {
          num: 12345,
          photo: fs.createReadStream(file)
        }, json: true, multipart: true});
      }).then(function(res) {
        should(res.body).be.eql({filename: 'anonim.jpg', mime: 'image/jpeg', field: '12345'});
      });
    });

    it('should be json', function() {
      return yarl.post(require('url').parse('http://' + path + '/' + method + '/form'), {body: {true: 'that'}, json: true}).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.post(path + '/' + method + '/form', {body: 'true=that', json: true, chunked: false});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.post(path + '/' + method + '/form', {body: {true: 'that'}, json: true, multipart: true});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.post(path + '/' + method + '/form', {body: 'true=that', json: true, multipart: true, chunked: false});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
      });
    });

    it('should redirect to /' + method + '/form', function() {
      return yarl.post(path + '/' + method + '/redirect', {body:{true: 'that'}, forceRedirect: true}).then(function(res) {
        should(res.body).be.eql('{"true":"that"}');
      });
    });

    it('should throw Error', function() {
      return yarl.post(path, {body: 'test=test&&t=123'}).catch(function(e) {
        should(e.message).be.eql('String must be correct x-www-form-urlencoded string');
      });
    });

    it('should throw RedirectError', function() {
      return yarl.post(path + '/' + method + '/redirect', {body:{true: 'that'}, json: true}).catch(function(e) {
        should(e.message).be.eql('Unauthorized redirect');
      });
    });

    it('should throw TypeError', function() {
      return yarl.post(path, {body:[{true: 'that'}], json: true}).catch(function(e) {
        should(e.message).be.eql('options.body must be a String or Object');
      });
    });

    it('should throw RequestError', function() {
      return yarl.post('https://' + path).catch(function(e) {
        should(e.message).be.eql('socket hang up');
      });
    });

    it('should throw RequestError', function() {
      return yarl.post(path + '/' + method + '/file', {
        body: {
        photo: require('http').request('http://127.0.0.1')
      }, multipart: true}).catch(function(e) {
        should(e.message).startWith('connect ECONNREFUSED');
      });
    });
  });

  /*PUT*/
  describe('.put', function() {
    var method = 'put';

    it('should be empty', function() {
      return yarl.put(path + '/' + method + '/form', {body:'', json: true}).then(function(res) {
        should(res.body).be.empty();
      });
    });

    it('should be json', function() {
      return yarl.put(require('url').parse('http://' + path + '/' + method + '/form'), {body: {true: 'that'}, json: true}).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.put(path + '/' + method + '/form', {body: 'true=that', json: true, chunked: false});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.put(path + '/' + method + '/form', {body: {true: 'that'}, json: true, multipart: true});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.put(path + '/' + method + '/form', {body: 'true=that', json: true, multipart: true, chunked: false});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
      });
    });

    it('should redirect to /' + method + '/ok', function() {
      return yarl.put(path + '/' + method + '/redirect', {body:{true: 'that'}, forceRedirect: true}).then(function(res) {
        should(res.body).be.eql('{"true":"that"}');
      });
    });

    it('should throw RedirectError', function() {
      return yarl.put(path + '/' + method + '/redirect', {body:{true: 'that'}, json: true}).catch(function(e) {
        should(e.message).be.eql('Unauthorized redirect');
      });
    });
  });

  /*PATCH*/
  describe('.patch', function() {
    var method = 'patch';

    it('should be empty', function() {
      return yarl.patch(path + '/' + method + '/form', {body:'', json: true}).then(function(res) {
        should(res.body).be.empty();
      });
    });

    it('should be json', function() {
      return yarl.patch(require('url').parse('http://' + path + '/' + method + '/form'), {body: {true: 'that'}, json: true}).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.patch(path + '/' + method + '/form', {body: 'true=that', json: true, chunked: false});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
      });
    });

    it('should redirect to /' + method + '/ok', function() {
      return yarl.patch(path + '/' + method + '/redirect', {body:{true: 'that'}, forceRedirect: true}).then(function(res) {
        should(res.body).be.eql('{"true":"that"}');
      });
    });

    it('should throw RedirectError', function() {
      return yarl.patch(path + '/' + method + '/redirect', {body:{true: 'that'}, json: true}).catch(function(e) {
        should(e.message).be.eql('Unauthorized redirect');
      });
    });
  });

  /*DELETE*/
  describe('.delete', function() {
    var method = 'delete';

    it('should be empty', function() {
      return yarl.delete(path + '/' + method + '/form', {body:'', json: true}).then(function(res) {
        should(res.body).be.empty();
      });
    });

    it('should be json', function() {
      return yarl.delete(require('url').parse('http://' + path + '/' + method + '/form'), {body: {true: 'that'}, json: true}).then(function(res) {
        should(res.body).be.eql({true: 'that'});
        return yarl.delete(path + '/' + method + '/form', {body: 'true=that', json: true, chunked: false});
      }).then(function(res) {
        should(res.body).be.eql({true: 'that'});
      });
    });

    it('should redirect to /' + method + '/ok', function() {
      return yarl.delete(path + '/' + method + '/redirect', {body:{true: 'that'}, forceRedirect: true}).then(function(res) {
        should(res.body).be.eql('{"true":"that"}');
      });
    });

    it('should throw RedirectError', function() {
      return yarl.delete(path + '/' + method + '/redirect', {body:{true: 'that'}, json: true}).catch(function(e) {
        should(e.message).be.eql('Unauthorized redirect');
      });
    });
  });

  /*DOWNLOAD*/
  describe('.download', function() {
    it('should download', function() {
      return yarl.download('https://avatars1.githubusercontent.com/u/2401029', './test/uploads/anonim.jpg').then(function(res) {
        should(res.body).be.eql('The data successfully written to file.');
      });
    });

    it('should download', function() {
      return yarl.download('https://avatars1.githubusercontent.com/u/2401029', fs.createWriteStream('./test/uploads/anonim.jpg')).then(function(res) {
        should(res.body).be.eql('The data successfully written to file.');
      });
    });

    it('should throw FileError', function() {
      return yarl.download('https://avatars1.githubusercontent.com/u/2401029', './uploads/anonim.jpg').catch(function(e) {
        should(e.message).startWith('ENOENT');
      });
    });

    it('should throw TypeError', function() {
      return yarl.download('127.0.0.1', null).catch(function(e) {
        should(e.message).be.eql('The second argument must be path or write stream');
      });
    });
  });

  after(function() {
    setTimeout(require('rimraf').sync(__dirname + '/uploads'), 300);
  });
});
