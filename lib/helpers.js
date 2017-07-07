'use strict';

const { isStream, isString, isObject } = require('multi-part/lib/helpers');

module.exports.isStream = isStream;
module.exports.isString = isString;
module.exports.isObject = isObject;

module.exports.isWriteStream = s => s && typeof s === 'object' && typeof s.pipe === 'function' && s.writable !== false && typeof s._write === 'function' && typeof s._writableState === 'object';

module.exports.isRedirect = code => [300, 301, 302, 303, 304, 305, 307, 308].includes(code);
module.exports.isRedirectAll = code => [300, 303, 307, 308].includes(code);

module.exports.prependHTTP = (url) => {
  url = url.trim();

  const match = url.match(/(?:(?:http[a-z]?):\/\/)|(:?\/\/)/ig);
  url = url.replace(/(?:(?:http[a-z]?):\/\/)|(:?\/\/)/ig, '');

  if (match && match[0] === 'https://') {
    return `https://${url}`;
  }
  return `http://${url}`;
};
