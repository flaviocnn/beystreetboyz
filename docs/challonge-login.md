# Login con Challonge

## Produzione Vercel (15 ottobre 2026)

- Dominio: https://beystreetboyz.vercel.app
- Callback da registrare su Challonge:
  `https://beystreetboyz.vercel.app/api/auth/challonge/callback`.
- Le tre variabili OAuth sono configurate in produzione; client secret e chiave
  delle sessioni sono variabili sensibili. Non sono incluse nel repository.
- L’app accetta anche `POSTGRES_URL` installata dall’integrazione Supabase/Vercel.
  Le migrazioni vengono eseguite prima della build; per migrarle si usa
  `DATABASE_MIGRATION_URL`, altrimenti `POSTGRES_URL_NON_POOLING` e i fallback.
- Migrazioni 0001–0008 applicate al database Supabase. Dopo l'attivazione OAuth
  è stato eseguito il trasferimento definitivo dei dati storici: 25 membri,
  6 messaggi, una tappa e 24 risultati. Vedere [produzione](production.md).
- Verificati dal sito pubblico: redirect a Challonge, callback configurato,
  cookie HttpOnly e endpoint sessione. Il consenso con un account reale resta
  necessario per il collaudo completo.

Durante `vercel link` la CLI ha riscritto `.env.local`. La connessione al database
locale è stata recuperata dal container esistente; chiave di sessione e parola
d’ordine staff locali sono state rigenerate nel file, invalidando le sessioni
locali precedenti. I dati locali non sono stati modificati.

Il pulsante nella pagina `/gilda` usa OAuth authorization code, scope `me` e
`https://api.challonge.com/v2.1/me.json`. La password Challonge non passa nell’app.

## Attivazione

1. Registra un’applicazione in https://connect.challonge.com/ con callback
   `https://DOMINIO-APP/api/auth/challonge/callback`.
2. Configura sul server `CHALLONGE_CLIENT_ID`, `CHALLONGE_CLIENT_SECRET` e
   `CHALLONGE_REDIRECT_URI`. Per sviluppo locale registra anche
   `http://localhost:3000/api/auth/challonge/callback` (o un’app separata).
   Usa esattamente l’host configurato, anche in locale.
3. Esegui `npm run db:migrate` per applicare `0008_challonge_oauth.sql` al database
   PostgreSQL/Supabase dell’ambiente. Poi riavvia o ridistribuisci l’app.
4. Verifica con un profilo censito e un profilo nuovo: autorizzazione, accesso,
   logout e successivo accesso senza duplicati. Verifica anche il rifiuto del consenso.

Questa implementazione appartiene alla produzione Vercel/Supabase e al progetto
di sviluppo Next.js/PostgreSQL. Sites resta esclusivamente archivio storico.

## Associazioni

- Un’identità già verificata si riconosce dall’ID immutabile Challonge, anche se
  cambia username. Il collegamento verificato è separato dai campi modificabili dallo staff.
- Al primo accesso si usa l’ID Challonge o l’username già assegnato dallo staff
  (senza distinzione maiuscole/minuscole). Queste associazioni devono essere corrette:
  chi controlla quel profilo potrà accedere al membro corrispondente.
- Associazioni contraddittorie vengono bloccate e richiedono la verifica dello staff;
  non si uniscono membri in base all’email restituita dal provider.
- Per un profilo sconosciuto si crea un membro con username come nome provvisorio,
  email/CF/documento assenti e tesseramento/pagamento da verificare. Lo staff può
  completarlo. Se un membro esiste senza associazione Challonge, lo staff deve
  assegnargliela prima del primo login per evitare un secondo profilo.
- I nuovi account OAuth non hanno una password locale conosciuta. Lo staff può
  assegnare email/CF e resettare la password per attivare anche l’accesso locale.
- La richiesta di cambiare password temporanea resta valida per il login locale;
  non blocca un login verificato da Challonge. I reset invalidano tutte le sessioni.

Lo stato OAuth è casuale, legato al browser tramite cookie HttpOnly, scade dopo
10 minuti e viene consumato una sola volta nel database. Le identità hanno
vincoli univoci; il collegamento è transazionale. I token OAuth non sono salvati
né inviati al client. Le tabelle sono escluse dall’accesso diretto anon/authenticated
di Supabase tramite RLS e revoca dei privilegi.

Le credenziali reali sono necessarie per il collaudo finale con Challonge:
i test automatici non sostituiscono il consenso e il redirect del provider.

Test: `npm test`; per il database locale, con Node 22.15+:
`node --env-file-if-exists=.env.local --test tests/challonge-postgres.test.mjs`.
Il secondo comando crea e rimuove membri di prova, simulando solo le risposte
HTTP del provider; verifica le route e le transazioni PostgreSQL reali.
