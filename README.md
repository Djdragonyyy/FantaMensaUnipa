# FantaMensa UniPa

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

Senza `.env.local` parte una **demo esplicitamente etichettata**, con dati nel browser e chiusura simulabile dal Profilo. Non registra account, non carica foto reali e non sostituisce il backend. Il controllo dell'orario della demo non è utilizzato dal gioco reale.

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

L'Edge Function valida JWT tramite `auth.getUser`, CORS e dimensione effettiva del corpo, decodifica JPEG/PNG, verifica dimensioni e riscrive solo pixel JPEG senza EXIF/GPS. Input massimo 3 MiB, 4000 px per lato e 12 MP; output massimo 1600 px e 1 MiB. Storage privato: **neppure l'autore può generare un URL firmato prima delle 13:30**. Dopo la chiusura sono consentiti URL di 60 secondi agli utenti autenticati. Non c'è OCR/AI. Retention prevista 30 giorni con job server separato.

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
