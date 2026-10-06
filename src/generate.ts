import { PDFDocument, PDFName, PDFNumber, type PDFFont, type PDFPage, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { validatePack, type Pack } from './model';
import { fingerprint, canGenerate, type Assignments, type SourceFile } from './review';
import { en } from './strings';
const ink=rgb(.14,.23,.21), green=rgb(.14,.36,.31), muted=rgb(.43,.49,.46);
function wrap(text:string,font:PDFFont,size:number,width:number) {
 const lines:string[]=[];
 for(const paragraph of text.replace(/\r/g,'').split('\n')) {
  let line='';
  for(const word of paragraph.split(/\s+/)) {
   const next=line?`${line} ${word}`:word;
   if(font.widthOfTextAtSize(next,size)<=width) {line=next; continue;}
   if(line) {lines.push(line);line='';}
   // Break unusually long tokens on grapheme boundaries, keeping Bangla clusters intact.
   const segments=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(word),s=>s.segment);
   for(const char of segments) {if(font.widthOfTextAtSize(line+char,size)>width && line){lines.push(line);line='';}line+=char;}
  }
  lines.push(line);
 }
 return lines;
}
function drawCover(page:PDFPage,font:PDFFont,pack:Pack,included:{title:string;pages:number}[],created:Date) {
 const width=page.getWidth()-88;
 const details=[['Tender ID',pack.tender.tender_id],['Title',pack.tender.title],['Procuring entity',pack.tender.procuring_entity],['Bidder',pack.tender.bidder],['Submission deadline',pack.tender.submission_deadline],['Package created',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(created)]];
 for(let size=12;size>=8;size-=.5) {
  const detailLines=details.map(([label,value])=>({label,lines:wrap(value,font,size,width-144)}));
  const docLines=included.map((doc,i)=>wrap(`${i+1}. ${doc.title} (${doc.pages} ${doc.pages===1?'page':'pages'})`,font,size,width));
  const required=detailLines.reduce((sum,d)=>sum+Math.max(1,d.lines.length)*size*1.6+10,0)+docLines.reduce((sum,d)=>sum+d.length*size*1.6+7,0)+60;
  if(required>page.getHeight()-220) continue;
  page.drawRectangle({x:0,y:page.getHeight()-126,width:page.getWidth(),height:126,color:green});
  page.drawText('TENDER DOCUMENT PACKAGE',{x:44,y:page.getHeight()-52,size:11,font,color:rgb(.82,.9,.86)});
  page.drawText('Submission package',{x:44,y:page.getHeight()-89,size:25,font,color:rgb(1,1,1)});
  let y=page.getHeight()-163;
  for(const detail of detailLines) {
   page.drawText(detail.label,{x:44,y,size:size-1,font,color:muted});
   for(const [i,line] of detail.lines.entries()) page.drawText(line,{x:188,y:y-i*size*1.6,size,font,color:ink});
   y-=Math.max(1,detail.lines.length)*size*1.6+10;
  }
  y-=12;page.drawLine({start:{x:44,y},end:{x:page.getWidth()-44,y},thickness:.6,color:rgb(.82,.86,.82)});y-=25;
  page.drawText('INCLUDED DOCUMENTS · IN SUBMISSION ORDER',{x:44,y,size:10,font,color:green});y-=24;
  for(const lines of docLines) {for(const line of lines){page.drawText(line,{x:44,y,size,font,color:ink});y-=size*1.6;}y-=7;}
  return;
 }
 throw new Error(en.coverOverflow);
}
export async function generatePackage(pack:Pack,assignments:Assignments,files:SourceFile[],isCurrent:()=>boolean) {
 const checkpoint=()=>{if(!isCurrent()) throw new Error(en.stale);};
 validatePack(pack);
 if(!canGenerate(pack,assignments,files)) throw new Error(en.blocked);
 const included=pack.requirements.filter(req=>assignments[req.id]).sort((a,b)=>a.order-b.order);
 // Re-hash all matched bytes at the point of generation; never trust filenames.
 const hashes=new Set<string>();
 const loaded=[];
 for(const req of included) {
  const source=files.find(f=>f.id===assignments[req.id].fileId)!;
  const hash=await fingerprint(source.file);checkpoint();
  if(hashes.has(hash) || hash!==source.hash) throw new Error(en.conflict);hashes.add(hash);
  const document=await PDFDocument.load(await source.file.arrayBuffer());checkpoint();
  if(document.isEncrypted) throw new Error(en.encrypted);
  if(document.getPageCount()!==source.pages) throw new Error(en.generationError);
  loaded.push({req,source,document});
 }
 const created=new Date(); const output=await PDFDocument.create(); output.registerFontkit(fontkit);
 const response=await fetch(`${import.meta.env.BASE_URL}fonts/NotoSansBengali.ttf`);
 if(!response.ok) throw new Error(en.generationError);
 const font=await output.embedFont(await response.arrayBuffer(),{subset:true});checkpoint();
 // Fontkit supports Bangla shaping while the cover's labels remain English.
 const charset=new Set(font.getCharacterSet());
 for(const value of [pack.tender.tender_id,pack.tender.title,pack.tender.procuring_entity,pack.tender.bidder,...included.map(r=>r.title_en)]) {
  if([...value].some(c=>!/\s/.test(c) && !charset.has(c.codePointAt(0)!))) throw new Error(en.unsupported);
 }
 const cover=output.addPage([595.28,841.89]);
 drawCover(cover,font,pack,loaded.map(v=>({title:v.req.title_en,pages:v.document.getPageCount()})),created);
 const total=1+loaded.reduce((n,v)=>n+v.document.getPageCount(),0);
 const footer=(n:number)=>`${pack.tender.tender_id} | Page ${n} of ${total}`;
 const footerMinWidth=font.widthOfTextAtSize(footer(total),9)+48;
 for(const item of loaded) {
  for(const [index,sourcePage] of item.document.getPages().entries()) {
   checkpoint();
   // PDF.js paints visible annotations and filled widgets; preserve their appearance.
   if(sourcePage.node.Annots()?.size()) {
    const { renderPageImage }=await import('./pdf');
    const rendered=await renderPageImage(item.source.file,index+1);checkpoint();
    const target=output.addPage([Math.max(rendered.width,footerMinWidth),rendered.height+48]);
    const image=await output.embedPng(rendered.bytes);
    target.drawImage(image,{x:(target.getWidth()-rendered.width)/2,y:48,width:rendered.width,height:rendered.height});
   } else {
    const media=sourcePage.getMediaBox(),crop=sourcePage.getCropBox();
    const left=Math.max(media.x,crop.x),bottom=Math.max(media.y,crop.y),right=Math.min(media.x+media.width,crop.x+crop.width),top=Math.min(media.y+media.height,crop.y+crop.height);
    if(right<=left || top<=bottom) throw new Error(en.generationError);
    const unitValue=sourcePage.node.get(PDFName.of('UserUnit')); const unit=unitValue instanceof PDFNumber ? unitValue.asNumber() : 1;
    const w=(right-left)*unit,h=(top-bottom)*unit;
    const rotation=((sourcePage.getRotation().angle%360)+360)%360;
    const rotated=rotation===90||rotation===270, width=rotated?h:w, height=rotated?w:h;
    const target=output.addPage([Math.max(width,footerMinWidth),height+48]);
    if(sourcePage.node.Contents()) {
     const embedded=await output.embedPage(sourcePage,{left,bottom,right,top});
     const pad=(target.getWidth()-width)/2;
     const origin=rotation===90 ? {x:pad,y:w+48} : rotation===180 ? {x:pad+w,y:h+48} : rotation===270 ? {x:pad+h,y:48} : {x:pad,y:48};
     target.drawPage(embedded,{...origin,xScale:unit,yScale:unit,rotate:degrees(-rotation)});
    }
   }
   // Yield between pages so edits can invalidate a long generation job.
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 for(const [index,page] of output.getPages().entries()) {
  const text=footer(index+1), size=Math.min(10,(page.getWidth()-48)/font.widthOfTextAtSize(text,1));
  if(size<8) throw new Error(en.coverOverflow);
  page.drawLine({start:{x:24,y:39},end:{x:page.getWidth()-24,y:39},thickness:.5,color:rgb(.82,.86,.83)});
  page.drawText(text,{x:(page.getWidth()-font.widthOfTextAtSize(text,size))/2,y:18,size,font,color:muted});
 }
 output.setTitle(`${pack.tender.tender_id} — Tender Document Package`);output.setCreator('Tenderdesk');output.setCreationDate(created);output.setModificationDate(created);
 const bytes=await output.save();checkpoint();
 return {bytes,pages:total,filename:`${pack.tender.tender_id.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')}_Package.pdf`};
}
