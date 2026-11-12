/* Analisi prudente di testo OCR: solo suggerimenti, mai salvataggio automatico. */
(function(root){
  'use strict';
  function dateFromMatch(m){
    const day=Number(m[1]), month=Number(m[2]), year=Number(m[3].length===2?'20'+m[3]:m[3]);
    const date=new Date(year,month-1,day);
    if(year<2000 || year>2100 || date.getFullYear()!==year || date.getMonth()!==month-1 || date.getDate()!==day) return null;
    return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }
  function unique(values){ return [...new Set(values.filter(Boolean))]; }
  function parseReceipt(text){
    const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const dates=[], labelledDates=[];
    for(const line of lines){
      for(const m of line.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})\b/g)){
        const date=dateFromMatch(m); dates.push(date);
        if(/\bdata\b/i.test(line) && !/scadenza|termine|validit[aà]/i.test(line)) labelledDates.push(date);
      }
    }
    const dateValues=unique(labelledDates.filter(Boolean).length?labelledDates:dates);
    const totals=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i].replace(/\bT[O0]TA[LI1]E\b/gi,'TOTALE');
      if(!/\btotale\b/i.test(line) || /sub\s*totale|subtotale|imponibile|iva|sconto|resto|parziale/i.test(line)) continue;
      let tail=line.slice(line.search(/\btotale\b/i)+6);
      if(!/\d/.test(tail) && lines[i+1] && /^\s*(?:€|eur)?\s*\d[\d.,]*\s*(?:€|eur)?\s*$/i.test(lines[i+1])) tail=lines[i+1];
      const matches=[...tail.matchAll(/(?:^|[^\d.,-])((?:\d{1,3}(?:\.\d{3})+|\d+)[,.]\d{2})(?!\d)/g)];
      if(matches.length!==1) continue;
      const n=Number(matches[0][1].replace(/\.(?=\d{3}(?:[,.]|$))/g,'').replace(',','.'));
      if(Number.isFinite(n) && n>0 && n<=1000000) totals.push(n.toFixed(2));
    }
    const totalValues=unique(totals);
    const merchant=lines.slice(0,8).find(line=>{
      const letters=(line.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
      return letters>=4 && line.length<=65 && !/\b(scontrino|documento|commerciale|vendita|fattura|ricevuta|partita|p\.?\s*iva|codice|fiscale|tel|telefono|via|viale|piazza|data|ora|totale|cassa|pagamento|cliente|copia|pag\.)\b/i.test(line) && !/\d{4,}/.test(line) && !/[€]/.test(line) && !/\d[,.]\d{2}/.test(line);
    });
    return {date:dateValues.length===1?dateValues[0]:null, amount:totalValues.length===1?totalValues[0]:null, description:merchant?'Scontrino - '+merchant:null, ambiguousDate:dateValues.length>1, ambiguousAmount:totalValues.length>1};
  }
  function mergeReceipts(original, enhanced){
    if(!enhanced) return original;
    const dateConflict=original.ambiguousDate || enhanced.ambiguousDate || !!(original.date && enhanced.date && original.date!==enhanced.date);
    const amountConflict=original.ambiguousAmount || enhanced.ambiguousAmount || !!(original.amount && enhanced.amount && original.amount!==enhanced.amount);
    const sameDescription=original.description && enhanced.description && original.description.toLocaleLowerCase('it-IT')===enhanced.description.toLocaleLowerCase('it-IT');
    const description=original.description && enhanced.description ? (sameDescription?original.description:null) : (original.description || enhanced.description);
    return {date:dateConflict?null:(original.date||enhanced.date), amount:amountConflict?null:(original.amount||enhanced.amount), description, ambiguousDate:dateConflict, ambiguousAmount:amountConflict};
  }
  root.ReceiptOCR={parseReceipt,mergeReceipts};
})(typeof window!=='undefined'?window:globalThis);
