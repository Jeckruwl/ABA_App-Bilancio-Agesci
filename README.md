# Helper Bilancio Agesci

Applicazione personale e non ufficiale per inserire operazioni di Prima Nota su `bilancio.agesci.it`.

## Uso

Apri l'app su HTTPS oppure avvia un server locale con `python3 -m http.server 8000` e visita `http://localhost:8000`. L'installazione PWA e il service worker richiedono HTTPS o localhost.

Accedi con le credenziali BuonaStrada, seleziona anno e incarico, quindi apri **Aggiungi entrata/uscita**. Sono disponibili modelli salvati nel browser e un selettore per il tema chiaro/scuro. L'accesso e il salvataggio delle operazioni richiedono una connessione a `bilancio.agesci.it`.

Per rinnovare automaticamente la sessione, il nome utente e la password vengono salvati in `localStorage`, sul dispositivo. Usa l'app solo su un dispositivo personale e premi **Dimentica password** per rimuovere le credenziali salvate.

## Lettura scontrino

Nella schermata della nuova operazione, premi il pulsante con la fotocamera sotto quello indietro e scegli **Fotocamera** per scattare oppure **Galleria** per selezionare una foto. Il comportamento finale della fotocamera dipende dal browser e dal dispositivo. La foto viene preparata usando gli algoritmi di [ocr-receipt](https://github.com/drakarah/ocr-receipt) (individuazione dei bordi, correzione prospettica e sogliatura); viene confrontata con la lettura della foto originale. Entrambe le letture usano Tesseract, quindi il risultato non è garantito. L'OCR viene eseguito sul dispositivo: la foto non viene inviata a un servizio OCR e non viene conservata dall'app. Il motore OCR è distribuito insieme all'app e scaricato al primo utilizzo; se il browser mantiene la cache, può essere riutilizzato offline. La cache può essere eliminata dal browser o dall'utente, rendendo necessario un nuovo download.

L'app prova a proporre data, totale e descrizione, e suggerisce un'uscita se non è già stata scelta una tipologia. Non sostituisce i campi già compilati. Se rileva più date o totali diversi, anche tra le due letture, lascia il valore da inserire manualmente. Controlla sempre tutti i campi, inclusi tipo, conto, tipologia e categoria, prima di salvare: la lettura può sbagliare o non riconoscere alcuni dati. Non viene mai salvata automaticamente un'operazione.

Per eseguire i test: `node tests/receipt-ocr.cjs`, `node tests/ocr-preprocess.cjs` e `node tests/sw-ocr.cjs`. Dettagli e licenze del motore sono in `vendor/ocr/README.md`.

## Sicurezza

L'app non è sviluppata da AGESCI e usa API che possono cambiare. Non condividere le credenziali o il token; verifica le operazioni sul sito ufficiale prima della chiusura dell'anno sociale.
