// メニュー生成エンジン(要件F-04)の雛形。Phase 1で実装する。
// UI非依存の純関数として実装し、必ずVitestユニットテストを付ける。

import type { Condition, MuscleGroup } from '../db/types'

export interface MenuRequest {
  /** 今日使える時間(分): 15 / 30 / 45 / 60 / 90 */
  availableMinutes: number
  /** 鍛えたい部位。空配列は「おまかせ」 */
  targetMuscles: MuscleGroup[]
  condition: Condition
}

export interface MenuItem {
  exerciseId: number
  sets: number
  suggestedWeightKg?: number
  suggestedReps: number
  intervalSec: number
}

export interface GeneratedMenu {
  items: MenuItem[]
  /** 生成理由の説明(部位選択の根拠など) */
  rationale: string
}

/**
 * その日の最適メニューを生成する(Phase 1で実装)。
 * 回復モデル→部位決定→種目選択→重量・レップ提案→インターバル指定→コンディション補正の順に組む。
 */
export function generateMenu(_request: MenuRequest): GeneratedMenu {
  // TODO(Phase 1 / WBS 1-3): 実装
  return { items: [], rationale: '' }
}
