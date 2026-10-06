import { getDocument, GlobalWorkerOptions, PDFWorker } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
let worker: PDFWorker | undefined;
export async function countPages(file: File): Promise<number> {
 const data = new Uint8Array(await file.arrayBuffer());
 if (!new TextDecoder().decode(data.slice(0, 1024)).includes('%PDF-')) throw new Error('Invalid PDF signature');
 worker ??= new PDFWorker();
 const task = getDocument({ data, worker });
 // Avoid a pending password prompt: protected documents get a useful error.
 task.onPassword = () => { void task.destroy(); };
 try { const pdf = await task.promise; return pdf.numPages; }
 finally { await task.destroy(); }
}
export async function renderPageImage(file:File,pageNumber:number) {
 worker ??= new PDFWorker();
 const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),worker});
 task.onPassword=()=>{void task.destroy();};
 try {
  const document=await task.promise, page=await document.getPage(pageNumber);
  const natural=page.getViewport({scale:1});
  const scale=Math.min(2,Math.sqrt(16000000/(natural.width*natural.height)));
  const viewport=page.getViewport({scale});const canvas=documentOwner.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvas,viewport}).promise;
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Render failed')),'image/png'));
  canvas.width=0;canvas.height=0;
  return {bytes:new Uint8Array(await blob.arrayBuffer()),width:natural.width,height:natural.height};
 } finally {await task.destroy();}
}
const documentOwner=globalThis.document;
