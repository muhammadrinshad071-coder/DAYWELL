import { entity, type LocalContact, type PersonalDocument } from '../src/core/models'
import type { DocumentAttachment } from '../src/core/attachments'

// Minimal single-page PDF with byte-accurate cross-reference offsets.
export function samplePdf(text = 'Local document fixture'): Buffer {
  const stream = `BT /F1 12 Tf 30 150 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let content = '%PDF-1.4\n'
  const offsets: number[] = [0]
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(content)); content += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(content)
  content += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(content)
}

export function sampleAttachment(): DocumentAttachment {
  const buffer = samplePdf()
  return { name: 'household-policy.pdf', mime: 'application/pdf', size: buffer.length, data: buffer.toString('base64') }
}

export function sampleDocument(): PersonalDocument {
  return { ...entity(), name: 'Household policy', category: 'insurance', description: '', reminderDays: 30, notes: '', attachment: sampleAttachment() }
}

export function sampleContact(patch: Partial<LocalContact> = {}): LocalContact {
  return { ...entity(), name: 'Family contact', category: 'Family', phone: '+91 90000 00000', address: 'Example Road, Kochi', emergency: true, notes: 'Contact for household assistance', ...patch }
}
