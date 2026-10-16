# Blackjack della Gilda

Accesso dalla libreria, tramite il riquadro colorato accanto a Beycoin Spin. Rimossi i giochi da tavolo non giocabili. Componenti dei giochi caricati solo quando selezionati; nessun fetch di gioco all'ingresso nella Gilda. Carte HTML/CSS, nessuna dipendenza aggiuntiva.

## Regole

- Puntata fissa 2 BC; vittoria 4 BC lordi, pareggio 2, blackjack naturale 5 (3:2), sconfitta 0.
- Un mazzo da 52 carte mescolato a ogni mano con Fisher–Yates e `crypto.randomInt` sul server.
- Asso 1/11, figure 10; il banco sta anche su soft 17. Naturali risolti alla distribuzione; entrambi naturali = pareggio. Un 21 ottenuto pescando non è un naturale.
- Carta e Stai; raggiungere 21 passa automaticamente al banco. Nessuno split, double, surrender o insurance.
- Massimo 20 partite complessive al giorno (Europe/Rome), condivise fra slot e Blackjack. Conta una sola volta all'inizio della mano; una mano già pagata rimane completabile anche con quota esaurita o saldo corretto sotto zero.
- Solo Beycoin virtuali, nessuna conversione o premio reale.

## Persistenza e sicurezza

`0016_blackjack.sql` aggiunge mani e azioni private con RLS e nessun accesso diretto anon/authenticated. Una sola mano attiva per membro (indice univoco parziale). Addebito all'inizio, premio una sola volta alla conclusione; saldo comune = somma premi achievement + netti slot + netti Blackjack. Lo storico Beycoin mostra la mano come movimento netto, inizialmente −2 e definitivo alla conclusione. Azioni conservate per audit.

Tutte le mutazioni condividono il lock per membro già usato dal portamonete/achievement/slot. UUID idempotente per ogni azione, con verifica di tipo, ID mano e versione attesa; un retry non pesca un'altra carta né duplica puntate/premi. Versioni obsolete rifiutate. Sessione, cambio password e same-origin verificati dalle API. Importi, identità, mazzo, carte ed esiti non sono accettati dal client. Carta coperta, mazzo e cursore non vengono inviati al browser; carta coperta rappresentata da `null` finché la mano non termina. GET/POST privati no-store.

La UI conserva l'intera azione in sospeso in sessionStorage, separata dalla chiave della slot; fallback in memoria se lo storage è bloccato. Un esito incerto offre Riprendi e impedisce nuove azioni. La mano è ripresa dal server anche cambiando gioco, chiudendo il popup o usando un altro dispositivo autenticato. Nessuna scadenza automatica o autoplay.

Verifica: `npm run test:blackjack` copre assi, naturali, soft17, bust, pareggio, 600 mani simulate, catalogo giocabile, recovery, autenticazione, dati nascosti, concorrenza, versioni, accredito unico, isolamento e limite condiviso. `test:slot` e `test:achievements` verificano la compatibilità del portamonete. Tutti i test DB sono confinati a database locali temporanei. Prima del deploy: backup riservato, migrazione additiva transazionale con checksum e confronto invarianti di membri, identità OAuth, punti, incassi e movimenti preesistenti.
