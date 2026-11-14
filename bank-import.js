/* Importazione estratto conto. I file e le righe rimangono solo in memoria. */
(function(){
  'use strict';
  const $bank=id=>document.getElementById(id);
  const screen=$bank('bankScreen'), file=$bank('bankFile'), account=$bank('bankAccount'), rowsEl=$bank('bankRows'), summary=$bank('bankSummary'), upload=$bank('bankUpload'), reset=$bank('bankReset');
  const editor=$bank('bankEditDialog'), confirmDialog=$bank('bankConfirmDialog'), type=$bank('bankType');
  let rows=[], errors=[], processing=false, attempted=false, importing=false, marker=null, selected=-1, generation=0, pendingAction=null;
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function categoryMatch(name){const matches=state.categorie.filter(c=>Number.isInteger(Number(c.value)) && Number(c.value)>0 && norm(c.label)===norm(name));return matches.length===1?matches[0]:null;}
  function chosenAccount(){return state.conti.find(c=>Number.isInteger(Number(c.value)) && Number(c.value)>0 && String(c.value)===account.value);}
  function validTypes(r){return (r.amount>0?state.tipiE:state.tipiU).filter(t=>Number.isInteger(Number(t.value)) && Number(t.value)>0 && t.selezionabile!==false && !(t.codice==='C.2' && Number(String(state.year?.label||'').split('-')[1])>=25));}
  function problems(r,acct){
    const issues=[];
    if(!r.description.trim())issues.push('Descrizione mancante');
    if(!r.type || !validTypes(r).some(t=>String(t.value)===String(r.type)))issues.push('Tipologia da assegnare');
    const date=r.date+'T00:00:00.000Z';
    if(state.year?.start && date<state.year.start.slice(0,10)+'T00:00:00.000Z' || state.year?.end && date>state.year.end.slice(0,10)+'T00:00:00.000Z')issues.push('Data fuori dall’anno selezionato');
    if(acct?.data_inizio_attivita && date<acct.data_inizio_attivita.slice(0,10)+'T00:00:00.000Z')issues.push('Data precedente al conto');
    if(acct?.data_fine_attivita && date>acct.data_fine_attivita.slice(0,10)+'T00:00:00.000Z')issues.push('Data successiva alla chiusura del conto');
    return issues;
  }
  function paragraph(text,cls){const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;return p;}
  function render(){
    rowsEl.replaceChildren();const acct=chosenAccount();
    rows.forEach((r,i)=>{
      const row=document.createElement('article');row.className='bank-row'+(r.booked?'':' bank-unbooked');row.setAttribute('aria-label','Operazione '+(i+1));
      row.append(paragraph('Data contabile: '+r.date.split('-').reverse().join('/')));
      row.append(paragraph('Operazione / descrizione:'));
      const button=document.createElement('button');button.type='button';button.className='bank-description';button.textContent=r.description;button.disabled=attempted||importing;button.setAttribute('aria-label','Modifica descrizione e tipologia operazione '+(i+1));button.onclick=()=>edit(i);row.append(button);
      const cat=categoryMatch(r.category);row.append(paragraph('Categoria estratto: '+r.category+(cat?' — associata nel bilancio':' — non associata nel bilancio'),cat?'':'bank-warning'));
      row.append(paragraph((r.amount>0?'Entrata: ':'Uscita: ')+fmtEUR(r.amount),'bank-amount'));
      const typ=validTypes(r).find(t=>String(t.value)===String(r.type));row.append(paragraph('Tipologia: '+(typ?.label||'da assegnare'),typ?'':'bank-warning'));
      if(!r.booked){
        row.append(paragraph('Operazione non contabilizzata: tieni premuto per rimuoverla dalla lista.','bank-warning'));
        const remove=document.createElement('button');remove.type='button';remove.className='bank-remove';remove.textContent='Rimuovi dalla lista';remove.disabled=attempted||importing;
        remove.setAttribute('aria-label','Rimuovi dalla lista operazione non contabilizzata '+(i+1));
        remove.onclick=()=>confirmRemoval(r);row.append(remove);
        let timer=null,start=null,suppressClickUntil=0;
        const cancelPress=()=>{if(timer!==null)clearTimeout(timer);timer=null;start=null;};
        row.addEventListener('pointerdown',e=>{
          if(attempted||importing||!e.isPrimary||e.button!==0)return;
          start={x:e.clientX,y:e.clientY,id:e.pointerId};
          timer=setTimeout(()=>{timer=null;start=null;suppressClickUntil=Date.now()+1000;confirmRemoval(r);},650);
        });
        row.addEventListener('pointermove',e=>{if(start&&e.pointerId===start.id&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)cancelPress();});
        row.addEventListener('pointerup',cancelPress);row.addEventListener('pointercancel',cancelPress);row.addEventListener('pointerleave',cancelPress);
        row.addEventListener('contextmenu',e=>{if(!attempted&&!importing)e.preventDefault();});
        row.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();suppressClickUntil=0;}},true);
      }
      const issues=problems(r,acct).filter(x=>x!=='Tipologia da assegnare');if(issues.length)row.append(paragraph(issues.join('. '),'bank-warning'));
      r.statusNode=paragraph(r.status||'', 'bank-status');row.append(r.statusNode);
      rowsEl.append(row);
    });
    const missing=rows.filter(r=>!r.type || !validTypes(r).some(t=>String(t.value)===String(r.type))).length;
    const unlinked=rows.filter(r=>!categoryMatch(r.category)).length, pending=rows.filter(r=>!r.booked).length;
    if(errors.length) summary.textContent='Lettura non completata: '+errors.join(' ')+' Nessuna operazione può essere caricata.';
    else if(rows.length)summary.textContent=rows.length+' operazioni rilevate. Tipologie da assegnare: '+missing+'. Categorie bancarie non associate: '+unlinked+'. Non contabilizzate dalla banca: '+pending+'.';
    else if(!processing)summary.textContent='';
    const invalid=!acct||!state.user||!state.year||$bank('btnBankImport').disabled||!rows.length||errors.length||rows.some(r=>problems(r,acct).length);
    upload.disabled=!!(invalid||processing||importing||attempted);
    file.disabled=processing||attempted||importing;account.disabled=attempted||importing;reset.classList.toggle('hidden',!attempted);reset.disabled=importing;
  }
  async function readPdf(f){
    if(!f || attempted||importing)return; const id=++generation;rows=[];errors=[];processing=true;summary.textContent='Analisi del PDF sul dispositivo…';render();
    try{
      if(f.size>20*1024*1024)throw new Error('Il file supera 20 MB.');
      const pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',document.baseURI).href;
      const task=pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer()),isEvalSupported:false});
      let doc;
      try{
        doc=await task.promise;if(doc.numPages>100)throw new Error('Il PDF supera 100 pagine.');
        const pages=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);pages.push((await page.getTextContent()).items);page.cleanup();}
        const result=BankStatement.parsePages(pages);if(id!==generation)return;rows=result.rows.map(r=>({...r,original:r.description,type:null,status:''}));errors=result.errors;
      }finally{if(doc)await doc.destroy();else await task.destroy();}
    }catch(err){if(id!==generation)return;errors=[err?.name==='PasswordException'?'PDF protetto da password: usa una copia senza password.':'PDF non leggibile o formato non supportato.'];}
    finally{if(id===generation){processing=false;render();}}
  }
  function edit(i){
    if(attempted||importing)return;selected=i;const r=rows[i];$bank('bankOriginal').textContent=r.original;$bank('bankDescription').value=r.description;$bank('bankEditError').textContent='';
    type.innerHTML='<option value="">— Seleziona tipologia —</option>';validTypes(r).forEach(t=>{const o=document.createElement('option');o.value=t.value;o.textContent=t.label;type.append(o);});type.value=r.type||'';
    editor.showModal();$bank('bankEditCancel').focus();
  }
  $bank('bankEditCancel').onclick=()=>editor.close();
  $bank('bankEditSave').onclick=()=>{
    const r=rows[selected],desc=$bank('bankDescription').value.trim(),choice=type.value;
    if(!desc||!validTypes(r).some(t=>String(t.value)===choice)){$bank('bankEditError').textContent='Inserisci descrizione e tipologia.';return;}
    r.description=desc;r.type=choice;editor.close();render();rowsEl.children[selected]?.querySelector('button')?.focus({preventScroll:true});
  };
  function confirmRemoval(r){
    if(attempted||importing||confirmDialog.open||!rows.includes(r))return;
    confirmAction('Vuoi rimuovere questa operazione non contabilizzata dall’elenco da caricare? Non verrà eliminata dalla banca.','Rimuovi',()=>{const index=rows.indexOf(r);if(index>=0)rows.splice(index,1);render();});
  }
  function confirmAction(text,label,fn){$bank('bankConfirmText').textContent=text;$bank('bankConfirmAccept').textContent=label;pendingAction=fn;confirmDialog.showModal();$bank('bankConfirmCancel').focus();}
  $bank('bankConfirmCancel').onclick=()=>{pendingAction=null;confirmDialog.close();};
  $bank('bankConfirmAccept').onclick=()=>{const fn=pendingAction;pendingAction=null;confirmDialog.close();if(fn)fn();};
  confirmDialog.addEventListener('cancel',()=>{pendingAction=null;});
  upload.onclick=()=>{
    render();if(upload.disabled)return;
    const unlinked=rows.filter(r=>!categoryMatch(r.category)).length,pending=rows.filter(r=>!r.booked).length;
    confirmAction('Hai verificato tutte le '+rows.length+' operazioni, le date, i segni e le tipologie? '+(unlinked?unlinked+' categorie bancarie non corrispondono a categorie del bilancio e saranno salvate senza categoria. ':'')+(pending?pending+' operazioni risultano non contabilizzate dalla banca. ':'')+'Verifica anche che non siano già presenti: il caricamento può creare duplicati.','Sì, carica',send);
  };
  async function send(){
    render();if(upload.disabled)return;const acct=chosenAccount();attempted=true;importing=true;render();
    for(let i=0;i<rows.length;i++){
      const r=rows[i],typ=validTypes(r).find(t=>String(t.value)===String(r.type)),category=categoryMatch(r.category),inc=r.amount>0;
      if(!state.user||!typ||!acct){r.status='Interrotta: contesto non più disponibile.';break;}
      const unit=state.unita,voce={idconto:Number(acct.value),data_operazione:r.date+'T00:00:00.000Z',descrizione:r.description,e_importo:inc?r.amount:null,u_importo:inc?null:Math.abs(r.amount),e_idtipo:inc?Number(typ.value):null,u_idtipo:inc?null:Number(typ.value),e_descrizionetipo:inc?typ.label:null,u_descrizionetipo:inc?null:typ.label,conto:acct.label,idcategoria:category?Number(category.value):null,note:'HelperBA',unita_codice:unit?unit.cun+unit.prog:null,unita_nome:unit?.nome||null};
      r.status='Caricamento…';r.statusNode.textContent=r.status;
      try{
        const result=await api('/api/vocecassa/save',{body:{req:buildReq(voce.idconto),vocecassa:voce}});
        if(typeof result==='string'||result==null||result===false||result?.success===false||result?.ok===false){r.status='Risposta non confermata: verifica sul Tool Bilancio prima di riprovare.';break;}
        r.status='Caricata';r.statusNode.textContent=r.status;
      }catch(err){r.status='Esito non confermato: verifica sul Tool Bilancio prima di riprovare.';break;}
    }
    importing=false;render();
    const done=rows.filter(r=>r.status==='Caricata').length;
    summary.textContent=done+' di '+rows.length+' operazioni confermate. '+(done<rows.length?'Caricamento interrotto: verifica la riga non confermata e le operazioni rimanenti nel Tool Bilancio prima di ripetere.':'Caricamento completato.');
  }
  reset.onclick=()=>confirmAction('Aprire un nuovo estratto cancella l’elenco corrente dalla memoria. Se il caricamento era parziale, verifica prima le operazioni già presenti per evitare duplicati.','Nuovo estratto',()=>{++generation;rows=[];errors=[];attempted=false;file.value='';render();});
  file.addEventListener('change',()=>readPdf(file.files?.[0]));account.addEventListener('change',render);
  $bank('btnBankImport').onclick=()=>{
    if(!state.user||$bank('btnBankImport').disabled)return;
    const old=account.value;fillSelect(account,state.conti,'— Seleziona conto —');if(old)account.value=old;
    marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaBank:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');screen.focus({preventScroll:true});render();
  };
  window.addEventListener('popstate',()=>{
    if(!screen.classList.contains('hidden')&&history.state?.abaBank!==marker){
      if(importing){history.pushState({...history.state,abaBank:marker},'');return;}
      if(editor.open)editor.close();if(confirmDialog.open)confirmDialog.close();screen.classList.add('hidden');document.querySelector('.wrap').inert=false;$bank('btnBankImport').focus({preventScroll:true});
    }
  });
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.key==='ArrowLeft'&&e.altKey)){e.preventDefault();if(!importing)history.back();return;}if(e.key==='Tab'){const items=[...screen.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(el=>el.tabIndex>=0 && el.getClientRects().length);if(items.length&&e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus();}else if(items.length&&!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus();}}});
  screen.addEventListener('touchstart',e=>{const t=e.touches[0];screen._swipe=e.touches.length===1&&t.clientX<=24?{x:t.clientX,y:t.clientY}:null;},{passive:true});
  screen.addEventListener('touchend',e=>{const p=screen._swipe;screen._swipe=null;if(!p||importing)return;const t=e.changedTouches[0],dx=t.clientX-p.x,dy=t.clientY-p.y;if(dx>70&&dx>Math.abs(dy)*1.5)history.back();},{passive:true});
  window.bankSessionLost=()=>{screen.classList.add('hidden');document.querySelector('.wrap').inert=false;if(editor.open)editor.close();if(confirmDialog.open)confirmDialog.close();};
  window.addEventListener('beforeunload',e=>{if(importing){e.preventDefault();e.returnValue='';}});
  document.addEventListener('click',e=>{if(e.target?.id==='btnLogout'||e.target?.id==='btnForget'){++generation;rows=[];errors=[];attempted=false;processing=false;file.value='';screen.classList.add('hidden');document.querySelector('.wrap').inert=false;}});
})();
