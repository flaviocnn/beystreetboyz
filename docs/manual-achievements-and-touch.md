# Impresa manuale e controlli touch

`demon-slayer` / **Sconfiggi il Demone!** è la prima impresa manuale: premio iniziale 50 BC, sblocca gli avatar 11 e 23 (Demoniaco/Demoniaca). Non si sblocca con login, risultati, deck o dati forniti dal browser. La qualificazione usa soltanto una riga attiva di `member_achievements` assegnata dall'operatore. Non è pubblicato alcun endpoint di auto-assegnazione.

`ops/grant-demon-to-alebuck.sql` è un'operazione esplicita, non una migrazione automatica: richiede un solo membro con username Challonge case-insensitive `Alebuck`, conserva il suo ID e tutte le identità, registra l'impresa, la provenienza manuale e una sola ricompensa nel ledger. Eseguire dentro una transazione, dopo backup riservato e verifica dell'ambiente. Usa lo stesso advisory lock del portamonete; può essere ripetuta senza duplicare monete. Gli altri membri già vestiti da demone ritornano a Esploratore/Esploratrice mantenendo colore e tutti gli altri dati. Un'eventuale futura revoca manuale deve anche ripristinare una skin base per il membro, oltre a impostare `active=false`; la riconciliazione storna la ricompensa una volta sola.

Il reconciler conserva le imprese manuali e la loro evidenza invece di revocarle al successivo login. Il profilo pubblico ne verifica lo stato in una sottoquery nello stesso SELECT già usato, senza aumentare il numero di query della classifica. Il Wistery legge una capability privata leggera (GET avatar), senza aspettare la riconciliazione dell'intero album; entrambe le varianti sono disabilitate per chi non possiede l'impresa. Il PUT avatar verifica nuovamente il diritto dal database dentro la transazione: la sola UI non è una barriera di autorizzazione.

## Movimento e pannelli

Il colore a sette cifre `#f2f3efa` era CSS non valido e lasciava menu e legenda senza sfondo. Entrambi ora usano `#f2f3ea` opaco e testo `#25352b`. La legenda su schermi stretti rimane separata dal joystick e scorre dove necessario.

Il controllo mobile predefinito è un joystick a otto direzioni, con dead zone di 10 px e corsa grafica massima di 32 px. Usa gli stessi eventi direzionali e lo stesso movimento/collisioni di città, Gilda e banca. Le diagonali mantengono la normalizzazione esistente. Pointer capture, rilascio, annullamento, cambio modalità, blur, pagina nascosta e apertura popup liberano le direzioni; il dito aggiuntivo non prende il controllo del primo. Nessuna nuova query durante la camminata. I pulsanti direzionali rimangono selezionabili e la scelta si conserva localmente. Tastiera e interazioni esistenti restano disponibili.

Verifiche: `npm test`, `npm run test:manual`, `npm run test:achievements`, `npm run test:guild`; test browser a 390×844 per sfondi opachi, drag, cambio controlli, pausa nel popup, accesso di Alebuck e blocco delle due skin per un altro membro. Backup di produzione e confronto transazionale prima dell'assegnazione; non alterare punti, incassi o altre identità.
