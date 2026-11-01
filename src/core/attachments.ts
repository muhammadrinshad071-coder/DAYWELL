import { z } from 'zod'

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024
export const MAX_WORKSPACE_ATTACHMENT_BYTES = 6 * 1024 * 1024
export const DOCUMENT_FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp'
const mimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const
const extensions: Record<typeof mimeTypes[number], RegExp> = {
  'application/pdf': /\.pdf$/i, 'image/png': /\.png$/i,
  'image/jpeg': /\.jpe?g$/i, 'image/webp': /\.webp$/i,
}

function signatureMatches(header: string, mime: typeof mimeTypes[number]): boolean {
  if (mime === 'application/pdf') return header.startsWith('%PDF-')
  if (mime === 'image/png') return header.startsWith('\x89PNG\r\n\x1a\n')
  if (mime === 'image/jpeg') return header.startsWith('\xff\xd8\xff')
  return header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP'
}

export const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(200).refine(name => !/[<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/.test(name) && [...name].every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127), 'Invalid file name'),
  mime: z.enum(mimeTypes),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
  data: z.string().min(4).max(4 * Math.ceil(MAX_ATTACHMENT_BYTES / 3)),
}).strict().superRefine((file, ctx) => {
  const fail = () => ctx.addIssue({ code: 'custom', message: 'Invalid document file' })
  if (!extensions[file.mime].test(file.name)) { fail(); return }
  const padding = (3 - file.size % 3) % 3
  const payload = padding ? file.data.slice(0, -padding) : file.data
  if (file.data.length !== 4 * Math.ceil(file.size / 3) || /[^A-Za-z0-9+/]/.test(payload) || (padding && file.data.slice(-padding) !== '='.repeat(padding))) { fail(); return }
  try { if (!signatureMatches(atob(file.data.slice(0, 24)), file.mime)) fail() }
  catch { fail() }
})

export type DocumentAttachment = z.infer<typeof attachmentSchema>

export async function readDocumentFile(file: File): Promise<DocumentAttachment> {
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES) throw new Error('attachment-size')
  const mime = mimeTypes.find(type => extensions[type].test(file.name))
  if (!mime || (file.type && file.type !== mime)) throw new Error('attachment-type')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  const result = attachmentSchema.safeParse({ name: file.name, mime, size: bytes.length, data: btoa(binary) })
  if (!result.success) throw new Error('attachment-type')
  return result.data
}

export function downloadDocumentFile(file: DocumentAttachment): void {
  const valid = attachmentSchema.parse(file)
  const bytes = Uint8Array.from(atob(valid.data), character => character.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: valid.mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = valid.name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function attachmentSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
