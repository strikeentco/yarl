'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var multer  = require('multer');
var upload = multer({ dest: __dirname + '/uploads/'});
var protocol = 'http://';
var port = 3001;
var path = '127.0.0.1' + ':' + port;
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));

/* GET */
app.get('/get/ok', function(req, res) {
  if (req.query && req.query.with) {
    res.send('Query ok');
  } else {
    res.send('Ok');
  }
});

app.get('/get/json', function(req, res) {
  res.json({true: 'that'});
});

app.get('/get/redirect', function(req, res) {
  res.redirect(protocol + path + '/get/ok');
});

app.get('/get/infinity', function(req, res) {
  res.redirect(protocol + path + '/get/infinity');
});

app.get('/get/empty', function(req, res) {
  res.end();
});

/* POST */
app.post('/post/form', upload.array(), function(req, res) {
  res.json(req.body);
});

app.post('/post/redirect', function(req, res) {
  res.redirect(protocol + path + '/post/form');
});

app.post('/post/file', upload.single('photo'), function(req, res) {
  if (req.body.num) {
    if (req.file && req.file.originalname) {
      res.json({filename: req.file.originalname, mime: req.file.mimetype, field: req.body.num});
    } else {
      res.json({field: req.body.num});
    }
  } else {
    if (req.file && req.file.originalname) {
      res.json({filename: req.file.originalname, mime: req.file.mimetype});
    } else {
      res.json({});
    }
  }
});

/* PUT */
app.put('/put/form', upload.array(), function(req, res) {
  res.json(req.body);
});

app.put('/put/redirect', function(req, res) {
  res.redirect(protocol + path + '/put/form');
});

/* PATCH */
app.patch('/patch/form', function(req, res) {
  res.json(req.body);
});

app.patch('/patch/redirect', function(req, res) {
  res.redirect(protocol + path + '/patch/form');
});

/* DELETE */
app.delete('/delete/form', function(req, res) {
  res.json(req.body);
});

app.delete('/delete/redirect', function(req, res) {
  res.redirect(protocol + path + '/delete/form');
});

module.exports = app;
module.exports.path = path;
module.exports.protocol = protocol;
module.exports.port = port;
