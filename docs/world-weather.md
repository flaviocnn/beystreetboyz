# Ora e meteo del mondo

- Posizione fissa: centro di Torino, 45.0703 N, 7.6869 E. Nessuna geolocalizzazione del giocatore. Orari leggibili in Europe/Rome, compresa l'ora legale.
- Luminosità astronomica calcolata dalla posizione solare UTC e aggiornata ogni minuto e al ritorno nell'app: alba, giorno, tramonto, notte; differenze stagionali automatiche. Nessun orario alba/tramonto fisso o vincolato al giorno di un vecchio dato API.
- Meteo Open-Meteo: condizioni attuali modellate, non osservazioni di una stazione sul posto. Codici WMO, nuvolosità, precipitazioni, neve, temperatura e vento. Fonti: https://open-meteo.com/en/docs e https://open-meteo.com/en/terms.
- Endpoint pubblico `/api/world/weather`, coordinate non modificabili dal client, nessun accesso al database. Richiesta upstream con timeout 7 secondi, cache Next condivisa 15 minuti, coalescenza delle richieste e breve cache CDN. Il browser controlla ogni minuto ma sincronizza ogni 15 minuti; dopo un errore riprova non prima di un minuto. Nessuna chiamata meteo per fotogramma o per oggetto.
- Ripresa da scheda in background: aggiornamento immediato del sole e controllo della scadenza meteo. Stato meteo condiviso tra città, Gilda e banca, senza ricreare canvas, camera o posizione del giocatore a ogni aggiornamento.
- Ultimo meteo valido in memoria e sessionStorage (facoltativo, validato). Dopo 45 minuti il dato è indicato come ritardato, dopo 3 ore non si usano più le sue precipitazioni/nuvole. Se non c'è un dato valido continua solo il ciclo solare; non viene spacciato per sereno un servizio offline.
- Pioggia/neve pixel art e tinta grigia per nuvole, foschia per nebbia, notte fredda e crepuscolo caldo. Temporali senza lampi/strobo. Vento orienta le precipitazioni. Negli interni soltanto luce ambientale attenuata, nessuna pioggia o neve sotto il tetto. UI e minimappa restano non oscurate. Oscuramento massimo esterno 50%, interno 12%; transizioni interpolate, non salti bruschi.
- Particelle limitate a 110; `prefers-reduced-motion` mantiene precipitazioni statiche e ridotte a massimo 16 elementi. Gli effetti non cambiano collisioni o controlli. Dettaglio meteo da tastiera tramite un riepilogo espandibile, con attribuzione Open-Meteo CC BY 4.0 e timestamp del dato.

## Servizio e licenza

La API gratuita è prevista per uso non commerciale: questa configurazione assume l'app di community senza monetizzazione del servizio. Per un successivo uso commerciale occorre un piano adeguato del fornitore; impostare `OPEN_METEO_API_KEY` sul server per usare il relativo endpoint customer. Non esporre la chiave nel client. Nessun nuovo account o abbonamento è stato attivato.

## Verifica

`node --test tests/world-weather.test.mjs`: parsing e dati anomali, codici meteo, sole stagionale/ora legale, cache/coalescenza, errore e recupero, scadenza, interni e movimento ridotto. Inclusi nella suite `npm test`. Verificare inoltre la risposta live, la leggibilità mobile e gli aggiornamenti senza respawn del giocatore.

Verifica del 16 ottobre 2026: 38 test unitari superati, TypeScript e build Next.js riusciti; lint dei moduli meteo superato. Endpoint live e locale rispondono con i dati modellati di Torino. Dettaglio apribile con Invio, layout mobile da 390 px senza overflow. Nessuna migrazione o scrittura del database necessaria.
