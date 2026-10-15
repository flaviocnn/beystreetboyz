# Torino Quest — Vercel + Supabase

Versione locale Next.js + PostgreSQL/Drizzle, sul ramo `codex/vercel-supabase`.
Il sito ChatGPT Sites usa ancora il database cloud D1, separato da PostgreSQL.
Il 15 ottobre 2026 è stata pubblicata su Sites la versione 15 (commit
`d22c551cfda91d0414c8a2ea831f69178372a392`): username Challonge come nome
principale in classifica, bacheca, Gilda, Wistery, specchio e lista staff.
Il trasferimento autorizzato è completato: il cloud contiene 24 membri, 3 messaggi,
una tappa e 24 risultati (23 assegnati), per 778 punti complessivi.
Backup, migrazione, importazione e confronto integrale sono stati verificati;
vedi `docs/sites-cloud-transfer.md`. Password, avatar e anagrafiche cloud esistenti
sono stati conservati. La versione Vercel/Supabase
rimane su questo ramo; il codice Sites è sul suo repository originale.

## Avvio sul Mac

Servono Node.js >=22.13 e Docker Desktop avviato.

```sh
cd /Users/flaviocannavo/Documents/bsbz
npm ci
npm run local:setup
docker compose --env-file .env.local up -d --wait
npm run db:migrate
npm run db:import -- .local-data/local-export.json
npm run tournament:sync -- data/tournaments/psmc5x5.json
npm run dev -- --hostname 127.0.0.1
```

Apri http://127.0.0.1:3000. Configurazione e importazione sono già state eseguite
su questo Mac. `local:setup` non sovrascrive `.env.local`. La nuova parola d'ordine
staff è `STAFF_PASSPHRASE` in quel file; le password dei membri restano invariate.
Sul nuovo dominio gli utenti devono effettuare nuovamente il login.

La copia aggiornata contiene **24 membri e 3 messaggi**. L'export contiene dati
personali e hash delle password: `.local-data/` e `.env*` sono esclusi da Git e
Vercel. Non condividerli né spostarli in `public/`.
L'import conserva ID, credenziali, avatar, tesseramenti e profili Challonge;
salta gli ID già presenti senza sovrascriverli. Altri conflitti annullano l'import.
Non è una sincronizzazione continua: prima del passaggio definitivo occorre
trasferire eventuali nuove modifiche effettuate sul sito originale.

Per fermare PostgreSQL senza cancellare i dati:

```sh
docker compose --env-file .env.local stop
```

## Deploy

1. Crea un progetto Supabase dedicato e vuoto. Da **Connect** copia le stringhe
   PostgreSQL, sostituendo la password e codificando eventuali caratteri speciali.
2. Crea `.env.supabase.local` sul Mac (ignorato da Git):

   ```dotenv
   DATABASE_MIGRATION_URL=STRINGA_DIRECT_O_SESSION_POOLER_PORTA_5432
   ```

   Usa Direct Connection oppure Session pooler se la rete non supporta IPv6.
3. Applica schema e dati al progetto Supabase scelto:

   ```sh
   node --env-file=.env.supabase.local scripts/migrate.mjs
   node --env-file=.env.supabase.local scripts/import-data.mjs .local-data/local-export.json
   node --env-file=.env.supabase.local scripts/sync-tournament.mjs data/tournaments/psmc5x5.json
   ```

4. Carica il codice in un tuo repository **privato** e importalo su Vercel.
   Il remote Git esistente appartiene a Sites: configura un nuovo remote per
   il tuo repository, non pubblicare la migrazione sul remote Sites.
5. Su Vercel: preset **Next.js**, radice `.`, Node.js 24.x, installazione `npm ci`,
   build `npm run build`. Configura queste variabili server:

   | Variabile | Valore |
   | --- | --- |
   | `DATABASE_URL` | Supabase Transaction pooler, porta 6543 |
   | `SESSION_SECRET` | Segreto casuale di almeno 32 byte |
   | `STAFF_PASSPHRASE` | Nuova parola d'ordine privata staff |

   Genera il segreto con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Non usare prefissi `NEXT_PUBLIC_`. `DATABASE_MIGRATION_URL` non serve su Vercel.
   Non impostare su Vercel l'URL del PostgreSQL Docker locale.
   Usa un database separato per le Preview per evitare modifiche ai dati reali.
6. Esegui Deploy e verifica login, staff, password, avatar e bacheca prima di
   trasferire il dominio definitivo.

La build non esegue migrazioni. Il driver disabilita prepared statements per
il Transaction pooler. RLS è attivo senza policy pubbliche; anon/authenticated
non possono accedere alle tabelle. Il server usa la connessione PostgreSQL
privilegiata, non una chiave anon.

**Supabase Auth non è attivato**: resta il login esistente per mantenere le
credenziali. I riferimenti Challonge sono conservati; questa migrazione non
aggiunge nuove integrazioni esterne.

Documentazione: [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

## Verifiche e modifiche future

```sh
npm test
npm run build
# Con il server locale acceso:
npm run test:integration
```

Il test di integrazione usa un membro fittizio e lo elimina al termine; rifiuta
URL non locali. Le migrazioni SQL attive sono in `supabase/migrations/`, tracciate
con checksum in `tq_internal.migrations`. Non modificare migrazioni applicate:
aggiungi un nuovo file SQL e aggiorna `db/schema.ts`.
`db:generate` produce solo bozze in `drizzle-pg/`: revisionale prima di aggiungere
le modifiche incrementali alle migrazioni attive; non duplicare lo schema iniziale.
I file Cloudflare/Vinext e `drizzle/` restano come riferimento storico, esclusi
dalla build corrente. I vecchi test dello starter non fanno parte di `npm test`.

La prima tappa Challonge è conservata in `data/tournaments/psmc5x5.json`:
24 risultati associati a 24 membri. `MikeMorz` è censito come Mike Morzz. Il comando
`npm run tournament:sync -- data/tournaments/psmc5x5.json` aggiorna la stessa
tappa senza duplicare punti e ricalcola per ogni membro le migliori 10 tappe.
La correzione Nika37 → `__Grizzly__` è documentata in `docs/correzioni-tornei.md`.
Savino e Isabella Palermo hanno schede parziali: prima del loro accesso serve
un'email o un codice fiscale, seguito dal reset della password nello staff.
L'export originale del sito resta in `.local-data/sites-export.json`; per
Supabase usa `local-export.json`, che include i membri e gli abbinamenti più
recenti. Il comando `node --env-file=.env.local scripts/export-local.mjs`
crea un export aggiornato, rifiutando di sovrascrivere quello esistente.

Audit eseguito: nessuna vulnerabilità nelle dipendenze di produzione.
Restano segnalazioni transitive negli strumenti di sviluppo ESLint/Drizzle Kit;
non è stato applicato `npm audit fix --force` perché propone downgrade incompatibili.

## Accesso con Challonge

Configurazione OAuth, associazioni e attivazione: [guida al login Challonge](docs/challonge-login.md).
