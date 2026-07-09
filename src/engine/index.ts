// メニュー生成エンジン(UI非依存の純関数群)
export { calibratedWeightKg, epley1Rm, patternBase1RmFrom } from './calibration'
export { calcFreshness, effectiveRecoveryHours, muscleFreshnessMap } from './freshness'
export { intervalSecFor, purposeForReps } from './interval'
export { initialWeightKg, snapToSteps, suggestWeightReps } from './progression'
export { candidatesByMuscle, isExerciseAvailable, muscleCountForTime, selectMuscles } from './selection'
export {
  alternativesFor,
  estimatedMinutes,
  generateMenu,
  itemDurationSec,
  prAttemptWeightKg,
  prescriptionFor,
} from './menu'
export type {
  EngineContext,
  ExerciseHistoryEntry,
  GeneratedMenu,
  MenuItem,
  MenuRequest,
  MuscleStimulus,
  Prescription,
  SetPerformance,
} from './types'
