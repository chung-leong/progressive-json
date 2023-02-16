import { expect } from 'chai';

import {
  generateJSON,
  getJSONProgress,
} from '../index.js';

describe('JSON parsing', function() {
  describe('#generateJSON', function() {
    it('should allow the use of wildcard characters in partial rule', async function() {
      const source = createDataSource(`
        { 
          "hello": [
            { "a": 1, "b": 2, "c": [] },
            { "a": 2, "b": 5, "c": [ 1, 2, 3,`, ` 4 ] },
            { "a": 8, "b": 9, "c": [ 7 ] }
          ],
          "what": "the heck?"
        }
      `);
      const objects = [];
      const generator = generateJSON(source, { 
        partial: 'hello.#.*', 
      });
      for await (const object of generator) {
        objects.push(object);
      }
      expect(objects[0]).to.eql({
        hello: [
          { a: 1, b: 2, c: [] },
          { a: 2, b: 5, c: [ 1, 2, 3 ] }
        ]
      });
      expect(objects[1]).to.eql({
        hello: [
          { a: 1, b: 2, c: [] },
          { a: 2, b: 5, c: [ 1, 2, 3, 4 ] },
          { a: 8, b: 9, c: [ 7 ] },
        ],
        what: 'the heck?'
      });
    })
    it('should accept partial rules given in an array', async function() {
      const source = createDataSource(`
        { 
          "hello": [
            { "a": 1, "b": 2, "c": [] },
            { "a": 2, "b": 5, "c": [ 1, 2, 3,`, ` 4 ] },
            { "a": 8, "b": 9, "c": [ 7 ] }
          ],
          "what": "the heck?"
        }
      `);
      const objects = [];
      const generator = generateJSON(source, { 
        partial: [ 'hello.#.a', 'hello.#.b', 'hello.#.c' ], 
      });
      for await (const object of generator) {
        objects.push(object);
      }
      expect(objects[0]).to.eql({
        hello: [
          { a: 1, b: 2, c: [] },
          { a: 2, b: 5, c: [ 1, 2, 3 ] }
        ]
      });
      expect(objects[1]).to.eql({
        hello: [
          { a: 1, b: 2, c: [] },
          { a: 2, b: 5, c: [ 1, 2, 3, 4 ] },
          { a: 8, b: 9, c: [ 7 ] },
        ],
        what: 'the heck?'
      });
    })
    it('should allow the omit truncated object when it does not match partial rule', async function() {
      const source = createDataSource(`
        { 
          "hello": [
            { "a": 1, "b": 2, "c": [] },
            { "a": 2, "b": 5, "c": [ 1, 2, 3,`, ` 4 ] },
            { "a": 8, "b": 9, "c": [ 7 ] }
          ],
          "what": "the heck?"
        }
      `);
      const objects = [];
      const generator = generateJSON(source, { 
        partial: 'hello.#', 
      });
      for await (const object of generator) {
        objects.push(object);
      }
      expect(objects[0]).to.eql({
        hello: [
          { a: 1, b: 2, c: [] },
          { a: 2, b: 5 }
        ]
      });
      expect(objects[1]).to.eql({
        hello: [
          { a: 1, b: 2, c: [] },
          { a: 2, b: 5, c: [ 1, 2, 3, 4 ] },
          { a: 8, b: 9, c: [ 7 ] },
        ],
        what: 'the heck?'
      });
    }) 
    it('should throw when JSON has comma in an unexpected place', async function() {
      const source = createDataSource(',');
      let error;
      try {
        for await (const object of generateJSON(source)) {        
        }
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('message').that.contains('Unexpected token ,');
    })
    it('should throw when JSON has right curly in an unexpected place', async function() {
      const source = createDataSource('}');
      let error;
      try {
        for await (const object of generateJSON(source)) {        
        }
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('message').that.contains('Unexpected token }');
    })
    it('should throw when JSON has right square bracket in an unexpected place', async function() {
      const source = createDataSource(']');
      let error;
      try {
        for await (const object of generateJSON(source)) {        
        }
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('message').that.contains('Unexpected token ]');
    })
    it('should throw when key is not correctly escaped', async function() {
      const source = createDataSource('{ "\n": {} }');
      let error;
      try {
        for await (const object of generateJSON(source)) {        
        }
      } catch (err) {
        error = err;
      }
      // parsing the key will cause a syntax error; the reported position should be relative 
      // to the whole document, not relative to the key
      expect(error).to.be.an('error').with.property('message').that.contains('position 3');
    }) 
    it('should produce the correct position where an error occurs', async function() {
      const args = [
        '                       [, "\u2000\u2014", "Hell',
        'o" ]',
      ];
      const source = createDataSource(...args);
      let error1;
      try {
        for await (const object of generateJSON(source)) {        
        }
      } catch (err) {
        error1 = err;
      }
      let error2;
      try {
        JSON.parse(args.join(''));
      } catch (err) {
        error2 = err;
      }
      expect(error1.message).to.equal(error2.message);
    })
  })  
  describe('#getJSONProgress', async function() {
    it('should return the retrieval progress, including the end brackets used', async function() {
      const source = createDataSource(`
        { 
          "hello": [
            { "a": 1, "b": 2, "c": [] },
            { "a": 2, "b": 5, "c": [ 1, 2, 3,`, ` 4 ] },
            { "a": 8, "b": 9, "c": [ 7 ] }
          ],
          "what": "the heck?"
        }
      `);
      const percentages = [], ends = [];
      const generator = generateJSON(source, { partial: 'hello.#.*' });
      for await (const object of generator) {
        const { loaded, total, end } = getJSONProgress(object);
        percentages.push(loaded / total);
        ends.push(end);
      }
      expect(ends[0]).to.equal(']}]}');
      expect(percentages[0]).to.be.above(0.25);
      expect(ends[1]).to.equal('');
      expect(percentages[1]).to.equal(1);
    })
    it('should return an empty object when given an object not from generateJSON', async function() {
      const progress = getJSONProgress({});
      expect(progress).to.eql({});
    })
    it('should return an empty object when a scalar is given', async function() {
      const progress = getJSONProgress("Hello world");
      expect(progress).to.eql({});
    })
  })
})

function createDataSource(...args) {
  return (async function*() {
    const encoder = new TextEncoder;
    const chunks = args.map(arg => encoder.encode(arg));
    const total = chunks.reduce((total, chunk) => total + chunk.length, 0);
    for (const chunk of chunks) {
      chunk.total = total;
      yield chunk;
    }
  })();
}