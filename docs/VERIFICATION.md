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
