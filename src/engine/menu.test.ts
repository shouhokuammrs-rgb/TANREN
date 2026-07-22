import { describe, expect, it } from 'vitest'
import { INITIAL_EXERCISES } from '../constants/exercises'
import type { MuscleGroup } from '../db/types'
import {
  alternativesFor,
  generateMenu,
  isShortenedMenu,
  prescriptionFor,
  recoveringListLabel,
} from './menu'
import { muscleFreshnessMap } from './freshness'
import { candidatesByMuscle, selectMuscles } from './selection'
import type { EngineContext, MenuRequest, MuscleStimulus } from './types'

const STEPS = [2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24]
const NOW = new Date('2026-07-10T10:00:00')

const EXERCISES = INITIAL_EXERCISES.map((e, i) => ({ ...e, id: i + 1 }))

function makeCtx(overrides: Partial<EngineContext> = {}): EngineContext {
  return {
    now: NOW,
    bodyWeightKg: 58,
    dumbbellStepsKg: STEPS,
    bench: { minAngleDeg: -20, maxAngleDeg: 90 },
    exercises: EXERCISES,
    lastPerformance: new Map(),
    muscleStimuli: [],
    activeInjuries: [],
    ...overrides,
  }
}

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 3_600_000)
}

const ALL_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs', 'glutes']

/** 全部位を直近1時間前に高ボリュームで刺激した状態 */
function allFatiguedStimuli(): MuscleStimulus[] {
  return ALL_MUSCLES.map((muscle) => ({ muscle, at: hoursAgo(1), setCount: 10 }))
}

describe('generateMenu: ログゼロ(境界値)', () => {
  const menu = generateMenu(makeCtx(), {
    availableMinutes: 45,
    targetMuscles: [],
    condition: 'normal',
  })

  it('初回でもメニューが生成される', () => {
    expect(menu.items.length).toBeGreaterThan(0)
    expect(menu.muscles.length).toBeGreaterThan(0)
  })

  it('ダンベル種目の提案重量は必ず器具設定の刻みの値', () => {
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    for (const item of menu.items) {
      const ex = byId.get(item.exerciseId)!
      if (ex.requiredEquipment.includes('dumbbell')) {
        expect(STEPS).toContain(item.suggestedWeightKg)
      } else {
        expect(item.suggestedWeightKg).toBeUndefined()
      }
    }
  })

  it('レップは種目のレップ帯下限(保守的開始)', () => {
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    for (const item of menu.items) {
      expect(item.suggestedReps).toBe(byId.get(item.exerciseId)!.repRangeMin)
    }
  })
})

describe('generateMenu: 時間15分(境界値)', () => {
  const menu = generateMenu(makeCtx(), {
    availableMinutes: 15,
    targetMuscles: [],
    condition: 'normal',
  })

  it('最低1種目は提案され、見積り時間が15分に収まる', () => {
    expect(menu.items.length).toBeGreaterThanOrEqual(1)
    expect(menu.estimatedMinutes).toBeLessThanOrEqual(15)
  })
})

describe('generateMenu: 全部位疲労時(DEC-006: 休養日提案)', () => {
  const ctx = makeCtx({ muscleStimuli: allFatiguedStimuli() })
  const menu = generateMenu(ctx, {
    availableMinutes: 45,
    targetMuscles: [],
    condition: 'normal',
  })

  it('繰り上げフォールバックせず、空メニュー+休養日フラグを返す', () => {
    expect(menu.isRestDay).toBe(true)
    expect(menu.items).toHaveLength(0)
    expect(menu.muscles).toHaveLength(0)
    expect(menu.rationale).toContain('休養日')
  })
})

