import type { MuscleGroup } from '../db/types'

// 回復係数(要件F-04)。Eiichiの体感フィードバックで調整が入る前提の定数ファイル

/** 基準回復時間(時間): 大筋群72h / 小筋群48h。上級者設定で上書き可能なデフォルト値(DEC-010) */
export const RECOVERY_HOURS = {
  large: 72,
  small: 48,
} as const

export type MuscleSize = keyof typeof RECOVERY_HOURS

export const MUSCLE_SIZE: Record<MuscleGroup, MuscleSize> = {
  chest: 'large',
  back: 'large',
  legs: 'large',
  glutes: 'large',
  shoulders: 'small',
  arms: 'small',
  abs: 'small',
}

export function recoveryHoursFor(muscle: MuscleGroup): number {
  return RECOVERY_HOURS[MUSCLE_SIZE[muscle]]
}
