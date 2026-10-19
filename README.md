# FantaMensa UniPa

**Aggiornamento 19 ottobre 2026:** il flusso principale usa gruppi privati su invito. Il creatore gestisce menu giornalieri e piatti personalizzati del proprio gruppo; i membri possono consultare il menu. La classifica è in lavorazione e accessibile soltanto ad amministratori con MFA. Il precedente gioco generale resta nella simulazione locale, con scadenza alle **13:30 Europe/Rome**.

Per aggiornare un backend esistente applicare anche `supabase/migrations/003_private_groups.sql`. I gruppi precedentemente pubblici diventano privati; i membri già iscritti restano membri. I menu personali dei gruppi sono separati dai menu e dai punteggi del precedente gioco generale. La classifica admin è una vista storica in lavorazione: non calcola punteggi dai nuovi menu personali.

Il pranzo diventa un gioco. Progetto indipendente e open source per indovinare il pranzo della mensa **Santi Romano**, viale delle Scienze, Palermo. Non è un servizio ufficiale di UniPa o ERSU. Pizza e panini sono esclusi.

Il README originario («sito per la fantamensa di unipa!») è conservato nel commit iniziale.

## Avvio

Richiede Node.js 24 e pnpm 11 (oppure npm). Dalla cartella del repository:

```sh
pnpm install --frozen-lockfile
pnpm dev
# http://127.0.0.1:5173
pnpm check
pnpm test
pnpm build
pnpm preview
```

Senza `.env.local` parte una **demo esplicitamente etichettata**, con dati nel browser e chiusura simulabile dal Profilo. Non registra account, legge le foto localmente ma non le carica sul server e non sostituisce il backend. Il controllo dell'orario della demo non è utilizzato dal gioco reale.

Per il gioco reale, copia `.env.example` in `.env.local` e configura Supabase seguendo [DEPLOYMENT](docs/DEPLOYMENT.md). Le variabili VITE sono pubbliche: contengono soltanto URL e chiave publishable/anon, mai una chiave service role. Ricostruisci il frontend dopo ogni cambio di configurazione.

## Funzioni

- Italiano/inglese, lingua persistente, layout da 360 px, navigazione Oggi / Classifiche / Gruppi / Profilo.
- Selezioni ricercabili per nome, traduzione e alias; identificativi dei piatti stabili, indipendenti dalla lingua. Catalogo separato dal menu reale.
- Un primo, tre secondi distinti, un contorno e pesca o pera. Un invio completo e una modifica, chiusura esatta alle 13:30 Europe/Rome.
- Menu dei partecipanti, senza approvazione preventiva. Il primo menu strutturato completo vince atomicamente. Gli altri restano prove; le divergenze vengono segnalate.
- Foto oppure selezioni; il contributo blocca il pronostico. Foto senza selezioni complete lasciano i risultati in attesa.
- Punti dettagliati, generale e gruppi con pesi distinti, storico mensile, pari merito e formattazione K locale con valore esatto.
- Gruppi pubblici/privati, più appartenenze, inviti revocabili, gestione membri e versioni mensili dei regolamenti.
- Google e email/password con verifica e recupero tramite Supabase Auth. Nickname pubblico, email privata; logout e MFA TOTP.
- Amministrazione con MFA obbligatoria: catalogo/alias, correzioni, annullamento, segnalazioni e audit.

## Architettura e sicurezza

Frontend statico Vite + JavaScript, SDK ufficiale Supabase. PostgreSQL è l'autorità per orario, autorizzazioni e transazioni. Ogni tabella applicativa ha RLS; i client non possono leggerla o modificarla direttamente, tranne il catalogo. Le RPC `SECURITY DEFINER` espongono soltanto dati autorizzati; gli helper non sono eseguibili dal client. Nessun ruolo deriva da metadata modificabili dall'utente.

Invii e contributi bloccano la riga della giornata. L'invio usa anche la revisione attesa; UUID di idempotenza e payload impediscono di scambiare un retry con una nuova modifica. Si verifica `clock_timestamp()` **dopo** aver acquisito il lock, quindi una richiesta in coda non oltrepassa la scadenza usando un vecchio timestamp. Tutte le modifiche di una transazione fallita vengono annullate.

I punteggi sono derivati dai pronostici e dal menu, senza contatori incrementali: ricalcolare non duplica punti e una correzione aggiorna immediatamente entrambe le classifiche. Il mese dipende dalla data giocata, non dall'arrivo del risultato. I gruppi congelano i pesi alla prima partecipazione; nuove regole valgono il mese seguente. Per gli ingressi conta il giorno di ingresso; per le rimozioni si conserva un intervallo storico.

L'Edge Function valida JWT tramite `auth.getUser`, CORS e dimensione effettiva del corpo, decodifica JPEG/PNG, verifica dimensioni e riscrive solo pixel JPEG senza EXIF/GPS. Input massimo 3 MiB, 4000 px per lato e 12 MP; output massimo 1600 px e 1 MiB. Storage privato: **neppure l'autore può generare un URL firmato prima delle 13:30**. Dopo la chiusura sono consentiti URL di 60 secondi agli utenti autenticati. È disponibile OCR locale con Tesseract.js: foto → testo modificabile → proposte nel catalogo → conferma umana del menu strutturato. La lettura non carica la foto, non blocca il pronostico e non assegna punti. L'upload come prova resta separato. Retention prevista 30 giorni con job server separato.