describe('generateMenu: 回復優先の短縮(DEC-006)', () => {
  // chest以外を24時間前に高ボリューム刺激(全て100%未満)。60分希望=3部位要求だが100%はchestのみ
  const ctx = makeCtx({
    muscleStimuli: ALL_MUSCLES.filter((m) => m !== 'chest').map((muscle) => ({
      muscle,
      at: hoursAgo(24),
      setCount: 8,
    })),
  })
  const menu = generateMenu(ctx, {
    availableMinutes: 60,
    targetMuscles: [],
    condition: 'normal',
  })

  it('回復中部位を含めず、短縮フラグと除外リストが立つ', () => {
    expect(menu.muscles).toEqual(['chest'])
    expect(menu.isShortened).toBe(true)
    expect(menu.isRestDay).toBe(false)
    expect(menu.requestedMinutes).toBe(60)
    expect(menu.estimatedMinutes).toBeLessThan(60 * 0.8)
    expect(menu.excludedRecoveringMuscles.map((e) => e.muscle)).not.toContain('chest')
    expect(menu.excludedRecoveringMuscles).toHaveLength(ALL_MUSCLES.length - 1)
  })

  it('説明文は指定文言「今日は◯分のメニューになります。理由:…が回復中のため」', () => {
    expect(menu.rationale).toBe(
      `今日は${menu.estimatedMinutes}分のメニューになります。理由:${recoveringListLabel(menu.excludedRecoveringMuscles)}が回復中のため`,
    )
  })

  it('100%部位のみで時間充足なら短縮通知なし(回帰)', () => {
    const fullMenu = generateMenu(makeCtx(), {
      availableMinutes: 45,
      targetMuscles: [],
      condition: 'normal',
    })
    expect(fullMenu.isShortened).toBe(false)
    expect(fullMenu.excludedRecoveringMuscles).toEqual([])
    expect(fullMenu.rationale).toContain('今日の対象')
  })
})

describe('generateMenu: 上級者設定(DEC-010)', () => {
  it('基本セット数4 → 生成メニューの全種目がsets=4', () => {
    const menu = generateMenu(makeCtx({ tuning: { defaultSets: 4 } }), {
      availableMinutes: 90,
      targetMuscles: [],
      condition: 'normal',
    })
    expect(menu.items.length).toBeGreaterThan(0)
    expect(menu.items.every((i) => i.sets === 4)).toBe(true)
  })

  it('tuning未指定は従来と同一挙動(回帰: sets=3)', () => {
    const menu = generateMenu(makeCtx(), {
      availableMinutes: 90,
      targetMuscles: [],
      condition: 'normal',
    })
    expect(menu.items.every((i) => i.sets === 3)).toBe(true)
  })

  it('回復予測(§3-1): soonestRecoveryは最短部位を返し、回復時間オーバーライドを反映する', () => {
    // backを36h前・中ボリューム(係数1)で刺激 → デフォルト72hでは50%・残り36h
    const stimuli: MuscleStimulus[] = [{ muscle: 'back', at: hoursAgo(36), setCount: 8 }]
    const request: MenuRequest = { availableMinutes: 60, targetMuscles: [], condition: 'normal' }

    const menu = generateMenu(makeCtx({ muscleStimuli: stimuli }), request)
    expect(menu.soonestRecovery?.muscle).toBe('back')
    expect(menu.soonestRecovery?.hoursUntilRecovered).toBeCloseTo(36, 5)

    // 回復時間48hに短縮 → 36h経過で75%・残り12h(freshnessと予測の両方に反映)
    const tuned = generateMenu(
      makeCtx({ muscleStimuli: stimuli, tuning: { largeRecoveryHours: 48 } }),
      request,
    )
    expect(tuned.excludedRecoveringMuscles.find((e) => e.muscle === 'back')?.freshness).toBe(75)
    expect(tuned.soonestRecovery?.hoursUntilRecovered).toBeCloseTo(12, 5)
  })

  it('対象行の分離(§3-2): 短縮時もmuscleSummaryで「今日の対象」を参照できる', () => {
    const ctx = makeCtx({
      muscleStimuli: ALL_MUSCLES.filter((m) => m !== 'chest').map((muscle) => ({
        muscle,
        at: hoursAgo(24),
        setCount: 8,
      })),
    })
    const menu = generateMenu(ctx, { availableMinutes: 60, targetMuscles: [], condition: 'normal' })
    expect(menu.isShortened).toBe(true)
    expect(menu.rationale).toContain('回復中のため')
    expect(menu.muscleSummary).toBe('今日の対象: 胸(回復100%)')
  })
})

