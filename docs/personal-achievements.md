# Casa delle Imprese

## Regole

- Edificio nella città, coordinate (1320, 935), al posto delle Officine decorative. Album `/imprese`, anche dal collegamento nella Gilda.
- Dieci definizioni versionate in `app/lib/achievements.ts`. Nessun punto di campionato viene modificato.
- Partecipazioni, Top 8, podi e vittorie provengono dai risultati associati all'ID del membro, non dal solo check-in/pagamento. Stagione = anno solare della data della tappa. Il distintivo, una volta raggiunta la soglia in un anno, rimane anche negli anni successivi salvo correzioni delle fonti.
- **Regola concordata:** il deck autodichiarato è Full attacco se tutti e tre i bit sono Attacco. Lame, ratchet e approvazioni staff non influiscono. Fonte: `Beyblade_X_componenti_torneo_POOL_TIER_DISTRIBUZIONE.xlsx`, foglio Bit, B5:C56 (52 bit). Snapshot delle categorie in `app/lib/bit-types.json`. Nessuna classificazione inferita dal nome o fornita dal client. Componenti personalizzati sconosciuti non qualificano; i nomi canonici vengono riconosciuti anche per deck storici.
- Vittoria e deck devono riferirsi alla stessa tappa dello stesso membro. Servono tre Beyblade completi e un risultato finale #1. Modifiche successive del deck ricalcolano la condizione: non si tratta di una certificazione del deck effettivamente giocato.
- Benvenuto: primo utilizzo autenticato dell'API dalla pubblicazione della funzione. Avatar: prima modifica effettiva salvata da questa versione, non il semplice salvataggio dello stesso avatar. Nessuna data storica di accesso/personalizzazione inventata.
- Bacheca e risultati già disponibili vengono riconosciuti automaticamente alla prima valutazione; `earned_at` è la prima data di riconoscimento, la data della tappa è indicata separatamente.

## Persistenza e sicurezza

Migrazione additiva `0013_personal_achievements.sql`: attività login/avatar, sblocchi, vetrine, audit. RLS abilitata, nessun accesso diretto da ruoli anon/authenticated. API server con sessione membro, authVersion, cambio password e controllo origine; nessun parametro memberId accettato dal client.

`POST /api/member/achievements` rivaluta fonti e riconcilia lo stato in transazione con lock per membro. Vincolo unico membro/impresa e audit solo sulle transizioni: risincronizzazioni ripetute non duplicano premi o notifiche. Le correzioni revocano esclusivamente gli sblocchi non più sostenuti da almeno una fonte valida; un'altra vittoria/deck idoneo conserva il distintivo. Vetrine ripulite dagli sblocchi invalidati. Le immagini PNG già esportate non sono revocabili.

`PUT` salva fino a tre distintivi e un titolo effettivamente posseduti. Classifica: solo vetrina opt-in, con verifica delle fonti anche se il proprietario non ha ancora riaperto l'album. Progresso, prove, dati personali e pagamenti non vengono pubblicati.

Rivalutazione alla navigazione, ogni 45 secondi nelle pagine aperte e al ritorno in primo piano; immediata dopo salvataggi avatar, messaggi e deck. Nessun accesso a Challonge durante questa valutazione: si leggono esclusivamente i risultati già importati. Toast discreto con suono popup già collegato al controllo audio dell'app. Eventuali errori del toast non bloccano il gioco; album con errore e riprova.

## Ricompense

Titoli Volto della Gilda / Vincitore di tappa; cornici Bronzo vivo / Scintille e nuovo motto Tre Bey. Una sola direzione. nello specchio. Nessun contenuto precedentemente disponibile viene bloccato. Foto: inclusione facoltativa del titolo e dei tre distintivi esposti. L'album non sostituisce il titolo temporaneo del trono.

## Rilascio e verifica

1. Migrazione locale e test su database temporanei isolati: `npm test`, `npm run test:achievements`, suite locali esistenti, TypeScript, lint e build.
2. Verifiche browser edificio/album, ingresso da tastiera, selezioni e breakpoint mobile.
3. Backup riservato prima della migrazione di produzione. Applicare prima la migrazione additiva a Supabase, poi distribuire su Vercel. Nessuna copia di dati locali su produzione, nessuna modifica a punteggi o introiti.
4. Recupero storico lazy al primo accesso: non è necessario uno script che riscriva tutti i membri. Il database di sviluppo resta separato da Supabase tramite le protezioni esistenti.

Test automatici: categorie dei 52 bit, contesto della vittoria, custom non classificati, soglie/anni/tappe duplicate, autorizzazioni, vetrine contraffatte, concorrenza, audit idempotente, modifica deck e correzione piazzamento.

## Verifica del 16 ottobre 2026

- 34 test unitari superati; integrazioni PostgreSQL achievement, trono, deck, check-in e impersonificazione locale superate su database temporanei.
- Build Next.js e TypeScript riusciti. Lint dei nuovi moduli superato; il lint globale segnala ancora difetti preesistenti in bacheca/audio/client-api/staff/Wistery, verificati anche sul codice HEAD precedente per bacheca e audio.
- Verificati da browser ingresso con Invio, album e salvataggio della vetrina; a 355 px effettivi, larghezza contenuto uguale al viewport, senza overflow.
- Migrazione Supabase applicata tramite CLI autenticata, con checksum registrato in `tq_internal.migrations`. Quattro nuove tabelle con RLS. Backup riservato `.local-data/pre-achievements-2026-10-16.json`.
- Dati preesistenti invariati dopo la migrazione: 25 membri, 24 risultati, 786 punti complessivi, 24 ricevute e 7200 centesimi.
