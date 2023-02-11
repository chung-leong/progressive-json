import { expect } from 'chai';

import {
  generateJSON,
} from '../index.js';

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

  it('should return the end brackets used when yieldClosingBrackets is true', async function() {
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
    const objects = [], ends = [];
    const generator = generateJSON(source, { 
      partial: 'hello.#.*', 
      yieldClosingBrackets: true 
    });
    for await (const [ object, end ] of generator) {
      objects.push(object);
      ends.push(end);
    }
    expect(ends[0]).to.equal(']}]}');
    expect(ends[1]).to.equal('');
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

})

function createDataSource(...args) {
  return (async function*() {
    const encoder = new TextEncoder;
    for (const arg of args) {
      yield encoder.encode(arg);
    }
  })();
}