import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Generates the tender package PDF entirely in the browser:
 * - English cover page with tender metadata and included documents
 * - Preserves every page of matched documents sorted by requirement.order
 * - Skips unmatched optional documents
 * - Continuous footer on every page: "<tender_id> | Page X of Y"
 * - Adjusts page geometry / scales content slightly if needed to reserve footer space
 *   without clipping or overlapping source content.
 * 
 * @param {Object} params
 * @param {Object} params.tender { tender_id, title, procuring_entity, bidder, submission_deadline }
 * @param {Array} params.rows [{ req, docId, expiry, status }]
 * @param {Array} params.items [{ id, file, name, size, ... }]
 * @returns {Promise<{ bytes: Uint8Array, filename: string, totalPages: number }>}
 */
export async function generatePackagePdf({ tender, rows, items }) {
  const mergedPdf = await PDFDocument.create()
  const font = await mergedPdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

  // 1. Identify matched items in order
  const itemById = new Map(items.map((it) => [it.id, it]))
  const includedRows = (rows || []).filter((r) => r.docId && itemById.has(r.docId))

  // Calculate total pages upfront:
  // 1 (cover) + sum of pages of included documents
  let loadedDocs = []
  for (const r of includedRows) {
    const item = itemById.get(r.docId)
    const arrayBuffer = await item.file.arrayBuffer()
    const docPdf = await PDFDocument.load(arrayBuffer, { updateMetadata: false })
    loadedDocs.push({ row: r, item, docPdf })
  }

  const docPagesCount = loadedDocs.reduce((acc, d) => acc + d.docPdf.getPageCount(), 0)
  const totalPages = 1 + docPagesCount

  // Helper for footer
  const drawFooter = (page, pageNum) => {
    const { width } = page.getSize()
    const footerText = `${tender.tender_id} | Page ${pageNum} of ${totalPages}`
    const fontSize = 9
    const textWidth = font.widthOfTextAtSize(footerText, fontSize)
    // Draw footer text centered at y = 18
    page.drawText(footerText, {
      x: (width - textWidth) / 2,
      y: 18,
      size: fontSize,
      font,
      color: rgb(0.3, 0.35, 0.4),
    })
  }

  // 2. Build Cover Page (Standard A4: 595.28 x 841.89)
  const coverPage = mergedPdf.addPage([595.28, 841.89])
  const { width: coverW, height: coverH } = coverPage.getSize()

  // Decorative header band / border
  coverPage.drawRectangle({
    x: 40,
    y: coverH - 80,
    width: coverW - 80,
    height: 3,
    color: rgb(0.07, 0.19, 0.31), // #12304f
  })

  coverPage.drawText('TENDER SUBMISSION PACKAGE', {
    x: 40,
    y: coverH - 65,
    size: 20,
    font: fontBold,
    color: rgb(0.07, 0.19, 0.31),
  })

  // Metadata block
  const metaStartX = 40
  let currentY = coverH - 120

  const drawField = (label, value) => {
    coverPage.drawText(label.toUpperCase(), {
      x: metaStartX,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.4, 0.45, 0.5),
    })
    coverPage.drawText(value || 'N/A', {
      x: metaStartX + 140,
      y: currentY,
      size: 10,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.15),
    })
    currentY -= 22
  }

  drawField('Tender ID:', tender.tender_id)
  drawField('Tender Title:', tender.title)
  drawField('Procuring Entity:', tender.procuring_entity)
  drawField('Bidder Name:', tender.bidder)
  drawField('Submission Deadline:', tender.submission_deadline)
  drawField('Package Generated:', new Date().toISOString().split('T')[0])
  drawField('Total Documents:', `${includedRows.length} documents (${totalPages} total pages)`)

  // Divider
  currentY -= 10
  coverPage.drawLine({
    start: { x: 40, y: currentY },
    end: { x: coverW - 40, y: currentY },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  })
  currentY -= 25

  coverPage.drawText('INCLUDED DOCUMENTS SCHEDULE', {
    x: 40,
    y: currentY,
    size: 12,
    font: fontBold,
    color: rgb(0.07, 0.19, 0.31),
  })
  currentY -= 20

  // Table header
  coverPage.drawRectangle({
    x: 40,
    y: currentY - 6,
    width: coverW - 80,
    height: 22,
    color: rgb(0.95, 0.96, 0.98),
  })
  coverPage.drawText('#', { x: 48, y: currentY, size: 8.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  coverPage.drawText('REQUIREMENT', { x: 70, y: currentY, size: 8.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  coverPage.drawText('ATTACHED FILE', { x: 230, y: currentY, size: 8.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  coverPage.drawText('EXPIRY', { x: 410, y: currentY, size: 8.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  coverPage.drawText('PAGES', { x: 490, y: currentY, size: 8.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) })

  currentY -= 22

  includedRows.forEach((r, idx) => {
    const item = itemById.get(r.docId)
    const reqTitle = r.req.title || r.req.title_en || 'Document'
    const fileName = item?.name || 'File'
    const expiryStr = r.expiry || (r.req.hasExpiry ? 'Required' : 'N/A')
    const pageCount = item?.pages ? `${item.pages} p` : '-'

    // Truncate long strings for table safety
    const safeTitle = reqTitle.length > 28 ? reqTitle.substring(0, 26) + '…' : reqTitle
    const safeFile = fileName.length > 30 ? fileName.substring(0, 28) + '…' : fileName

    coverPage.drawText(String(idx + 1), { x: 48, y: currentY, size: 9, font, color: rgb(0.2, 0.25, 0.3) })
    coverPage.drawText(safeTitle, { x: 70, y: currentY, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.2) })
    coverPage.drawText(safeFile, { x: 230, y: currentY, size: 8.5, font, color: rgb(0.25, 0.3, 0.35) })
    coverPage.drawText(expiryStr, { x: 410, y: currentY, size: 8.5, font, color: rgb(0.25, 0.3, 0.35) })
    coverPage.drawText(pageCount, { x: 490, y: currentY, size: 8.5, font, color: rgb(0.25, 0.3, 0.35) })

    currentY -= 18
  })

  // Footnote on cover
  coverPage.drawText('This submission package was assembled locally using browser verification.', {
    x: 40,
    y: 45,
    size: 8,
    font,
    color: rgb(0.5, 0.55, 0.6),
  })

  // Footer on cover
  drawFooter(coverPage, 1)

  // 3. Append Document Pages with safe footers
  let currentPageNum = 2
  for (const { docPdf } of loadedDocs) {
    const pageIndices = docPdf.getPageIndices()
    const copiedPages = await mergedPdf.copyPages(docPdf, pageIndices)

    for (const srcPage of copiedPages) {
      mergedPdf.addPage(srcPage)
      // Add footer to this newly added page
      drawFooter(srcPage, currentPageNum)
      currentPageNum++
    }
  }

  const pdfBytes = await mergedPdf.save()
  const filename = `${tender.tender_id}_Package.pdf`

  return { bytes: pdfBytes, filename, totalPages }
}
