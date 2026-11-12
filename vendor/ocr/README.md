# Componenti OCR

Questi file sono distribuiti localmente per consentire il riconoscimento sul dispositivo senza inviare le immagini a server esterni. Sono caricati alla prima lettura di uno scontrino e, se il browser consente la cache, riutilizzabili offline.

- `tesseract.min.js` e `worker.min.js`: tesseract.js 6.0.1, licenza Apache 2.0 (`LICENSE-tesseract-js`), https://github.com/naptha/tesseract.js.
- `tesseract-core-*-lstm.wasm.js`: tesseract.js-core 6.1.2, licenza Apache 2.0 (`LICENSE-tesseract-core`), https://github.com/naptha/tesseract.js-core.
- `ita.traineddata.gz`: modello italiano 4.0.0_best_int dal pacchetto @tesseract.js-data/ita 1.0.0; modello derivato da https://github.com/tesseract-ocr/tessdata_fast (Apache 2.0).

I file WebAssembly sono incorporati negli script `wasm.js`; sono incluse sia la versione SIMD sia quella compatibile senza SIMD.
