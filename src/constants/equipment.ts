import type { Equipment } from '../db/types'

// Eiichiの初期器具(要件定義書 §4)
// 重量ステップ配列は仮値。実物の目盛り確認後に設定画面で編集可能にする(DEC-002)
export const DUMBBELL_STEPS_KG = [
  2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24,
]

export const INITIAL_EQUIPMENT: Omit<Equipment, 'id'>[] = [
  {
    name: '可変ダンベル',
    type: 'dumbbell',
    quantity: 2,
    weightStepsKg: DUMBBELL_STEPS_KG,
    isActive: 1,
    note: '重量ステップは設定画面の編集ウィザードで実物に合わせて調整可能',
  },
  {
    name: 'アジャスタブルベンチ',
    type: 'bench',
    quantity: 1,
    minAngleDeg: -20,
    maxAngleDeg: 90,
    isActive: 1,
    note: 'デクライン〜フラット〜インクライン〜シーテッド全対応',
  },
  {
    name: '自重・床',
    type: 'bodyweight',
    quantity: 1,
    isActive: 1,
  },
]
