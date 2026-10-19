# Stato consegna — 9 ottobre 2026

Prima implementazione completa del codice applicativo: interfaccia bilingue, regole SQL, gruppi, classifiche, auth Supabase, storage privato, Edge upload, amministrazione MFA, migrazioni, catalogo esempio, MIT e documentazione.

Verifiche locali: 21 test passati; check e build passati; demo nel browser a 360×800 e 1280×900, entrambe le lingue. Vedi VERIFICATION.md per i limiti delle prove.

Commit locali:
- `70c41d2`: regole transazionali, storage e test.
- `2df0dc8`: interfaccia bilingue e integrazione Auth.
- `ebd5b6c`: deployment, amministrazione, fonti e documentazione.
- Ulteriori fix/documentazione possono seguire; `git log` è l'autorità per HEAD.

Remote origin conserva l'URL GitHub richiesto. **Push GitHub non riuscito**: `fatal: could not read Username for 'https://github.com': terminal prompts disabled`. Autenticare Git Credential Manager con account autorizzato oppure usare SSH, poi `git push origin main` senza force.

**Deployment non completato**. Sites è stato registrato una sola volta e il suo ID conservato in `.openai/hosting.json`. Nessuna versione è stata salvata/pubblicata. Il runtime ha rifiutato `write_stdin` necessario al source helper: `approval required by policy, but ... sandbox_approval is false`. Nessuna credenziale è stata scritta in file, argomenti shell o repository. Per riprendere usare lo stesso project_id e ottenere una nuova credenziale temporanea, mai creare un secondo Site per aggirare il blocco.

Mancano configurazioni reali Supabase, Google OAuth, SMTP, Edge Function e hosting pubblico. Senza env la build allegata è una demo locale etichettata, non un gioco multiutente operativo. La guida DEPLOYMENT.md consente l'attivazione su Cloudflare Pages Free con HTTPS provider; DuckDNS non offre il CNAME richiesto da quello stack.

Per l'avvio: Node 24, pnpm 11, `pnpm install --frozen-lockfile`, `pnpm dev`. Per attivare il backend seguire DEPLOYMENT.md e poi eseguire le prove esterne indicate in VERIFICATION.md prima di aprire al pubblico. Non è dichiarata readiness di produzione dei servizi esterni senza queste verifiche.

Aggiornamento OCR: riconoscimento gratuito nel browser, asset locali inclusi nella build, testo modificabile, proposte da catalogo e conferma esplicita. Invio foto come prova separato. La build OCR non è stata pubblicata sul servizio esterno.

## 19 ottobre 2026 — gruppi privati

Menu del gruppo gestiti dal creatore, piatti personalizzati riutilizzabili e date selezionabili; correzioni senza limite di orario, revisioni e audit. Consultazione riservata ai membri; rimozione membro revoca accesso. Solo gruppi privati, ingresso su invito. Classifica nascosta agli utenti e RPC riservate agli amministratori con MFA, con indicazione WIP. Simulazione locale conservata alle 13:30. 27 test e build passati; verifica visiva non completata per arresto Computer Use.

Remote aggiunto: `djdragonyyy` → `https://github.com/Djdragonyyy/FantaMensaUnipa.git`. Il push è stato tentato ma fallisce per credenziali: Git Credential Manager non riesce a usare wincredman e Git non può richiedere lo username in questa sessione. Da un terminale autenticato eseguire `git push djdragonyyy main`, senza force. Non è necessario collegare GitHub a ChatGPT.

FantaEventi aggiunti nei gruppi: quattro eventi comuni con quote e richiesta personale del formaggio con toggle. Quote modificabili dal proprietario e congelate alla prima giocata, una modifica entro le 13:30, esiti confermati dal creatore dopo chiusura e punti virtuali calcolati dal server. Classifica ancora riservata agli admin/WIP. 34 test e build passati. Push ancora non completato: autorizzazione GitHub non disponibile né nel contesto sandbox né in quello utente con wincredman al momento della verifica.

Preparazione alla pubblicazione: titolare indicato Alberto Fiocco, contatto pubblico albertuzzo24@gmail.com. Regione proposta Supabase Central EU (Frankfurt), Cloudflare Pages Free su pages.dev. Account provider ancora da creare. Migrazione 005 per foto legacy e snapshot privati; Google Fonts rimosso; pagina privacy/stato servizio, bozza informativa e documento di avvio preparati. Accesso UI pubblico chiuso per impostazione iniziale (va chiusa anche la registrazione Auth sul provider). 36 test e build passati. Non pubblicato; cancellazione/retention completa, licenze/notice, informativa finale, email e prove esterne restano necessari prima dell'apertura.

## Push GitHub completato — 19 ottobre 2026

Il push a `https://github.com/Djdragonyyy/FantaMensaUnipa.git`, branch `main`, è riuscito: dal commit iniziale `9c1430c` a `815be3e`, seguiti dall'aggiornamento di questo stato. Le credenziali sono disponibili in Windows Credential Manager nell'account Windows del titolare; non sono nel repository né collegate all'account ChatGPT. Il branch locale ora segue `djdragonyyy/main`. I precedenti errori di autenticazione riportati in questo documento sono storici. Il sito non è ancora pubblicato: configurazione dei provider e controlli di apertura restano necessari.
