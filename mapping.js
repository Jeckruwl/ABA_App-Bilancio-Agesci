/* Relazioni tipologia Scout/categoria, locali al contesto corrente. */
(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  const key=()=>{const u=state.user?.userInfo?.codiceSocio,y=state.year?.value,i=state.incarico,n=state.unita;if(u==null||y==null)return null;return 'ab_mapping_v1:'+JSON.stringify([u,y,i?.tipoIncarico??null,i?.accessoTipo??null,i?.dati?.creg??null,i?.dati?.czona??null,i?.dati?.ord??null,i?.codiceUnita??null,n?.cun??null,n?.prog??null]);};
  const scout=t=>t && t.selezionabile!==false && (t.voceMinisteroId!=null||!!t.gruppoZona);
  const types=dir=>(dir==='i'?state.tipiE:state.tipiU).filter(scout);
  const id=x=>String(x);
  function read(){try{const k=key(),d=k&&JSON.parse(localStorage.getItem(k)||'null');return d&&d.version===1&&Array.isArray(d.nodes)&&Array.isArray(d.links)?d:{version:1,nodes:[],links:[]};}catch(e){return {version:1,nodes:[],links:[]};}}
  function write(d){try{const k=key();if(!k)throw Error();localStorage.setItem(k,JSON.stringify(d));return true;}catch(e){message('Impossibile salvare la mappatura sul dispositivo. Nessuna modifica applicata.');return false;}}
  function activeLinks(dir){if(state.mappingReady===false)return [];const d=read(), ts=types(dir), cs=state.categorie;return d.links.filter(l=>l.dir===dir&&ts.some(t=>id(t.value)===id(l.type))&&cs.some(c=>id(c.value)===id(l.category)));}
  function associated(dir,side,value){if(!value)return [];return [...new Set(activeLinks(dir).filter(l=>id(l[side])===id(value)).map(l=>id(l[side==='type'?'category':'type'])) )];}
  // null indica nessun filtro. Il filtro tiene conto delle sole voci effettivamente selezionabili.
  function apply(dir,source,type,category,availableTypes,availableCategories){
    type=id(type||'');category=id(category||'');
    const typeIds=new Set(availableTypes.map(x=>id(x.value))),catIds=new Set(availableCategories.map(x=>id(x.value)));
    let allowed=null;
    if(source==='type' && type){allowed=associated(dir,'type',type).filter(x=>catIds.has(x));if(!allowed.length)allowed=null;if(allowed){if(allowed.length===1)category=allowed[0];else if(!allowed.includes(category))category='';}}
    if(source==='category' && category){allowed=associated(dir,'category',category).filter(x=>typeIds.has(x));if(!allowed.length)allowed=null;if(allowed){if(allowed.length===1)type=allowed[0];else if(!allowed.includes(type))type='';}}
    return {type,category,allowed};
  }
  function compatible(dir,t,c,source){if(!t||!c)return true;const links=activeLinks(dir), relevant=links.filter(l=>source==='category'?id(l.category)===id(c):id(l.type)===id(t));return !relevant.length||relevant.some(l=>id(l.type)===id(t)&&id(l.category)===id(c));}
  window.TypeMapping={apply,activeLinks,compatible};

  const screen=el('mappingScreen'),board=el('mapBoard'),svg=el('mapLines');let data=null,selected=null,marker=null;
  function message(s){el('mapMessage').textContent=s;}
  function allTypes(){return ['i','o'].flatMap(dir=>types(dir).map(t=>({kind:'type',dir,value:id(t.value),label:(dir==='i'?'Entrata · ':'Uscita · ')+t.label})));}
  function allCats(){return state.categorie.map(c=>({kind:'category',dir:'',value:id(c.value),label:c.label}));}
  const nodeKey=n=>n.kind+':'+(n.dir||'')+':'+id(n.value);
  function resolve(n){return (n.kind==='type'?allTypes():allCats()).find(x=>nodeKey(x)===nodeKey(n));}
  function add(n,x,y){if(data.nodes.some(a=>nodeKey(a)===nodeKey(n)))return;const count=data.nodes.filter(a=>a.kind===n.kind).length;const p={...n,x:Math.max(0,Math.min(450,x??(n.kind==='type'?20:430))),y:Math.max(0,Math.min(1800,y??(25+count*85)))};const next={...data,nodes:[...data.nodes,p]};if(write(next)){data=next;render();}}
  function remove(n){const next={...data,nodes:data.nodes.filter(x=>nodeKey(x)!==nodeKey(n)),links:data.links.filter(l=>n.kind==='type'?!(l.dir===n.dir&&id(l.type)===id(n.value)):id(l.category)!==id(n.value))};if(write(next)){data=next;selected=null;render();}}
  function connect(a,b){if(!a||!b||a.kind===b.kind){message('Scegli una tipologia e una categoria.');return;}const t=a.kind==='type'?a:b,c=a.kind==='category'?a:b;if(data.links.some(l=>l.dir===t.dir&&id(l.type)===id(t.value)&&id(l.category)===id(c.value))){message('Il collegamento esiste già.');return;}const next={...data,links:[...data.links,{dir:t.dir,type:id(t.value),category:id(c.value)}]};if(write(next)){data=next;selected=null;message('Collegamento salvato.');render();}}
  function removeLink(l){const next={...data,links:data.links.filter(x=>!(x.dir===l.dir&&id(x.type)===id(l.type)&&id(x.category)===id(l.category)))};if(write(next)){data=next;render();}}
  function palette(container,items){container.replaceChildren();items.forEach(n=>{const b=document.createElement('button');b.type='button';b.className='map-palette-item';b.textContent=n.label;b.title='Tocca o trascina nel grafo';b.onclick=()=>add(n);let start=null;b.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,id:e.pointerId};b.setPointerCapture(e.pointerId);});b.addEventListener('pointerup',e=>{if(!start)return;const rect=board.getBoundingClientRect(),moved=Math.hypot(e.clientX-start.x,e.clientY-start.y)>15;start=null;if(moved&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){add(n,e.clientX-rect.left-90,e.clientY-rect.top-20);b._drag=true;setTimeout(()=>b._drag=false,0);}});b.addEventListener('click',e=>{if(b._drag){e.stopImmediatePropagation();e.preventDefault();}},true);container.append(b);});}
  function render(){
    palette(el('mapTypes'),allTypes());palette(el('mapCategories'),allCats());board.querySelectorAll('.map-node').forEach(n=>n.remove());svg.replaceChildren();el('mapConnections').replaceChildren();
    const valid=data.nodes.filter(resolve), height=Math.max(400,...valid.map(n=>(Number(n.y)||0)+90));board.style.height=height+'px';svg.setAttribute('viewBox','0 0 640 '+height);
    valid.forEach(n=>{const item=resolve(n),box=document.createElement('div');box.className='map-node '+(n.kind==='type'?'map-node-type':'map-node-category');box.style.left=n.x+'px';box.style.top=n.y+'px';box.dataset.key=nodeKey(n);
      const label=document.createElement('div');label.className='map-node-label';label.textContent=item.label;label.title='Trascina per spostare';box.append(label);
      const port=document.createElement('button');port.type='button';port.className='map-port';port.textContent=selected&&nodeKey(selected)===nodeKey(n)?'Selezionato':'Collega';port.setAttribute('aria-label','Collega '+item.label);port.onclick=()=>{if(selected&&nodeKey(selected)!==nodeKey(n))connect(selected,n);else{selected=selected?null:n;message(selected?'Seleziona il nodo da collegare.':'');render();}};
      let ps=null;port.addEventListener('pointerdown',e=>{e.stopPropagation();ps={x:e.clientX,y:e.clientY};port.setPointerCapture(e.pointerId);});port.addEventListener('pointerup',e=>{if(!ps)return;const moved=Math.hypot(e.clientX-ps.x,e.clientY-ps.y)>15;ps=null;if(moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.map-node');const dest=valid.find(x=>nodeKey(x)===target?.dataset.key);if(dest)connect(n,dest);port._drag=true;setTimeout(()=>port._drag=false,0);}});port.addEventListener('click',e=>{if(port._drag){e.stopImmediatePropagation();e.preventDefault();}},true);
      const del=document.createElement('button');del.type='button';del.className='map-node-remove';del.textContent='Rimuovi';del.setAttribute('aria-label','Rimuovi nodo '+item.label);del.onclick=()=>{if(confirm('Rimuovere il nodo e tutti i suoi collegamenti?'))remove(n);};box.append(port,del);board.append(box);
      let drag=null;label.addEventListener('pointerdown',e=>{drag={dx:e.clientX-n.x,dy:e.clientY-n.y};label.setPointerCapture(e.pointerId);});label.addEventListener('pointermove',e=>{if(!drag)return;n.x=Math.max(0,Math.min(450,e.clientX-drag.dx));n.y=Math.max(0,Math.min(1800,e.clientY-drag.dy));box.style.left=n.x+'px';box.style.top=n.y+'px';drawLines();});label.addEventListener('pointerup',()=>{if(!drag)return;drag=null;if(!write(data)){data=read();}render();});
    });
    function drawLines(){svg.replaceChildren();data.links.forEach(l=>{const a=valid.find(n=>n.kind==='type'&&n.dir===l.dir&&id(n.value)===id(l.type)),b=valid.find(n=>n.kind==='category'&&id(n.value)===id(l.category));if(!a||!b)return;const line=document.createElementNS('http://www.w3.org/2000/svg','path');const x1=Number(a.x)+190,y1=Number(a.y)+35,x2=Number(b.x),y2=Number(b.y)+35;line.setAttribute('d',`M ${x1} ${y1} C ${x1+80} ${y1}, ${x2-80} ${y2}, ${x2} ${y2}`);line.setAttribute('class','map-link');svg.append(line);});}
    drawLines();
    data.links.forEach(l=>{const a=valid.find(n=>n.kind==='type'&&n.dir===l.dir&&id(n.value)===id(l.type)),b=valid.find(n=>n.kind==='category'&&id(n.value)===id(l.category));if(!a||!b)return;const row=document.createElement('div');row.className='map-connection';const text=document.createElement('span');text.textContent=resolve(a).label+' ↔ '+resolve(b).label;const del=document.createElement('button');del.type='button';del.textContent='Elimina';del.setAttribute('aria-label','Elimina collegamento '+text.textContent);del.onclick=()=>removeLink(l);row.append(text,del);el('mapConnections').append(row);});
  }
  el('btnMapping').onclick=()=>{if(!key() || state.mappingReady===false){message('Seleziona un account e un anno e ricarica le voci.');return;}data=read();selected=null;message('');render();marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaMapping:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');screen.focus();};
  el('mapClose').onclick=()=>{if(history.state?.abaMapping===marker)history.back();else close();};
  function close(){screen.classList.add('hidden');document.querySelector('.wrap').inert=false;window.refreshManualMapping?.();el('btnMapping').focus();}
  window.addEventListener('popstate',()=>{if(!screen.classList.contains('hidden')&&history.state?.abaMapping!==marker)close();});
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();el('mapClose').click();}});
})();
/* Sincronizzazione dei selettori dell'operazione manuale. */
(function(){
  const type=document.getElementById('fTipo'),category=document.getElementById('fCat');
  function typeChoices(){const arr=(state.tipo==='i'?state.tipiE:state.tipiU).filter(x=>x.selezionabile!==false);let list=arr.filter(x=>state.voceMode==='scout'?isScout(x):!isScout(x));if(state.voceMode==='scout'){const level=state.incarico?.tipoIncarico===1?'z':'g',match=list.filter(x=>x.gruppoZona===level);if(match.length)list=match;}return list;}
  function fill(sel,items,placeholder,value){fillSelect(sel,items,placeholder);sel.value=value||'';}
  function sync(source){
    const ts=typeChoices(),cs=state.categorie;
    const result=state.voceMode==='scout'?window.TypeMapping.apply(state.tipo,source,type.value,category.value,ts,cs):{type:type.value,category:category.value,allowed:null};
    if(source==='type')fill(category,result.allowed?cs.filter(c=>result.allowed.includes(String(c.value))):cs,'— Nessuna —',result.category);
    else fill(type,result.allowed?ts.filter(t=>result.allowed.includes(String(t.value))):ts,'— Seleziona tipologia —',result.type);
    updatePayloadPreview();
  }
  window.resetManualMapping=()=>{const old=category.value;fill(category,state.categorie,'— Nessuna —',old);};
  window.refreshManualMapping=()=>{const t=type.value,c=category.value;fill(type,typeChoices(),'— Seleziona tipologia —',t);fill(category,state.categorie,'— Nessuna —',c);if(t)sync('type');else if(c)sync('category');};
  type.addEventListener('change',()=>sync('type'));category.addEventListener('change',()=>sync('category'));
})();
