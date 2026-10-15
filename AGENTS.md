<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Produzione di riferimento

- Dal 15 ottobre 2026 la produzione è esclusivamente https://beystreetboyz.vercel.app,
  progetto Vercel `beystreetboyz`, scope `flaviocnns-projects`, con database Supabase.
- Per modifiche e sincronizzazioni richieste dall'utente, Vercel/Supabase è la
  destinazione di produzione predefinita. PostgreSQL Docker resta solo sviluppo.
- Il vecchio Cloud Sites è archivio storico: non pubblicare, sincronizzare o
  modificare dati su Sites, salvo esplicita nuova richiesta dell'utente.
- `.openai/hosting.json` e gli script Sites sono riferimenti legacy, non istruzioni
  per scegliere la produzione. Il repository attivo è `flaviocnn/beystreetboyz`.
- Conservare gli ID e le identità OAuth di produzione nelle riconciliazioni.
  Prima di importazioni: backup riservato, confronto e verifica transazionale.
- Non eseguire `vercel link` in questa cartella già collegata: la CLI può
  sovrascrivere `.env.local`. Non inserire credenziali o backup nei file pubblici.
