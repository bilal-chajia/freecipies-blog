globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_i1f6TNQq.mjs';
import { MessageChannel } from 'node:worker_threads';
import './chunks/astro-designed-error-pages_B3kwtL5g.mjs';
import './chunks/astro/server_Bsmdvglz.mjs';

if (typeof globalThis.MessageChannel === "undefined") {
  globalThis.MessageChannel = MessageChannel;
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
