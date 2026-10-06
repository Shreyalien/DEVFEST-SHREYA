import { MAX_BYTES, MAX_FILES, type Requirement, type Pack } from './model';
export type Assignment = { fileId: string; expiry: string };
export type Assignments = Record<string, Assignment>;
export type ReviewStatus = 'missing' | 'notProvided' | 'expiryNeeded' | 'expired' | 'ok';
export function requirementStatus(req: Requirement, assignment: Assignment | undefined, deadline: string): ReviewStatus {
 if (!assignment) return req.mandatory ? 'missing' : 'notProvided';
 if (req.has_expiry) {
  const date = assignment.expiry;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return 'expiryNeeded';
  if (date < deadline) return 'expired';
 }
 return 'ok';
}
export async function fingerprint(file: File): Promise<string> {
 const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
 return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export type SourceFile = { id: string; file: File; pages?: number; hash?: string; error?: string };
export function canGenerate(pack: Pack | null, assignments: Assignments, files: SourceFile[]) {
 if (!pack || files.length > MAX_FILES || files.reduce((n,f)=>n+f.file.size,0)>MAX_BYTES) return false;
 if (files.some(f=>!f.error && (!f.pages || !f.hash))) return false;
 const used=new Set<string>();
 for(const req of pack.requirements) {
  const a=assignments[req.id];
  const status=requirementStatus(req,a,pack.tender.submission_deadline);
  if(status!=='ok' && status!=='notProvided') return false;
  if(a) {
   const f=files.find(f=>f.id===a.fileId);
   if(!f || f.error || !f.hash || !f.pages || used.has(f.hash)) return false;
   used.add(f.hash);
  }
 }
 return true;
}
