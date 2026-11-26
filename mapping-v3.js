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

  const screen=el('mappingScreen'),board=el('mapBoard'),svg=el('mapLines'),viewport=el('mapViewport'),extent=el('mapExtent');
  let data=null,selected=null,marker=null,zoom=1,pinching=null;
  function message(s){el('mapMessage').textContent=s;}
  function allTypes(){return ['i','o'].flatMap(dir=>types(dir).map(t=>({kind:'type',dir,value:id(t.value),label:(dir==='i'?'Entrata · ':'Uscita · ')+t.label})));}
  function allCats(){return state.categorie.map(c=>({kind:'category',dir:'',value:id(c.value),label:c.label}));}
  const nodeKey=n=>n.kind+':'+(n.dir||'')+':'+id(n.value);
  function resolve(n){return (n.kind==='type'?allTypes():allCats()).find(x=>nodeKey(x)===nodeKey(n));}
  function point(clientX,clientY){const r=board.getBoundingClientRect();return {x:(clientX-r.left)/zoom,y:(clientY-r.top)/zoom};}
  function sizing(){const h=Number(board.dataset.height)||400;board.style.height=h+'px';board.style.transform='scale('+zoom+')';extent.style.width=(640*zoom)+'px';extent.style.height=(h*zoom)+'px';el('mapZoomReset').textContent=Math.round(zoom*100)+'%';}
  function setZoom(value,clientX,clientY){
    const next=Math.max(.35,Math.min(2,Math.round(value*100)/100));if(next===zoom)return;
    const rect=viewport.getBoundingClientRect(),x=clientX==null?rect.width/2:clientX-rect.left,y=clientY==null?rect.height/2:clientY-rect.top;
    const bx=(viewport.scrollLeft+x)/zoom,by=(viewport.scrollTop+y)/zoom;zoom=next;sizing();viewport.scrollLeft=bx*zoom-x;viewport.scrollTop=by*zoom-y;
  }
  el('mapZoomIn').onclick=()=>setZoom(zoom*1.25);
  el('mapZoomOut').onclick=()=>setZoom(zoom/1.25);
  el('mapZoomReset').onclick=()=>setZoom(1);
  viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX,e.clientY);}},{passive:false});
  viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){const [a,b]=e.touches;pinching={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom};e.preventDefault();}},{passive:false});
  viewport.addEventListener('touchmove',e=>{if(pinching && e.touches.length===2){const [a,b]=e.touches,dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinching.distance>0)setZoom(pinching.zoom*dist/pinching.distance,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);e.preventDefault();}},{passive:false});
  viewport.addEventListener('touchend',e=>{if(e.touches.length<2)pinching=null;});viewport.addEventListener('touchcancel',()=>{pinching=null;});
  function add(n,x,y){if(data.nodes.some(a=>nodeKey(a)===nodeKey(n)))return;const count=data.nodes.filter(a=>a.kind===n.kind).length;const p={...n,x:Math.max(0,Math.min(450,x??(n.kind==='type'?20:430))),y:Math.max(0,Math.min(1800,y??(25+count*85)))};const next={...data,nodes:[...data.nodes,p]};if(write(next)){data=next;render();}}
  function remove(n){const next={...data,nodes:data.nodes.filter(x=>nodeKey(x)!==nodeKey(n)),links:data.links.filter(l=>n.kind==='type'?!(l.dir===n.dir&&id(l.type)===id(n.value)):id(l.category)!==id(n.value))};if(write(next)){data=next;selected=null;render();}}
  function connect(a,b){if(!a||!b||a.kind===b.kind){message('Scegli una tipologia e una categoria.');return;}const t=a.kind==='type'?a:b,c=a.kind==='category'?a:b;if(data.links.some(l=>l.dir===t.dir&&id(l.type)===id(t.value)&&id(l.category)===id(c.value))){message('Il collegamento esiste già.');return;}const next={...data,links:[...data.links,{dir:t.dir,type:id(t.value),category:id(c.value)}]};if(write(next)){data=next;selected=null;message('Collegamento salvato.');render();}}
  function removeLink(l){const next={...data,links:data.links.filter(x=>!(x.dir===l.dir&&id(x.type)===id(l.type)&&id(x.category)===id(l.category)))};if(write(next)){data=next;render();}}
  function palette(container,items,query){
    container.replaceChildren();items.filter(n=>n.label.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())).forEach(n=>{
      const b=document.createElement('button');b.type='button';b.className='map-palette-item';b.textContent=n.label;b.title='Tocca o trascina nel grafo';b.onclick=()=>add(n);
      let start=null;
      b.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,id:e.pointerId,scroll:container.scrollTop,moved:false};b.setPointerCapture(e.pointerId);});
      b.addEventListener('pointermove',e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>10)start.moved=true;const bounds=container.getBoundingClientRect();if(e.pointerType==='touch'&&e.clientX>=bounds.left&&e.clientX<=bounds.right&&Math.abs(dy)>Math.abs(dx))container.scrollTop=start.scroll-dy;});
      b.addEventListener('pointercancel',()=>{start=null;});
      b.addEventListener('pointerup',e=>{if(!start)return;const moved=start.moved||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10;start=null;if(moved){b._drag=true;setTimeout(()=>b._drag=false,0);const rect=viewport.getBoundingClientRect();if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){const p=point(e.clientX,e.clientY);add(n,p.x-95,p.y-20);}}});
      b.addEventListener('click',e=>{if(b._drag){e.stopImmediatePropagation();e.preventDefault();}},true);container.append(b);
    });
  }
  function render(){
    palette(el('mapTypes'),allTypes(),el('mapSearchTypes').value);palette(el('mapCategories'),allCats(),el('mapSearchCategories').value);board.querySelectorAll('.map-node').forEach(n=>n.remove());svg.replaceChildren();el('mapConnections').replaceChildren();
    const valid=data.nodes.filter(resolve),height=Math.max(400,...valid.map(n=>(Number(n.y)||0)+100));board.dataset.height=height;sizing();svg.setAttribute('viewBox','0 0 640 '+height);
    function drawLines(preview){svg.replaceChildren();data.links.forEach(l=>{const a=valid.find(n=>n.kind==='type'&&n.dir===l.dir&&id(n.value)===id(l.type)),b=valid.find(n=>n.kind==='category'&&id(n.value)===id(l.category));if(!a||!b)return;line(Number(a.x)+190,Number(a.y)+36,Number(b.x),Number(b.y)+36,false);});if(preview){const n=preview.node;line(Number(n.x)+(n.kind==='type'?190:0),Number(n.y)+36,preview.x,preview.y,true);}}
    function line(x1,y1,x2,y2,preview){const l=document.createElementNS('http://www.w3.org/2000/svg','path'),curve=Math.max(40,Math.abs(x2-x1)*.45);l.setAttribute('d',`M ${x1} ${y1} C ${x1+(x2>=x1?curve:-curve)} ${y1}, ${x2-(x2>=x1?curve:-curve)} ${y2}, ${x2} ${y2}`);l.setAttribute('class','map-link'+(preview?' map-link-preview':''));svg.append(l);}
    valid.forEach(n=>{const item=resolve(n),box=document.createElement('div');box.className='map-node '+(n.kind==='type'?'map-node-type':'map-node-category');box.style.left=n.x+'px';box.style.top=n.y+'px';box.dataset.key=nodeKey(n);
      const label=document.createElement('div');label.className='map-node-label';label.textContent=item.label;label.title='Trascina per spostare';box.append(label);
      const port=document.createElement('button');port.type='button';port.className='map-port';port.setAttribute('aria-pressed',String(!!selected&&nodeKey(selected)===nodeKey(n)));port.setAttribute('aria-label','Collega '+item.label);port.title='Trascina sul punto dell’altra scheda oppure tocca due punti';port.onclick=()=>{if(selected&&nodeKey(selected)!==nodeKey(n))connect(selected,n);else{selected=selected?null:n;message(selected?'Seleziona il punto dell’altro nodo.':'');render();}};
      let ps=null;port.addEventListener('pointerdown',e=>{e.stopPropagation();if(pinching)return;ps={x:e.clientX,y:e.clientY};port.setPointerCapture(e.pointerId);});port.addEventListener('pointermove',e=>{if(!ps||pinching)return;if(Math.hypot(e.clientX-ps.x,e.clientY-ps.y)>8){const p=point(e.clientX,e.clientY);drawLines({node:n,x:p.x,y:p.y});}});port.addEventListener('pointercancel',()=>{ps=null;drawLines();});port.addEventListener('pointerup',e=>{if(!ps)return;const moved=Math.hypot(e.clientX-ps.x,e.clientY-ps.y)>8;ps=null;drawLines();if(moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.map-port');const dest=valid.find(x=>nodeKey(x)===target?.closest('.map-node')?.dataset.key);if(dest)connect(n,dest);else message('Trascina il collegamento sul punto di un’altra scheda.');port._drag=true;setTimeout(()=>port._drag=false,0);}});port.addEventListener('click',e=>{if(port._drag){e.stopImmediatePropagation();e.preventDefault();}},true);
      const del=document.createElement('button');del.type='button';del.className='map-node-remove';del.textContent='Rimuovi';del.setAttribute('aria-label','Rimuovi nodo '+item.label);del.onclick=()=>{if(confirm('Rimuovere il nodo e tutti i suoi collegamenti?'))remove(n);};box.append(port,del);board.append(box);
      let drag=null;label.addEventListener('pointerdown',e=>{if(pinching)return;const p=point(e.clientX,e.clientY);drag={dx:p.x-n.x,dy:p.y-n.y};label.setPointerCapture(e.pointerId);});label.addEventListener('pointermove',e=>{if(!drag||pinching)return;const p=point(e.clientX,e.clientY);n.x=Math.max(0,Math.min(450,p.x-drag.dx));n.y=Math.max(0,Math.min(1800,p.y-drag.dy));box.style.left=n.x+'px';box.style.top=n.y+'px';drawLines();});label.addEventListener('pointercancel',()=>{drag=null;data=read();render();});label.addEventListener('pointerup',()=>{if(!drag)return;drag=null;if(!write(data))data=read();render();});
    });
    drawLines();
    data.links.forEach(l=>{const a=valid.find(n=>n.kind==='type'&&n.dir===l.dir&&id(n.value)===id(l.type)),b=valid.find(n=>n.kind==='category'&&id(n.value)===id(l.category));if(!a||!b)return;const row=document.createElement('div');row.className='map-connection';const text=document.createElement('span');text.textContent=resolve(a).label+' ↔ '+resolve(b).label;const del=document.createElement('button');del.type='button';del.textContent='Elimina';del.setAttribute('aria-label','Elimina collegamento '+text.textContent);del.onclick=()=>removeLink(l);row.append(text,del);el('mapConnections').append(row);});
  }
  el('mapSearchTypes').addEventListener('input',()=>{if(data)palette(el('mapTypes'),allTypes(),el('mapSearchTypes').value);});el('mapSearchCategories').addEventListener('input',()=>{if(data)palette(el('mapCategories'),allCats(),el('mapSearchCategories').value);});
  el('btnMapping').onclick=()=>{if(!key() || state.mappingReady===false){message('Seleziona un account e un anno e ricarica le voci.');return;}data=read();selected=null;zoom=1;el('mapSearchTypes').value='';el('mapSearchCategories').value='';message('');marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaMapping:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');render();screen.focus();};
  el('mapExport').onclick=()=>{
    if(!data)return;
    const nodes=data.nodes.map(n=>{
      const source=n.kind==='type'?types(n.dir).find(t=>id(t.value)===id(n.value)):state.categorie.find(c=>id(c.value)===id(n.value));
      return {kind:n.kind,dir:n.kind==='type'?n.dir:null,value:id(n.value),label:source?.label||n.label||'',available:!!source,x:Number(n.x)||0,y:Number(n.y)||0};
    });
    const links=data.links.map(l=>({dir:l.dir,type:id(l.type),category:id(l.category)}));
    const payload={format:'helper-bilancio-mappatura',version:1,exportedAt:new Date().toISOString(),nodes,links};
    try{
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='mappatura-tipologie.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      message(nodes.some(n=>!n.available)?'Esportazione avviata. Alcuni nodi non sono più disponibili nel contesto: verifica il file prima di condividerlo.':'Esportazione avviata. Il file contiene i nomi e gli identificativi delle voci, non le credenziali.');
    }catch(e){message('Impossibile esportare la mappatura su questo dispositivo.');}
  };
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
