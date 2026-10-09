import { statSync } from 'node:fs';

/** Size of a file under public/, as shown next to its download: "15 KB", "1.2 MB". */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function publicFileSize(webPath: string): number {
  return statSync(`public${webPath}`).size;
}
