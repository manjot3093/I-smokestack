import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { synthesizeSpeech } from './tts.js';

function provider(outcomes) {
  const clients = [];
  return {
    clients,
    createClient() {
      const outcome = outcomes[clients.length];
      const audioStream = new PassThrough();
      const client = {
        closed: false,
        async setMetadata() {},
        toStream() {
          setImmediate(() => {
            if (outcome === 'hang') return;
            if (outcome instanceof Error) {
              audioStream.write('partial');
              audioStream.destroy(outcome);
            } else audioStream.end(outcome);
          });
          return { audioStream };
        },
        close() { this.closed = true; audioStream.destroy(); },
      };
      clients.push(client);
      return client;
    },
  };
}

test('retries interrupted synthesis without including partial audio', async () => {
  const source = provider([new Error('stream closed'), 'complete audio']);
  const result = await synthesizeSpeech('Hello', source);
  assert.equal(result.toString(), 'complete audio');
  assert.ok(source.clients.every((client) => client.closed));
});

test('closes the connection after successful synthesis', async () => {
  const source = provider(['audio']);
  assert.equal((await synthesizeSpeech('Hello', source)).toString(), 'audio');
  assert.ok(source.clients[0].closed);
});

test('rejects persistent failures after one retry and closes connections', async () => {
  const source = provider([new Error('unavailable'), new Error('unavailable')]);
  await assert.rejects(synthesizeSpeech('Hello', source), /unavailable/);
  assert.equal(source.clients.length, 2);
  assert.ok(source.clients.every((client) => client.closed));
});

test('rejects empty audio instead of returning a successful empty file', async () => {
  const source = provider(['', '']);
  await assert.rejects(synthesizeSpeech('Hello', source), /empty/i);
});

test('times out stalled synthesis and releases both attempts', async () => {
  const source = provider(['hang', 'hang']);
  await assert.rejects(synthesizeSpeech('Hello', { ...source, timeoutMs: 20 }), /timeout/i);
  assert.equal(source.clients.length, 2);
  assert.ok(source.clients.every((client) => client.closed));
});
