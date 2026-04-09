/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<import("@shared/types").Env>;

declare namespace App {
  interface Locals extends Runtime {
    cfContext: import("@cloudflare/workers-types").ExecutionContext;
  }
}

declare module '*?worker' {
  const workerConstructor: {
    new(): Worker;
  };
  export default workerConstructor;
}

declare module "cloudflare:workers" {
  export const env: import("@shared/types").Env;
}

