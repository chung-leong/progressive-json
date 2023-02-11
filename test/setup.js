import AbortController from 'abort-controller';
import fetch from 'node-fetch';

if (!global.AbortController) {
  global.AbortController = AbortController;
}
global.fetch = async (url, options) => {
  const res = await fetch(url, options);
  res.body.getReader = function() {
    const f = this[Symbol.asyncIterator];
    const iterator = f.call(this);
    return {
      read: () => iterator.next(),
    };
  };
  return res;
};

global.resolve = (path) => {
  return (new URL(path, import.meta.url)).pathname;
};