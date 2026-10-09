# Pubblicazione gratuita collegata a GitHub

Cloudflare è collegato al repository GitHub, non all'account ChatGPT. Il collegamento GitHub pubblico nel footer rimanda al codice; la firma dell'autore è indipendente dall'integrazione di deployment.

## Prima caricare il codice su GitHub

La copia completa e i commit sono nel repository locale in outputs/FantaMensaUnipa. Il remoto GitHub contiene ancora soltanto il commit iniziale perché il push non disponeva di credenziali. Collegare ora il repository vuoto a Pages non pubblica l'app.

Puoi usare GitHub Desktop, autenticato personalmente con l'account che ha accesso al repository:

1. File → Add local repository; seleziona la cartella FantaMensaUnipa in outputs.
2. Controlla i commit e il remoto origin.
3. Push origin. Le credenziali restano in GitHub Desktop/Git Credential Manager; non occorre il connettore GitHub di ChatGPT.

In alternativa, dopo autenticazione locale sicura: `git push origin main` dalla cartella del progetto. Non forzare il push. Se il remoto è cambiato, integra prima i nuovi commit.

## Collegare Cloudflare Pages

1. Accedi personalmente a Cloudflare, piano Free.
2. Workers & Pages → Create application → Pages → Connect to Git.
3. Autorizza Cloudflare Workers & Pages su GitHub. Usa **Only select repositories** e scegli soltanto `FantaMensaUnipa`.
4. Seleziona repository `albertofiocco24-star/FantaMensaUnipa`, branch di produzione `main`.
5. Preset: None; build command: `pnpm build`; output directory: `dist`; root: vuota (radice del repository).
6. Variabile `NODE_VERSION=24`. Per il gioco reale aggiungi le variabili pubbliche `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e l'eventuale site key CAPTCHA; mai service role o secret OAuth.
7. Save and Deploy. Usa l'HTTPS gratuito `nome.pages.dev`.

I push successivi su main aggiornano il sito automaticamente. Se hai già creato un progetto con Direct Upload, crea un NUOVO progetto Pages con Git integration: il metodo non si converte sul progetto esistente.

## Zero costi, entro le quote

- Hosting Cloudflare Pages Free, dominio provider pages.dev: nessun dominio da comprare. Piano Free, 500 build/mese.
- Supabase Free per database, Auth, MFA e foto: DB 500 MB, storage 1 GB, 50.000 utenti attivi/mese. Pausa dopo inattività, senza backup automatici Free. Non attivare Pro/trial.
- Email: Supabase SMTP predefinito non è per utenti reali. Brevo Free consente 300 invii/giorno, senza carta e senza scadenza del piano; occorre un mittente approvato e l'attivazione SMTP. L'approvazione/deliverability non sono state verificate. Se il provider richiede un dominio mittente che non possiedi, non comprarlo automaticamente: rivalutare un SMTP gratuito accessibile o un dominio già disponibile.
- Google OAuth: configurazione del client e consenso pubblico, nessuna API AI o funzione a pagamento introdotta dal progetto.

Le quote possono cambiare e possono sospendere il servizio una volta esaurite: non si promettono gratuità permanente o uso illimitato. Non sono previsti upgrade automatici. Configura la retention delle foto usando un job su macchina fidata oppure GitHub Actions entro la quota disponibile, seguendo DEPLOYMENT.md.

**Il deploy prima della configurazione Supabase mostra solo una demo**, esplicitamente etichettata. Per utenti reali completa DEPLOYMENT.md e le prove esterne di VERIFICATION.md.

Fonti ufficiali verificate il 9 ottobre 2026:
- https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/platform/limits/
- https://supabase.com/pricing
- https://supabase.com/docs/guides/auth/auth-smtp
- https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
