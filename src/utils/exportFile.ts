// バックアップJSONのファイル書き出し(設定③データ/全削除画面の「先にエクスポート」で共用)
import { exportBackup, recordExportDone } from './backup'

/** iOSは共有シート、非対応環境はダウンロードにフォールバック */
export async function exportBackupToFile(): Promise<void> {
  const backup = await exportBackup()
  const json = JSON.stringify(backup)
  const date = new Date().toISOString().slice(0, 10)
  const file = new File([json], `tanren-backup-${date}.json`, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {})
  } else {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }
  recordExportDone()
}
