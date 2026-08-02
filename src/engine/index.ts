// メニュー生成エンジン(UI非依存の純関数群)
export { calibratedWeightKg, epley1Rm, patternBase1RmFrom } from './calibration'
export { ALL_MUSCLES } from './priority'
export { detectPrSetNumbers, recentPrHistory, setScore, summarizeExercise } from './summary'
export type { CompletedSetInput, ExerciseSummary, PastSetInput, PrHistoryEntry } from './summary'
export { calcFreshness, effectiveRecoveryHours, hoursUntilRecovered, muscleFreshnessMap } from './freshness'
export { growthE1Rm, muscleGrowthMap, sessionE1Rm, sessionMaxReps, weeklyTopGain } from './growth'
export type { WeeklyGain } from './growth'
export {
  chartGoalLineKg,
  coefForDirectEdit,
  detectReachedGoals,
  equipmentE1RmCap,
  goalGapRatio,
  goalPriority,
  goalPriorityScores,
  goalProgress,
  goalTrendByMuscle,
  isCapped,
  nextGoalLevel,
  raiseSuggestionKg,
  targetE1Rm,
} from './goal'
export type { GoalProgress, GoalTrend } from './goal'
export type {
  GrowthMetric,
  GrowthPoint,
  GrowthSessionInput,
  GrowthSetInput,
  MuscleGrowth,
} from './growth'
export { absAttained, absLevelRank, absLevelSatisfied, isCapReached } from './absGoal'
export type { CapCheckSet } from './absGoal'
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
