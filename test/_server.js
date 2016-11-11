'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

const upload = multer({ dest: `${__dirname}/uploads/` });
const protocol = 'http://';
const port = 3001;
const path = `${'127.0.0.1:'}${port}`;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));

/* GET */
app.get('/get/ok', (req, res) => {
  if (req.query && req.query.with) {
    res.send('Query ok');
  } else {
    res.send('Ok');
  }
});

app.get('/get/json', (req, res) => {
  res.json({ true: 'that' });
});

app.get('/get/redirect', (req, res) => {
  res.redirect(`${protocol + path}/get/ok`);
});

app.get('/get/infinity', (req, res) => {
  res.redirect(`${protocol + path}/get/infinity`);
});

app.get('/get/empty', (req, res) => {
  res.end();
});

/* POST */
app.post('/post/form', upload.array(), (req, res) => {
  res.json(req.body);
});

app.post('/post/redirect', (req, res) => {
  res.redirect(`${protocol + path}/post/form`);
});

app.post('/post/file', upload.single('photo'), (req, res) => {
  if (req.body.num) {
    if (req.file && req.file.originalname) {
      res.json({ filename: req.file.originalname, mime: req.file.mimetype, field: req.body.num });
    } else {
      res.json({ field: req.body.num });
    }
  } else if (req.file && req.file.originalname) {
    res.json({ filename: req.file.originalname, mime: req.file.mimetype });
  } else {
    res.json({});
  }
});

/* PUT */
app.put('/put/form', upload.array(), (req, res) => {
  res.json(req.body);
});

app.put('/put/redirect', (req, res) => {
  res.redirect(`${protocol + path}/put/form`);
});

/* PATCH */
app.patch('/patch/form', (req, res) => {
  res.json(req.body);
});

app.patch('/patch/redirect', (req, res) => {
  res.redirect(`${protocol + path}/patch/form`);
});

/* DELETE */
app.delete('/delete/form', (req, res) => {
  res.json(req.body);
});

app.delete('/delete/redirect', (req, res) => {
  res.redirect(`${protocol + path}/delete/form`);
});

module.exports = app;
module.exports.path = path;
module.exports.protocol = protocol;
module.exports.port = port;
