/* Importazione estratto conto. I file e le righe rimangono solo in memoria. */
(function(){
  'use strict';
  const $bank=id=>document.getElementById(id);
  const screen=$bank('bankScreen'), file=$bank('bankFile'), account=$bank('bankAccount'), rowsEl=$bank('bankRows'), summary=$bank('bankSummary'), upload=$bank('bankUpload'), reset=$bank('bankReset');
  const confirmDialog=$bank('bankConfirmDialog');
  // Una pagina PWA precedente può ancora essere in cache durante un aggiornamento.
  // In quel caso creiamo i contatori mancanti prima di registrare i pulsanti.
  (function ensureCounters(){
    let added=false, stats=$bank('bankStats'), box=$bank('bankReadyBox');
    if(!stats){
      stats=document.createElement('div');stats.id='bankStats';stats.className='bank-stats hidden';stats.setAttribute('aria-label','Riepilogo operazioni');
      const detected=document.createElement('p');detected.id='bankDetected';
      const pending=document.createElement('button');pending.type='button';pending.id='bankPending';pending.className='bank-pending-link';
      stats.append(detected,pending);rowsEl.before(stats);added=true;
    }
    if(!box){
      box=document.createElement('aside');box.id='bankReadyBox';box.className='bank-ready-box hidden';box.setAttribute('aria-live','polite');
      const ready=document.createElement('span');ready.id='bankReady';box.append(ready);screen.append(box);added=true;
    }
    if(added){
      const style=document.createElement('style');style.textContent='.bank-stats p{margin:4px 0}.bank-pending-link{display:block;padding:0;border:0;background:transparent;color:#fff;text-decoration:underline;text-align:left;font:inherit;font-size:14px;cursor:pointer}.bank-pending-link:disabled{cursor:default;opacity:.75;text-decoration:none}.bank-screen.has-counters{padding-bottom:calc(86px + env(safe-area-inset-bottom))}.bank-ready-box{position:fixed;z-index:1;right:16px;bottom:calc(12px + env(safe-area-inset-bottom));max-width:calc(100% - 32px);padding:10px 14px;background:var(--card);color:var(--txt);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 18px #0006;font-size:14px;font-weight:700}';document.head.append(style);
    }
  })();
  let rows=[], errors=[], processing=false, attempted=false, importing=false, marker=null, generation=0, pendingAction=null, hasResult=false, outcome='';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function categoryMatch(name){const matches=state.categorie.filter(c=>Number.isInteger(Number(c.value)) && Number(c.value)>0 && norm(c.label)===norm(name));return matches.length===1?matches[0]:null;}
  function chosenAccount(){return state.conti.find(c=>Number.isInteger(Number(c.value)) && Number(c.value)>0 && String(c.value)===account.value);}
  function validTypes(r){return (r.amount>0?state.tipiE:state.tipiU).filter(t=>Number.isInteger(Number(t.value)) && Number(t.value)>0 && t.selezionabile!==false && !(t.codice==='C.2' && Number(String(state.year?.label||'').split('-')[1])>=25));}
  function transferAccounts(){return state.conti.filter(c=>Number(c.value)>0 && (c.assigned===true || c.assigned===1) && (c.isdummy===false || c.isdummy===0));}
  function otherAccount(r,acct){return transferAccounts().find(c=>String(c.value)===String(r.otherAccount) && String(c.value)!==String(acct?.value));}
  function transferNote(r){return 'HelperBA — '+r.description.trim();}
  function ready(r,acct){return r.transfer ? !!otherAccount(r,acct) : !!r.type && validTypes(r).some(t=>String(t.value)===String(r.type));}
  function transferReq(){
    const e=state.user,t=state.incarico,o=state.unita;
    if(t){
      const req={rendicontoid:state.year?.value,filterbydate:true,codicesocio:e?.userInfo?.codiceSocio,creg:t?.dati?.creg,czona:t?.dati?.czona,ord:t?.dati?.ord,contoid:0,tipoIncaricoMain:e?.userInfo?.tipoIncarico,tipoIncarico:t?.tipoIncarico,accessoTipo:t?.accessoTipo,gruppozona_nome:t?.dati?.nome,codiceUnita:t?.codiceUnita||null,unita_nome:getNomeUnitaByIncarico(t)};
      if(o){req.codiceUnita=o.cun+o.prog;req.unita_nome=o.nome;}return req;
    }
    return {rendicontoid:state.year?.value,filterbydate:true,codicesocio:e?.userInfo?.codiceSocio,creg:null,czona:0,ord:0,contoid:0};
  }
  function problems(r,acct){
    const issues=[];
    if(!r.description.trim())issues.push('Descrizione mancante');
    if(r.transfer){
      const other=otherAccount(r,acct);
      if(!other)issues.push('Seleziona un altro conto abilitato');
      if(acct && !transferAccounts().some(c=>String(c.value)===String(acct.value)))issues.push('Il conto dell’estratto non è abilitato ai giroconti');
      if(transferNote(r).length>255)issues.push('Descrizione troppo lunga per le note del giroconto (massimo 255 caratteri, incluso HelperBA)');
      const date=r.date+'T00:00:00.000Z';
      if(other?.data_inizio_attivita && date<other.data_inizio_attivita.slice(0,10)+'T00:00:00.000Z' || other?.data_fine_attivita && date>other.data_fine_attivita.slice(0,10)+'T00:00:00.000Z')issues.push('Data fuori dal periodo di attività dell’altro conto');
    }else if(!ready(r,acct))issues.push('Tipologia da assegnare');
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
      const row=document.createElement('article');row.className='bank-row'+(r.booked?'':' bank-unbooked');row.tabIndex=-1;row.setAttribute('aria-label','Operazione '+(i+1));
      row.append(paragraph('Data contabile: '+r.date.split('-').reverse().join('/'),'bank-date'));
      row.append(paragraph('Operazione / descrizione:'));
      const button=document.createElement('button');button.type='button';button.className='bank-description';button.textContent=r.description;button.disabled=attempted||importing;button.setAttribute('aria-label','Modifica descrizione operazione '+(i+1));
      button.onclick=()=>{
        if(attempted||importing)return;
        const input=document.createElement('textarea');input.className='bank-description';input.rows=1;input.value=r.description;input.setAttribute('aria-label','Descrizione operazione '+(i+1));
        const resize=()=>{input.style.height='auto';input.style.height=input.scrollHeight+'px';};
        input.addEventListener('input',()=>{r.description=input.value;input.setAttribute('aria-invalid',String(!r.description.trim()));resize();updateSummary();});
        button.replaceWith(input);resize();input.focus();
      };row.append(button);
      row.append(paragraph((r.amount>0?'Entrata: ':'Uscita: ')+fmtEUR(r.amount),'bank-amount '+(r.amount>0?'bank-income':'bank-expense')));
      const transferLabel=document.createElement('label');transferLabel.className='bank-transfer-check';
      const check=document.createElement('input');check.type='checkbox';check.checked=!!r.transfer;check.disabled=attempted||importing;check.setAttribute('aria-label','Giroconto operazione '+(i+1));
      check.addEventListener('change',()=>{r.transfer=check.checked;render();});transferLabel.append(check,document.createTextNode(' Giroconto'));row.append(transferLabel);
      const label=document.createElement('label');label.htmlFor=(r.transfer?'bankRowAccount-':'bankRowType-')+i;label.textContent=r.transfer?(r.amount>0?'Dal conto *':'Verso il conto *'):'Tipologia *';row.append(label);
      const dropdown=document.createElement('select');dropdown.id=label.htmlFor;dropdown.disabled=attempted||importing;
      const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=r.transfer?'— Seleziona conto —':'— Seleziona tipologia —';dropdown.append(placeholder);
      (r.transfer?transferAccounts().filter(c=>String(c.value)!==String(acct?.value)):validTypes(r)).forEach(t=>{const option=document.createElement('option');option.value=t.value;option.textContent=t.label;dropdown.append(option);});
      dropdown.value=(r.transfer?r.otherAccount:r.type)||'';dropdown.addEventListener('change',()=>{if(r.transfer){r.otherAccount=dropdown.value||null;render();}else{r.type=dropdown.value||null;updateSummary();}});row.append(dropdown);
      if(!r.booked){
        row.append(paragraph('Operazione non contabilizzata: tieni premuto per rimuoverla dalla lista.','bank-warning'));
        const remove=document.createElement('button');remove.type='button';remove.className='bank-remove';remove.textContent='Rimuovi dalla lista';remove.disabled=attempted||importing;
        remove.setAttribute('aria-label','Rimuovi dalla lista operazione non contabilizzata '+(i+1));
        remove.onclick=()=>confirmRemoval(r);row.append(remove);
        let timer=null,start=null,suppressClickUntil=0;
        const cancelPress=()=>{if(timer!==null)clearTimeout(timer);timer=null;start=null;};
        row.addEventListener('pointerdown',e=>{
          if(attempted||importing||!e.isPrimary||e.button!==0||e.target.closest('textarea,.select-wrapper,input,label'))return;
          start={x:e.clientX,y:e.clientY,id:e.pointerId};
          timer=setTimeout(()=>{timer=null;start=null;suppressClickUntil=Date.now()+1000;confirmRemoval(r);},650);
        });
        row.addEventListener('pointermove',e=>{if(start&&e.pointerId===start.id&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)cancelPress();});
        row.addEventListener('pointerup',cancelPress);row.addEventListener('pointercancel',cancelPress);row.addEventListener('pointerleave',cancelPress);
        row.addEventListener('contextmenu',e=>{if(!attempted&&!importing)e.preventDefault();});
        row.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();suppressClickUntil=0;}},true);
      }
      r.issuesNode=paragraph('', 'bank-warning');row.append(r.issuesNode);
      r.statusNode=paragraph(r.status||'', 'bank-status');row.append(r.statusNode);
      rowsEl.append(row);
      window.registerSelectMenu?.(dropdown);
    });
    updateSummary();
  }
  function updateSummary(){
    const acct=chosenAccount();
    rows.forEach(r=>{if(r.issuesNode)r.issuesNode.textContent=problems(r,acct).filter(x=>x!=='Tipologia da assegnare').join('. ');});
    const missing=rows.filter(r=>!ready(r,acct)).length;
    const pending=rows.filter(r=>!r.booked).length;
    const showCounters=hasResult||rows.length>0;
    $bank('bankStats').classList.toggle('hidden',!showCounters);
    $bank('bankReadyBox').classList.toggle('hidden',!showCounters);
    screen.classList.toggle('has-counters',showCounters);
    $bank('bankDetected').textContent='Operazioni rilevate: '+rows.length;
    $bank('bankPending').textContent='Operazioni non contabilizzate: '+pending;
    $bank('bankPending').disabled=pending===0;
    $bank('bankReady').textContent='Operazioni pronte: '+(rows.length-missing)+'/'+rows.length;
    if(errors.length) summary.textContent='Lettura non completata: '+errors.join(' ')+' Nessuna operazione può essere caricata.';
    else if(processing) summary.textContent='Analisi del PDF sul dispositivo…';
    else summary.textContent=outcome;
    const invalid=!acct||!state.user||!state.year||$bank('btnBankImport').disabled||!rows.length||errors.length||rows.some(r=>problems(r,acct).length);
    upload.disabled=!!(invalid||processing||importing||attempted);
    file.disabled=processing||attempted||importing;account.disabled=attempted||importing;reset.classList.toggle('hidden',!attempted);reset.disabled=importing;
  }
  async function readPdf(f){
    if(!f || attempted||importing)return; const id=++generation;rows=[];errors=[];hasResult=false;outcome='';processing=true;summary.textContent='Analisi del PDF sul dispositivo…';render();
    try{
      if(f.size>20*1024*1024)throw new Error('Il file supera 20 MB.');
      const pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',document.baseURI).href;
      const task=pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer()),isEvalSupported:false});
      let doc;
      try{
        doc=await task.promise;if(doc.numPages>100)throw new Error('Il PDF supera 100 pagine.');
        const pages=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);pages.push((await page.getTextContent()).items);page.cleanup();}
        const result=BankStatement.parsePages(pages);if(id!==generation)return;rows=result.rows.map(r=>({...r,original:r.description,type:null,status:''}));errors=result.errors;hasResult=rows.length>0||!errors.length;
      }finally{if(doc)await doc.destroy();else await task.destroy();}
    }catch(err){if(id!==generation)return;errors=[err?.name==='PasswordException'?'PDF protetto da password: usa una copia senza password.':'PDF non leggibile o formato non supportato.'];}
    finally{if(id===generation){processing=false;render();}}
  }
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
    const pending=rows.filter(r=>!r.booked).length;
    confirmAction('Hai verificato tutte le '+rows.length+' operazioni, le date, i segni, le tipologie e i conti dei giroconti? '+(pending?pending+' operazioni risultano non contabilizzate dalla banca. ':'')+'Verifica anche che non siano già presenti: il caricamento può creare duplicati.','Sì, carica',send);
  };
  async function send(){
    render();if(upload.disabled)return;const acct=chosenAccount();attempted=true;importing=true;outcome='Caricamento in corso…';render();
    for(let i=0;i<rows.length;i++){
      const r=rows[i],typ=validTypes(r).find(t=>String(t.value)===String(r.type)),category=categoryMatch(r.category),inc=r.amount>0;
      if(!state.user||!acct||problems(r,acct).length){r.status='Interrotta: contesto non più disponibile.';break;}
      const unit=state.unita,voce=r.transfer?null:{idconto:Number(acct.value),data_operazione:r.date+'T00:00:00.000Z',descrizione:r.description,e_importo:inc?r.amount:null,u_importo:inc?null:Math.abs(r.amount),e_idtipo:inc?Number(typ.value):null,u_idtipo:inc?null:Number(typ.value),e_descrizionetipo:inc?typ.label:null,u_descrizionetipo:inc?null:typ.label,conto:acct.label,idcategoria:category?Number(category.value):null,note:'HelperBA',unita_codice:unit?unit.cun+unit.prog:null,unita_nome:unit?.nome||null};
      r.status='Caricamento…';r.statusNode.textContent=r.status;
      try{
        const other=otherAccount(r,acct);
        const giroconto=r.transfer?{dataEffettuazione:r.date+'T00:00:00.000Z',fromContoId:Number(inc?other.value:acct.value),toContoId:Number(inc?acct.value:other.value),importo:Math.abs(r.amount),note:transferNote(r)}:null;
        const result=r.transfer ? await api('/api/conto/saveGiroconto',{body:{req:transferReq(),giroconto}}) : await api('/api/vocecassa/save',{body:{req:buildReq(voce.idconto),vocecassa:voce}});
        if(typeof result==='string'||result==null||result===false||result?.success===false||result?.ok===false){r.status='Risposta non confermata: verifica sul Tool Bilancio prima di riprovare.';break;}
        r.status='Caricata';r.statusNode.textContent=r.status;
      }catch(err){r.status='Esito non confermato: verifica sul Tool Bilancio prima di riprovare.';break;}
    }
    importing=false;render();
    const done=rows.filter(r=>r.status==='Caricata').length;
    outcome=done+' di '+rows.length+' operazioni confermate. '+(done<rows.length?'Caricamento interrotto: verifica la riga non confermata e le operazioni rimanenti nel Tool Bilancio prima di ripetere.':'Caricamento completato.');summary.textContent=outcome;
  }
  reset.onclick=()=>confirmAction('Aprire un nuovo estratto cancella l’elenco corrente dalla memoria. Se il caricamento era parziale, verifica prima le operazioni già presenti per evitare duplicati.','Nuovo estratto',()=>{++generation;rows=[];errors=[];attempted=false;hasResult=false;outcome='';file.value='';render();});
  $bank('bankPending').addEventListener('click',()=>{const row=rowsEl.querySelector('.bank-unbooked');if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.focus({preventScroll:true});}});
  file.addEventListener('change',()=>readPdf(file.files?.[0]));account.addEventListener('change',render);
  $bank('btnBankImport').onclick=()=>{
    if(!state.user||$bank('btnBankImport').disabled)return;
    const old=account.value;fillSelect(account,state.conti,'— Seleziona conto —');if(old)account.value=old;
    marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaBank:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');screen.focus({preventScroll:true});render();
  };
  window.addEventListener('popstate',()=>{
    if(!screen.classList.contains('hidden')&&history.state?.abaBank!==marker){
      if(importing){history.pushState({...history.state,abaBank:marker},'');return;}
      if(confirmDialog.open)confirmDialog.close();screen.classList.add('hidden');document.querySelector('.wrap').inert=false;$bank('btnBankImport').focus({preventScroll:true});
    }
  });
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.key==='ArrowLeft'&&e.altKey)){e.preventDefault();if(!importing)history.back();return;}if(e.key==='Tab'){const items=[...screen.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.tabIndex>=0 && el.getClientRects().length);if(items.length&&e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus();}else if(items.length&&!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus();}}});
  screen.addEventListener('touchstart',e=>{const t=e.touches[0];screen._swipe=e.touches.length===1&&t.clientX<=24?{x:t.clientX,y:t.clientY}:null;},{passive:true});
  screen.addEventListener('touchend',e=>{const p=screen._swipe;screen._swipe=null;if(!p||importing)return;const t=e.changedTouches[0],dx=t.clientX-p.x,dy=t.clientY-p.y;if(dx>70&&dx>Math.abs(dy)*1.5)history.back();},{passive:true});
  window.bankSessionLost=()=>{screen.classList.add('hidden');document.querySelector('.wrap').inert=false;if(confirmDialog.open)confirmDialog.close();};
  window.addEventListener('beforeunload',e=>{if(importing){e.preventDefault();e.returnValue='';}});
  document.addEventListener('click',e=>{if(e.target?.id==='btnLogout'||e.target?.id==='btnForget'){++generation;rows=[];errors=[];attempted=false;processing=false;hasResult=false;outcome='';file.value='';screen.classList.add('hidden');document.querySelector('.wrap').inert=false;}});
})();
