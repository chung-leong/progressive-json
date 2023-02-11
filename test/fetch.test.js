import { expect } from 'chai';
import { createServer } from 'http';

import {
  fetchChunks,
  fetchJSON,
} from '../src/fetch.js';

describe('Data retrieval', function() {
  const server = createServer((req, res) => server.handler?.(req, res));
  before(function(done) {
    server.listen(0, done);
  })
  after(function(done) {
    server.close(done);
  })
  afterEach(function() {
    server.handler = null;
  })
  describe('#fetchChunks', function() {
    it('should fetch the remote data', async function() {
      const data = 'This is a test';
      server.handler = (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(data);      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0);
      for await (const chunk of fetchChunks(url)) {
        const newBuffer = new Uint8Array(buffer.length + chunk.length);
        newBuffer.set(buffer);
        newBuffer.set(chunk, buffer.length);
        buffer = newBuffer;
      }
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      expect(text).to.equal('This is a test');
    })
    it('should retry if initial attempt ends in failure', async function() {
      const data = 'This is a test';
      let ready = false, count = 0;
      server.handler = (req, res) => {
        if (ready) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(data);        
        } else {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('');
        }
        count++;
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0);
      setTimeout(() => ready = true, 20);
      for await (const chunk of fetchChunks(url, { retryInterval: 50 })) {
        const newBuffer = new Uint8Array(buffer.length + chunk.length);
        newBuffer.set(buffer);
        newBuffer.set(chunk, buffer.length);
        buffer = newBuffer;
      }
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      expect(text).to.equal('This is a test');
      expect(count).to.equal(2);
    })
    it('should fetch the remote data in chunks', async function() {
      const data = 'This is a test';
      server.handler = (req, res) => {
        const range = req.headers.range;
        const m = /bytes=(\d+)-(\d+)/.exec(range);
        const si = parseInt(m[1]), ei = parseInt(m[2]);
        res.writeHead(206, { 
          'Content-Type': 'text/plain',
          'Etag': 'abc',
          'Content-Range': `bytes ${si}-${ei}/${data.length}`,
        });
        res.end(data.substring(si, ei + 1));      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0), count = 0;
      for await (const chunk of fetchChunks(url, { chunkSize: 2 })) {
        const newBuffer = new Uint8Array(buffer.length + chunk.length);
        newBuffer.set(buffer);
        newBuffer.set(chunk, buffer.length);
        buffer = newBuffer;
        count++;
      }
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      expect(text).to.equal('This is a test');
      expect(count).to.equal(7);
    })
    it('should fail when no etag is returned', async function() {
      const data = 'This is a test';
      server.handler = (req, res) => {
        const range = req.headers.range;
        const m = /bytes=(\d+)-(\d+)/.exec(range);
        const si = parseInt(m[1]), ei = parseInt(m[2]);
        res.writeHead(206, { 
          'Content-Type': 'text/plain',
          'Content-Range': `bytes ${si}-${ei}/${data.length}`,
        });
        res.end(data.substring(si, ei + 1));      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0), error;
      try {
        for await (const chunk of fetchChunks(url, { chunkSize: 2 })) {
          const newBuffer = new Uint8Array(buffer.length + chunk.length);
          newBuffer.set(buffer);
          newBuffer.set(chunk, buffer.length);
          buffer = newBuffer;
          count++;
        }  
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
    it('should fail when no range header is messed up', async function() {
      const data = 'This is a test';
      server.handler = (req, res) => {
        const range = req.headers.range;
        const m = /bytes=(\d+)-(\d+)/.exec(range);
        const si = parseInt(m[1]), ei = parseInt(m[2]);
        res.writeHead(206, { 
          'Content-Type': 'text/plain',
          'Etag': 'abc',
          'Content-Range': `bytes ${si}-${NaN}/${data.length}`,
        });
        res.end(data.substring(si, ei + 1));      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0), error;
      try {
        for await (const chunk of fetchChunks(url, { chunkSize: 2 })) {
          const newBuffer = new Uint8Array(buffer.length + chunk.length);
          newBuffer.set(buffer);
          newBuffer.set(chunk, buffer.length);
          buffer = newBuffer;
          count++;
        }  
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
    it('should fail when the server does not return 206', async function() {
      const data = 'This is a test';
      server.handler = (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(data);      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0), error;
      try {
        for await (const chunk of fetchChunks(url, { chunkSize: 2 })) {
          const newBuffer = new Uint8Array(buffer.length + chunk.length);
          newBuffer.set(buffer);
          newBuffer.set(chunk, buffer.length);
          buffer = newBuffer;
        }  
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
    it('should fail when the server returns 404', async function() {
      const data = 'This is a test';
      server.handler = (req, res) => {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      let buffer = new Uint8Array(0), error;
      try {
        for await (const chunk of fetchChunks(url)) {
          const newBuffer = new Uint8Array(buffer.length + chunk.length);
          newBuffer.set(buffer);
          newBuffer.set(chunk, buffer.length);
          buffer = newBuffer;
        }  
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
  })
  describe('#fetchJSON', function() {
    it('should retrieve JSONs progressively', async function() {
      const original = {
        results: [
          { a: 1, b: 2, c: 3 },
          { a: 4, b: 5, c: 6 },
          { a: 7, b: 8, c: 9 },
          { a: 10, b: 11, c: 12 },
          { a: 13, b: 14, c: 15 },
        ],
      };
      const data = JSON.stringify(original);
      server.handler = (req, res) => {
        const range = req.headers.range;
        const m = /bytes=(\d+)-(\d+)/.exec(range);
        const si = parseInt(m[1]), ei = parseInt(m[2]);
        res.writeHead(206, { 
          'Content-Type': 'text/plain',
          'Etag': 'abc',
          'Content-Range': `bytes ${si}-${ei}/${data.length}`,
        });
        res.end(data.substring(si, ei + 1));      
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      const objects = [];
      for await (const object of fetchJSON(url, { partial: 'results', chunkSize: 3 })) {
        objects.push(object);
      }
      expect(objects.length).to.equal(6);
      expect(objects[0]).to.eql({ results: [ { a: 1, b: 2, c: 3 } ] });
    })
    it('should restart from beginning when etag changes half way', async function() {
      const originalA = {
        results: [
          { a: 1, b: 2, c: 3 },
          { a: 4, b: 5, c: 6 },
          { a: 7, b: 8, c: 9 },
          { a: 10, b: 11, c: 12 },
          { a: 13, b: 14, c: 15 },
        ],
      };
      const originalB = {
        results: [
          { hello: 'world' },
        ],
      };
      let switched = false;
      server.handler = (req, res) => {
        const etag = `switched-${switched}`;
        const match = req.headers['if-match'];
        if (match && match !== etag) {
          res.writeHead(406);
          res.end('');
        } else {
          const data = JSON.stringify(switched ? originalB : originalA);
          const range = req.headers.range;
          const m = /bytes=(\d+)-(\d+)/.exec(range);
          const si = parseInt(m[1]), ei = parseInt(m[2]);
          res.writeHead(206, { 
            'Content-Type': 'text/plain',
            'Etag': etag,
            'Content-Range': `bytes ${si}-${ei}/${data.length}`,
          });
          res.end(data.substring(si, ei + 1));  
        }
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      const objects = [];
      const pause = async () => {
        if (objects.length === 3) {
          switched = true;
        }
      };
      for await (const object of fetchJSON(url, { partial: 'results', chunkSize: 3, pause })) {
        objects.push(object);
      }
      expect(objects[0]).to.eql({ results: [ { a: 1, b: 2, c: 3 } ] });
      expect(objects[3]).to.eql({ results: [ { hello: 'world' } ] });
    })
    it('should throw when server does not handle range', async function() {
      const original = {
        results: [
          { a: 1, b: 2, c: 3 },
          { a: 4, b: 5, c: 6 },
          { a: 7, b: 8, c: 9 },
          { a: 10, b: 11, c: 12 },
          { a: 13, b: 14, c: 15 },
        ],
      };
      const data = JSON.stringify(original);
      server.handler = (req, res) => {
        res.writeHead(206, { 'Content-Type': 'text/plain' });
        res.end(data);
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      const objects = [];
      let error;
      try {
        for await (const object of fetchJSON(url, { partial: 'results', chunkSize: 3 })) {
          objects.push(object);
        }  
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error');
    })
  })
})
