import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Check, ChevronRight, FileJson, FileText, FolderOpen, Layers, LockKeyhole, ShieldCheck, Upload, X, LoaderCircle, CalendarDays, CircleAlert } from 'lucide-react';
import { en } from './strings';
import { bn, localizeMessage } from './bn';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/600.css';
import { MAX_BYTES, MAX_FILES, validatePack, type Pack } from './model';
import { fingerprint, requirementStatus, canGenerate, type Assignment, type Assignments } from './review';
import './style.css';
import './mobile.css';
import './review.css';
import './finish.css';
import { RequirementList } from './RequirementList';
type Uploaded = { id: string; file: File; pages?: number; hash?: string; error?: string };
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
function App() {
 const [locale,setLocale]=useState<'en'|'bn'>('en'); const t=locale==='bn'?bn:en;
 const [generating,setGenerating]=useState(false);
 const [output,setOutput]=useState<{url:string;filename:string;pages:number}|null>(null);
 const revision=useRef(0),generationLock=useRef(false);
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 useEffect(()=>()=>{if(output)URL.revokeObjectURL(output.url);},[output]);
 const invalidate=()=>{revision.current++;setOutput(null);};
 const [pack, setPack] = useState<Pack | null>(null);
 const [files, setFiles] = useState<Uploaded[]>([]);
 const [assignments, setAssignments] = useState<Assignments>(() => Object.create(null));
 const [history, setHistory] = useState<{ requirementId: string; previous?: Assignment }[]>([]);
 const [messages, setMessages] = useState<string[]>([]);
 const [notice, setNotice] = useState('');
 const [busy, setBusy] = useState(false);
 const [drag, setDrag] = useState(false);
 const stored = useRef<Uploaded[]>([]);
 const jsonInput = useRef<HTMLInputElement>(null); const pdfInput = useRef<HTMLInputElement>(null);
 const update = (next: Uploaded[]) => { invalidate(); stored.current = next; setFiles(next); };
 const report = (message: string) => setMessages(prev => [...prev, message]);
 function resetMatches() { invalidate(); setAssignments(Object.create(null)); setHistory([]); }
 function match(requirementId: string, fileId: string) {
  const file = stored.current.find(item => item.id === fileId);
  if (fileId && (!file?.hash || !file.pages || file.error)) { report(t.unavailable); return; }
  if (file && Object.entries(assignments).some(([id, value]) => id !== requirementId && stored.current.find(item => item.id === value.fileId)?.hash === file.hash)) { report(t.conflict); return; }
  invalidate();
  setHistory(prev => [...prev, { requirementId, previous: assignments[requirementId] }]);
  const next: Assignments = Object.assign(Object.create(null), assignments);
  if (fileId) next[requirementId] = { fileId, expiry: '' }; else delete next[requirementId];
  setAssignments(next);
 }
 function removeFile(fileId: string) {
  update(stored.current.filter(item => item.id !== fileId));
  const clean = (values: Assignments): Assignments => Object.assign(Object.create(null), Object.fromEntries(Object.entries(values).filter(([, value]) => value.fileId !== fileId)));
  setAssignments(clean); setHistory([]);
 }
 function undoMatch() {
  const change = history[history.length - 1];
  if (!change) return;
  invalidate();
  const next: Assignments = Object.assign(Object.create(null), assignments);
  if (change.previous) next[change.requirementId] = change.previous;
  else delete next[change.requirementId];
  setAssignments(next); setHistory(history.slice(0, -1));
 }
 function setExpiry(id:string,expiry:string) {
  invalidate(); setAssignments(prev=>Object.assign(Object.create(null),prev,{[id]:{...prev[id],expiry}}));
 }
 async function generate() {
  if(generationLock.current) return;
  if(!pack || busy || !canGenerate(pack,assignments,stored.current)) {report(t.blocked);return;}
  generationLock.current=true;setGenerating(true);setMessages([]);
  const version=revision.current;
  try {
   const {generatePackage}=await import('./generate');
   const result=await generatePackage(pack,structuredClone(assignments),[...stored.current],()=>version===revision.current);
   if(version!==revision.current) return;
   const url=URL.createObjectURL(new Blob([result.bytes.slice().buffer],{type:'application/pdf'}));
   setOutput({url,filename:result.filename,pages:result.pages});
   const link=document.createElement('a');link.href=url;link.download=result.filename;document.body.append(link);link.click();link.remove();
  } catch(error) {
   const raw=error instanceof Error?error.message:'';
   report(Object.values(en).includes(raw)?raw:en.generationError);
  } finally {generationLock.current=false;setGenerating(false);}
 }
 async function importJson(file: File) {
  setMessages([]); setNotice('');
  if (!file.name.toLowerCase().endsWith('.json')) { report(t.jsonFile); return; }
  setBusy(true);
  try {
   let value: unknown;
   const content = await file.text();
   try { value = JSON.parse(content); } catch { throw new Error(t.jsonSyntax); }
   setPack(validatePack(value)); resetMatches();
  } catch (error) { report(error instanceof Error ? error.message : t.readFail); }
  finally { setBusy(false); }
 }
 async function addFiles(incoming: File[]) {
  const accepted: Uploaded[] = [];
  let bytes = stored.current.reduce((sum, entry) => sum + entry.file.size, 0);
  for (const file of incoming) {
   if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) { report(`${file.name}: ${t.pdfOnly}`); continue; }
   if (stored.current.length + accepted.length >= MAX_FILES) { report(`${file.name}: ${t.countLimit}`); continue; }
   if (bytes + file.size > MAX_BYTES) { report(`${file.name}: ${t.sizeLimit}`); continue; }
   accepted.push({ id: crypto.randomUUID(), file }); bytes += file.size;
  }
  update([...stored.current, ...accepted]);
  // Read one file at a time to keep peak memory usage bounded.
  for (const entry of accepted) {
   if (!stored.current.some(item => item.id === entry.id)) continue;
   try {
    let hash: string;
    try { hash = await fingerprint(entry.file); } catch { update(stored.current.map(item => item.id === entry.id ? { ...item, error: t.hashFail } : item)); continue; }
    const { countPages } = await import('./pdf'); const pages = await countPages(entry.file);
    update(stored.current.map(item => item.id === entry.id ? { ...item, pages, hash } : item));
   }
   catch { update(stored.current.map(item => item.id === entry.id ? { ...item, error: t.unreadable } : item)); }
  }
 }
 async function loadSample() {
  setBusy(true); setMessages([]); setNotice('');
  try {
   const response = await fetch(`${import.meta.env.BASE_URL}sample-pack/requirements.json`);
   if (!response.ok) throw new Error();
   const parsed = validatePack(await response.json());
   const paths = Object.keys(import.meta.glob('/public/sample-pack/documents/*.pdf')).map(path => path.replace('/public/', ''));
   const sampleFiles = await Promise.all(paths.map(async path => {
    const result = await fetch(`${import.meta.env.BASE_URL}${path}`);
    if (!result.ok) throw new Error();
    return new File([await result.blob()], path.split('/').pop()!, { type: 'application/pdf' });
   }));
   setPack(parsed); resetMatches(); update([]); await addFiles(sampleFiles); setNotice(t.sampleNotice);
  } catch { report(t.sampleFail); } finally { setBusy(false); }
 }
 const totalBytes = files.reduce((sum, file) => sum + file.file.size, 0);
 const reviewed = pack?.requirements.map(req => ({ req, status: requirementStatus(req, assignments[req.id], pack.tender.submission_deadline) })) ?? [];
 const blockers = reviewed.filter(item => ['missing', 'expiryNeeded', 'expired'].includes(item.status));
 const counts = { ok: reviewed.filter(item => item.status === 'ok').length, skipped: reviewed.filter(item => item.status === 'notProvided').length };
 const duplicates = (file: Uploaded) => file.hash ? files.filter(other => other.id !== file.id && other.hash === file.hash) : [];
 const duplicateCopies = files.filter((file, index) => file.hash && files.slice(0, index).some(other => other.hash === file.hash)).length;
 const totalPages = files.reduce((sum, file) => sum + (file.pages ?? 0), 0);
 const reading = files.some(file => file.pages === undefined && !file.error);
 const date = pack ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(pack.tender.submission_deadline)) : '';
 const ready=!busy && canGenerate(pack,assignments,files);
 const generationExplanation=!pack?t.noPack:busy||reading?t.wait:blockers.length?t.blocked:ready?t.ready:t.blocked;
 return <>
  <header className="topbar"><div className="brand"><span className="brand-mark"><Layers size={23}/></span><div><strong>{t.brand}</strong><span>{t.product}</span></div></div><div className="header-tools"><span className="local"><ShieldCheck size={15}/>{t.local}</span><label className="sr-only" htmlFor="language">{t.language}</label><select id="language" value={locale} onChange={event=>setLocale(event.target.value as 'en'|'bn')}><option value="en">English</option><option value="bn">বাংলা</option></select></div></header>
  <main>
   <nav className="workflow" aria-label={t.workflow}><a href="#import" className={!pack?'active':''} aria-current={!pack?'step':undefined}><b>01</b>{t.step1}</a><ChevronRight size={15}/><a href="#review" className={pack&&!ready?'active':''} aria-current={pack&&!ready?'step':undefined}><b>02</b>{t.step2}</a><ChevronRight size={15}/><a href="#generate" className={ready?'active':''} aria-current={ready?'step':undefined}><b>03</b>{t.step3}</a></nav>
   <section className="intro" id="import"><div><span className="eyebrow">{t.eyebrow}</span><h1>{t.heading}</h1><p>{t.intro}</p></div><div className="intro-actions"><button className="secondary" onClick={loadSample} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <FolderOpen size={17}/>} {t.sample}</button><button className="primary" onClick={() => jsonInput.current?.click()} disabled={busy}><FileJson size={17}/>{t.import}</button></div></section>
   <input ref={jsonInput} className="sr-only" type="file" accept=".json,application/json" aria-label={t.jsonInput} onChange={event => { const file = event.target.files?.[0]; if (file) void importJson(file); event.target.value = ''; }}/>
   <input ref={pdfInput} className="sr-only" type="file" multiple accept=".pdf,application/pdf" aria-label={t.pdfInput} onChange={event => { if (event.target.files) void addFiles(Array.from(event.target.files)); event.target.value = ''; }}/>
   {messages.length > 0 && <div role="alert" className="alert"><CircleAlert size={19}/><div>{messages.map((message, index) => <p key={index}>{localizeMessage(message,locale)}</p>)}</div><button className="icon-button" aria-label={t.dismiss} onClick={() => setMessages([])}><X size={18}/></button></div>}
   {notice && <div role="status" className="notice"><Check size={17}/>{localizeMessage(notice,locale)}</div>}
   <section className="summary" aria-label={t.summary}><div className="summary-title"><span className="eyebrow">{t.summary}</span>{pack ? <><span className="tender-id">{pack.tender.tender_id}</span><h2>{pack.tender.title}</h2></> : <><h2>{t.emptyTitle}</h2><p>{t.emptySummary}</p></>}</div>{pack && <dl><div><dt>{t.entity}</dt><dd>{pack.tender.procuring_entity}</dd></div><div><dt>{t.bidder}</dt><dd>{pack.tender.bidder}</dd></div><div><dt><CalendarDays size={14}/>{t.deadline}</dt><dd>{date}</dd></div></dl>}</section>
   <div className="workspace"><section className="documents"><div className="section-heading"><div><h2>{t.docs} <span className="count">{files.length}</span></h2><p>{t.docsHelp}</p></div></div>
    <div className={`dropzone ${drag ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); if (!busy) void addFiles(Array.from(event.dataTransfer.files)); }}><span className="upload-icon"><Upload size={24}/></span><h3>{t.drop}</h3><p>{t.dropHelp}</p><button className="secondary" disabled={busy} onClick={() => pdfInput.current?.click()}>{t.choose}<ArrowRight size={15}/></button><small>{t.limits}</small></div>
    <div className="file-meter"><span>{t.fileUsage(files.length, MAX_FILES)}</span><span>{t.totalSize(totalBytes)}</span></div><div className="meter"><span style={{ width: `${totalBytes / MAX_BYTES * 100}%` }}/></div>
    <div className="file-list" aria-live="polite">{files.length === 0 ? <div className="file-empty"><FileText size={22}/><strong>{t.noDocs}</strong><p>{t.noDocsHelp}</p></div> : files.map(file => {
     const copies = duplicates(file);
     const assigned = pack?.requirements.find(req => assignments[req.id]?.fileId === file.id);
     return <div className={`file-row ${file.error ? 'file-error' : ''}`} key={file.id}><FileText size={20}/><div><strong>{file.file.name}</strong><span>{file.error ? localizeMessage(file.error,locale) : (file.pages === undefined ? t.checking : t.fileDetails(file.pages, t.fileSize(file.file.size)))}</span>{copies.length > 0 && <span className="duplicate-note">{t.duplicateOf(copies.map(copy => copy.file.name).join(', '))}</span>}{assigned && <span className="assigned-note">{t.assignedTo(locale==='bn'?assigned.title_bn:assigned.title_en)}</span>}</div>{file.pages === undefined && !file.error && <LoaderCircle size={16} className="spin"/>}<button className="icon-button" aria-label={`${t.remove} ${file.file.name}`} onClick={() => removeFile(file.id)}><X size={17}/></button></div>;
    })}</div>
    {files.length > 0 && <p className="document-total">{t.pagesRead(totalPages, reading)}</p>}
    <p className="privacy"><LockKeyhole size={14}/>{t.privacy}</p>
   </section>
   <section className="checklist" id="review"><div className="section-heading"><div><h2>{t.requirements} <span className="count">{pack?.requirements.length ?? 0}</span></h2><p>{t.reqHelp}</p></div>{pack && <button className="undo-button secondary" disabled={!history.length || busy} onClick={undoMatch}>{t.undo}</button>}</div>
    {pack ? <><div className="table-head"><span>{t.order}</span><span>{t.document}</span><span>{t.status}</span></div><RequirementList pack={pack} files={files} assignments={assignments} busy={busy} onMatch={match} onExpiry={setExpiry} t={t} locale={locale}/><div className="next-note"><CircleAlert size={17}/><div><strong>{t.next}</strong><p>{t.nextHelp}</p></div></div></> : <div className="requirements-empty"><span><Layers size={32}/></span><h3>{t.reqEmpty}</h3><p>{t.reqEmptyHelp}</p><button className="text-button" onClick={() => jsonInput.current?.click()} disabled={busy}>{t.import}<ArrowRight size={16}/></button></div>}
   </section></div>
   <section className="readiness" id="generate"><div className="readiness-icon"><LockKeyhole size={21}/></div><div><h2>{t.readiness} <span className="step-tag">{t.stepTag}</span></h2>{pack && <p className="readiness-counts" aria-live="polite">{t.readyCounts(counts.ok, counts.skipped, blockers.length)}{blockers.length === 0 ? ` · ${t.allReady}` : ''}</p>}{files.length > 0 && <p>{t.uploadCounts(files.filter(file => !file.pages && !file.error).length, files.filter(file => file.error).length, duplicateCopies)}</p>}<p id="generation-explanation">{generating?t.generating:generationExplanation}</p><p>{t.footerNote}</p>{output && <div className="output-success" role="status"><strong>{t.success}</strong><span>{t.downloadName(output.filename,output.pages)}</span><a href={output.url} download={output.filename}>{t.download}</a></div>}</div><button disabled={!ready||generating} onClick={generate} aria-describedby="generation-explanation" className="generate">{generating?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} {generating?t.generating:t.generate}</button></section>
   <footer><span>{t.footer}</span><span>{t.browser}</span></footer>
  </main>
 </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);



