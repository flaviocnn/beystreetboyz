# Trono del Campione

Nella Gilda il trono (T), sulla pedana centrale accanto alla classifica, celebra il vincitore dell'ultima
tappa con risultati importati. Non sostituisce la statua annuale di GranBurstone.
Si apre camminando vicino e premendo Invio, tramite touch oppure dal banner
discreto all'ingresso. Mostra avatar salvato, corona, username Challonge, tappa,
piazzamento e deck se registrato. Non assegna punti o privilegi staff.

## Periodo del titolo

La fonte unica è `tournament_stages` / `tournament_results`: si prende la tappa
con risultati più recente per data (a pari data, slug decrescente stabile), e il
suo unico risultato con `final_rank=1`. Creare tappe di check-in o tappe senza
risultati non interrompe il titolo. Reimportare una tappa con data precedente
non fa regredire il campione. Una tappa successiva con risultati ma senza un
vincitore univoco lascia il trono in attesa, senza attribuzioni arbitrarie.

Non occorrono migrazioni o sincronizzazioni aggiuntive: il campione cambia con
l'importazione/correzione dei risultati. L'API rilegge il database in transazione
read-only repeatable-read, restituisce solo campi pubblici e non ha cache.
La pagina aggiorna il titolo ogni 15 secondi e quando torna in primo piano.
Errori di verifica disabilitano il ritratto speciale, non mantengono un permesso
obsoleto. Un vincitore non associato a un membro resta celebrabile con avatar
standard ma nessun utente può rivendicarne il ritratto tramite il solo username.

## Specchio

Solo il membro il cui ID è quello del vincitore corrente vede il selettore
“Sul trono”. L'immagine speciale include l'avatar incoronato sul trono, username
ufficiale, tappa vinta, 1° posto e deck della stessa tappa, se presente. Nome e
posa vengono fissati per questa modalità, sfondo e motto restano selezionabili.
Qualunque membro conserva il ritratto normale e le foto delle proprie top 8.

Prima di scaricare o condividere il ritratto speciale viene riletto il titolo:
devono coincidere membro vincitore e tappa del PNG generato. Se il titolo è
scaduto o non verificabile l'esportazione viene bloccata e si torna al ritratto
normale. Le immagini già esportate restano ricordi: non sono revocabili e non
sono certificati digitali o prove di autorizzazione. Il renderer canvas gira
sul client, quindi non è un sistema DRM contro modifiche manuali al codice.

Endpoint: GET `/api/guild/champion`, autenticato come membro della Gilda.
Restituisce `{champion, canUseThrone}` senza email, CF, dati di pagamento o
password. La verifica usa ID membro e sessione firmata, mai parametri client.

Verifiche: `npm run test:champion`, `npm test`, TypeScript, browser locale.

## Disposizione della sala

Classifica e trono condividono la pedana a nord, entrambi visibili all'arrivo.
La classifica espone in miniatura i primi tre membri con i punteggi correnti.
Specchio e archivio occupano rispettivamente l'ala ovest e l'ala est; bacheca,
statua annuale e libreria sono nella galleria a sud, con sprite più contenuti.
I corridoi restano sgombri: le impronte dei mobili e le collisioni sono definite
nella stessa struttura, con almeno 64 unità di separazione tra gli oggetti.
Minimappa e legenda si aprono con il pulsante bussola, per lasciare la scena
libera di default. La camera adatta lo zoom alla finestra, mantenendo la pedana
principale leggibile e inquadrata anche sugli schermi piccoli.
