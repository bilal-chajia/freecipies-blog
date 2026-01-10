/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<import("@shared/types").Env>;

declare namespace App {
  interface Locals extends Runtime {
  }
}

declare module '*?worker' {
  const workerConstructor: {
    new(): Worker;
  };
  export default workerConstructor;
}
