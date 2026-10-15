# Trasferimento Sites completato — 15 ottobre 2026

> Documento storico. Dopo questo trasferimento è stato eseguito il passaggio
> definitivo a Vercel/Supabase: vedere [produzione](production.md).
> Sites non è più un ambiente di produzione e non deve ricevere aggiornamenti.

Sito: https://torino-quest.cannavo-flavio.chatgpt.site

- Versione pubblicata: 15.
- Commit Sites: `d22c551cfda91d0414c8a2ea831f69178372a392`.
- Deploy: `appgdep_6ad0d556b33c81919746430d31ab4e93`, riuscito.
- 24 membri, 3 messaggi, una tappa, 24 risultati, 23 associati e 778 punti.
- Quattro schede trasferite: Isabella Palermo, Zeid Lakratte, Savino, Mattia Archinà.
- Completati i profili __Grizzly__ e maton11, già associati dall'organizzatore.

## Backup riservati sul Mac

- `.local-data/sites-pre-transfer-2026-10-15.json`: cloud prima del trasferimento,
  20 membri e 3 messaggi; SHA-256
  `ac410c1ed273bb10f9b187bed6c0ce2fa84cae18a7af59c11e193d8d2e64c7aa`.
- `.local-data/local-pre-transfer-2026-10-15.json`: PostgreSQL prima del trasferimento.
- `.local-data/sites-restored-pre-transfer-2026-10-15.sqlite`: ripristino di prova
  con la migrazione verificata e i dati cloud originali conservati.
- `.local-data/sites-post-transfer-2026-10-15.json`: stato cloud finale verificato.
- `.local-data/sites-pre-mike-2026-10-15.json`: stato cloud immediatamente
  precedente al censimento di Mike (24 membri e 4 messaggi).
- `.local-data/sites-post-mike-2026-10-15.json`: stato cloud dopo Mike.

Questi file includono dati personali e hash delle password. Sono esclusi da Git
e conservati con permessi riservati; non devono entrare in `public/` o nella build.

## Verifiche completate

Backup ripristinato in SQLite e in D1 locale; migrazione con chiavi esterne attive,
integrità e confronto di tutti i campi superati. Suite API locale: autorizzazione,
rifiuto di punteggi errati, rollback su conflitto, idempotenza, login, cambio
password, pari merito e bacheca.

Dopo il deploy, prima di importare, i 20 membri e i 3 messaggi cloud erano identici
al backup. Dopo l'importazione, tutti i campi degli account originali risultano
identici salvo i punti e il completamento dell'username; i quattro nuovi account
corrispondono integralmente ai dati locali, comprese credenziali, avatar e pagamenti.
Ogni risultato, associazione, punteggio e metadato della tappa è stato confrontato
con il dataset locale. Coefficiente verificato: 1,00 su 24 presenti.

La correzione Nika37 → __Grizzly__ attribuisce 15 punti a Marco Pellegatta;
Riccardo Carella conserva il profilo Nika37 e 0 punti. Il 15 ottobre 2026
MikeMorz è stato censito come Mike Morzz e gli sono stati attribuiti gli 8 punti
della tappa; il totale della classifica passa da 778 a 786 punti.

Versione Sites definitiva: 18, commit
`41b88da1adebd1b7b1ab5d67171d3fbaa06166e2`. Il login di Mike è stato verificato
con l'email `mike92_@live.it`; il cambio password al primo accesso è obbligatorio.
La rotta temporanea usata per il trasferimento ristretto è stata rimossa dalla
sorgente definitiva.

Il ramo locale Vercel/Supabase resta separato dal repository Sites. Le future
modifiche ai dati non vengono sincronizzate automaticamente fra i due ambienti.
