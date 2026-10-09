export async function readMenuPhoto(file,{signal,onProgress=()=>{}}={}){
 if(!file||!['image/jpeg','image/png'].includes(file.type)||!file.size||file.size>3*1024*1024)throw new Error('OCR_FILE');
 let worker,bitmap,timer,cancelled=false;
 const aborted=()=>new DOMException('Cancelled','AbortError');
 let rejectStop;
 const stopped=new Promise((_,reject)=>{rejectStop=reject;});
 const stop=()=>{cancelled=true;worker?.terminate();rejectStop(aborted());};
 signal?.addEventListener('abort',stop,{once:true});
 const work=(async()=>{
  if(signal?.aborted)throw aborted();
  bitmap=await createImageBitmap(file);
  if(bitmap.width>4000||bitmap.height>4000||bitmap.width*bitmap.height>12000000)throw new Error('OCR_FILE');
  const canvas=document.createElement('canvas'),ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();bitmap=null;
  if(cancelled)throw aborted();
  const {createWorker}=await import('tesseract.js');
  worker=await createWorker('ita',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr',workerBlobURL:false,cacheMethod:'none',logger:m=>onProgress(m.status==='recognizing text'?Math.round(m.progress*100):null)});
  if(cancelled||signal?.aborted){await worker.terminate();throw aborted();}
  await worker.setParameters({tessedit_pageseg_mode:'3'});
  const {data}=await worker.recognize(canvas);
  return data.text.trim().slice(0,12000);
 })();
 timer=setTimeout(()=>{cancelled=true;worker?.terminate();rejectStop(new Error('OCR_TIMEOUT'));},90000);
 try{return await Promise.race([work,stopped]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);bitmap?.close();if(worker)await worker.terminate();}
}
