// エンジン上級者設定(DEC-010)の読み書き。
// エンジン純粋性維持のため、localStorageを読むのはここ(UI/Context組み立て層)だけ。
// エンジンは EngineContext.tuning 経由でオーバーライドを受け取る

import { ENGINE_TUNING_RANGES } from '../constants/engine'
import type { EngineTuning } from '../engine/types'

/** useLocalSettingと同じ書式のキー(tanren:プレフィックス) */
export const ENGINE_TUNING_SETTING_KEY = 'engineTuning'
const STORAGE_KEY = `tanren:${ENGINE_TUNING_SETTING_KEY}`

/** 許容範囲でclampし、数値以外・範囲情報にないキーを落とす */
export function sanitizeEngineTuning(raw: unknown): EngineTuning {
  const result: EngineTuning = {}
  if (!raw || typeof raw !== 'object') return result
  for (const [key, range] of Object.entries(ENGINE_TUNING_RANGES) as [
    keyof EngineTuning,
    { min: number; max: number; default: number },
  ][]) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = Math.min(range.max, Math.max(range.min, Math.round(value)))
    }
  }
  return result
}

/** EngineContext注入用にlocalStorageから読み込む。未設定・不正時はundefined(=全デフォルト) */
export function loadEngineTuning(): EngineTuning | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const tuning = sanitizeEngineTuning(JSON.parse(raw))
    return Object.keys(tuning).length > 0 ? tuning : undefined
  } catch {
    return undefined
  }
}
