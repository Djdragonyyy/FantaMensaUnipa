import jpeg from 'jpeg-js';
import {PNG} from 'pngjs';
import {Buffer} from 'node:buffer';
export const MAX_INPUT=3*1024*1024;
function dimensions(bytes){
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10){const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);return {kind:'png',width:dv.getUint32(16),height:dv.getUint32(20)};}
 if(bytes[0]===255&&bytes[1]===216){let p=2;while(p+8<bytes.length){if(bytes[p]!==255)throw new Error('PHOTO_INVALID');let marker=bytes[p+1];p+=2;if(marker===0xd9||marker===0xda)break;const length=(bytes[p]<<8)+bytes[p+1];if(length<2||p+length>bytes.length)throw new Error('PHOTO_INVALID');if([0xc0,0xc1,0xc2].includes(marker))return {kind:'jpeg',height:(bytes[p+3]<<8)+bytes[p+4],width:(bytes[p+5]<<8)+bytes[p+6]};p+=length;}}
 throw new Error('PHOTO_INVALID');
}
export function sanitizePhoto(bytes){
 try{
  if(bytes.length<32||bytes.length>MAX_INPUT)throw new Error();const dim=dimensions(bytes);
  if(dim.width<1||dim.height<1||dim.width>4000||dim.height>4000||dim.width*dim.height>12_000_000)throw new Error();
  const raw=dim.kind==='jpeg'?jpeg.decode(bytes,{useTArray:true,maxResolutionInMP:12,maxMemoryUsageInMB:100}):PNG.sync.read(Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength),{checkCRC:true});
  const ratio=Math.min(1,1600/raw.width,1600/raw.height),width=Math.max(1,Math.round(raw.width*ratio)),height=Math.max(1,Math.round(raw.height*ratio)),data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const src=(Math.floor(y/ratio)*raw.width+Math.floor(x/ratio))*4,dst=(y*width+x)*4,alpha=raw.data[src+3]/255;for(let k=0;k<3;k++)data[dst+k]=Math.round(raw.data[src+k]*alpha+255*(1-alpha));data[dst+3]=255;}
  // Decode and re-encode pixels: EXIF/GPS/comments never copied to the new JPEG.
  let result=jpeg.encode({data,width,height},70).data;if(result.length>1048576)result=jpeg.encode({data,width,height},45).data;if(result.length>1048576)throw new Error();return result;
 }catch{throw new Error('PHOTO_INVALID');}
}
