'use strict';

var objectAssign = require('object-assign');
var codes = require('http').STATUS_CODES;

function ErrorClass(name, opts, func) {
  Error.captureStackTrace(this, func);

  ErrorClass.prototype.__proto__ = Error.prototype;
  ErrorClass.prototype.name = name;
  ErrorClass.prototype.message = opts.message;
  delete opts.message;

  objectAssign(this, opts);
}

module.exports.HTTPError = function HTTPError(statusCode, opts) {
  this.host = opts.host;
  this.hostname = opts.hostname;
  this.method = opts.method;
  this.path = opts.path;
  this.message = 'Response code ' + statusCode + ' (' + codes[statusCode] + ')';

  this.response = {
    statusCode: statusCode,
    statusMessage: codes[statusCode],
    body: opts.body
  };

  return new ErrorClass('HTTPError', this, HTTPError);
};

module.exports.ParseError = function ParseError(error, opts) {
  this.message = error.message;
  this.host = opts.host;
  this.hostname = opts.hostname;
  this.method = opts.method;
  this.path = opts.path;

  this.response = {
    body: opts.body
  };

  return new ErrorClass('ParseError', this, ParseError);
};

module.exports.RedirectError = function RedirectError(statusCode, opts) {
  this.host = opts.host;
  this.hostname = opts.hostname;
  this.method = opts.method;
  this.path = opts.path;
  this.message = 'Unauthorized redirect';

  this.response = {
    statusCode: statusCode,
    statusMessage: codes[statusCode],
    message: 'Redirect allowed only for GET and HEAD methods. Use option forceRedirect to force instead.',
    location: opts.location
  };

  return new ErrorClass('RedirectError', this, RedirectError);
};

module.exports.MaxRedirectsError = function MaxRedirectsError(statusCode, opts) {
  this.host = opts.host;
  this.hostname = opts.hostname;
  this.method = opts.method;
  this.path = opts.path;
  this.message = 'Max redirects error';

  this.response = {
    statusCode: statusCode,
    statusMessage: codes[statusCode],
    message: 'Redirected ' + opts.redirectCount + ' times. Aborting.',
    location: opts.location
  };

  return new ErrorClass('MaxRedirectsError', this, MaxRedirectsError);
};

module.exports.RequestError = function RequestError(error, opts) {
  this.message = error.message;
  this.code = error.code;
  this.host = opts.host;
  this.hostname = opts.hostname;
  this.method = opts.method;
  this.path = opts.path;

  return new ErrorClass('RequestError', this, RequestError);
};

module.exports.FileError = function FileError(error, opts) {
  return new ErrorClass('FileError', error, FileError);
};
