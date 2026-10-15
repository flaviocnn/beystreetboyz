# Login con Challonge

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

Questa implementazione appartiene al progetto locale Next.js/PostgreSQL.
Un’eventuale versione Sites ancora su SQLite/D1 richiede il porting delle due
tabelle e delle query transazionali prima della pubblicazione.

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
