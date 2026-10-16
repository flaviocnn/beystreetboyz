# Impersonare un membro in locale

Avvia PostgreSQL Docker e l'app con `npm run dev` usando la configurazione
locale già presente in `.env.local`. In basso a destra compare **TEST LOCALE**
su tutte le schermate, anche prima del login.

1. Apri **TEST LOCALE · Cambia membro**.
2. Cerca per username Challonge o nome, scegli il membro e premi
   **Entra come questo membro**. La schermata si ricarica con la sua sessione.
3. Prova Gilda, avatar, bacheca, archivio, specchio e, se il membro è staff,
   gestione utenti, check-in e banca. Non occorrono password o OAuth.
4. Per cambiare identità riapri il pannello; per uscire scegli
   **Termina test · Torna visitatore**.

Si usano solo i membri presenti nella copia locale, senza scaricare o
sincronizzare automaticamente dati dalla produzione. Le azioni sono reali
**sul database locale** e persistono lì tra riavvii; non sono un'anteprima
temporanea e non vengono trasferite su Vercel/Supabase. Password temporanee
non bloccano l'impersonificazione e non vengono cambiate entrando in test.
Il ruolo non viene elevato: un membro normale resta membro normale.

## Isolamento

- Il pannello e l'endpoint `/api/dev/impersonate` sono disponibili solo con
  `NODE_ENV=development`, fuori da Vercel, su `localhost`, `127.0.0.1` o `::1`,
  con PostgreSQL su loopback. Non sono disponibili con `next start`.
- In sviluppo l'accesso applicativo al database rifiuta URL remoti, anche
  se inseriti accidentalmente in `.env.local`. Non usare tunnel/forward di
  localhost verso il database di produzione.
- Il cookie HttpOnly firmato usa il metodo distinto `local`, scade dopo
  un'ora e viene rifiutato in produzione anche se copiato manualmente.
  Non è un cookie di login Challonge.
- Ogni richiesta continua a verificare esistenza del membro, versione della
  sessione e ruolo dal database locale. Reset, cancellazioni e revoche valgono.
- Cambi d'identità e uscita richiedono origine same-origin e JSON; le richieste
  cross-site sono rifiutate. In produzione l'endpoint risponde 404 senza
  leggere il database né elencare membri.
- I moduli di pagamento registrano soltanto dati locali: non eseguono addebiti
  reali. Le eventuali importazioni da Challonge leggono il provider e salvano
  esclusivamente nella copia locale; non modificano i tornei remoti.

Test: `npm test`, `npm run test:local`, `npm run test:checkin`, TypeScript.
