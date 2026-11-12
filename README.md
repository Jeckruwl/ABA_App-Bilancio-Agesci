# Helper Bilancio Agesci

Applicazione personale e non ufficiale per inserire operazioni di Prima Nota su `bilancio.agesci.it`.

## Uso

Apri l'app su HTTPS oppure avvia un server locale con `python3 -m http.server 8000` e visita `http://localhost:8000`. L'installazione PWA e il service worker richiedono HTTPS o localhost.

Accedi con le credenziali BuonaStrada, seleziona anno e incarico, quindi apri **Aggiungi entrata/uscita**. Sono disponibili modelli salvati nel browser e un selettore per il tema chiaro/scuro. Nella schermata operazione il tasto di sistema, il gesto indietro o il tasto Escape torna alla schermata precedente; le notifiche si chiudono dopo tre secondi o con uno swipe. L'accesso e il salvataggio delle operazioni richiedono una connessione a `bilancio.agesci.it`.

Per rinnovare automaticamente la sessione, il nome utente e la password vengono salvati in `localStorage`, sul dispositivo. Usa l'app solo su un dispositivo personale e premi **Dimentica password** per rimuovere le credenziali salvate.

## Sicurezza

L'app non è sviluppata da AGESCI e usa API che possono cambiare. Non condividere le credenziali o il token; verifica le operazioni sul sito ufficiale prima della chiusura dell'anno sociale.
