import { sep } from 'path';
import { Readable } from 'stream';

export function createJSONStream(value, replacer, space = 0) {
  return Readable.from(generateStringified(value, replacer, space));
}

export async function* generateStringified(value, replacer, space = 0) {
  const queue = new Queue;
  let depth = 0, indent = '';

  if (!isFinite(space)) {
    space = 0;
  }
  if (replacer) {
    if (Array.isArray(replacer)) {
      const keys = replacer;
      replacer = function(key, val) {
        // not supposed to filter for arrays
        if (!Array.isArray(this)) {
          // cannot use includes() since we want matching with type conversion
          if (keys.findIndex(k => k == key) !== -1) {
            return val;
          }            
        } else {
          return val;
        }
      };
    } else if (typeof(replacer) === 'function') {
      const outer = { '': value };
      value = replacer.call(outer, '', value);  
    } else {
      replacer = undefined;
    }
  }

  function move(delta) {
    depth += delta;
    indent = (space > 0) ? '\n' + ' '.repeat(depth * space) : '';
  }

  function processScalar(value, separator, prefix, defVal) {    
    const string = JSON.stringify(value) ?? defVal;
    if (string !== undefined) {
      queue.push(separator, indent, prefix, string);
      return 1;
    } else {
      return 0;
    }
  }

  async function processObject(object, separator, prefix, defVal) {
    if (typeof(object.toJSON) === 'function') {
      await process(object.toJSON(), separator, prefix, defVal);
    } else if (typeof(object.then) === 'function') {
      await process(await object, separator, prefix, defVal);
    } else if (object[Symbol.asyncIterator]) {
      queue.push(separator, indent, prefix, '[');
      move(+1);
      let count = 0;
      for await (const item of object) {
        const sep = (count > 0) ? ',' : '';
        const val = (replacer) ? replacer.call(object, count, item) : item;
        count += await process(val, sep, '', 'null');
      }
      move(-1);
      queue.push(count > 0 ? indent : '', ']');
    } else if (object[Symbol.iterator]) {
      queue.push(separator, indent, prefix, '[')
      move(+1);
      let count = 0;
      for (const item of object) {
        const sep = (count > 0) ? ',' : '';
        const val = (replacer) ? replacer.call(object, count, item) : item;
        // inlining process() here, so the whole array can be processed in synchronous
        // code if it only contains scalar values
        if (typeof(val) === 'object' && val) {
          count += await processObject(val, sep, '', 'null');
        } else {
          count += processScalar(val, sep, '', 'null');
        }
      }
      move(-1);
      queue.push(count > 0 ? indent : '', ']');
    } else {
      queue.push(separator, indent, prefix, '{');
      move(+1);
      const colon = (space > 0) ? ': ' : ':'; 
      let count = 0;
      for (const [ key, prop ] of Object.entries(object)) {
        const val = (replacer) ? replacer.call(object, key, prop) : prop;
        const sep = (count > 0) ? ',' : '';
        const pre = JSON.stringify(key) + colon;
        // inlining process() here for the same reason as above
        if (typeof(val) === 'object' && val) {
          count += await processObject(val, sep, pre);
        } else {
          count += processScalar(val, sep, pre);
        }
      }
      move(-1);
      queue.push(count > 0 ? indent : '', '}');
    }
    return 1;
  }

  async function process(value, separator, prefix, defVal) {
    if (typeof(value) === 'object' && value) {
      return processObject(value, separator, prefix, defVal);
    } else {
      return processScalar(value, separator,prefix, defVal);
    }
  }

  process(value).then(() => queue.close());

  const encoder = new TextEncoder();
  for (;;) {
    const tokens = await queue.pull();
    if (!tokens) {
      break;
    }
    const text = tokens.join('');
    yield encoder.encode(text);
  }
}

class Queue {
  constructor() {
    this.items = [];
    this.promise = null;
    this.resolve = null;
    this.closed = false;
  }

  close() {
    this.closed = true;
    this.signal();
  }
  
  async pull() {
    if (!this.items && !this.closed) {
      if (!this.promise) {
        this.promise = new Promise(r => this.resolve = r);
      }
      await this.promise;
    }
    const { items } = this;
    this.items = null;
    return items;
  }

  push(...items) {
    if (this.items) {
      this.items.push(...items);
    } else {
      this.items = items;
    }
    this.signal();
  }

  signal() {
    if (this.promise) {
      this.resolve();
      this.promise = null;
      this.resolve = null;
    }
  }
}