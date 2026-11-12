# Helper personale per Tool Bilancio AGESCI

Accedi **una sola volta** e poi inserisci le operazioni di Prima Nota senza aprire ogni volta `bilancio.agesci.it`.

## Avvio rapido (2 minuti)

1. Apri `index.html` con un server locale (consigliato) oppure con doppio click:
   ```bash
   cd agesci-bilancio-helper
   python3 -m http.server 8000
   # poi apri http://localhost:8000
   ```
   > Su alcuni browser le chiamate API da `file://` possono essere bloccate: usa il server locale sopra.
2. Inserisci **username e password di BuonaStrada** → *Accedi e resta collegato*.
   - La password non viene salvata: resta solo il token di sessione nel browser.
3. Seleziona **Anno sociale** e **Incarico** (e Unità, se richiesto). Conti, tipologie e categorie si caricano da soli.
4. Vai su **Nuova operazione**, compila e premi *Salva operazione*.

## Cosa puoi fare

| Funzione | Descrizione |
|---|---|
| **Nuova operazione** | Singola operazione Prima Nota (conto, data, entrata/uscita, importo, tipologia, descrizione, categoria, note). Con validazioni come il sito ufficiale e anteprima del payload API. |
| **Salva e duplica** | Dopo il salvataggio tiene conto/tipologia per la prossima operazione (utile per quote ripetute). |
| **Modelli ⭐** | Salva le combinazioni frequenti e applicale in un click. Restano in `localStorage`. |
| **Import massivo CSV 📥** | Più operazioni in sequenza da un CSV, con anteprima, controllo errori e log di invio. |
| **Operazioni recenti 🕘** | Elenco dal sito ufficiale con **Duplica** ed **Elimina**. |

## CSV per l'import massivo

Intestazione obbligatoria, separatore `;` o `,`:

```csv
data;descrizione;tipo;importo;tipologia;conto;categoria;note
15/03/2026;Quota Lupetti gennaio;E;25;Quote associative;Cassa;;
20/03/2026;Spesa cancelleria;U;18.50;Materiale cancelleria;Cassa;;
```

- `data`: formato `GG/MM/AAAA`
- `tipo`: `E`/`Entrata` oppure `U`/`Uscita`
- `tipologia` e `conto`: puoi scrivere la **label** (es. `Quote associative`, `Cassa`) oppure l'**ID numerico** o il **codice** (es. `C.2`). L'helper li risolve automaticamente.
- `categoria` e `note`: facoltative.

Nell'app c'è il pulsante *Scarica modello CSV* e *Carica esempio*.

## 📲 Installarla come PWA (app sulla home del telefono)

L'app è già una **PWA**: dopo l'installazione si apre come un'app vera (schermo intero, icona sulla home, funziona anche offline per la schermata iniziale).

### Requisito importante: HTTPS (o localhost)

Le PWA richiedono un **contesto sicuro**: `https://` oppure `http://localhost`.
- ✅ Su PC con `http://localhost:8000` puoi già installarla e provarla in Chrome.
- ✅ Sul telefono serve l'app **online in HTTPS** (es. GitHub Pages, Netlify, Vercel — tutti gratuiti): carica la cartella `agesci-bilancio-helper` su uno di questi servizi e apri l'URL HTTPS dal telefono.
- ❌ Da `file://` (doppio click sul file) o da un server solo `http://` su rete locale, il browser **non** permetterà l'installazione (manca il contesto sicuro).

### Come installarla

**Android (Chrome):**
1. Apri l'URL HTTPS (o `http://localhost:8000` su PC) in Chrome.
2. Premi il pulsante giallo **📲 Installa app** in alto (oppure menu ⋮ → *Installa app*).
3. L'icona viola/gialla **€** compare sulla home. Aprila come un'app normale.

