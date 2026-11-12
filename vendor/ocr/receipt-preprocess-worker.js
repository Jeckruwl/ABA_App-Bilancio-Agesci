/* Preprocessing tratto da drakarah/ocr-receipt (MIT); nessuna foto viene inviata in rete. */
importScripts('ocr-receipt-main.js');
// Rileva un foglio chiaro su sfondo scuro quando il contorno Canny non è chiuso.
function brightPaper(canvas) {
  const w=canvas.width, h=canvas.height, pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
  const lum=new Uint8Array(w*h), hist=new Uint32Array(256);
  let sum=0;
  for(let i=0;i<lum.length;i++){ const p=i*4; const v=Math.round(0.299*pixels[p]+0.587*pixels[p+1]+0.114*pixels[p+2]); lum[i]=v; hist[v]++; sum+=v; }
  let leftCount=0,leftSum=0,maxVariance=0,threshold=0;
  for(let t=0;t<255;t++){
    leftCount+=hist[t]; leftSum+=t*hist[t];
    const rightCount=lum.length-leftCount;
    if(!leftCount || !rightCount) continue;
    const difference=leftSum/leftCount-(sum-leftSum)/rightCount;
    const variance=leftCount*rightCount*difference*difference;
    if(variance>maxVariance){maxVariance=variance;threshold=t;}
  }
  if(threshold>230 || maxVariance===0) return null;
  const mask=new Uint8Array(lum.length), queue=new Int32Array(lum.length);
  let best=null;
  for(let start=0;start<lum.length;start++){
    if(mask[start] || lum[start]<=threshold) continue;
    let head=0,tail=0,minSum=Infinity,maxSum=-Infinity,minDiff=Infinity,maxDiff=-Infinity;
    let lt,rt,lb,rb,minX=w,maxX=0,minY=h,maxY=0;
    queue[tail++]=start;mask[start]=1;
    while(head<tail){
      const i=queue[head++],x=i%w,y=Math.floor(i/w),sumXY=x+y,diff=x-y;
      if(sumXY<minSum){minSum=sumXY;lt=[x/w,y/h];} if(sumXY>maxSum){maxSum=sumXY;rb=[x/w,y/h];}
      if(diff>maxDiff){maxDiff=diff;rt=[x/w,y/h];} if(diff<minDiff){minDiff=diff;lb=[x/w,y/h];}
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      const push=n=>{if(!mask[n] && lum[n]>threshold){mask[n]=1;queue[tail++]=n;}};
      if(x>0) push(i-1); if(x+1<w) push(i+1); if(y>0) push(i-w); if(y+1<h) push(i+w);
    }
    if(tail>w*h*0.2 && tail/(Math.max(1,(maxX-minX+1)*(maxY-minY+1)))>0.6 && minX>2 && minY>2 && maxX<w-3 && maxY<h-3 && (!best || tail>best.size)) best={size:tail,leftTop:lt,rightTop:rt,leftBottom:lb,rightBottom:rb,success:true};
  }
  return best;
}
self.onmessage = async ({data}) => {
  let bitmap;
  try {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') throw new Error('Pre-elaborazione non supportata');
    bitmap = await createImageBitmap(data.image);
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height), Math.sqrt(4000000 / (bitmap.width * bitmap.height)));
    const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
    if (width < 80 || height < 80) throw new Error('Immagine troppo piccola');
    const full = new OffscreenCanvas(width, height), context = full.getContext('2d', {willReadFrequently:true});
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); bitmap = null;
    const smallScale = Math.min(1, 320 / width, 640 / height);
    const small = new OffscreenCanvas(Math.max(1, Math.round(width * smallScale)), Math.max(1, Math.round(height * smallScale)));
    small.getContext('2d', {willReadFrequently:true}).drawImage(full, 0, 0, small.width, small.height);
    function validCorners(c) {
      if (!c || !c.success) return false;
      const points = [c.leftTop, c.rightTop, c.rightBottom, c.leftBottom];
      if (!points.every(p => p && p.every(x => Number.isFinite(x) && x >= 0 && x <= 1))) return false;
      const area = Math.abs(points.reduce((sum, p, i) => sum + p[0] * points[(i+1)%4][1] - p[1] * points[(i+1)%4][0], 0))/2;
      return area >= 0.2 && area <= 0.97;
    }
    let corners = Algorithm.extractBiggestRectangularArea(GUI.extractSettings, small, false);
    if (!validCorners(corners)) corners = brightPaper(small);
    const cropped = validCorners(corners);
    if (!cropped) corners = {leftTop:[0,0], rightTop:[1,0], leftBottom:[0,1], rightBottom:[1,1]};
    const output = new OffscreenCanvas(1, 1);
    Algorithm.warpExtractedResultAndPrepareForOCR(full, output, corners, GUI.warpSettings, false);
    if (output.width < 80 || output.height < 80) throw new Error('Ritaglio non valido');
    const image = await output.convertToBlob({type:'image/png'});
    self.postMessage({ok:true, image, cropped});
  } catch (err) {
    if (bitmap) bitmap.close();
    self.postMessage({ok:false, error:String(err && err.message || err)});
  }
};
