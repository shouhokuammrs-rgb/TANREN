import { useState } from 'react'

/**
 * 端末ローカルのUI設定(localStorage)。
 * トレデータはDexie、UI設定はここ、と使い分ける
 */
export function useLocalSetting<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const storageKey = `tanren:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw === null ? defaultValue : (JSON.parse(raw) as T)
    } catch {
      return defaultValue
    }
  })
  const update = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // プライベートブラウズ等で失敗しても動作は継続
    }
  }
  return [value, update]
}