## Regole

Generale: primo 20, ogni secondo 15 (massimo 45), contorno 10, succhino 10, bonus tutte corrette 15 = massimo 100. Nessuna penalità. Entrambi i succhini validi se presenti. Mancanza menu = attesa, non errori nei pronostici. Giornata annullata = nessun punto.

Gruppi standard: primo 15, ogni secondo 15, contorno 15, succhino 10, bonus 15 = massimo 100. Pesi interi non negativi con massimo totale ≤100; dettagli e altre scelte in [ASSUMPTIONS](docs/ASSUMPTIONS.md).

## Documentazione e verifiche

- [Deployment, OAuth, SMTP, amministratori e DNS](docs/DEPLOYMENT.md)
- [Quote gratuite, fonti e palette](docs/SOURCES.md)
- [Assunzioni e limiti](docs/ASSUMPTIONS.md)
- [Verifiche eseguite e verifiche esterne necessarie](docs/VERIFICATION.md)
- [Come contribuire](CONTRIBUTING.md)

Le migrazioni sono in `supabase/migrations`. `supabase/seed.sql` contiene un **catalogo candidato di esempio**, non il menu odierno e non dati di utenti. La demo del browser è separata. Licenza MIT.

## Lettura del menu da foto

Dopo il pronostico, seleziona una foto nella sezione contributi e premi **Estrai testo dalla foto**. Correggi il testo e premi **Aggiorna i piatti suggeriti**, poi controlla e completa tutte le categorie nel modulo del menu e conferma l’invio. I nomi assenti dal catalogo richiedono selezione manuale o aggiornamento del catalogo da parte dell’amministratore. Foto sfocate, ruotate o con testo piccolo possono produrre errori.

Il riconoscimento è gratuito e avviene nel browser, anche in demo. Worker, motore WASM e modello italiano sono serviti dallo stesso sito: nessuna foto viene trasmessa a servizi OCR. `pnpm dev`, `pnpm test` e `pnpm build` preparano automaticamente gli asset da dipendenze versionate; `public/ocr` è generata e non va committata. Il primo utilizzo scarica alcuni MB e può richiedere tempo su telefoni lenti. Massimo 3 MiB, 4000 px per lato e 12 MP; annullamento e timeout di 90 secondi disponibili.

## FantaEventi dei gruppi privati

Ogni membro può giocare sugli eventi della giornata entro le **13:30 Europe/Rome**: caduta dei piatti; «Permesso, Permesso!!»; «Sgomberare!!»; «Ragazzi chi ha finito levi i vassoi!!»; richiesta personale del formaggio con toggle. È richiesta almeno una selezione e si può modificare la giocata una sola volta. I pronostici di altri membri non vengono esposti.

Quote iniziali modificabili dal creatore: piatti ×2,5; permesso ×1,5; sgomberare ×3,0; vassoi ×2,0; formaggio ×1,8. Ogni evento scelto e avvenuto vale **10 × quota punti virtuali**. Errori e selezioni disattivate valgono zero: nessuna puntata in denaro. Le quote sono memorizzate in centesimi interi, con incrementi di 0,1 fra 1,0 e 10,0, e sono congelate per gruppo/giorno dalla prima giocata. Le successive modifiche del creatore valgono solo per giornate non iniziate.

Dopo la chiusura il creatore conferma i quattro eventi comuni e, separatamente, i partecipanti a cui è stato chiesto il formaggio. Le caselle non selezionate significano evento non avvenuto; è richiesta una conferma esplicita prima di salvare. Gli esiti sono correggibili con audit e controllo della revisione; i punti vengono ricalcolati senza sommare due volte. Ogni membro vede solo il proprio riepilogo punti; la classifica continua a essere WIP riservata agli admin e non incorpora ancora questi punti eventi.

La simulazione locale supporta lo stesso flusso: giocare prima della chiusura simulata, poi usare Profilo → Simula chiusura delle 13:30 e confermare gli eventi dal gruppo. Applicare anche la migrazione **004_canteen_events.sql** prima di distribuire il frontend aggiornato su Supabase reale.

## Preparazione alla prima pubblicazione

Vedi [stato e primo passo](docs/LAUNCH-2026-10-19.md). Il sito multiutente parte con accesso UI chiuso (`VITE_PUBLIC_ACCESS_ENABLED=false`); disattivare anche le registrazioni nel dashboard Supabase fino alla revisione finale. Applicare tutte le migrazioni, inclusa 005. Font Google rimossi; prove legacy riservate al proprietario e agli admin MFA; snapshot senza prove di altri utenti. Titolare e contatto privacy forniti dall’autore sono nella pagina pubblica di stato e nella [bozza da finalizzare](docs/PRIVACY-DRAFT.md). Queste misure non equivalgono a conformità certificata o pubblicazione completata.
