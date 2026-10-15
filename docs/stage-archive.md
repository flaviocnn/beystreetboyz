# Archivio delle Tappe

Area personale nella Gilda, separata dalla classifica e dalla bacheca. Il leggio
con tre beyblade è a sud (marcatore A). Interazione con Invio o tocco; il form
usa controlli nativi per mouse, tastiera e mobile.

## Risultati e deck

- Lo storico legge solo `tournament_results.member_id` della sessione corrente,
  con nome/data/punteggio della tappa già sincronizzata. Nessuna associazione
  per somiglianza del nome e nessuna chiamata aggiuntiva a Challonge.
- Gli attuali risultati salvano `final_rank` numerico solo per la top 8.
  Un valore nullo appare come “Fuori top 8”, con bilancio gironi disponibile.
  Non viene derivato un piazzamento dai punti. Il check-in non è un risultato.
- Per posizioni da 1 a 8 si può salvare/modificare un deck di esattamente tre
  beyblade completi. Ognuno contiene 1–5 componenti lama, un ratchet e un bit.
  Supportati sottocomponenti CX e ratchet integrato nella lama.
- Il catalogo deriva dai soli fogli Bit, Ratchet e Lame dell'Excel fornito:
  52 bit (nome e sigla), 37 ratchet, 155 lame/sottocomponenti (categoria/sistema).
  Quantità pool, tier, formule e istruzioni interne al file non diventano regole.
  Provenienza e intervalli sono in `app/lib/bey-parts.json`.
- “Aggiungi altro” consente un nome libero (1–100 caratteri), limitato al deck
  personale. Non modifica il catalogo condiviso. Non si applicano vincoli di
  composizione o duplicazione non richiesti: il deck è una dichiarazione,
  non una certificazione di legalità o impiego effettivo.
- La tabella `stage_decks` è collegata al membro e alla tappa, non alla riga
  risultato, per conservare il deck durante un reimport delete/insert dei risultati.
  Una nuova posizione fuori top 8 mantiene il deck storico ma impedisce modifiche.
  Eliminare definitivamente membro/tappa elimina i relativi deck in cascata.

## Protezioni e verifiche

GET `/api/guild/stages`, PUT `/api/guild/stages/[slug]/deck`. Il server risolve
sempre il membro dalla sessione e ignora eventuali identità nel body. Controlla
origine, cambio password richiesto, top 8 da database, componenti del catalogo o
personalizzati e versione. Lock transazionali impediscono salvataggi concorrenti
e cambi di risultato fra verifica e salvataggio. Un conflitto restituisce 409
senza sovrascrivere il deck. Il login staff condiviso non è un'identità giocatore.

Migrazione additiva `0012_stage_decks.sql`, RLS e privilegi anon/authenticated
revocati. Nessuna modifica a risultati, punti o pagamenti esistenti.

Test: `npm test`, `npm run test:decks`, `npm run test:checkin`, TypeScript e build.
I test database usano solo database temporanei locali isolati.

## Foto allo Specchio dei blader

Lo specchio legge lo stesso storico personale e offre solo risultati numerici
da 1 a 8. La scelta iniziale “Nessuna · solo ritratto” conserva la foto originale.
Scegliendo una tappa vengono disegnati nel PNG il nome e il piazzamento; solo il
primo posto è chiamato vincitore. Il deck registrato, se presente, è aggiunto
automaticamente come testo completo dei tre beyblade, anche per componenti CX
e nomi personalizzati. Senza deck compaiono solo risultato e nome della tappa.
La larghezza resta 1080 px; l'altezza si adatta al testo senza troncamenti.
Download e condivisione usano lo stesso PNG dell'anteprima. Nessun risultato o
deck viene modificato. Un errore di caricamento non impedisce il ritratto base.
