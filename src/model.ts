export type Requirement = { id: string; order: number; title_en: string; title_bn: string; mandatory: boolean; has_expiry: boolean };
export type Pack = { tender: { tender_id: string; title: string; procuring_entity: string; bidder: string; submission_deadline: string }; requirements: Requirement[] };
export const MAX_FILES = 30;
export const MAX_BYTES = 50 * 1024 * 1024;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validatePack(value: unknown): Pack {
 if (!object(value) || !object(value.tender)) throw new Error('Add a tender object containing the tender details.');
 const tender = value.tender;
 for (const key of ['tender_id', 'title', 'procuring_entity', 'bidder', 'submission_deadline']) {
  if (typeof tender[key] !== 'string' || !tender[key].trim()) throw new Error(`tender.${key} must be a non-empty text value.`);
 }
 const date = tender.submission_deadline as string;
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('submission_deadline must be a real date in YYYY-MM-DD format.');
 if (!Array.isArray(value.requirements) || !value.requirements.length) throw new Error('requirements must be a non-empty list of documents.');
 const ids = new Set<string>(); const orders = new Set<number>();
 value.requirements.forEach((r: unknown, i: number) => {
  const label = `Requirement ${i + 1}`;
  if (!object(r)) throw new Error(`${label} must be an object.`);
  for (const key of ['id', 'title_en', 'title_bn']) if (typeof r[key] !== 'string' || !r[key].trim()) throw new Error(`${label}: ${key} must be non-empty text.`);
  if (!Number.isSafeInteger(r.order) || (r.order as number) < 1) throw new Error(`${label}: order must be a positive whole number.`);
  for (const key of ['mandatory', 'has_expiry']) if (typeof r[key] !== 'boolean') throw new Error(`${label}: ${key} must be true or false.`);
  if (ids.has(r.id as string)) throw new Error(`${label}: id must be unique.`);
  if (orders.has(r.order as number)) throw new Error(`${label}: order must be unique.`);
  ids.add(r.id as string); orders.add(r.order as number);
 });
 const pack = value as unknown as Pack;
 return { tender: pack.tender, requirements: [...pack.requirements].sort((a, b) => a.order - b.order) };
}
