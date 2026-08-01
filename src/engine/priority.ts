// 部位定数。旧ギャップ分析(F-03: priorityScores/analyzeGap)はISS-023で撤去済み——
// 優先度はgoal.tsのgoalPriorityScores(DEC-013)がEngineContext経由で担う
import type { MuscleGroup } from '../db/types'

export const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'abs',
  'glutes',
]
