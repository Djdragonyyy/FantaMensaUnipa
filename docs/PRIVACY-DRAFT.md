# Bozza informativa per il servizio multiutente — da finalizzare prima dell'apertura

Titolare: **Alberto Fiocco**. Contatto: **albertuzzo24@gmail.com**. Autore: alberto-fiocco.

Questa bozza non è una dichiarazione di conformità e non va presentata come informativa definitiva. Gli account dei fornitori non sono ancora stati creati. La pagina pubblica `privacy.html` descrive invece lo stato effettivo di configurazione e la demo locale. L'accesso UI pubblico parte disattivato; la registrazione va disattivata anche nel dashboard Auth.

## Testo di lavoro

FantaMensa UniPa è un progetto indipendente di gioco tra amici, senza scommesse in denaro, non affiliato a UniPa o ERSU Palermo. Per fornire account, gruppi privati e giocate vengono trattati email, identificatore account, nickname, iscrizioni ai gruppi, scelte, risultati ed eventi, date e dati tecnici necessari alla sicurezza. Non chiediamo documenti, dati sanitari, matricola, posizione o foto di persone. Non utilizzare campi liberi per dati personali di altre persone.

La finalità principale è erogare il servizio richiesto dall'utente; la base proposta è l'esecuzione del servizio ai sensi dell'art. 6(1)(b) GDPR. Prevenzione degli abusi e sicurezza richiedono una valutazione documentata di necessità, proporzionalità e legittimo interesse prima di adottare l'art. 6(1)(f). Le richieste sui diritti e gli eventuali obblighi di legge hanno basi distinte da documentare. Nessun consenso al marketing è richiesto perché non è previsto marketing.

Il nickname e l'appartenenza sono visibili agli attuali membri del gruppo. Il creatore decide il menu e conferma gli eventi; dopo la chiusura vede i partecipanti per confermare a chi è stato chiesto il formaggio. Le scelte degli altri giocatori non sono esposte dal nuovo sistema eventi. Gli amministratori con MFA possono svolgere funzioni di moderazione e leggere l'audit. Non avvengono decisioni con effetti giuridici o analogamente significativi: i punti sono elementi del gioco.

Il browser conserva preferenza lingua e sessione; in demo conserva inoltre i dati dimostrativi. Non sono integrati tracker pubblicitari o analytics. Un CAPTCHA, se attivato, è un fornitore aggiuntivo: va verificato e descritto prima dell'attivazione, compresi i trattamenti del dispositivo. Non dichiarare automaticamente che ogni strumento di terzi sia tecnico o esente da consenso.

L'OCR avviene sul dispositivo senza inviare la foto a servizi di riconoscimento. L'upload di prove è distinto, richiede una funzione server e controlli di formato/dimensione; la ricodifica rimuove EXIF/GPS, ma non cancella dati visibili nei pixel. Le prove del precedente gioco sono accessibili solo all'autore e agli amministratori con MFA dopo la scadenza. Non esiste ancora un sistema di allegati fotografici condivisi nei gruppi: non descriverlo come già disponibile.

Fornitori previsti, da confermare dopo la configurazione: Cloudflare per pagine e protezione della rete; Supabase per account, database e storage; SMTP da scegliere e provare, eventualmente Brevo. GitHub ospita il codice e, se attivato il workflow di retention, esegue il job server. Il codice non deve contenere dati degli utenti. L'accesso Google aggiungerebbe un ulteriore fornitore e non è necessario alla prima apertura.

La regione UE del database non elimina automaticamente ogni possibile trasferimento extra SEE: occorre verificare soggetti contrattuali, DPA, sub-responsabili, accessi di supporto, distribuzione CDN e garanzie applicabili dei servizi scelti. Indicare nell'informativa finale destinatari e garanzie effettivi, senza inventare localizzazione esclusivamente italiana/europea.

Per accesso, rettifica, cancellazione, limitazione, opposizione e portabilità quando applicabili, scrivere al contatto del titolare. È possibile presentare reclamo al Garante per la protezione dei dati personali. Non chiedere documenti di identità per impostazione predefinita: verificare in modo proporzionato che la richiesta provenga dal titolare dell'account. Il termine di risposta e le eventuali proroghe vanno gestiti secondo l'art. 12 GDPR.

## Conservazione: decisioni e operazioni ancora necessarie

| Dati | Stato tecnico / decisione da completare |
|---|---|
| Foto server | Job predisposto: oltre 30 giorni; prenotazioni incomplete oltre 1 giorno. Non attivo senza configurazione. Verificare esecuzione, arretrato e rimozione oggetti; non promettere cancellazione se il job non gira. |
| Account, gruppi, giocate e risultati | Nessun termine automatico implementato. Stabilire prima dell'apertura durata e criteri proporzionati, gestione dell'inattività e procedura di cancellazione/anomizzazione testata. |
| Audit, segnalazioni, rate limit | Separare tempi tecnici e necessità di sicurezza; implementare pulizia e accessi limitati. Non conservare indefinitamente per comodità. |
| Log fornitori e backup | Verificare piano effettivo, retention e procedure di ripristino/cancellazione con il provider. Free Supabase non equivale a backup automatici gestiti. |
| Dati nel browser | Persistono finché eliminati dal browser; la demo ha anche il comando Azzera demo. Gestire esplicitamente sessione e logout. |

La cancellazione dell'account Supabase non va attivata alla cieca: alcune relazioni legacy impediscono la cancellazione del profilo; un creatore ha inoltre gruppi con altri membri. Prima dell'apertura servono una procedura verificata per revoca sessioni, eliminazione delle foto, gestione/trasferimento dei gruppi, rimozione o anonimizzazione delle relazioni e dei dati personali negli audit, poi cancellazione Auth. Non eseguire SQL distruttivo su dati reali senza identificazione della richiesta e verifica del risultato.

## Riesame necessario

Finalizzare condizioni d'uso e regole sui contenuti, limiti d'età e gestione dei minori, informativa e basi giuridiche, conservazione, diritti, risposta agli incidenti, contratti/DPA e trasferimenti. Valutare questi aspetti con un professionista in funzione della concreta apertura del servizio. La disponibilità di un piano Free o di RLS non costituisce una certificazione di conformità.

Fonti ufficiali consultate il 19 ottobre 2026:
- [GDPR pubblicato dal Garante](https://www.garanteprivacy.it/regolamentoue)
- [Linee guida cookie e altri strumenti di tracciamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876)
- [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum)
