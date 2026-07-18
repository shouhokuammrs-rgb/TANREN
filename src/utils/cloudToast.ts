// クラウド同期結果→トースト表示の対応(Phase 5)。設定画面とセッション保存フックで共用
import { CLOUD_COPY } from '../constants/copy'
import type { CloudSyncResult } from './cloudBackup'
import { showToast } from './toast'

export function toastSyncResult(result: CloudSyncResult): void {
  if (result === 'uploaded') showToast(CLOUD_COPY.syncDone, 'success')
  else if (result === 'offline') showToast(CLOUD_COPY.syncOffline, 'info')
  else if (result === 'error') showToast(CLOUD_COPY.syncError, 'error')
}
