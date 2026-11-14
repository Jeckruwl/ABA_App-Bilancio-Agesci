/* Parser per l'esportazione bancaria con colonne Data contabile, Operazione,
   Contabilizzato, Categoria, Importo. Non interpreta PDF scansionati. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BankStatement=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function parseDate(s){const m=/^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(s);if(!m)return null;const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));return d.getUTCFullYear()===+m[3]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?`${m[3]}-${m[2]}-${m[1]}`:null;}
  function parseAmount(s){s=s.replace(/\s/g,'').replace(/€/g,'').replace(/EUR/gi,'').replace(/−/g,'-');if(!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}$/.test(s))return null;const n=Number(s.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&n!==0?n:null;}
  function parsePages(pages){
    let columns=null,rows=[],errors=[],totalDates=0;
    pages.forEach((items,p)=>{
      const cells=items.filter(i=>typeof i.str==='string'&&i.str.trim()&&i.transform).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5]}));
      const h=word=>cells.find(c=>normalize(c.text)===word);
      const op=h('operazione'), category=h('categoria'), amount=h('importo'), contabil=h('contabilizzato'), date=h('contabile');
      let top=Infinity;
      if(op&&category&&amount&&contabil&&date){columns={op:op.x-10, status:contabil.x-10, category:category.x-15, amount:amount.x-25};top=date.y-3;}
      if(!columns){errors.push(`Pagina ${p+1}: intestazioni non riconosciute.`);return;}
      const dateCells=cells.filter(c=>c.y<top&&c.x<columns.op&&/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(c.text));
      if(dateCells.some(c=>!parseDate(c.text)))errors.push(`Pagina ${p+1}: data contabile non valida.`);
      const anchors=dateCells.filter(c=>parseDate(c.text)).sort((a,b)=>b.y-a.y);
      const amountCells=cells.filter(c=>c.y<top&&c.x>=columns.amount&&parseAmount(c.text)!==null);
      if(amountCells.length!==anchors.length)errors.push(`Pagina ${p+1}: numero di importi e date non corrispondente.`);
      const statusCells=cells.filter(c=>c.y<top&&c.x>=columns.status&&c.x<columns.category&&["si","no"].includes(normalize(c.text)));
      if(statusCells.length!==anchors.length)errors.push(`Pagina ${p+1}: numero di stati e date non corrispondente.`);
      totalDates+=anchors.length;
      if(!anchors.length){errors.push(`Pagina ${p+1}: nessuna riga con data contabile riconosciuta.`);return;}
      const classified=anchors.map(a=>({anchor:a,description:[],category:[],amount:[],status:[]}));
      for(const cell of cells){
        if(cell.y>=top || cell.x<columns.op)continue;
        let best=-1,dist=Infinity;anchors.forEach((a,i)=>{let d=Math.abs(a.y-cell.y);if(d<dist){dist=d;best=i;}});
        if(dist>22)continue;
        const r=classified[best], key=cell.x>=columns.amount?'amount':cell.x>=columns.category?'category':cell.x>=columns.status?'status':'description';r[key].push(cell);
      }
      const join=xs=>xs.sort((a,b)=>b.y-a.y||a.x-b.x).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
      classified.forEach((r,i)=>{
        const description=join(r.description), category=join(r.category), rawAmount=join(r.amount), status=normalize(join(r.status));
        const amount=parseAmount(rawAmount);
        if(!description||!category||amount===null||!['si','no'].includes(status)){errors.push(`Pagina ${p+1}, riga ${i+1}: dati incompleti o non riconosciuti.`);return;}
        rows.push({date:parseDate(r.anchor.text),description,category,amount,booked:status==='si',page:p+1});
      });
    });
    if(!totalDates)errors.push('Nessuna operazione riconosciuta. Verifica che il PDF contenga testo selezionabile e il formato supportato.');
    return {rows,errors};
  }
  return {parsePages,parseDate,parseAmount};
});
