import { describe, expect, it } from 'vitest'
import { openDB } from 'idb'
import { attachmentSchema, MAX_ATTACHMENT_BYTES, readDocumentFile } from '../../src/core/attachments'
import { createBackup, parseBackup, recordCount } from '../../src/core/backup'
import { contactSchema, emptyWorkspace, entity, preferencesSchema, workspaceSchema } from '../../src/core/models'
import { removeRecord, saveRecord } from '../../src/core/operations'
import { IndexedDBRepository } from '../../src/core/repository'
import { searchWorkspace } from '../../src/core/search'
import { sampleAttachment, sampleContact, sampleDocument, samplePdf } from '../file-fixtures'

describe('local document files', () => {
  it('reads a PDF without changing any bytes', async () => {
    const buffer = samplePdf()
    const file = await readDocumentFile(new File([new Uint8Array(buffer)], 'policy.pdf', { type: 'application/pdf' }))
    expect(Buffer.from(file.data, 'base64')).toEqual(buffer)
    expect(file).toMatchObject({ name: 'policy.pdf', size: buffer.length, mime: 'application/pdf' })
  })

  it('accepts PNG, JPEG and WebP headers with matching file types', async () => {
    for (const [name, mime, header] of [
      ['image.png', 'image/png', '\x89PNG\r\n\x1a\n'],
      ['image.jpeg', 'image/jpeg', '\xff\xd8\xff\xe0'],
      ['image.webp', 'image/webp', 'RIFF\x04\x00\x00\x00WEBP'],
    ]) {
      const bytes = Uint8Array.from(header, character => character.charCodeAt(0))
      expect((await readDocumentFile(new File([bytes], name, { type: mime }))).mime).toBe(mime)
    }
  })

  it('rejects oversized, empty, renamed and active-content files', async () => {
    await expect(readDocumentFile(new File([], 'empty.pdf'))).rejects.toThrow('attachment-size')
    await expect(readDocumentFile(new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], 'large.pdf'))).rejects.toThrow('attachment-size')
    for (const file of [new File(['<script>alert(1)</script>'], 'script.html'), new File(['<html>fake</html>'], 'fake.pdf'), new File(['%PDF-1.4'], 'fake.pdf', { type: 'text/html' })]) {
      await expect(readDocumentFile(file)).rejects.toThrow('attachment-type')
    }
  })

  it('validates file metadata, signatures, payloads and safe filenames on restore', () => {
    const file = sampleAttachment()
    for (const patch of [{ name: '../private.pdf' }, { name: 'policy\u202e.pdf' }, { name: 'policy.html' }, { name: 'bad\u0000.pdf' }, { mime: 'text/html' }, { size: file.size + 1 }, { data: file.data.slice(1) }, { data: '!'.repeat(file.data.length) }, { data: Buffer.alloc(file.size).toString('base64') }]) {
      expect(attachmentSchema.safeParse({ ...file, ...patch }).success).toBe(false)
    }
  })

  it('rejects a workspace over the combined attachment limit', () => {
    const bytes = Buffer.alloc(MAX_ATTACHMENT_BYTES)
    bytes.write('%PDF-1.4')
    const data = emptyWorkspace()
    data.documents = Array.from({ length: 3 }, () => ({ ...sampleDocument(), attachment: { ...sampleAttachment(), size: bytes.length, data: bytes.toString('base64') } }))
    expect(workspaceSchema.safeParse(data).success).toBe(true)
    data.documents.push(sampleDocument())
    expect(workspaceSchema.safeParse(data).success).toBe(false)
  })
})

describe('saved contacts, persistence and backup compatibility', () => {
  it('requires a usable phone number or address and rejects phone URI injection', () => {
    expect(contactSchema.safeParse(sampleContact({ phone: '', address: '' })).success).toBe(false)
    expect(contactSchema.safeParse(sampleContact({ phone: '', address: 'Local community centre' })).success).toBe(true)
    for (const phone of ['javascript:alert(1)', '123;ext=456', '+1+234', '()', '12', '123\n456']) expect(contactSchema.safeParse(sampleContact({ phone })).success).toBe(false)
    expect(contactSchema.safeParse(sampleContact({ phone: '112' })).success).toBe(true)
  })

  it('restores older workspaces and backups without contacts or attachments', () => {
    const data = emptyWorkspace()
    const { contacts: omitted, ...legacy } = data
    expect(omitted).toEqual([])
    expect(workspaceSchema.parse(legacy)).toEqual(data)
    expect(parseBackup(JSON.stringify({ app: 'daywell', version: 1, exportedAt: new Date().toISOString(), data: legacy, preferences: {} })).data.contacts).toEqual([])
  })

  it('loads an existing IndexedDB workspace and persists additions across connections', async () => {
    const name = `compatibility-${crypto.randomUUID()}`
    const db = await openDB(name, 1, { upgrade(connection) { connection.createObjectStore('workspace') } })
    const legacy: Record<string, unknown> = { ...emptyWorkspace() }
    delete legacy.contacts
    await db.put('workspace', legacy, 'current')
    db.close()
    const repo = new IndexedDBRepository(name)
    const contact = sampleContact()
    const document = sampleDocument()
    try {
      expect((await repo.load()).contacts).toEqual([])
      await repo.update(data => { saveRecord(data, 'contacts', contact); saveRecord(data, 'documents', document) })
      await repo.close()
      const saved = await repo.load()
      expect(saved.contacts[0].name).toBe(contact.name)
      expect(saved.documents[0].attachment).toEqual(document.attachment)
      await expect(repo.update(data => { data.documents[0].attachment!.data = 'corrupt' })).rejects.toThrow()
      expect(await repo.load()).toEqual(saved)
      await repo.update(data => { removeRecord(data, 'documents', document.id); removeRecord(data, 'contacts', contact.id) })
      expect((await repo.load()).documents).toEqual([])
      expect((await repo.load()).contacts).toEqual([])
    } finally { await repo.close() }
  })

  it('includes contacts and file bytes in backups and rejects duplicate contact IDs', () => {
    const data = emptyWorkspace()
    data.contacts.push(sampleContact())
    data.documents.push(sampleDocument())
    expect(parseBackup(createBackup(data, preferencesSchema.parse({}))).data).toEqual(data)
    expect(recordCount(data)).toBe(2)
    data.contacts.push({ ...data.contacts[0], name: 'Duplicate' })
    expect(workspaceSchema.safeParse(data).success).toBe(false)
    data.contacts[1] = { ...data.contacts[1], ...entity() }
    expect(workspaceSchema.safeParse(data).success).toBe(true)
  })

  it('finds contact categories, numbers, addresses, notes and attachment filenames locally', () => {
    const data = emptyWorkspace()
    data.contacts.push(sampleContact())
    data.documents.push(sampleDocument())
    for (const query of ['family', '90000', 'example road', 'household assistance']) expect(searchWorkspace(data, query).results).toContainEqual(expect.objectContaining({ kind: 'contacts', path: '/local', id: data.contacts[0].id }))
    expect(searchWorkspace(data, 'household-policy.pdf').results[0]).toMatchObject({ kind: 'documents', id: data.documents[0].id })
  })
})
