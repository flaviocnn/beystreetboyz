# Torino Quest — Vercel + Supabase

**Produzione predefinita: https://beystreetboyz.vercel.app**, con database Supabase.
Repository attivo: `https://github.com/flaviocnn/beystreetboyz`.
Applicazione Next.js + PostgreSQL/Drizzle; accesso con Challonge oppure email/CF.

Dal 15 ottobre 2026 Sites è soltanto archivio storico: nessuna nuova pubblicazione
o sincronizzazione deve essere destinata a quel cloud. Vercel/Supabase è l'unica
fonte di verità di produzione. Docker PostgreSQL è un ambiente di sviluppo separato.

Il passaggio definitivo trasferisce 25 membri, 6 messaggi, una tappa e 24 risultati
associati, per **786 punti**. L'account OAuth GranBurstone mantiene il proprio ID
Vercel e riceve l'anagrafica e i 15 punti storici, senza duplicati.
Procedura e backup riservati: [produzione Vercel](docs/production.md).

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

La copia Docker precedente al passaggio contiene **25 membri e 3 messaggi**;
la produzione conserva anche gli aggiornamenti successivi di Sites (6 messaggi).
Gli export contengono dati
personali e hash delle password: `.local-data/` e `.env*` sono esclusi da Git e
Vercel. Non condividerli né spostarli in `public/`.
L'import conserva ID, credenziali, avatar, tesseramenti e profili Challonge;
salta gli ID già presenti senza sovrascriverli. Altri conflitti annullano l'import.
Non è una sincronizzazione continua: non importare una vecchia copia Docker
in produzione per sovrascrivere dati Vercel più recenti.

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

4. Il progetto è già collegato al repository `flaviocnn/beystreetboyz` e a Vercel.
   Non usare i vecchi helper di pubblicazione Sites.
5. Su Vercel: preset **Next.js**, radice `.`, Node.js 24.x, installazione `npm ci`,
   build `npm run db:migrate && npm run build`. Configura queste variabili server:

   | Variabile | Valore |
   | --- | --- |
   | `DATABASE_URL` | Supabase Transaction pooler, porta 6543 |
   | `SESSION_SECRET` | Segreto casuale di almeno 32 byte |
   | `STAFF_PASSPHRASE` | Nuova parola d'ordine privata staff |
   | `CHALLONGE_CLIENT_ID` | ID dell'app OAuth |
   | `CHALLONGE_CLIENT_SECRET` | Segreto OAuth, variabile sensibile |
   | `CHALLONGE_REDIRECT_URI` | `https://beystreetboyz.vercel.app/api/auth/challonge/callback` |

   Genera il segreto con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Non usare prefissi `NEXT_PUBLIC_` per segreti. L'integrazione Vercel/Supabase
   fornisce già `POSTGRES_URL`, accettata in alternativa a `DATABASE_URL`.
   Per migrare si usa `DATABASE_MIGRATION_URL`, altrimenti `POSTGRES_URL_NON_POOLING`.
   Non impostare su Vercel l'URL del PostgreSQL Docker locale.
   Usa un database separato per le Preview per evitare modifiche ai dati reali.
6. Esegui Deploy e verifica login, staff, password, avatar e bacheca prima di
   trasferire il dominio definitivo.

La build Vercel esegue le migrazioni prima della compilazione. Il driver disabilita prepared statements per
il Transaction pooler. RLS è attivo senza policy pubbliche; anon/authenticated
non possono accedere alle tabelle. Il server usa la connessione PostgreSQL
privilegiata, non una chiave anon.

**Supabase Auth non è attivato**: le sessioni dell'app mantengono sia il login
locale esistente sia OAuth Challonge. Le identità verificate sono conservate
separatamente dai campi anagrafici modificabili.

Documentazione: [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

## Verifiche e modifiche future

```sh
npm test
node --test tests/production-plan.test.mjs
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
L'export originale del sito resta in `.local-data/sites-export.json`.
Il backup definitivo Sites è `.local-data/sites-cutover-2026-10-15.json`;
il backup Supabase definitivo è `.local-data/vercel-post-cutover-2026-10-15.json`.
`local-export.json` è una copia precedente, non la fonte di produzione.
Il comando `node --env-file=.env.local scripts/export-local.mjs`
crea un export aggiornato, rifiutando di sovrascrivere quello esistente.

Audit eseguito: nessuna vulnerabilità nelle dipendenze di produzione.
Restano segnalazioni transitive negli strumenti di sviluppo ESLint/Drizzle Kit;
non è stato applicato `npm audit fix --force` perché propone downgrade incompatibili.

## Accesso con Challonge

Configurazione OAuth, associazioni e attivazione: [guida al login Challonge](docs/challonge-login.md).

## Check-in delle tappe

Dal Palazzo dello staff apri **Check-in tappe** per collegare un torneo Challonge,
importare gli iscritti e registrare presenza e pagamento fisico della singola quota.
Riepilogo pre-torneo, ospiti senza anagrafica, correzioni e cronologia sono inclusi.
Il tesseramento annuale resta separato. [Procedura e verifiche](docs/checkin.md).
