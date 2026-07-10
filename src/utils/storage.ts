// 永続ストレージ(ISS-009-1)。
// iOS/ブラウザはストレージ逼迫時にIndexedDBを自動削除し得るため、persist()で保護を要求する

export type PersistState = 'granted' | 'denied' | 'unsupported'

export async function requestPersistentStorage(): Promise<PersistState> {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') {
    return 'unsupported'
  }
  try {
    return (await navigator.storage.persist()) ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** 現在の永続化状態(設定画面の表示用) */
export async function persistedState(): Promise<PersistState> {
  if (!('storage' in navigator) || typeof navigator.storage.persisted !== 'function') {
    return 'unsupported'
  }
  try {
    return (await navigator.storage.persisted()) ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}
