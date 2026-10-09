# Configurazione e deployment

## 1. Supabase gratuito

1. Crea un progetto nell'organizzazione **Free**, conserva la password del database in un password manager. Non selezionare Pro o trial.
2. Nel SQL Editor esegui in ordine `supabase/migrations/001_game.sql`, `002_storage.sql`, poi `supabase/seed.sql`. Alternativa con CLI ufficiale: `supabase login`, `supabase link --project-ref IL_REF`, `supabase db push`, poi applica il catalogo. Le migrazioni vanno eseguite una volta su database nuovo; non sono script distruttivi di reset.
3. Copia Project URL e chiave **publishable/anon** in `.env.local`. Service role e password DB restano esclusivamente server.
4. Auth: abilita Email, conferma email e password di almeno 12 caratteri. Imposta Site URL e redirect allowlist sull'URL HTTPS effettivo del frontend; per lo sviluppo consenti esattamente `http://127.0.0.1:5173`. Evita wildcard globali.
5. Configura rate limit Auth: mantenere i limiti IP per token/login e registrazione, email almeno 60 secondi tra reinvii, quota SMTP coerente con il provider. Per apertura pubblica abilita hCaptcha gratuito in Auth e imposta `VITE_HCAPTCHA_SITE_KEY`; la secret va nel dashboard Supabase, mai nel frontend. Non disattivare la verifica email per aggirare problemi SMTP.
6. Verifica RLS e bucket `menu-photos` privato. Non aggiungere policy di upload dirette al client o policy SELECT pubbliche.

## 2. Email (verifica e recupero)

L'SMTP predefinito di Supabase è per test: solo membri del progetto, 2 email/ora. **Non è sufficiente per il pubblico.** Configura Custom SMTP.

Brevo Free è un'opzione senza trial, 300 email/giorno e senza carta secondo la fonte ufficiale citata. Crea l'account, verifica un mittente e completa l'attivazione delle email transazionali. Usa le credenziali SMTP generate nel dashboard (host `smtp-relay.brevo.com`, porta 587, username SMTP e password SMTP), non la password di accesso Brevo. Inseriscile solo in Supabase Auth → SMTP. Verifica le impostazioni correnti del provider. L'autenticazione SPF/DKIM/DMARC del dominio mittente è raccomandata/richiesta dai provider; l'attivazione e la deliverability non sono state provate con credenziali reali. DuckDNS non fornisce una casella email e i TXT limitati non sostituiscono un dominio email controllato.

Prova realmente registrazione, link di verifica e recupero da un indirizzo non appartenente al team prima di aprire il sito. Se Brevo non approva il mittente disponibile, serve un altro SMTP affidabile gratuito o un dominio mittente già posseduto; non è promesso che una casella personale sia accettata.

## 3. Google OAuth

Nel Google Cloud Console crea OAuth Client di tipo Web. Configura il consenso **External** per qualsiasi account Google, gli scope minimi email/profile/openid e pubblica il consenso in Production quando pronto (Testing limita ai test user). Non imporre il dominio UniPa.

URI di redirect autorizzato Google: `https://PROJECT_REF.supabase.co/auth/v1/callback`. Copia Client ID e Client Secret nel provider Google di Supabase. Il secret resta sul servizio Auth. Il frontend passa come redirect finale il proprio `location.origin`, già presente nella allowlist Supabase. Conferma callback e dominio effettivi nel dashboard, senza inventare URI. Con HTTPS `*.pages.dev` non serve un dominio personalizzato Supabase a pagamento.

## 4. Foto e conservazione

Da un terminale fidato con Supabase CLI:

```sh
supabase functions deploy upload-photo
supabase secrets set ALLOWED_ORIGINS=https://NOME.pages.dev,http://127.0.0.1:5173
```

URL/key anon/service role Supabase sono variabili integrate del runtime Edge. `verify_jwt=false` nel config non significa accesso libero: il codice verifica il JWT con `getUser`, compatibile con le nuove signing key. Non passare service role nel browser.

Conservazione: in GitHub Settings → Secrets/Variables → Actions configura `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` come **secrets**, e la variabile `RETENTION_ENABLED=true`. Il workflow elimina fino a 100 foto per notte, dopo 30 giorni (prenotazioni incomplete dopo 1 giorno). Ripeti il job se c'è un arretrato. Finché non abiliti il job le foto NON vengono cancellate automaticamente: controlla lo storage. Alternativa su macchina fidata: esporta le due variabili server e lancia `node scripts/prune-photos.mjs`. I menu e lo storico di gioco rimangono, la prova appare scaduta.

