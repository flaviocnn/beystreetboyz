# Beycoin personali

Saldo e registro nella Casa delle Imprese (`/imprese`). Ogni achievement assegna un premio virtuale; si può spendere nella slot della libreria della Gilda. Non ci sono acquisti di monete, trasferimenti, cambio in euro, premi reali o collegamenti ai punti di campionato. Saldo e storico non vengono esposti in classifica: appartengono al solo membro autenticato.

Premi iniziali: benvenuto 10, avatar 15, primo messaggio 15, prima tappa 25, tre tappe 40, prima Top 8 50, primo deck 30, tre podi 100, prima vittoria 150, vittoria full attacco 200. Totale delle dieci imprese: 735 BC. Catalogo `BEYCOIN_REWARDS`; l'importo del singolo premio già assegnato è congelato nel database, non ricalcolato retroattivamente se il catalogo cambia.

`0014_beycoins.sql` aggiunge importo, stato del credito e revisione al diritto dell'achievement, più il registro append-only `beycoin_ledger`, con RLS e revoca di accessi diretti anon/authenticated. Il saldo è la somma di tutti i movimenti, non un numero inviato dal browser. Revisione univoca per membro/impresa, transazione e lock per membro garantiscono idempotenza anche tra schede o richieste simultanee. Nessuna API accetta importi, destinatari o saldo da assegnare.

Una revoca dell'achievement registra uno storno dell'importo originario. Il successivo ripristino riaccredita lo stesso importo: il saldo netto non supera il premio originale. Cambiare ripetutamente un deck non genera monete extra. I movimenti rimangono per audit; l'API restituisce gli ultimi 50, mentre il saldo considera l'intero registro. Premi storici attivi accreditati una sola volta dalla migrazione; quelli revocati non ricevono monete fino all'eventuale ripristino.

Verifica: test PostgreSQL `npm run test:achievements` copre recupero dello storico, isolamento, concorrenza, manipolazione del payload, revoche, ripristini e saldo netto. Prima della migrazione di produzione: backup riservato aggiornato di dati e achievement, applicazione transazionale e registrazione checksum; confronto di membri, punti e incassi reali invariati.

## Beycoin Spin — libreria della Gilda

Seleziona la slot nella ludoteca. Costo fisso 1 BC, massimo 20 giri al giorno (Europe/Rome), almeno 2 secondi fra giri. Nessun autoplay. Quattro simboli equiprobabili e indipendenti su tre rulli: tre Grifoni pagano 12 BC (1/64), gli altri tris 4 BC (3/64), una coppia restituisce 1 BC (36/64), tre simboli diversi 0 (24/64). Premi lordi comprensivi della puntata, ritorno teorico 93,75%, probabilità di guadagno netto 6,25%. La UI espone regole e probabilità, storico degli ultimi dieci giri e nessuna animazione di quasi-vincita.

Migrazione additiva `0015_slot_machine.sql`: registro `beycoin_slot_spins`, nessuna riscrittura dei premi achievement. Ogni riga registra costo, premio, tre simboli, versione regole, giorno e timestamp. Il saldo comune è `SUM(beycoin_ledger.amount) + SUM(payout-cost)`; lo storico comune mostra la variazione netta di ciascun giro (anche zero). Le correzioni achievement restano possibili anche dopo aver speso: un eventuale saldo negativo impedisce nuovi giri, non crea credito giocabile.

RNG `node:crypto.randomInt` solo server. Transazione e **stesso lock per membro degli achievement**; nessun saldo, premio, esito o ID membro accettato dal browser. Chiave UUIDv4 idempotente per membro, esito persistito atomicamente con l'addebito. Recupero prima di quota/cooldown/saldo, così una risposta persa è recuperabile senza nuovo costo. La UI conserva la chiave in sessionStorage (fallback in memoria), non avvia un nuovo giro finché quello incerto non è risolto. RLS e accesso diretto revocato; endpoint privati no-store, auth e cambio password obbligatorio, CSRF same-origin sul POST. Nessuna richiesta a Challonge.

`npm run test:slot`: enumerazione dei 64 esiti; PostgreSQL isolato per autenticazione, payload manipolati, idempotenza concorrente, saldo e storico comuni, isolamento account, limiti, vincoli DB e doppia spesa. I test creano e distruggono solo un database locale temporaneo. In produzione eseguire prima backup riservato e verifica invarianti, poi migrazione e deploy Vercel; non applicare al vecchio Sites.

## Correzione incontri Dark/Phoenix

Il punto d'arrivo a distanza 38 poteva risultare 38.00000000000001 a causa degli arrotondamenti. Il passo residuo diventava inferiore alla precisione delle coordinate: il visitatore restava nello stato walking per sempre. Introdotta una tolleranza di 0,05 unità e una transizione talking nello stesso frame in cui si raggiunge il punto. Nessun cambiamento a 30 secondi d'inattività, cancellazione al movimento, collisioni, frasi, tempi del dialogo o suoni.

Test: 256 configurazioni limite (128 angoli, entrambi i visitatori), controllo che l'NPC smetta di muoversi, e 64 avvicinamenti simulati a 60 fps. Con il vecchio codice 70/128 configurazioni limite restavano bloccate dopo due secondi; il codice corretto apre il dialogo in tutti i casi.
