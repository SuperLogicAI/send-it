// Spike-only stub so tsc passes; real types come from `wrangler types` in 1.3.
declare module "cloudflare:workers" {
  export const env: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  export class DurableObject {
    constructor(ctx: any, env: unknown); // eslint-disable-line @typescript-eslint/no-explicit-any
    ctx: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}
declare type DurableObjectState = any; // eslint-disable-line @typescript-eslint/no-explicit-any