Le prenotazioni foto bloccano immediatamente il pronostico; una foto rifiutata o un upload fallito non lo sblocca. Lo stesso UUID permette il retry senza nuovo contributo. Immagini prive di selezioni complete non risolvono la giornata.

## 5. Due amministratori, senza password condivise

1. Le due persone registrano **account individuali** tramite il sito, verificano l'email e scelgono nickname dal Profilo. Password personali generate dal password manager o accesso Google, nessuna password predefinita.
2. Entrambe dal Profilo scelgono Configura MFA, scansionano il QR TOTP e verificano un codice. In seguito usano Verifica MFA a ogni nuova sessione amministrativa.
3. Il proprietario del database identifica gli UUID degli account con una query server nel SQL Editor (email mai mostrate al pubblico):

```sql
select u.id, u.email, p.nickname
from auth.users u join public.profiles p on p.id=u.id;
```

4. Dopo aver verificato le due identità, assegna il ruolo **soltanto tramite SQL Editor**:

```sql
begin;
lock table public.admins in exclusive mode;
insert into public.admins(user_id) values
 ('UUID_PRIMA_PERSONA'::uuid), ('UUID_SECONDA_PERSONA'::uuid);
-- Verifica che il risultato contenga esattamente le due persone previste.
select * from public.admins;
commit;
```

Sostituisci i segnaposto con UUID reali. Nessuna RPC pubblica assegna ruoli; i metadata del profilo non hanno effetto. Tutte le RPC admin richiedono appartenenza alla tabella e claim `aal2`. Per revocare un amministratore usa il SQL Editor fidato. Conserva un audit operativo separato delle assegnazioni DBA; l'audit applicativo registra correzioni, annullamenti, catalogo e segnalazioni. Non condividere chiavi privilegiate con gli amministratori del gioco.

## 6. Cloudflare Pages Free (frontend pubblico)

Connetti il repository GitHub dal dashboard Pages, seleziona branch `main`, comando build `pnpm build`, directory `dist`, Node.js 24. Aggiungi solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e site key CAPTCHA alle variabili di build. Il lockfile è incluso. Configura anche i limiti Auth e CORS Edge sull'URL generato `https://NOME.pages.dev`.

Alternativa: `pnpm build`, poi Direct Upload di `dist` dal dashboard. HTTPS sul sottodominio provider. Non pubblicare la demo come gioco reale: in produzione deve sparire il banner di esplorazione. Le intestazioni di sicurezza in `public/_headers` sono applicate da Pages. Verificale dal browser dopo il deploy.

È disponibile anche una build statica per Sites con `.openai/hosting.json`; l'anteprima Sites è privata per impostazione iniziale. L'identità Sites non equivale agli account di gioco Supabase. La configurazione Supabase va incorporata ricostruendo la build. La directory dist è rigenerabile e non versionata.

## 7. DuckDNS

DuckDNS è DNS dinamico, non hosting. La API ufficiale offre IP A/AAAA e TXT, non la gestione CNAME richiesta da Pages per un sottodominio esterno. Non puntare DuckDNS a un IP ricavato da `pages.dev`: non è un endpoint IP dedicato/stabile e non configura TLS o routing. Non posso documentare una configurazione DuckDNS→Pages supportata e gratuita: usare `*.pages.dev` (oppure URL Sites privato per anteprima).

Con hosting proprio su IP e un certificato Let's Encrypt, DuckDNS può essere usato (anche TXT per challenge DNS), ma richiede un server sempre acceso e non è lo stack gratuito gestito scelto. Dopo qualsiasi cambio di hostname aggiorna allowlist Auth, redirect finale e `ALLOWED_ORIGINS`; la callback Google continua a essere quella Supabase.

## 8. Git e apertura al pubblico

Il repository originale è `https://github.com/albertofiocco24-star/FantaMensaUnipa.git`, branch main. Per push occorre un account con accesso in scrittura. Usa Git Credential Manager o SSH; non incollare token nei file o negli URL remoti:

```sh
git remote -v
git push origin main
```

Su Windows, se schannel fallisce: `git -c http.sslBackend=openssl push origin main`. Non usare `--force`. Se il remoto avanza, `git fetch origin`, integra/revisiona i nuovi commit e riesegui i test prima del push. Non inserire credenziali nei log o nella cronologia.

Prima dell'apertura reale esegui le verifiche esterne in VERIFICATION.md. Selezionare piani Free evita acquisti automatici; quote, disponibilità e termini possono cambiare. Esegui backup manuali del database: il piano Free non include backup automatici.
