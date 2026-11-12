# Componenti OCR

Questi file sono distribuiti localmente per consentire il riconoscimento sul dispositivo senza inviare le immagini a server esterni. Sono caricati alla prima lettura di uno scontrino e, se il browser consente la cache, riutilizzabili offline.

- `tesseract.min.js` e `worker.min.js`: tesseract.js 6.0.1, licenza Apache 2.0 (`LICENSE-tesseract-js`), https://github.com/naptha/tesseract.js.
- `tesseract-core-*-lstm.wasm.js`: tesseract.js-core 6.1.2, licenza Apache 2.0 (`LICENSE-tesseract-core`), https://github.com/naptha/tesseract.js-core.
- `ita.traineddata.gz`: modello italiano 4.0.0_best_int dal pacchetto @tesseract.js-data/ita 1.0.0; modello derivato da https://github.com/tesseract-ocr/tessdata_fast (Apache 2.0).

I file WebAssembly sono incorporati negli script `wasm.js`; sono incluse sia la versione SIMD sia quella compatibile senza SIMD.
- `ocr-receipt-main.js` e `receipt-preprocess-worker.js`: adattamento dell'algoritmo di preprocessing di [drakarah/ocr-receipt](https://github.com/drakarah/ocr-receipt), commit `e59d503dcdadbdcb285cca19b986dc42d41d213a`, licenza MIT (`LICENSE-ocr-receipt`). L'avvio della demo webcam e i log sono disattivati e l'inizializzazione dell'istogramma della mediana è corretta; il worker aggiunge un ripiego per fogli chiari su sfondo scuro. l'adattamento lavora sulle foto selezionate dall'utente in un Web Worker.
