import type { Pack } from './model';
import { requirementStatus, type Assignments } from './review';
import type { Strings } from './strings';
import { CalendarDays } from 'lucide-react';
type Candidate = { id: string; file: File; hash?: string; pages?: number; error?: string };
export function RequirementList({ pack, files, assignments, busy, onMatch, onExpiry, t, locale }: { pack: Pack; files: Candidate[]; assignments: Assignments; busy: boolean; onMatch: (id: string, fileId: string) => void; onExpiry: (id: string, expiry: string) => void; t: Strings; locale: 'en'|'bn' }) {
 return <ol className="requirements">{pack.requirements.map(req => {
  const assignment = assignments[req.id];
  const title = locale==='bn' ? req.title_bn : req.title_en;
  const status = requirementStatus(req, assignment, pack.tender.submission_deadline);
  const reason = status === 'missing' || status === 'expiryNeeded' || status === 'expired' ? t.reasons[status] : '';
  return <li key={req.id}><span className="order">{String(req.order).padStart(2, '0')}</span><div className="requirement-info"><h3>{title}</h3><div><span className={`label ${req.mandatory ? 'mandatory' : ''}`}>{req.mandatory ? t.mandatory : t.optional}</span><span className="expiry">{req.has_expiry ? <CalendarDays size={12}/> : null}{req.has_expiry ? t.expiry : t.noExpiry}</span></div></div><span className={`status ${status}`} aria-live="polite"><span/>{t[status]}</span>
   <div className="match-controls"><div className="match-select"><label className="sr-only" htmlFor={`match-${req.id}`}>{t.matchLabel(title)}</label><select id={`match-${req.id}`} value={assignment?.fileId ?? ''} disabled={busy} onChange={event => onMatch(req.id, event.target.value)}><option value="">{t.chooseMatch}</option>{files.map(file => {
    const used = Object.entries(assignments).some(([id, value]) => id !== req.id && files.find(item => item.id === value.fileId)?.hash === file.hash && !!file.hash);
    return <option key={file.id} value={file.id} disabled={!file.hash || !file.pages || !!file.error || used}>{file.file.name}{used ? ` — ${t.used}` : !file.hash || !file.pages || file.error ? ` — ${t.unavailable}` : ''}</option>;
   })}</select>{assignment && <button className="unmatch-button" disabled={busy} aria-label={t.unmatchLabel(title)} onClick={() => onMatch(req.id, '')}>{t.unmatch}</button>}</div>
   {assignment && req.has_expiry && <label className="expiry-input">{t.expiryDate}<input type="date" aria-label={t.expiryLabel(title)} value={assignment.expiry} disabled={busy} onChange={event => onExpiry(req.id, event.target.value)}/></label>}
   {reason && <p className={`blocker-reason ${status === 'expired' ? 'expired' : ''}`}>{reason}</p>}</div>
  </li>;
 })}</ol>;
}
