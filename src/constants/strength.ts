import type { MovementPattern } from '../db/types'

// 筋力キャリブレーション(ISS-002)の定数。
// 係数はいずれも一般的なストレングス指導の経験則(barbell↔dumbbell換算・%1RMレップ換算)
// に基づく保守的な初期値。ドッグフーディングのフィードバックで調整する前提

/** 筋力の目安として入力できる基準種目 */
export interface RefLift {
  id: string
  name: string
  pattern: MovementPattern
  /**
   * 推定1RM→パターン基準1RM(バーベル相当)への換算係数。
   * バーベル種目は1.0。ダンベル種目は「ダンベル片手1RM ≒ バーベル1RM × 分担率」の
   * 逆数(例: ダンベルベンチ片手 ≒ バーベルベンチの35% → 1/0.35 ≒ 2.9)
   */
  toPatternBase: number
}

export const REF_LIFTS: RefLift[] = [
  // ジムのバーベル種目(そのままパターン基準1RM)
  { id: 'barbell_bench_press', name: 'バーベルベンチプレス', pattern: 'horizontal_press', toPatternBase: 1 },
  { id: 'barbell_overhead_press', name: 'バーベルショルダープレス', pattern: 'vertical_press', toPatternBase: 1 },
  { id: 'barbell_row', name: 'バーベルロウ', pattern: 'row', toPatternBase: 1 },
  { id: 'barbell_deadlift', name: 'デッドリフト', pattern: 'hinge', toPatternBase: 1 },
  { id: 'barbell_squat', name: 'バーベルスクワット', pattern: 'squat', toPatternBase: 1 },
  // 主要ダンベル種目(片手重量で入力)
  // ダンベルペア合計 ≒ バーベルの7〜8割 → 片手 ≒ 35〜40% の下限側を採用(保守的)
  { id: 'dumbbell_bench_press', name: 'ダンベルベンチプレス(片手)', pattern: 'horizontal_press', toPatternBase: 2.9 },
  { id: 'dumbbell_shoulder_press', name: 'ダンベルショルダープレス(片手)', pattern: 'vertical_press', toPatternBase: 2.7 },
  // 片手ロウは体で支えられるため相対的に高重量が扱える → 片手 ≒ バーベルロウの50%
  { id: 'one_hand_row', name: 'ワンハンドダンベルロウ', pattern: 'row', toPatternBase: 2.0 },
  // ゴブレットは保持が制限要因 → 1個 ≒ スクワット1RMの35%
  { id: 'goblet_squat', name: 'ゴブレットスクワット(1個)', pattern: 'squat', toPatternBase: 2.9 },
]

/**
 * パターン基準1RM(バーベル相当)→ ダンベル種目の作業重量(片手・8-12レップ想定)係数。
 * 根拠: 8-12レップの作業重量 ≒ 1RMの70〜75%、ダンベル片手 ≒ バーベルの35〜40%
 *   → 例(水平プレス): 0.35 × 0.6〜0.65(ダンベルの安定性ロス込み) ≒ 0.21
 *   → 指示書の目安「バーベルベンチ1RM × 0.20〜0.22」の中央値と一致
 * isolation / core は基準1RMとの相関が薄いため換算対象外(体重比デフォルトにフォールバック)
 */
export const WORKING_WEIGHT_COEF: Partial<Record<MovementPattern, number>> = {
  horizontal_press: 0.21,
  vertical_press: 0.24,
  row: 0.3,
  hinge: 0.2,
  squat: 0.26,
}

/**
 * パターン内の種目間の強度差を出すための基準係数。
 * 「種目のinitialWeightFactor ÷ この値」でパターン代表種目に対する相対強度になる
 * (例: インクラインプレス0.18 ÷ 0.22 ≒ 0.82倍)
 */
export const PATTERN_BASELINE_FACTOR: Partial<Record<MovementPattern, number>> = {
  horizontal_press: 0.22, // ダンベルベンチプレス
  vertical_press: 0.17, // シーテッドショルダープレス
  row: 0.28, // ワンハンドダンベルロウ
  hinge: 0.3, // ダンベルデッドリフト
  squat: 0.3, // ゴブレットスクワット
}