**iPhone/iPad (Safari):**
1. Apri l'URL HTTPS in Safari.
2. Condividi (⬆) → *Aggiungi a schermata Home*.
3. L'icona compare sulla home. (Su iOS l'installazione avviene solo da Safari, non da Chrome.)

**PC (Chrome/Edge):**
1. Apri l'app e premi **📲 Installa app** (o l'icona di installazione nella barra degli indirizzi).
2. L'app si apre in una finestra dedicata, senza barra del browser.

### Cosa funziona offline e cosa no

- ✅ **Offline:** l'app si apre e mostra la schermata (il service worker `sw.js` mette in cache `index.html`, manifest e icone).
- ❌ **Offline:** login e inserimento operazioni richiedono internet, perché le API sono su `bilancio.agesci.it` e **non vengono mai messe in cache** (i dati di bilancio devono essere sempre aggiornati).
- 🔑 Il token resta salvato in `localStorage` anche dopo l'installazione: non devi riaccedere a ogni apertura.

### File PWA aggiunti

| File | Ruolo |
|---|---|
| `manifest.json` | Nome, icone, colori, modalità standalone |
| `sw.js` | Service worker: cache dell'app shell, mai delle API |
| `icons/*.png` | Icone 48/192/512 + maskable + Apple touch icon |

## "Senza accedere tutte le volte" — come funziona

- Il sito ufficiale salva il token in `sessionStorage` (si perde chiudendo il browser).
- Questo helper lo salva in **`localStorage`**, quindi resta collegato anche dopo aver chiuso e riaperto il browser, finché il token JWT non scade.
- L'helper mostra in alto **data di scadenza e durata del token** (es. "dura 30 minuti").
- ⚠️ **Il token AGESCI scade in poco tempo** (tipicamente minuti/ore, non giorni): da solo non basta salvarlo. Per questo l'app ha il **rinnovo automatico**:
  - Se lasci attiva l'opzione *"Rinnovo automatico"* al login, la password viene salvata **solo su questo dispositivo** (`localStorage`, chiave `ab_creds`).
  - L'app controlla la scadenza **ogni 30 secondi** e riaccede da sola **2 minuti prima** che il token scada, senza che tu debba fare nulla.
  - Se riapri l'app dopo ore/giorni (token già scaduto), riaccede subito da sola all'apertura.
  - Se il server risponde `401`, prova subito un nuovo login automatico.
- 🔒 **Sicurezza:** usa il rinnovo automatico **solo sul tuo telefono/PC personale**, mai su PC condivisi. Per togliere la password salvata premi **🗑 Dimentica password** in alto (o deseleziona l'opzione al prossimo login).
- Tutti i dati di contesto (anni, conti, tipologie) vengono ricaricati automaticamente a ogni apertura, senza credenziali.

## Alternativa da terminale

`bilancio_helper.py` fa le stesse cose da riga di comando (utile per import massivi da script):

```bash
pip install requests
python3 bilancio_helper.py login --username TUO_USERNAME
# inserisce la password in modo sicuro (non viene salvata su disco)
python3 bilancio_helper.py insert --conto "Cassa" --data 15/03/2026 --tipo E --importo 25 --tipologia "Quote associative" --descrizione "Quota Lupetti"
python3 bilancio_helper.py import-csv operazioni.csv
python3 bilancio_helper.py list
```

Il token viene salvato in `~/.agesci_bilancio_token.json` (file locale, permessi ristretti). Vedi `ANALISI.md` per i dettagli tecnici delle API.

## Sicurezza e avvertenze

- Strumento **personale e non ufficiale**: non è sviluppato da AGESCI. Le API sono interne al sito e possono cambiare.
- Usa l'helper **solo sul tuo dispositivo personale**, mai su PC condivisi. Non condividere il token.
- Verifica sempre le operazioni sul sito ufficiale prima della chiusura dell'anno sociale.
- Nessun dato lascia il tuo browser/computer: le chiamate vanno solo a `bilancio.agesci.it`.
