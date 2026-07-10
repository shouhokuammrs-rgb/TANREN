// メニュー生成エンジン(UI非依存の純関数群)
export { calibratedWeightKg, epley1Rm, patternBase1RmFrom } from './calibration'
export { ALL_MUSCLES, analyzeGap, priorityScores } from './priority'
export type { GapAnalysis } from './priority'
export { detectPrSetNumbers, setScore, summarizeExercise } from './summary'
export type { CompletedSetInput, ExerciseSummary, PastSetInput } from './summary'
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
