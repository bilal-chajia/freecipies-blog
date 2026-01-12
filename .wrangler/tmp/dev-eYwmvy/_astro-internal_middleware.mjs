globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_i1f6TNQq.mjs';
import './chunks/astro-designed-error-pages_B3kwtL5g.mjs';
import './chunks/astro/server_Bsmdvglz.mjs';

try {
  if (typeof globalThis.MessageChannel === "undefined") {
    const { MessageChannel } = await import('node:worker_threads');
    globalThis.MessageChannel = MessageChannel;
  }
} catch (e) {
  console.warn("Failed to polyfill MessageChannel from node:worker_threads", e);
  if (typeof globalThis.MessageChannel === "undefined") {
    class MockMessageChannel {
      port1;
      port2;
      constructor() {
        this.port1 = { onmessage: null, postMessage: (msg) => {
          if (this.port2.onmessage) this.port2.onmessage({ data: msg });
        } };
        this.port2 = { onmessage: null, postMessage: (msg) => {
          if (this.port1.onmessage) this.port1.onmessage({ data: msg });
        } };
      }
    }
    globalThis.MessageChannel = MockMessageChannel;
  }
}
const onRequest$2 = defineMiddleware(async (context, next) => {
  return next();
});

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
