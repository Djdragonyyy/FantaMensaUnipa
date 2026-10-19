# Licenze e contenuti: controllo preliminare 19 ottobre 2026

Inventario delle dipendenze runtime ottenuto localmente con `pnpm licenses list --prod --json`: licenze dichiarate MIT, Apache-2.0, 0BSD e BSD-2-Clause. Supabase SDK dichiara MIT; Tesseract.js e tesseract.js-core dichiarano Apache-2.0. Il modello italiano è distribuito dal pacchetto `@tesseract.js-data/ita` 1.0.0 (metadata MIT): verificare anche provenienza/licenza dei pesi prima della distribuzione pubblica. I decoder server jpeg-js e pngjs dichiarano MIT. L'inventario non sostituisce il testo delle licenze o un audit legale.

`prepare-ocr.mjs` conserva già i testi LICENSE di Tesseract.js e del core insieme agli asset OCR. Prima dell'apertura completare il file di avvisi per le dipendenze incorporate nei bundle, mantenendo copyright e notice applicabili, inclusi quelli delle dipendenze transitive e del modello. Non descrivere tutto il software distribuito come esclusivamente MIT: la licenza del progetto non sostituisce quella delle dipendenze.

Google Fonts non è più caricato. La marca grafica è composta dal codice CSS e dal testo del progetto; non sono utilizzati loghi ufficiali UniPa/ERSU nel sorgente. L'uso dei nomi nel titolo non prova autorizzazione sui marchi: mantenere il disclaimer di indipendenza e rivalutare nome/presentazione in caso di contestazioni o confusione.

Il catalogo è dimostrativo, non una copia certificata del menu di una mensa. Prima di utilizzare foto o materiali di terzi verificare diritti, autorizzazione e dati visibili. I termini d'uso devono chiedere agli utenti di caricare soltanto contenuti che possono legittimamente condividere e prevedere un contatto per segnalazioni/rimozioni. Non promettere che la sola rimozione EXIF elimini ogni dato personale o vincolo sui contenuti.

Nessuna verifica può garantire in assoluto l'assenza di diritti di terzi: questa è una verifica preliminare sul repository, con controlli da completare prima del servizio pubblico.
