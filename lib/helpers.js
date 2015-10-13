'use strict';

module.exports.isStream = function isStream(stream) {
  return stream && typeof stream === 'object' && typeof stream.pipe === 'function' && stream.readable !== false && typeof stream._read === 'function' && typeof stream._readableState === 'object';
};

module.exports.isWriteStream = function isWriteStream(stream) {
  return stream && typeof stream === 'object' && typeof stream.pipe === 'function' && stream.writable !== false && typeof stream._write === 'function' && typeof stream._writableState === 'object';
};

module.exports.isString = function isString(val) {
  return typeof val === 'string';
};

module.exports.isObject = function isObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]' && !Buffer.isBuffer(val);
};

module.exports.isRedirect = function isRedirect(code) {
  return [300, 301, 302, 303, 305, 307, 308].indexOf(code) !== -1;
};

module.exports.prependHTTP = function prependHTTP(url) {
  url = url.trim();

  var match = url.match(/(?:(?:http[a-z]?):\/\/)|(:?\/\/)/ig);
  url = url.replace(/(?:(?:http[a-z]?):\/\/)|(:?\/\/)/ig, '');

  if (match && match[0] === 'https://') {
    return 'https://' + url;
  } else {
    return 'http://' + url;
  }
};
