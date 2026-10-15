# Produzione Vercel / Supabase

Dal 15 ottobre 2026, su richiesta del proprietario, l'ambiente di produzione
predefinito è **https://beystreetboyz.vercel.app**.

- Progetto Vercel: `beystreetboyz`, scope `flaviocnns-projects`.
- Repository: `https://github.com/flaviocnn/beystreetboyz`.
- Runtime: Next.js, PostgreSQL/Supabase con RLS; connessione server privilegiata.
- Migrazioni: `supabase/migrations/`, applicate prima della build Vercel.
- Identità: email/CF/password oppure OAuth Challonge; callback
  `https://beystreetboyz.vercel.app/api/auth/challonge/callback`.
- Staff: `STAFF_PASSPHRASE` di produzione è configurata come variabile sensibile,
  inizializzata con la parola d'ordine locale custodita in `.env.local`.

Sites è una copia storica non aggiornata. Non eseguire deploy, importazioni,
sincronizzazioni o modifiche dati su quel cloud. I riferimenti `.openai/` e gli
script Sites restano solo per consultare la storia e i backup. Non cancellare
il vecchio servizio o i backup senza una richiesta esplicita del proprietario.

## Passaggio dei dati

Lettura finale live di Sites: 25 membri, 6 messaggi, 1 tappa, 24 risultati, tutti
associati; somma dei punteggi 786. La copia Docker aveva 25 membri e 3 messaggi;
Sites conteneva aggiornamenti più recenti di credenziali, tesseramenti e avatar.
Il trasferimento usa quindi la fotografia live Sites completa, non il vecchio
export locale.

Supabase conteneva il solo account OAuth GranBurstone. L'importazione conserva
il suo ID Vercel `b6293901-340b-48bd-b370-4e117afb25bd`, versione di sessione,
identità Challonge verificata e scelta avatar Vercel. Importa anagrafica,
credenziali locali storiche e 15 punti; rimappa messaggi e risultati dal vecchio
ID `a788965e-883e-4bda-bb9c-d8b97c0c761d`. Gli altri 24 membri conservano gli ID
storici. Nessun membro viene duplicato e le password non vengono reimpostate.

Gli abbinamenti di torneo restano invariati, inclusa la correzione
Nika37 → `__Grizzly__`: 15 punti a Marco Pellegatta, Riccardo Carella 0.
MikeMorz mantiene anagrafica, email di accesso e 8 punti.
I punteggi sono ricostruiti dalle migliori 10 tappe. Il comando di sincronizzazione
risolve le associazioni Challonge esplicite per rispettare gli ID OAuth migrati.

## Backup e controllo

File riservati, ignorati da Git/Vercel, con permessi 0600 in `.local-data/`:

- `sites-cutover-2026-10-15.json`: copia finale live Sites.
- `local-pre-vercel-cutover-2026-10-15.json`: copia PostgreSQL locale precedente.
- `vercel-pre-cutover-2026-10-15.json`: Supabase prima dell'importazione, incluse
  le identità OAuth.
- `vercel-plan-cutover-2026-10-15.json`: simulazione e mappa degli ID.
- `vercel-apply-cutover-2026-10-15.json`: risultato della transazione e snapshot.
- `vercel-post-cutover-2026-10-15.json`: lettura indipendente di verifica.

La procedura transazionale blocca modifiche concorrenti e richiede l'impronta
esatta del backup verificato. Rifiuta associazioni ambigue, conflitti di identità,
risultati incompatibili e punteggi incoerenti. Tutti i campi membro importati e
le identità OAuth vengono confrontati prima del commit. Una seconda lettura
verifica l'impronta completa dopo il commit.

Il canale HTTP temporaneo per il trasferimento è rimosso dal deployment finale
e la sua credenziale revocata dopo la verifica. Gli strumenti di pianificazione
e i test rimangono per audit; non sono una sincronizzazione automatica con Sites.

Esito verificato: 25 membri, 6 messaggi, 1 tappa, 24 risultati, 786 punti.
Confronto di tutti i campi superato, con normalizzazione booleane e timestamp
D1/PostgreSQL. Identità OAuth invariata. Impronta dello snapshot finale:
`c9cdc67db0e73ce61236d206f1e3ebb448ce7d022feba55a80d82fc10a138d75`.

Verificati anche l'accesso staff e la lista membri live. Test in database
locale isolato: risincronizzazione eseguita due volte, 24 risultati e 786 punti
invariati, GranBurstone sempre collegato al nuovo ID e con 15 punti.

## Modifiche future

La destinazione di produzione di ogni nuova attività è Vercel/Supabase.
Il database Docker è separato: non usare vecchi export locali per sovrascrivere
la produzione. Prima di modificare dati reali, acquisire un backup aggiornato.
Per i segreti usare le variabili Vercel; quelle sensibili non vengono esportate
da `vercel env pull`. Non aggirare questa protezione per copiarle nei file sorgente.

Deploy dal progetto già collegato: `vercel --prod --yes`.
Non rieseguire `vercel link`: può riscrivere `.env.local`.
Non aggiungere credenziali, dati dei membri o backup a Git o a `public/`.
