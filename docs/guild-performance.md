# Profilazione dell’ingresso nella Gilda — 16 ottobre 2026

## Diagnosi

Produzione Supabase: 25 membri, 24 risultati, una tappa, un profilo vetrina. `EXPLAIN (ANALYZE, FORMAT JSON, TIMING OFF)` sulle SELECT originali, senza letture di dati personali né scritture:

| Lettura | Esecuzione PostgreSQL |
| --- | ---: |
| Membri per la classifica | 0,091 ms |
| Risultati per la classifica | 0,090 ms |
| Profili dei distintivi | 0,060 ms |
| Ultima tappa giocata | 0,194 ms |

Non sono scansioni pesanti ai volumi attuali. Non sono stati aggiunti indici o migrazioni inutili.

Il blocco più evidente nel client era `sessione → classifica completa → setLoading(false)`: anche con accesso valido, il canvas non veniva montato finché non finivano classifica e qualificazione dei distintivi. Il campione e la riconciliazione achievement/Beycoin partivano nello stesso momento, contendendo le tre connessioni del pool.

In produzione la regione Supabase è `eu-north-1`, mentre il deploy Vercel precedente mostrava `[iad1]` nelle funzioni. Questo introduce viaggi USA–Europa tra app e DB: è una causa di latenza, non di CPU PostgreSQL. `vercel.json` ora imposta una sola regione `arn1`, corrispondente a Stoccolma. La scelta segue la [documentazione Vercel sulle regioni delle funzioni](https://vercel.com/docs/functions/configuring-functions/region) e la [corrispondenza dei codici regione](https://vercel.com/docs/regions). Nessun database o dato personale viene trasferito.

## Modifiche

- L’accesso verificato è l’unico requisito bloccante. La mappa diventa esplorabile mentre classifica e campione arrivano in background. Se la classifica fallisce, resta disponibile la sala con un errore/riprova nella relativa finestra.
- Classifica: aggregazione di presenze, vittorie e migliori tre punteggi nel DB, anziché trasferire e raggruppare l’intero storico nell’API. Stesso ordinamento e stessi pari merito.
- Distintivi opt-in: fatti di qualificazione raccolti in un’unica query correlata, riletti dai risultati/deck attuali. Non si espongono badge revocati o dati privati di altri membri.
- Campione: una sola SELECT che sceglie prima l’ultima tappa giocata e poi il suo eventuale vincitore. Una singola istruzione ha uno snapshot coerente: non servono BEGIN, SET TRANSACTION e COMMIT. Vincitori ambigui o mancanti continuano a negare il ritratto speciale; la verifica prima dell’esportazione resta fresca.
- Specchio, archivio e bacheca: import dinamici, non all’ingresso. Il solo JavaScript viene preriscaldato quando ci si avvicina all’oggetto; i dati personali vengono richiesti quando si apre la finestra.
- Notifiche achievement/Beycoin: prima sincronizzazione differita di 1,2 secondi, senza cambiare ricompense, transazioni o autorizzazioni. Le azioni esplicite e l’album continuano a richiedere i dati quando servono.
- Cache client precedente invariata: 30–60 secondi e invalidazione sulle modifiche. Nessuna cache di autorizzazioni o nuova cache persistente server.

## Misure locali, build di produzione

Stesso database locale, sessione temporanea generata solo in memoria, sei richieste per API (prima richiesta separata, mediana delle altre cinque). Le misure sono indicative, non un benchmark di produzione né uno SLA: il TCP locale e il carico macchina non riproducono la latenza geografica.

| API | Mediana prima | Mediana dopo |
| --- | ---: | ---: |
| Sessione, non modificata | 6,0 ms | 13,6 ms |
| Classifica | 15,2 ms | 9,3 ms |
| Campione | 14,9 ms | 6,7 ms |

La sala ora attende solo la sessione, non la somma sessione + classifica. Non viene dichiarata una percentuale di miglioramento del caricamento complessivo in produzione senza una misura autenticata end-to-end.

Script iniziali referenziati dall’HTML: 674.657 → 655.175 byte (−19.482 byte), gzip di riferimento 212.174 → 204.961 byte. La somma include il polyfill legacy che i browser moderni possono saltare: non equivale al trasferimento effettivo su ogni dispositivo.

## Test

- `npm test`: ingresso non bloccato da una classifica sospesa/fallita, negazione accesso per ospite/password temporanea, smontaggio sicuro.
- `npm run test:guild`: conta le query reali con debug del driver, senza stamparne parametri. Classifica: tre query totali, incluso controllo accesso. Campione: due query totali, incluso controllo accesso. Controlla anche spareggi, top tre, membri senza tappe, risultati non associati, isolamento delle vetrine e revoca della sessione.
- `npm run test:champion` e `npm run test:achievements`: conservano le regressioni su correzioni risultati/deck, trono e portafoglio Beycoin.
- Build TypeScript/Next ed esplorazione browser, apertura differita dello specchio e ripristino della sessione locale di prova.
