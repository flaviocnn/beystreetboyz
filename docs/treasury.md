# Banca della Gilda

Intesa è ora una banca-fantasy ispirata a Gringotts: facciata di marmo, colonne,
portale dorato, tre contabili con sembianze di ratto e una sala visitabile in
`/banca`. Frecce/WASD, controlli touch, Invio ai banchi e pulsanti convenzionali
per parlare o aprire il registro. Audio disattivabile e dialoghi accessibili.

La sala è pubblica. Il registro economico completo è riservato allo staff,
controllato dal server a ogni richiesta GET `/api/staff/treasury`. Le sessioni
personali revocate o scadute non possono leggere i pagamenti. Il registro non
è esposto nelle API pubbliche, nella mappa o nei dialoghi dei contabili.

## Registrazione degli introiti

Il pagamento di check-in è già la ricevuta, con ID iscritto/tappa, importo in
centesimi, metodo, data e operatore. `Pagato e presente` salva pagamento e audit
in una transazione con lock e versione. Un nuovo pagamento di una tappa da 3 €
vale 300 centesimi. Ripetere il click o confermare una presenza già pagata non
crea un altro introito. Nessuna seconda tabella di incassi e nessun backfill
che possa duplicare gli importi. I pagamenti storici sono visibili subito.

La quota predefinita è 3 €, ma eventuali quote diverse già configurate vengono
conservate e mostrate esplicitamente. Non si riscrivono incassi storici a 3 €.
Gli ospiti possono avere ricevute senza anagrafica. Il tesseramento annuale è
escluso: il registro riguarda solo i pagamenti delle tappe di check-in.

Il totale è la somma degli attuali `paid_cents` con `payment_status = paid`,
anche per assenti e iscrizioni rimosse: assenza e cancellazione non implicano un
rimborso. Annullare un pagamento tramite correzione lo esclude dal totale, ma
conserva l'audit del check-in. Metodo corretto e resync roster non duplicano gli
introiti. Nessun addebito/rimborso online o spesa viene eseguito dalla banca.

Il registro mostra totale di tutte le tappe, suddivisione per metodo, riepiloghi
per tappa e dettaglio paginato (50 ricevute) filtrabile per tappa. Gli snapshot
usano una transazione read-only repeatable-read. Refresh ogni 15 secondi e al
ritorno nella scheda, senza chiamare Challonge. Eventuali errori evidenziano che
si sta mostrando l'ultima lettura riuscita; una revoca dell'accesso nasconde i dati.

Nessuna migrazione o modifica dei dati esistenti è necessaria. Test database:
`npm run test:checkin` verifica 300 centesimi, mancati duplicati, correzioni,
conservazione delle quote diverse, filtri e accesso staff/non-staff.
