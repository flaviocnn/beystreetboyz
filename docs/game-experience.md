# Esperienza di gioco condivisa

`world-game.ts` definisce camera, velocità (.19 px/ms), normalizzazione del campo visivo e raggio d’interazione (120 px). Città e Gilda usano gli stessi sprite del giocatore e gli stessi componenti HUD, menu, guida, frecce touch e invito a interagire. La mappa occupa il viewport dinamico anche in landscape. Dimensioni in pixel CSS, non in pixel fisici: il device pixel ratio non modifica la scala di gioco.

Le collisioni usano la stessa sagoma del personaggio. In città i punti di accesso sono davanti alle porte (non al centro degli edifici), con lo stesso indicatore a terra presente nella Gilda. I test verificano che tutte le porte e tutti gli oggetti siano raggiungibili dalla posizione iniziale.

I controlli hanno bersagli da almeno 44 px, con safe area. Frecce/WASD non intercettano campi, link, pulsanti o popup. Invio apre l’oggetto vicino; Tab/frecce navigano la modale; Esc chiude. I pulsanti di movimento funzionano anche con attivazione da tastiera e tecnologie assistive. I popup sono scorrevoli senza far scorrere la mappa.

## Audio

Un solo `GameAudioProvider` nel layout conserva AudioContext e preferenza on/off durante la navigazione client. La melodia cambia per città, Gilda/banca/imprese e Wistery. Nessuna libreria o traccia esterna. Il browser deve consentire l’audio dopo il primo gesto dell’utente.

`SoundEngine` copre passi (anche tocchi brevi), click, apertura/chiusura popup e dettagli, nuovi messaggi/stati ed errori. I click delegati coprono pulsanti/link e le selezioni; la deduplicazione evita raddoppi con gli handler esistenti. I popup con hook hanno `data-sound="manual"` quando contengono regioni live. Schede nascoste e audio disattivato non emettono suoni; l’unmount annulla le note pianificate.

## Cache e freschezza

- Sessioni e permessi: nessuna cache temporale. Vengono accorpate soltanto letture concorrenti. Autorizzazione sempre verificata sul server.
- Classifica, archivio personale, bacheca e campione: cache client in memoria per membro, 30 secondi, massimo 64 chiavi. Nessuna persistenza di dati personali in localStorage e nessuna cache CDN privata.
- Classifica: aggiornamento visibile ogni minuto e al ritorno sulla scheda, solo se scaduta; il bottone “Aggiorna ora” forza una lettura nuova. Campione e bacheca: controllo ogni 30 secondi quando visibili.
- Ritratto sul trono: la verifica prima di scaricare/condividere ignora sempre la cache, anche se l’anteprima usa il polling.
- Achievement/Beycoin: una sincronizzazione condivisa per membro al minuto. Album, notifiche e specchio riusano il medesimo risultato. Le notifiche di sblocco vengono emesse solo su risposta di rete, non quando si rilegge il valore in cache.
- Modifiche a deck/avatar/vetrina, login/logout: invalidazione della cache. Un cambio identità cancella i dati precedenti. Una richiesta vecchia non può ripopolare una cache invalidata. Gli errori non si memorizzano.
- Challonge: elenco upcoming della community in memoria server per 60 secondi, richieste concorrenti accorpate e chiavi separate per credenziale (hash), massimo 4 voci. L’intera paginazione deve riuscire prima di salvare il risultato. Cache best effort per istanza Vercel, non un archivio durevole. Check-in/iscritti, importazione risultati e pagamenti restano letture/scritture fresche, senza cache.
- Meteo: invariato, 15 minuti e recupero dell’ultimo dato valido; luce ogni minuto. Nessuna richiesta a Challonge durante il semplice movimento sulle mappe.

Il polling si interrompe nelle schede nascoste; al ritorno si ricontrollano i dati scaduti. Bilanci finanziari, saldi Beycoin, permessi ed idoneità al trono non sono mai considerati attendibili per una scrittura solo perché presenti nel client.

## Verifica

`npm test` include camera identica ai vari viewport, raggiungibilità di ogni oggetto, visibilità dei due oggetti principali all’arrivo, TTL/deduplicazione/invalidation race della cache, isolamento credenziali Challonge e copertura di tutti i suoni con un AudioContext simulato. Completare con prova browser a 390×844, 320×568 e landscape, popup da tastiera e anteprima specchio.