describe('generateMenu: 強調ローテーション(DEC-012・実マスタ)', () => {
  it('前回midなら胸の先頭候補が未出現の強調(インクライン=upper)に切り替わる', () => {
    const ctx = makeCtx({ recentEmphasis: new Map([['chest', ['mid']]]) })
    const menu = generateMenu(ctx, { availableMinutes: 30, targetMuscles: ['chest'], condition: 'normal' })
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    const first = byId.get(menu.items[0].exerciseId)!
    expect(first.name).toBe('インクラインダンベルプレス')
    expect(menu.items[0].emphasis).toBe('upper')
  })

  it('recentEmphasisなしは従来の並び(回帰: フラットプレスが先頭)', () => {
    const menu = generateMenu(makeCtx(), { availableMinutes: 30, targetMuscles: ['chest'], condition: 'normal' })
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    expect(byId.get(menu.items[0].exerciseId)!.name).toBe('ダンベルベンチプレス')
  })

  it('alternativesForと生成(candidatesByMuscle)の並びが一貫する', () => {
    const ctx = makeCtx({ recentEmphasis: new Map([['chest', ['mid', 'upper']]]) })
    const candidates = candidatesByMuscle(ctx, ['chest'], 'normal').get('chest')!
    const alternatives = alternativesFor(ctx, 'chest', [])
    expect(alternatives.slice(0, candidates.length).map((e) => e.id)).toEqual(
      candidates.map((e) => e.id),
    )
  })

  it('未出現のisolation(インクラインフライ)が出現済みcompound(フラットプレス)を追い越さない', () => {
    const ctx = makeCtx({ recentEmphasis: new Map([['chest', ['mid']]]) })
    const names = alternativesFor(ctx, 'chest', []).map((e) => e.name)
    expect(names.indexOf('ダンベルベンチプレス')).toBeLessThan(
      names.indexOf('インクラインダンベルフライ'),
    )
  })
})

describe('recoveringListLabel / isShortenedMenu(DEC-006)', () => {
  const ex = (muscles: MuscleGroup[]) => muscles.map((muscle) => ({ muscle, freshness: 50 }))

  it('部位名の列挙は3件まで「と」区切り、4件以上は先頭3件+「ほか」', () => {
    expect(recoveringListLabel(ex(['chest', 'back']))).toBe('胸と背中')
    expect(recoveringListLabel(ex(['chest', 'back', 'legs']))).toBe('胸と背中と脚')
    expect(recoveringListLabel(ex(['chest', 'back', 'legs', 'arms']))).toBe('胸、背中、脚ほか')
  })

  it('短縮判定は希望時間×SHORTENED_NOTICE_RATIO(0.8)の境界で切り替わる', () => {
    expect(isShortenedMenu(36, 45, true)).toBe(false) // ちょうど0.8倍は短縮扱いしない
    expect(isShortenedMenu(35, 45, true)).toBe(true)
    expect(isShortenedMenu(10, 45, false)).toBe(false) // 除外部位がなければ短縮通知なし
  })
})

describe('generateMenu: 部位指定とフレッシュネス警告', () => {
  it('指定部位が回復途中なら警告付きでそのまま採用', () => {
    const ctx = makeCtx({ muscleStimuli: [{ muscle: 'chest', at: hoursAgo(12), setCount: 8 }] })
    const menu = generateMenu(ctx, {
      availableMinutes: 45,
      targetMuscles: ['chest'],
      condition: 'normal',
    })
    expect(menu.muscles).toEqual(['chest'])
    // ISS-011: 人体図と同じ状態語(回復中/休息推奨)+%+軽め推奨の文言
    expect(menu.warnings.some((w) => /(回復中|休息推奨)\(\d+%\)。軽めを推奨/.test(w))).toBe(true)
  })

  it('おまかせは疲労部位を避けてフレッシュな部位を選ぶ', () => {
    const ctx = makeCtx({ muscleStimuli: [{ muscle: 'chest', at: hoursAgo(6), setCount: 10 }] })
    const menu = generateMenu(ctx, {
      availableMinutes: 45,
      targetMuscles: [],
      condition: 'normal',
    })
    expect(menu.muscles).not.toContain('chest')
  })
})

describe('generateMenu: 痛みフラグの自動回避(F-06連携)', () => {
  it('痛みフラグ部位は指定しても除外され、警告が出る', () => {
    const ctx = makeCtx({ activeInjuries: ['shoulders'] })
    const menu = generateMenu(ctx, {
      availableMinutes: 45,
      targetMuscles: ['shoulders', 'legs'],
      condition: 'normal',
    })
    expect(menu.muscles).toEqual(['legs'])
    expect(menu.warnings.some((w) => w.includes('痛み'))).toBe(true)
  })

  it('痛みフラグ部位をサブで使う種目も除外される(肩→ベンチプレス除外)', () => {
    const ctx = makeCtx({ activeInjuries: ['shoulders'] })
    const menu = generateMenu(ctx, {
      availableMinutes: 60,
      targetMuscles: ['chest'],
      condition: 'normal',
    })
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    for (const item of menu.items) {
      expect(byId.get(item.exerciseId)!.muscleGroups).not.toContain('shoulders')
    }
  })
})

