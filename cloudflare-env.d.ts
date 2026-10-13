/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    STAFF_PASSPHRASE: string;
    SESSION_SECRET: string;
  }
}
