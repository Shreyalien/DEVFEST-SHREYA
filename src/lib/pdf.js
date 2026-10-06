import { PDFDocument, EncryptedPDFError } from 'pdf-lib'

export class PdfReadError extends Error {
  constructor(code) {
    super(code)
    this.code = code // 'empty' | 'encrypted' | 'unreadable'
  }
}

export function looksLikePdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

async function sha256Hex(buffer) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

/** Reads the page count and SHA-256 of a PDF locally. Throws PdfReadError on failure. */
export async function readPdfInfo(file) {
  if (file.size === 0) throw new PdfReadError('empty')
  let buffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new PdfReadError('unreadable')
  }
  let pages
  try {
    const doc = await PDFDocument.load(buffer, { updateMetadata: false })
    pages = doc.getPageCount()
  } catch (error) {
    if (error instanceof EncryptedPDFError) throw new PdfReadError('encrypted')
    throw new PdfReadError('unreadable')
  }
  if (pages < 1) throw new PdfReadError('unreadable')
  return { pages, hash: await sha256Hex(buffer) }
}
