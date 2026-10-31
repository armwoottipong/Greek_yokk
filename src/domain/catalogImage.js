export const MAX_IMAGE_BYTES=150*1024
export const IMAGE_SIZE=512
export function validateImage(value){
 if(value==='')return value
 if(typeof value!=='string'||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value))throw new Error('กรุณาใช้รูป JPEG ที่ผ่านการครอป')
 const data=value.slice(23),bytes=data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0)
 if(data.length%4||bytes>MAX_IMAGE_BYTES)throw new Error('รูปต้องมีขนาดไม่เกิน 150 KB')
 return value
}
export function cropRect(width,height,zoom=1,x=50,y=50){
 if(![width,height,zoom,x,y].every(Number.isFinite)||width<=0||height<=0||zoom<1||zoom>4||x<0||x>100||y<0||y>100)throw new Error('ตำแหน่งครอปรูปไม่ถูกต้อง')
 const size=Math.min(width,height)/zoom
 return {x:(width-size)*x/100,y:(height-size)*y/100,size}
}
export async function readImageFile(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('เลือกรูป JPG, PNG หรือ WebP')
 if(file.size>10*1024*1024)throw new Error('ไฟล์ต้นฉบับต้องไม่เกิน 10 MB')
 const url=URL.createObjectURL(file),image=new Image()
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('เปิดรูปไม่ได้ กรุณาเลือกไฟล์อื่น'));image.src=url})
  if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>25000000)throw new Error('รูปต้องมีความละเอียดไม่เกิน 25 ล้านพิกเซล')
  return {image,url}
 }catch(e){URL.revokeObjectURL(url);throw e}
}
export async function cropImage(image,{zoom=1,x=50,y=50}={}){
 const r=cropRect(image.naturalWidth,image.naturalHeight,zoom,x,y),canvas=document.createElement('canvas')
 canvas.width=canvas.height=IMAGE_SIZE
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('อุปกรณ์นี้ยังไม่รองรับการครอปรูป')
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,IMAGE_SIZE,IMAGE_SIZE)
 ctx.drawImage(image,r.x,r.y,r.size,r.size,0,0,IMAGE_SIZE,IMAGE_SIZE)
 for(const quality of [.9,.8,.7,.6,.45]){
  const value=canvas.toDataURL('image/jpeg',quality)
  try{return validateImage(value)}catch{ /* Retry a lower JPEG quality within the fixed size limit. */ }
 }
 throw new Error('บีบอัดรูปไม่ได้ กรุณาเลือกรูปอื่น')
}
