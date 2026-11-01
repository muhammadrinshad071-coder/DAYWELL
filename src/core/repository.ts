import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { emptyWorkspace, workspaceSchema, type Workspace } from './models'

interface DaywellDB extends DBSchema {
  workspace: { key: string; value: Workspace }
}

// Implement this boundary for authenticated cloud sync later.
export interface WorkspaceRepository {
  load(): Promise<Workspace>
  update(mutation: (draft: Workspace) => void): Promise<Workspace>
  replace(workspace: Workspace): Promise<Workspace>
  close(): Promise<void>
}

export class IndexedDBRepository implements WorkspaceRepository {
  private connection?: Promise<IDBPDatabase<DaywellDB>>
  constructor(private name = 'daywell-local-v1') {}

  private connect(): Promise<IDBPDatabase<DaywellDB>> {
    if (!this.connection) {
      this.connection = openDB<DaywellDB>(this.name, 1, {
        upgrade(db) { db.createObjectStore('workspace') },
        blocking: () => { void this.close() },
        terminated: () => { this.connection = undefined },
      }).catch(error => { this.connection = undefined; throw error })
    }
    return this.connection
  }

  async load(): Promise<Workspace> {
    const db = await this.connect()
    const value = await db.get('workspace', 'current')
    return value ? workspaceSchema.parse(value) : emptyWorkspace()
  }

  async update(mutation: (draft: Workspace) => void): Promise<Workspace> {
    const db = await this.connect()
    const tx = db.transaction('workspace', 'readwrite')
    try {
      const current = await tx.store.get('current')
      const draft = current ? workspaceSchema.parse(current) : emptyWorkspace()
      mutation(draft)
      const validated = workspaceSchema.parse(draft)
      await tx.store.put(validated, 'current')
      await tx.done
      return validated
    } catch (error) {
      try { tx.abort() } catch { /* A failed transaction may already be aborted. */ }
      await tx.done.catch(() => undefined)
      throw error
    }
  }

  async replace(workspace: Workspace): Promise<Workspace> {
    const validated = workspaceSchema.parse(workspace)
    const db = await this.connect()
    const tx = db.transaction('workspace', 'readwrite')
    try {
      await tx.store.put(validated, 'current')
      await tx.done
      return validated
    } catch (error) {
      try { tx.abort() } catch { /* A failed transaction may already be aborted. */ }
      await tx.done.catch(() => undefined)
      throw error
    }
  }

  async close(): Promise<void> {
    const connection = this.connection
    this.connection = undefined
    if (connection) (await connection).close()
  }
}
