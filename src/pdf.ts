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