describe('generateMenu: コンディション補正(F-04-6)', () => {
  const request: Omit<MenuRequest, 'condition'> = { availableMinutes: 60, targetMuscles: ['chest', 'back'] }

  it('疲れ気味は普通より総セット数が約20%減る', () => {
    const normal = generateMenu(makeCtx(), { ...request, condition: 'normal' })
    const tired = generateMenu(makeCtx(), { ...request, condition: 'tired' })
    const total = (m: typeof normal) => m.items.reduce((s, i) => s + i.sets, 0)
    expect(total(tired)).toBeLessThan(total(normal))
  })

  it('疲れ気味は高重量種目(低レップ帯)を回避する', () => {
    const tired = generateMenu(makeCtx(), { ...request, condition: 'tired' })
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    for (const item of tired.items) {
      expect(byId.get(item.exerciseId)!.repRangeMax).toBeGreaterThan(8)
    }
  })

  it('絶好調はコンパウンド種目1つにPR挑戦フラグが付く', () => {
    const great = generateMenu(makeCtx(), { ...request, condition: 'great' })
    expect(great.items.filter((i) => i.isPrAttempt).length).toBe(1)
  })
})

describe('generateMenu: 器具フィルタ', () => {
  it('ベンチなしではベンチ必須種目が選ばれない', () => {
    const ctx = makeCtx({ bench: undefined })
    const menu = generateMenu(ctx, {
      availableMinutes: 60,
      targetMuscles: ['chest'],
      condition: 'normal',
    })
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    for (const item of menu.items) {
      expect(byId.get(item.exerciseId)!.requiredEquipment).not.toContain('bench')
    }
  })

  it('ベンチ角度範囲外の種目は除外される(0°〜45°ならショルダープレス90°は不可)', () => {
    const ctx = makeCtx({ bench: { minAngleDeg: 0, maxAngleDeg: 45 } })
    const menu = generateMenu(ctx, {
      availableMinutes: 60,
      targetMuscles: ['shoulders'],
      condition: 'normal',
    })
    const byId = new Map(EXERCISES.map((e) => [e.id, e]))
    for (const item of menu.items) {
      const angle = byId.get(item.exerciseId)!.benchAngleDeg
      if (angle !== undefined) {
        expect(angle).toBeGreaterThanOrEqual(0)
        expect(angle).toBeLessThanOrEqual(45)
      }
    }
  })
})

describe('alternativesFor / prescriptionFor(入れ替え・追加用)', () => {
  it('同部位の代替候補から現在の種目が除外される', () => {
    const ctx = makeCtx()
    const chest = EXERCISES.filter((e) => e.primaryMuscle === 'chest')
    const alts = alternativesFor(ctx, 'chest', [chest[0].id!])
    expect(alts.length).toBeGreaterThan(0)
    expect(alts.map((e) => e.id)).not.toContain(chest[0].id)
  })

  it('代替種目にも刻みにスナップした処方が付く', () => {
    const ctx = makeCtx()
    const ex = EXERCISES.find((e) => e.name === 'ダンベルフライ')!
    const p = prescriptionFor(ex, ctx)
    expect(STEPS).toContain(p.suggestedWeightKg)
    expect(p.intervalSec).toBe(90) // 10レップ=筋肥大・アイソレーション
  })
})

describe('selectMuscles / muscleFreshnessMap(単体)', () => {
  it('刺激履歴のない部位は100%', () => {
    const map = muscleFreshnessMap(makeCtx())
    for (const m of ALL_MUSCLES) expect(map[m]).toBe(100)
  })

  it('高ボリューム刺激は回復時間が延びる(72h経過でも100%未満)', () => {
    const ctx = makeCtx({ muscleStimuli: [{ muscle: 'chest', at: hoursAgo(72), setCount: 12 }] })
    expect(muscleFreshnessMap(ctx).chest).toBeLessThan(100)
  })

  it('低ボリューム刺激は早く回復する(62h経過で100%)', () => {
    const ctx = makeCtx({ muscleStimuli: [{ muscle: 'chest', at: hoursAgo(62), setCount: 3 }] })
    expect(muscleFreshnessMap(ctx).chest).toBe(100)
  })

  it('おまかせ+15分は1部位のみ', () => {
    const ctx = makeCtx()
    const { muscles } = selectMuscles(ctx, [], 15, muscleFreshnessMap(ctx))
    expect(muscles.length).toBe(1)
  })
})
