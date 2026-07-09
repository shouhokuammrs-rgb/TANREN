import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db/types'
import { initialWeightKg, snapToSteps, suggestWeightReps } from './progression'
import type { ExerciseHistoryEntry } from './types'

const STEPS = [2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24]

const dumbbellPress: Exercise = {
  id: 1,
  name: 'ダンベルベンチプレス',
  primaryMuscle: 'chest',
  muscleGroups: ['chest'],
  movementType: 'compound',
  movementPattern: 'horizontal_press',
  requiredEquipment: ['dumbbell', 'bench'],
  repRangeMin: 6,
  repRangeMax: 12,
  initialWeightFactor: 0.22,
  isActive: 1,
  formCues: [],
  commonMistake: '',
}

const pushup: Exercise = {
  id: 2,
  name: 'プッシュアップ',
  primaryMuscle: 'chest',
  muscleGroups: ['chest'],
  movementType: 'compound',
  movementPattern: 'horizontal_press',
  requiredEquipment: ['bodyweight'],
  repRangeMin: 10,
  repRangeMax: 20,
  isActive: 1,
  formCues: [],
  commonMistake: '',
}

function history(sets: { weightKg?: number; reps: number; achieved: boolean }[]): ExerciseHistoryEntry {
  return { exerciseId: 1, performedAt: new Date('2026-07-01T10:00:00'), sets }
}

describe('snapToSteps(重量スナップ)', () => {
  it('downは希望以下で最大の刻み', () => {
    expect(snapToSteps(12.8, STEPS, 'down')).toBe(11.5)
    expect(snapToSteps(13, STEPS, 'down')).toBe(13)
  })

  it('最小刻み未満はdownでも最小値', () => {
    expect(snapToSteps(1, STEPS, 'down')).toBe(2.5)
  })

  it('upは希望超で最小の刻み。最大重量では頭打ち', () => {
    expect(snapToSteps(13, STEPS, 'up')).toBe(14.5)
    expect(snapToSteps(24, STEPS, 'up')).toBe(24)
  })
})

describe('初回種目(ログゼロ)の保守的提案', () => {
  it('体重×係数を下方向スナップした初期重量+レップ下限', () => {
    // 58kg × 0.22 = 12.76 → 11.5kgに切り下げ
    expect(suggestWeightReps(dumbbellPress, undefined, 58, STEPS)).toEqual({
      weightKg: 11.5,
      reps: 6,
    })
  })

  it('自重種目は重量なし+レップ下限', () => {
    expect(suggestWeightReps(pushup, undefined, 58, STEPS)).toEqual({
      weightKg: undefined,
      reps: 10,
    })
  })

  it('initialWeightKgは自重種目でundefined', () => {
    expect(initialWeightKg(pushup, 58, STEPS)).toBeUndefined()
  })
})

describe('ダブルプログレッション', () => {
  it('レップ上限到達→次の重量ステップ+レップ下限から再開', () => {
    const last = history([
      { weightKg: 11.5, reps: 12, achieved: true },
      { weightKg: 11.5, reps: 12, achieved: true },
      { weightKg: 11.5, reps: 12, achieved: true },
    ])
    expect(suggestWeightReps(dumbbellPress, last, 58, STEPS)).toEqual({
      weightKg: 13,
      reps: 6,
    })
  })

  it('全セット達成だが上限未到達→同重量でレップ+1', () => {
    const last = history([
      { weightKg: 11.5, reps: 9, achieved: true },
      { weightKg: 11.5, reps: 8, achieved: true },
      { weightKg: 11.5, reps: 8, achieved: true },
    ])
    // 最小レップ8基準で+1
    expect(suggestWeightReps(dumbbellPress, last, 58, STEPS)).toEqual({
      weightKg: 11.5,
      reps: 9,
    })
  })

  it('未達成セットあり→同重量・同目標で再挑戦', () => {
    const last = history([
      { weightKg: 13, reps: 8, achieved: true },
      { weightKg: 13, reps: 6, achieved: false },
      { weightKg: 13, reps: 6, achieved: false },
    ])
    expect(suggestWeightReps(dumbbellPress, last, 58, STEPS)).toEqual({
      weightKg: 13,
      reps: 6,
    })
  })

  it('最大重量でレップ上限到達→頭打ち(同重量・上限レップ)', () => {
    const last = history([
      { weightKg: 24, reps: 12, achieved: true },
      { weightKg: 24, reps: 12, achieved: true },
    ])
    expect(suggestWeightReps(dumbbellPress, last, 58, STEPS)).toEqual({
      weightKg: 24,
      reps: 12,
    })
  })

  it('器具設定変更で過去重量が刻みに無い場合もスナップし直す', () => {
    const last = history([{ weightKg: 12, reps: 8, achieved: true }])
    const result = suggestWeightReps(dumbbellPress, last, 58, STEPS)
    expect(STEPS).toContain(result.weightKg)
  })

  it('自重種目がレップ上限到達→上限で頭打ち', () => {
    const last: ExerciseHistoryEntry = {
      exerciseId: 2,
      performedAt: new Date('2026-07-01T10:00:00'),
      sets: [{ reps: 20, achieved: true }],
    }
    expect(suggestWeightReps(pushup, last, 58, STEPS)).toEqual({ reps: 20 })
  })
})
