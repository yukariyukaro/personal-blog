/**
 * File System Access API 的增量类型补充。
 *
 * TypeScript 5.9 的 lib.dom 已包含 FileSystemHandle / FileSystemFileHandle /
 * FileSystemDirectoryHandle / FileSystemWritableFileStream 的基础定义，
 * 但缺少目录异步遍历（values）、权限查询以及 window 上的选择器方法。
 * 这里只补充缺失成员（interface 合并），不重复声明已有成员。
 */

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<
    FileSystemDirectoryHandle | FileSystemFileHandle
  >
  queryPermission?(descriptor?: {
    mode?: 'read' | 'readwrite'
  }): Promise<PermissionState>
  requestPermission?(descriptor?: {
    mode?: 'read' | 'readwrite'
  }): Promise<PermissionState>
}

interface FileSystemFileHandle {
  queryPermission?(descriptor?: {
    mode?: 'read' | 'readwrite'
  }): Promise<PermissionState>
  requestPermission?(descriptor?: {
    mode?: 'read' | 'readwrite'
  }): Promise<PermissionState>
}

interface Window {
  showOpenFilePicker?(options?: unknown): Promise<FileSystemFileHandle[]>
  showSaveFilePicker?(options?: unknown): Promise<FileSystemFileHandle>
  showDirectoryPicker?(
    options?: unknown,
  ): Promise<FileSystemDirectoryHandle>
}
