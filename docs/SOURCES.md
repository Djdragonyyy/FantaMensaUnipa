# Fonti pubbliche verificate il 9 ottobre 2026

## Palette

Fonti: [identità e logo UniPa](https://www.unipa.it/ateneo/unipacomunica/identit-e-logo-di-ateneo/), [portale ERSU Palermo](https://www.ersupalermo.it/). Il manuale UniPa collegato non è risultato accessibile tramite il lettore web, quindi **non attribuiamo codici esadecimali ufficiali** alle istituzioni.

Palette originale ispirata al carattere istituzionale dei portali: blu scuro `#173E60` (azioni/testi), verde `#226A4E` (esiti), fondo `#F5F7F6`, testo `#183950`, secondario `#587080`, accento sabbia `#D1BD7E`. Non vengono riprodotti sigilli/loghi ufficiali. Il marchio fm è originale, realizzato in CSS. I contrasti dei testi principali su bianco e delle azioni blu superano 4,5:1; accenti decorativi non veicolano informazioni da soli.

## Servizi gratuiti e quote

| Servizio | Piano e quote verificate | Limiti operativi |
| --- | --- | --- |
| [Supabase Free](https://supabase.com/pricing) | DB 500 MB/progetto, storage 1 GB, 50.000 utenti attivi/mese, egress 5 GB e cached egress 5 GB, 500.000 Edge invocations, MFA TOTP incluso | Pausa dopo una settimana inattiva, nessun backup automatico/SLA Free; monitorare dashboard |
| [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) | Default: 2 email/ora e solo indirizzi del team | SMTP custom necessario per utenti reali |
| [Brevo Free](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans) | 300 email/giorno, nessuna carta richiesta, nessun limite temporale del piano | Attivazione transazionale e mittente/dominio da verificare; quota non cumulabile |
| [Cloudflare Pages Free](https://developers.cloudflare.com/pages/platform/limits/) | 500 build/mese, una build concorrente, 20.000 file, 25 MiB/file | Qui solo asset statici; DB/Auth/storage su Supabase, nessuna Functions Pages necessaria |

Le quote sono una fotografia della documentazione, non una garanzia di gratuità permanente né di capacità illimitata. Non sono stati acquistati piani, trial o upgrade. La registrazione effettiva ai provider, incluso se venga richiesta una verifica aggiuntiva, resta da completare. La documentazione dei piani gratuiti non sostituisce una verifica con l'account reale.

## Sicurezza, OAuth e DNS

- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits): limiti per IP e endpoint, reinvio email e quote SMTP; mantenerli e configurare CAPTCHA.
- [Google OAuth Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google): client Web, callback Supabase, consent screen e redirect allowlist.
- [MFA](https://supabase.com/docs/guides/auth/auth-mfa): TOTP e claim AAL2 per autorizzazioni avanzate.
- [DuckDNS spec](https://www.duckdns.org/spec.jsp): IP A/AAAA e TXT; nessuna API CNAME documentata.
- [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/): per sottodomini esterni serve CNAME verso il nome pages.dev. **Inferenza dalle due fonti**: DuckDNS non offre la configurazione richiesta per Pages; usare HTTPS pages.dev.

Le fonti ERSU sono usate per contesto/localizzazione, non per un menu del giorno. Nessun menu pubblico è importato automaticamente nel catalogo dei candidati o nei risultati.

## OCR

- Tesseract.js 7.0.0, Apache-2.0: https://github.com/naptha/tesseract.js
- Configurazione locale e scelta automatica dei motori: https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md
- Modello italiano `@tesseract.js-data/ita` 1.0.0: https://github.com/naptha/tessdata

Le licenze Tesseract.js e del core sono copiate insieme agli asset. La licenza MIT del progetto non sostituisce le licenze delle dipendenze.
