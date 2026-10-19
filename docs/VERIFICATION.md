# Verifica della prima versione

Eseguita localmente il 9 ottobre 2026 su Windows, Node 24.19.0.

## Automazione

`pnpm test`: 21 test passati, zero fallimenti. Include una suite PostgreSQL reale via PGlite (WASM) con migrazioni di produzione e schema Auth/Storage simulato:

- Chiusura server alle 13:30:00, inverno/estate e giorni di cambio ora.
- Completezza, tre secondi distinti, unico pronostico e unica modifica.
- UUID di idempotenza, retry, payload incompatibile, revisioni concorrenti inviate tramite Promise.all.
- Prenotazione foto che blocca il pronostico; foto senza menu = attesa.
- Primo menu completo accettato automaticamente, contributi successivi e divergenze.
- Visibilità dei menu/pronostici/prove e policy Storage prima/dopo la scadenza, compresa impossibilità di generare URL firmati prima della chiusura.
- Tabelle e helper non accessibili ai client, nessuna assegnazione admin dal client.
- Gruppi privati, token revocabili, membro senza accesso al token del creatore.
- Pesi generale/gruppi, ricalcolo senza duplicazioni, bonus massimo 100 e entrambi i succhini.
- Versioni mensili congelate, ingresso tardivo, cambio mese, risultati storici e annullamento.
- AAL1 respinto, AAL2 amministratore accettato, audit delle correzioni.
- OCR italiano reale su immagine di test; associazione al catalogo tramite nomi/alias, categorie, deduplicazione, inattivi, piatti sconosciuti o esauriti e rifiuto file troppo grandi.
- Decodifica immagini, rimozione metadati JPEG, PNG convertito, file contraffatti, limiti di peso/dimensione.

`pnpm check`: sintassi JavaScript, parità delle chiavi IT/EN e separazione delle chiavi privilegiate dal frontend. Controllo sintattico TypeScript Edge con Node strip-types. `pnpm build`: build Vite di produzione riuscita. Workflow CI incluso.

**Limite del test concorrenza**: PGlite serializza le query in un solo processo. Verifica transazioni, idempotenza e revisioni usando richieste concorrenti, ma non sostituisce un test di lock con più connessioni PostgreSQL reali. I lock FOR UPDATE e i vincoli sono nel SQL di produzione; lo stress test multi-connessione sul progetto Supabase resta da eseguire.

## Browser

Verificata demo tramite browser Codex:

- Smartphone 360×800 e desktop 1280×900.
- Invio completo, salvataggio unica modifica e pulsante successivamente disabilitato.
- Contributo strutturato in inglese e blocco definitivo del pronostico.
- Chiusura simulata da Profilo, dettaglio 100/100, classifica italiana con valore esatto.
- Creazione gruppo privato su desktop.
- Passaggio italiano/inglese con conservazione degli ID e della preferenza.
- Nessun overflow orizzontale rilevato: scrollWidth ≤ innerWidth ai due viewport.
- Estrazione OCR nel browser da PNG di test, correzione testo, aggiornamento piatti e segnalazione righe sconosciute; IT/EN e mobile. Nessuna immagine reale della mensa è stata fornita: l’accuratezza sul cartello reale resta da verificare.
- Screenshot di consegna nelle directory outputs, distinti dal codice.

I controlli sono manuali attraverso UI; nessuna registrazione/email/OAuth reale è stata simulata come verifica esterna riuscita.

## Prima dell'apertura pubblica (necessario)

Mancano credenziali/accesso Supabase, Google OAuth, SMTP e Cloudflare. Queste operazioni **non sono state eseguite sul servizio reale**:

1. Applicare migrazioni e catalogo su Supabase staging. Confermare RLS e service role nell'Edge runtime.
2. Provare due account reali, Google External e email non appartenente al team, verifica email, reset, logout e scadenza sessione. Attivare CAPTCHA.
3. Provare upload completo nel runtime Deno, CORS e retry; non basta il test Node del sanitizzatore. Verificare anche file corrotti e JPEG/PNG massimi.
4. Da due sessioni indipendenti, prima della scadenza: tentare REST diretto, RPC, lettura Storage e creazione signed URL; nessuna selezione/foto altrui deve essere accessibile. Dopo la scadenza i risultati devono apparire.
5. Inviare richieste contemporanee su connessioni distinte: un solo primo menu accettato, un solo edit, nessun invio dopo il cutoff, anche se ha atteso un lock.
6. Creare i due amministratori via procedura DBA; verificare AAL2 e tutte le azioni amministrative nel browser.
7. Attivare retention e verificarne l'effettiva esecuzione; controllare quote e backup.
8. Configurare env, compilare e pubblicare la build reale su Pages; il banner demo deve scomparire. Verificare HTTPS, CSP e redirect OAuth sul dominio effettivo.

Il codice e la demo sono verificati localmente. La readiness del servizio reale richiede queste prove esterne: non è dichiarata completata senza accessi.

## Aggiornamento 19 ottobre 2026

27 test locali passati (suite precedenti più 5 casi della nuova migrazione e relativo contenitore). Nuova suite: conversione dei gruppi pubblici, creazione privata idempotente, accesso su invito, proprietario e membri, isolamento di piatti/menu fra gruppi, correzioni dopo la scadenza, conflitto di revisione, revoca accesso dopo rimozione membro, dati malformati e assenza di scritture parziali, accesso diretto alle tabelle negato, classifica riservata ad admin AAL2 e blocco dei precedenti endpoint interni. Check sintattico/traduzioni e build Vite riusciti.

La verifica visiva di questo aggiornamento non è stata completata: Computer Use si è fermato perché non ha potuto determinare con sicurezza l’URL del browser Windows. Le verifiche UI riportate sopra riguardano la versione precedente. Nessun test sul progetto Supabase remoto e nessuna pubblicazione di questo aggiornamento sono stati eseguiti.

## Verifica FantaEventi — 19 ottobre 2026

34 test passati; check sintassi, parità IT/EN e build riusciti. Nuovi casi: calcolo punti con quote e formaggio personale, input e quote invalidi, accessi membri/proprietario, congelamento quote, isolamento gruppi, nessuna esposizione dei pronostici altrui, unica modifica e revisione, scadenza esatta alle 13:30, date diverse da oggi, conferma dopo chiusura, completezza degli esiti personali, correzione senza accumulo, tabelle/helper non accessibili e revoca accesso. Test SQL su PGlite con migrazioni di produzione. Verifica visiva e integrazione su Supabase remoto non completate; restano da provare sul servizio reale.

## Preparazione alla pubblicazione — 19 ottobre 2026

36 test passati dopo la migrazione 005: nuovo test con tutte le migrazioni in ordine e verifica privacy delle vecchie foto/snapshot tra due utenti, anonimo, admin AAL1/AAL2. Verificati font remoti assenti e accesso UI pubblico disattivato di default. Check sintattico/traduzioni e build passati. Controllo automatico dei sorgenti per formati riconosciuti di chiavi private, token GitHub e JWT service role senza rilevamenti. Non equivale a penetration test o verifica assoluta di assenza di segreti. Account Cloudflare/Supabase ancora da creare, nessun URL pubblico confermato, nessun collaudo sul backend reale. Stato e ostacoli: LAUNCH-2026-10-19.md.
