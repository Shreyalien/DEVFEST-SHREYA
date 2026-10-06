import type { Requirement } from './model';
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
