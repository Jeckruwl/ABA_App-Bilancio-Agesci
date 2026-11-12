const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {console, self: {}, importScripts: () => {}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('vendor/ocr/ocr-receipt-main.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('vendor/ocr/receipt-preprocess-worker.js', 'utf8'), context);
assert.equal(context.ImageOps.median(new Uint8Array([0, 0, 255, 255, 255])), 255);
function canvas(rectangle) {
  const width=100, height=100, data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const value=rectangle && x>=20 && x<=80 && y>=10 && y<=90 ? 240 : 0;
    const i=(y*width+x)*4; data[i]=data[i+1]=data[i+2]=value; data[i+3]=255;
  }
  return {width,height,getContext:()=>({getImageData:()=>({data})})};
}
const paper=context.brightPaper(canvas(true));
assert(paper && paper.success);
assert(Math.abs(paper.leftTop[0]-0.2)<0.03 && Math.abs(paper.rightBottom[1]-0.9)<0.03);
assert.equal(context.brightPaper(canvas(false)),null);
console.log('Preprocessing: mediana e individuazione del foglio OK');
