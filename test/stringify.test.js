import { expect } from 'chai';
import { createServer } from 'http';

import {
  createJSONStream,
  countGenerated,
  deferred,
} from '../server.js';
import {
  generateStringified,
} from '../src/stringify.js';
import {
  fetchJSON,
} from '../index.js';

describe('Stringification', function() {
  describe('#generateStringified', function() {
    it('should yield the same result as JSON.stringify when a regular object is given', async function() {
      const object = {
        a: 'Hello world',
        b: NaN,
        c: Infinity,
        d: Symbol('?'),
        e: {
          f: [ 1, 2, 3, undefined ],
          g: new Date(),
        },
        h: () => {},
        i: function() {},
        "\n\n": "\n\n",
      };
      const text1 = await readText(generateStringified(object));
      const text2 = JSON.stringify(object);
      expect(text1).to.equal(text2);
    })
    it('should indent the same way as JSON.stringify', async function() {
      const object = {
        a: 'Hello world',
        b: NaN,
        c: Infinity,
        d: Symbol('?'),
        e: {
          f: [ 1, 2, 3, undefined ],
          g: new Date(),
        },
        h: () => {},
        i: function() {},
        "\n\n": "\n\n",
      };
      const text1 = await readText(generateStringified(object, undefined, 2));
      const text2 = JSON.stringify(object, undefined, 2);
      expect(text1).to.equal(text2);
    })
    it('should handle promises as expected', async function() {
      const object2 = {
        a: 'Hello world',
        b: NaN,
        c: Infinity,
        d: Symbol('?'),
        e: {
          f: [ 1, 2, 3, undefined ],
          g: new Date(),
        },
        h: () => {},
        i: function() {},
        "\n\n": "\n\n",
      };
      const object1 = {
        ...object2,
        a: Promise.resolve(object2.a),
        b: Promise.resolve(object2.b),
      };
      const text1 = await readText(generateStringified(object1, undefined, 2));
      const text2 = JSON.stringify(object2, undefined, 2);
      expect(text1).to.equal(text2);
    })
    it('should accept async generator', async function() {
      async function *generate() {
        yield 1;
        await delay(10);
        yield 2;
        await delay(10);
        yield {
          a: [ 1, 2, {}, [] ],
          b: delay(10).then(() => "Hello world")
        };
        yield (async function*() {
          // yield nothing
          delay(10);
        })();
      };
      const text = await readText(generateStringified(generate(), undefined, 2));
      const object = JSON.parse(text);
      expect(object).to.eql([ 1, 2, { a: [ 1, 2, {}, [] ], b: 'Hello world' }, [] ]);
    })
    it('should use replacer function', async function() {
      const object = {
        a: 'Hello world',
        b: NaN,
        c: Infinity,
        d: Symbol('?'),
        e: {
          f: [ 1, 2, 3, undefined ],
          g: new Date(),
        },
        h: () => {},
        i: function() {},
        "\n\n": "\n\n",
      };
      const replacer = (key, val) => key ? 'dingo' : val;
      const text1 = await readText(generateStringified(object, replacer));
      const text2 = JSON.stringify(object, replacer);
      expect(text1).to.equal(text2);
    })
    it('should use replacer array', async function() {
      const object = {
        a: 'Hello world',
        b: NaN,
        c: Infinity,
        d: Symbol('?'),
        e: {
          f: [ 1, 2, 3, undefined ],
          g: new Date(),
        },
        h: () => {},
        i: function() {},
        "\n\n": "\n\n",
      };
      const replacer = [ 'a', 'c', 'd', 'e', 'f' ];
      const text1 = await readText(generateStringified(object, replacer, 2));
      const text2 = JSON.stringify(object, replacer, 2);
      expect(text1).to.equal(text2);
    })
    it('should treat invalid replacer and space the same way as JSON.stringify', async function() {
      const object = {
        a: 'Hello world',
        b: NaN,
        c: Infinity,
        d: Symbol('?'),
        e: {
          f: [ 1, 2, 3, undefined ],
          g: new Date(),
        },
        h: () => {},
        i: function() {},
        "\n\n": "\n\n",
      };
      const replacer = 'a';
      const text1 = await readText(generateStringified(object, replacer, Infinity));
      const text2 = JSON.stringify(object, replacer, Infinity);
      expect(text1).to.equal(text2);
      const text3 = await readText(generateStringified(object, replacer, -34));
      const text4 = JSON.stringify(object, replacer, -34);
      expect(text3).to.equal(text4);
      const text5 = await readText(generateStringified(object, replacer, ''));
      const text6 = JSON.stringify(object, replacer, '');
      expect(text5).to.equal(text6);
    })
    it('should error out when a toJSON handler throws', async function() {
      const object = {
        bad: { 
          toJSON: () => {
            throw new Error('Bad news')
          }
        }
      };
      let error;
      try {
        for await (const json of generateStringified(object)) {          
        }
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
  })
  describe('#createJSONStream', function() {
    const server = createServer((req, res) => server.handler(req, res));
    before(function(done) {
      server.listen(0, done);
    });
    after(function(done) {
      server.close(done);
    });
    afterEach(function() {
      server.handler = null;
    });
    it('should create a stream that produces a JSON document', async function() {
      server.handler = (req, res) => {
        const object = {
          a: 'Hello world',
          b: delay(10).then(() => 123),
          c: (async function*() {
            yield 'bingo';
            yield 'dingo';
            yield 'jingo';
            await delay(30);
            yield 'lingo';
          })(),
        };
        const stream = createJSONStream(object, undefined, 2);
        res.writeHead(200, { 'Content-type': 'application/json' });
        stream.pipe(res);
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/`;
      const res = await fetch(url);
      const json = await res.json();
      expect(json).to.eql({
        a: 'Hello world',
        b: 123,
        c: [ 'bingo', 'dingo', 'jingo', 'lingo' ]
      });
    })
    it('should produce useful result for fetchJSON', async function() {
      server.handler = (req, res) => {
        const results = (async function*() {
          for (let i = 1; i <= 10; i++) {
            yield {
              id: i,
              date: new Date(),
              hello: 'Hello world!\n'.repeat(10),
            };
            await delay(10);  
          }
        })();
        const stream = createJSONStream(results, (key, val) => val, 2);
        res.writeHead(200, { 'Content-type': 'application/json' });
        stream.pipe(res);
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/`;
      const objects = [];
      for await (const object of fetchJSON(url)) {
        objects.push(object);
      }
      expect(objects.length).to.be.at.least(2);
    })
  })
  describe('#countGenerated', function() {
    it('should count the number of items generated by async generator', async function() {
      const generator = (async function*() {
        yield 1;
        yield 2;
        yield 3;
      })();
      const object = {
        results: generator,
        count: countGenerated(generator)
      };
      const text = await readText(createJSONStream(object));
      const output = JSON.parse(text);
      expect(output).to.eql({
        results: [ 1, 2, 3 ],
        count: 3
      });
    })
    it('should count the number of items generated by regular generator', async function() {
      const generator = (function*() {
        yield 1;
        yield 2;
        yield 3;
      })();
      const object = {
        results: generator,
        count: countGenerated(generator)
      };
      const text = await readText(createJSONStream(object));
      const output = JSON.parse(text);
      expect(output).to.eql({
        results: [ 1, 2, 3 ],
        count: 3
      });
    })
    it('should throw when given non-generator', async function() {
      expect(() => countGenerated({})).to.throw();
    })
    it('should reject when an error occurs in the generator', async function() {
      // cover error handling in generateStringified too
      const generator = (function*() {
        yield 1;
        yield 2;
        yield 3;
        throw new Error('A five-ounce bird cannot carry a one-pound coconut');
      })();
      const object = { count: countGenerated(generator) };
      try {
        // fulfill the promise
        for (const number of generator) {
        }
      } catch (err) {
      }
      let error;
      try {
        const text = await readText(generateStringified(object));        
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
    it('should reject when an error occurs in the async generator', async function() {
      // cover error handling in generateStringified too
      const generator = (async function*() {
        yield 1;
        yield 2;
        yield 3;
        throw new Error('A five-ounce bird cannot carry a one-pound coconut');
      })();
      const object = { count: countGenerated(generator) };
      try {
        // fulfill the promise
        for await (const number of generator) {
        }
      } catch (err) {
      }
      let error;
      try {
        const text = await readText(generateStringified(object));        
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
  })
  describe('#deferred', function() {
    it('should yield return value from async callback function', async function() {
      const object = {
        message: deferred(async () => {
          await delay(10);
          return 'Hello world';
        })
      };
      const text = await readText(createJSONStream(object));
      expect(text).to.equal('{"message":"Hello world"}');
    })
  })
})

async function readText(generator) {
  const chunks = [];
  let size = 0;
  for await (const chunk of generator) {
    chunks.push(chunk);
    size += chunk.length;
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}