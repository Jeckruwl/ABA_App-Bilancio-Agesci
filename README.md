# Helper Bilancio Agesci

Applicazione personale e non ufficiale per inserire operazioni di Prima Nota su `bilancio.agesci.it`.

## Uso

Apri l'app su HTTPS oppure avvia un server locale con `python3 -m http.server 8000` e visita `http://localhost:8000`. L'installazione PWA e il service worker richiedono HTTPS o localhost.

Accedi con le credenziali BuonaStrada, seleziona anno e incarico, quindi apri **Aggiungi entrata/uscita**. Sono disponibili modelli salvati nel browser e un selettore per il tema chiaro/scuro. Per modificare un modello, premi **Modifica**, aggiorna i campi nella schermata separata e premi **Salva modifiche**; usa il gesto o tasto indietro per annullare. Data e importo non vengono modificati da questa schermata. I menu di selezione mostrano le voci complete con testo compatto e un campo di ricerca; si chiudono con il pulsante Chiudi, Escape o il tasto indietro del dispositivo. Nella schermata operazione il tasto di sistema, il gesto indietro o il tasto Escape torna alla schermata precedente; le notifiche si chiudono dopo tre secondi o con uno swipe. L'accesso e il salvataggio delle operazioni richiedono una connessione a `bilancio.agesci.it`.

Per rinnovare automaticamente la sessione, il nome utente e la password vengono salvati in `localStorage`, sul dispositivo. Usa l'app solo su un dispositivo personale. Per rimuovere le credenziali salvate, elimina i dati del sito o dell'app dal browser; **Esci** interrompe la sessione ma non cancella la password salvata.

## Importazione estratto conto

Dalla dashboard apri **Carica operazioni da estratto conto** e scegli un PDF con testo selezionabile e il conto di destinazione. È supportato il formato dell'esempio fornito, con colonne Data contabile, Operazione, Contabilizzato, Categoria e Importo; PDF di altre banche, scansioni e file protetti potrebbero non essere riconosciuti. Il PDF viene analizzato localmente, non viene caricato sul server né conservato dall'app.

Per ogni riga modifica la descrizione direttamente e scegli la tipologia di entrata o uscita dal relativo menu. Per un trasferimento seleziona **Giroconto** e scegli l’altro conto abilitato: per un’uscita è la destinazione, per un’entrata è l’origine. La tipologia non è richiesta. Lo specchietto flottante conta le operazioni con tipologia o altro conto assegnato; il link sotto il conto porta alla prima operazione non contabilizzata. La categoria della banca viene associata a quella del bilancio solo se il nome coincide in modo univoco; altrimenti l'operazione viene salvata senza categoria. Le righe non contabilizzate dalla banca hanno un bordo rosso e possono essere rimosse dalla lista con una pressione prolungata e conferma, oppure con il pulsante Rimuovi dalla lista; non vengono eliminate dalla banca. Le date fuori dall'anno o dal periodo di attività del conto impediscono l'invio.

Dopo aver verificato tutte le righe, conferma il caricamento. Ogni operazione ordinaria importata riporta `HelperBA` nel campo note, senza modificare descrizione o categoria. I giroconti sono inviati separatamente come tali e riportano nelle note `HelperBA` e la descrizione (massimo 255 caratteri complessivi). Le operazioni sono inviate una alla volta; in caso di errore o risposta incerta l'invio si ferma, senza ritentare automaticamente. Controlla nel Tool Bilancio quelle già registrate prima di avviare un nuovo import, per evitare duplicati. La bozza con righe, modifiche e stato viene salvata automaticamente nella memoria locale del browser, associata a socio, anno e contesto selezionato; il PDF e le credenziali non fanno parte della bozza. Riaprendo l'app nello stesso browser e contesto viene ripristinata. Usa **Elimina bozza** per cancellarla; la sostituzione con un altro PDF richiede conferma. Se il caricamento era già iniziato, la bozza ripristinata resta bloccata: verifica le operazioni nel Tool prima di eliminarla e iniziare un nuovo estratto. Se il salvataggio locale non è disponibile l'app avvisa e blocca l'invio per proteggere dallo stato incerto. La cancellazione dei dati del browser elimina anche le bozze; chi usa lo stesso dispositivo e profilo browser potrebbe accedervi.

Il lettore PDF usa PDF.js 4.10.38 (licenza Apache 2.0, `vendor/pdfjs/LICENSE`).

## Sicurezza

L'app non è sviluppata da AGESCI e usa API che possono cambiare. Non condividere le credenziali o il token; verifica le operazioni sul sito ufficiale prima della chiusura dell'anno sociale.
