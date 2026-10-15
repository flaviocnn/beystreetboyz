# Check-in tappe

Produzione: https://beystreetboyz.vercel.app/staff/checkin, accessibile dallo staff.
Il Palazzo dello staff contiene il collegamento “CHECK-IN TAPPE”.

I membri con `members.role = 'staff'` accedono automaticamente con la propria
sessione della Gilda (Challonge oppure password personale), senza parola d'ordine
aggiuntiva e senza perdere l'accesso alla Gilda. Una password temporanea deve
essere cambiata prima di usare lo staff; il login OAuth non richiede quel cambio.
Ruolo, esistenza del membro e versione della sessione vengono verificati sul
server a ogni richiesta, incluse gestione anagrafiche, reset e check-in.
La parola d'ordine condivisa resta un accesso alternativo. Uscire dallo staff
chiude anche la sessione personale corrente. I ruoli non sono modificabili dai
form anagrafici e non vengono assegnati automaticamente in base allo username.
La migrazione `0011_member_staff_role.sql` abilita solo gli otto ID verificati
richiesti dall'organizzatore. Il ruolo predefinito per nuovi membri è `member`.

1. Crea il torneo su Challonge e fai iscrivere lì i partecipanti.
2. Nel check-in scegli “Nuova tappa”, incolla link/ID, indica data e quota in euro.
   Il nome è facoltativo; in alternativa viene usato quello Challonge.
3. Gli iscritti vengono importati. Nessuno viene considerato presente o pagato
   solo perché è iscritto. Gli ospiti possono pagare senza una nuova anagrafica.
4. Indica l'operatore del banco e il metodo per il prossimo incasso. Premi
   “Pagato e presente” solo dopo aver ricevuto fisicamente la quota.
5. Segna esplicitamente gli assenti, anche con il pulsante rapido “Segna assente”.
   “Presenza / correggi” permette di registrare un presente non pagato o correggere
   presenza/metodo/pagamento con una motivazione obbligatoria.
6. Prima di avviare il torneo aggiorna gli iscritti da Challonge. Il riepilogo
   conferma la disponibilità a iniziare solo se c'è almeno un presente, tutte le
   presenze sono verificate e tutti i presenti iscritti hanno pagato. Un presente
   rimosso da Challonge deve essere riconciliato prima del via.

Il torneo si avvia su Challonge. L'app non avvia il torneo, non iscrive giocatori
e non esegue addebiti o rimborsi. La quota della tappa non aggiorna il pagamento
del tesseramento annuale, che resta indipendente nell'anagrafica.

## Comportamento dei dati

- Un torneo Challonge può essere collegato una sola volta, tramite ID stabile.
- Gli iscritti sono identificati dall'ID partecipante della singola tappa.
  L'eventuale membro è associato tramite username Challonge esatto (case insensitive),
  mai per somiglianza del nome. Non si creano account automaticamente per gli ospiti.
- Il flag Challonge `states.active` può indicare che un giocatore è stato eliminato:
  non viene interpretato come cancellazione dell'iscrizione o come assenza.
  Un ID non più presente nell'elenco completo importato viene marcato non iscritto.
- Le reimportazioni aggiornano elenco e associazioni, conservando presenze,
  pagamenti e storico. I partecipanti scomparsi restano nel filtro “Non più iscritti”.
- L'incassato registrato comprende anche pagamenti di assenti/rimossi. Non si
  presume che un'assenza equivalga a un rimborso. Per correggere un rimborso già
  effettuato fisicamente si annulla la registrazione indicando la motivazione.
- La quota è fissata alla creazione e non viene cambiata dopo gli incassi.
  Si registrano pagamenti completi della quota; acconti e sconti individuali non
  fanno parte di questa prima versione.
- Ogni pagamento/correzione conserva importo, metodo, orario, operatore e stati
  precedente/successivo. L'interfaccia mostra le ultime 30 operazioni; il database
  conserva l'intero audit. Con l'accesso personale è registrato anche l'ID del
  membro autenticato; con la parola d'ordine resta l'attore condiviso `staff`.
  Il nome operatore inserito al banco resta una dichiarazione libera.
- Le versioni dei record impediscono a due operatori di sovrascriversi. In caso
  di conflitto si aggiorna la scheda e si riprova, senza duplicare l'incasso.
- La schermata rilegge i dati dell'app ogni 15 secondi e al ritorno nella scheda;
  l'API Challonge viene chiamata solo durante creazione/importazione manuale.

## Configurazione e verifiche

`CHALLONGE_API_KEY` è una variabile server sensibile su Vercel. L'importazione usa
API v2.1 con autenticazione API key v1, legge pagine complete e non invia segreti
al browser. Il torneo deve essere accessibile all'account proprietario della chiave.
Ogni richiesta include `include_community_tournaments=1` per leggere anche i
tornei delle community creati da quell'account, sia all'importazione sia al resync
per ID numerico. Non è necessario spostare il torneo su un account personale.
I rifiuti di accesso e i limiti API sono mostrati senza modificare i dati salvati.

Migrazioni additive: `0009_stage_checkin.sql` e `0010_checkin_complete_payment.sql`, tre tabelle con RLS e privilegi
anon/authenticated revocati: `checkin_events`, `checkin_participants`, `checkin_audit`.
Gli accessi avvengono solo dalle API staff e le modifiche verificano l'origine.

Verifiche: `npm test`, `npm run test:checkin`, TypeScript e build Vercel.
Il test database crea e rimuove solo un database locale temporaneo isolato e
verifica autorizzazione, ospiti, pagamenti, conflitti concorrenti, audit, resync,
rollback su errore provider e indipendenza del tesseramento annuale.

Documentazione provider: [elenco partecipanti](https://challonge.apidog.io/list-participants-23619749e0)
e [autenticazione](https://challonge.apidog.io/authorization-1726705m0).
