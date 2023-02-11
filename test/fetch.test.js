import { expect } from 'chai';
import ServerMock from 'mock-http-server';

import {
  fetchChunks,
} from '../src/fetch.js';

describe('#fetchChunks', function() {
  const server = new ServerMock({ host: 'localhost', port: 0 });
  beforeEach(function(done) {
    server.start(done);
  });
  afterEach(function(done) {
    server.stop(done);
  });
  it('should fetch the remote data', async function() {
    server.on({
      method: 'GET',
      path: '/resource',
      reply: {
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: 'This is a test'
      }
    });
    const url = `http://localhost:${server.getHttpPort()}/resource`;
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
})  
