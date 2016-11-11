'use strict';

const helpers = require('multi-part/lib/helpers');

module.exports.isStream = helpers.isStream;
module.exports.isString = helpers.isString;
module.exports.isObject = helpers.isObject;

module.exports.isWriteStream = s => s && typeof s === 'object' && typeof s.pipe === 'function' && s.writable !== false && typeof s._write === 'function' && typeof s._writableState === 'object';

module.exports.isRedirect = code => [300, 301, 302, 303, 305, 307, 308].indexOf(code) !== -1;

module.exports.prependHTTP = (url) => {
  url = url.trim();

  const match = url.match(/(?:(?:http[a-z]?):\/\/)|(:?\/\/)/ig);
  url = url.replace(/(?:(?:http[a-z]?):\/\/)|(:?\/\/)/ig, '');

  if (match && match[0] === 'https://') {
    return `https://${url}`;
  }
  return `http://${url}`;
};
