# Stato consegna — 9 ottobre 2026

Prima implementazione completa del codice applicativo: interfaccia bilingue, regole SQL, gruppi, classifiche, auth Supabase, storage privato, Edge upload, amministrazione MFA, migrazioni, catalogo esempio, MIT e documentazione.

Verifiche locali: 17 test passati; check e build passati; demo nel browser a 360×800 e 1280×900, entrambe le lingue. Vedi VERIFICATION.md per i limiti delle prove.

Commit locali:
- `70c41d2`: regole transazionali, storage e test.
- `2df0dc8`: interfaccia bilingue e integrazione Auth.
- `ebd5b6c`: deployment, amministrazione, fonti e documentazione.
- Ulteriori fix/documentazione possono seguire; `git log` è l'autorità per HEAD.

Remote origin conserva l'URL GitHub richiesto. **Push GitHub non riuscito**: `fatal: could not read Username for 'https://github.com': terminal prompts disabled`. Autenticare Git Credential Manager con account autorizzato oppure usare SSH, poi `git push origin main` senza force.

**Deployment non completato**. Sites è stato registrato una sola volta e il suo ID conservato in `.openai/hosting.json`. Nessuna versione è stata salvata/pubblicata. Il runtime ha rifiutato `write_stdin` necessario al source helper: `approval required by policy, but ... sandbox_approval is false`. Nessuna credenziale è stata scritta in file, argomenti shell o repository. Per riprendere usare lo stesso project_id e ottenere una nuova credenziale temporanea, mai creare un secondo Site per aggirare il blocco.

Mancano configurazioni reali Supabase, Google OAuth, SMTP, Edge Function e hosting pubblico. Senza env la build allegata è una demo locale etichettata, non un gioco multiutente operativo. La guida DEPLOYMENT.md consente l'attivazione su Cloudflare Pages Free con HTTPS provider; DuckDNS non offre il CNAME richiesto da quello stack.

Per l'avvio: Node 24, pnpm 11, `pnpm install --frozen-lockfile`, `pnpm dev`. Per attivare il backend seguire DEPLOYMENT.md e poi eseguire le prove esterne indicate in VERIFICATION.md prima di aprire al pubblico. Non è dichiarata readiness di produzione dei servizi esterni senza queste verifiche.
