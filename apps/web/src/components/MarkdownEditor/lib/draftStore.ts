import type { EditorMode, EditorSource } from '../types'
import type { Frontmatter } from './frontmatter'

export type DraftRecord = {
  id: 'current'
  sourceKind: EditorSource['kind']
  /** 仅 sourceKind === 'note' 时有效，为相对笔记根目录的路径 */
  sourcePath: string[] | null
  sourceSlug: string | null
  sourceTitle: string | null
  mode: EditorMode
  content: string
  fileName: string | null
  frontmatter: Frontmatter
  updatedAt: number
}

export type DirectoryRecord = {
  id: 'notes-root'
  handle: FileSystemDirectoryHandle
  name: string
  updatedAt: number
}

const DATABASE_NAME = 'blog-editor'
const DATABASE_VERSION = 1
const DRAFT_STORE = 'drafts'
const DIRECTORY_STORE = 'directories'
const DRAFT_ID: DraftRecord['id'] = 'current'
const DIRECTORY_ID: DirectoryRecord['id'] = 'notes-root'

let databasePromise: Promise<IDBDatabase> | null = null

const openDatabase = () => {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(DRAFT_STORE)) {
          database.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(DIRECTORY_STORE)) {
          database.createObjectStore(DIRECTORY_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error ?? new Error('无法打开 IndexedDB'))
    }).catch((error: unknown) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

const runRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB 请求失败'))
  })

const readRecord = async <T>(
  storeName: string,
  id: string,
): Promise<T | null> => {
  try {
    const database = await openDatabase()
    const store = database.transaction(storeName, 'readonly').objectStore(storeName)
    const record = await runRequest<T | undefined>(store.get(id) as IDBRequest<T | undefined>)

    return record ?? null
  } catch {
    return null
  }
}

const putRecord = async (storeName: string, value: unknown) => {
  const database = await openDatabase()
  const store = database.transaction(storeName, 'readwrite').objectStore(storeName)

  await runRequest(store.put(value))
}

const deleteRecord = async (storeName: string, id: string) => {
  try {
    const database = await openDatabase()
    const store = database
      .transaction(storeName, 'readwrite')
      .objectStore(storeName)

    await runRequest(store.delete(id))
  } catch {
    // 清理失败不影响主流程。
  }
}

const isUsableDirectoryHandle = (
  value: unknown,
): value is FileSystemDirectoryHandle =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FileSystemDirectoryHandle).name === 'string' &&
  typeof (value as FileSystemDirectoryHandle).getFileHandle === 'function'

export const readDraft = () => readRecord<DraftRecord>(DRAFT_STORE, DRAFT_ID)

export const createDraftRecord = (input: {
  source: EditorSource
  mode: EditorMode
  content: string
  fileName: string | null
  frontmatter: Frontmatter
}): DraftRecord => ({
  id: DRAFT_ID,
  sourceKind: input.source.kind,
  sourcePath: input.source.kind === 'note' ? input.source.path : null,
  sourceSlug: input.source.kind === 'online' ? input.source.slug : null,
  sourceTitle: input.source.kind === 'online' ? input.source.title : null,
  mode: input.mode,
  content: input.content,
  fileName: input.fileName,
  frontmatter: input.frontmatter,
  updatedAt: Date.now(),
})

export const writeDraft = async (record: DraftRecord) => {
  try {
    await putRecord(DRAFT_STORE, record)

    return true
  } catch {
    return false
  }
}

export const clearDraft = () => deleteRecord(DRAFT_STORE, DRAFT_ID)

export const readDirectoryHandle = async () => {
  const record = await readRecord<DirectoryRecord>(
    DIRECTORY_STORE,
    DIRECTORY_ID,
  )

  return record !== null && isUsableDirectoryHandle(record.handle)
    ? record
    : null
}

export const writeDirectoryHandle = async (
  handle: FileSystemDirectoryHandle,
) => {
  try {
    await putRecord(DIRECTORY_STORE, {
      id: DIRECTORY_ID,
      handle,
      name: handle.name,
      updatedAt: Date.now(),
    } satisfies DirectoryRecord)

    return true
  } catch {
    return false
  }
}

export const clearDirectoryHandle = () =>
  deleteRecord(DIRECTORY_STORE, DIRECTORY_ID)
