// 腹の段位ゴール行(DEC-018改・spec §2)。5bゲージ行と外形を揃えつつ、
// 中身は係数ゲージではなく「段位バッジ(順不同・gap6pxで切り離し)+条件チェックリスト」。
// 進捗率(%)・「n/3」表記は出さない(段位は離散量・積み上がり順が一定でないため)
import { useLiveQuery } from 'dexie-react-hooks'
import { ABS_CONDITIONS, ABS_LEVELS } from '../constants/goals'
import { ABS_GOAL_COPY, MUSCLE_GOAL_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import { db } from '../db/db'
import { listClearedAbsConditions } from '../db/queries'
import type { AbsCondition, GoalLevel, GoalMode } from '../db/types'
import { absAttained, absLevelSatisfied } from '../engine'

export interface AbsGoalDraft {
  level: GoalLevel
  mode: GoalMode
}

/**
 * 段位バッジ×3(spec §2-3)。設定①(タップ可)と腹詳細(表示のみ)で共用。
 * 状態: 選択中(molten)/到達済み(steel+✓)/未到達(idle)。選択中が優先
 */
export function AbsTierBadges({
  cleared,
  selectedLevel,
  onPick,
}: {
  cleared: Set<AbsCondition>
  selectedLevel?: GoalLevel
  onPick?: (level: GoalLevel) => void
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        {ABS_LEVELS.map((level) => {
          const selected = selectedLevel === level
          const attained = absLevelSatisfied(cleared, level)
          const style = selected
            ? {
                border: '1.5px solid var(--color-molten)',
                background: 'rgb(255 92 26/.10)',
                color: 'var(--color-text-hot)',
                boxShadow: '0 0 10px rgb(255 92 26/.35)',
              }
            : attained
              ? {
                  border: '1.5px solid var(--color-steel-line)',
                  background: 'rgb(201 183 156/.06)',
                  color: 'var(--color-steel)',
                }
              : { border: '1.5px solid #241812', color: 'var(--color-tab-idle)' }
          const label = `${!selected && attained ? '✓ ' : ''}${ABS_GOAL_COPY.levelLabels[level]}`
          return onPick ? (
            <button
              key={level}
              type="button"
              aria-label={`${MUSCLE_GROUP_LABELS.abs} ${ABS_GOAL_COPY.levelLabels[level]}`}
              onClick={(e) => {
                e.stopPropagation()
                onPick(level)
              }}
              className="h-[26px] flex-1 rounded-[8px] text-[11px] font-bold"
              style={style}
            >
              {label}
            </button>
          ) : (
            <span
              key={level}
              className="flex h-[26px] flex-1 items-center justify-center rounded-[8px] text-[11px] font-bold"
              style={style}
            >
              {label}
            </span>
          )
        })}
      </div>
      {/* 条件キャプション(8px Mono) */}
      <div className="mt-0.5 flex gap-1.5">
        {ABS_LEVELS.map((level) => (
          <span
            key={level}
            className="label-mono flex-1 text-center text-[8px] tracking-normal text-[#4A3A2C]"
          >
            {ABS_GOAL_COPY.levelConditionCaptions[level]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 条件チェックリスト(spec §2-4)。これが進捗表示の本体 */
function AbsConditionChecklist({
  cleared,
  selectedLevel,
  reached,
}: {
  cleared: Set<AbsCondition>
  selectedLevel: GoalLevel
  reached: boolean
}) {
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const repMaxByName = new Map((exercises ?? []).map((e) => [e.name, e.repRangeMax]))
  const bodyweightCleared = ['C1', 'C2'].filter((c) => cleared.has(c as AbsCondition)).length
  const weightedCleared = cleared.has('C3') ? 1 : 0
  return (
    <div className="mt-2 flex flex-col gap-[5px]">
      {ABS_CONDITIONS.map((def) => {
        const done = cleared.has(def.condition)
        // レッグレイズ(C2)は昇格提案なし=上限のまま継続する状態を#8A431Cの枠で静かに示す
        const border = done
          ? def.condition === 'C2'
            ? '1px solid #8A431C'
            : '1px solid var(--color-steel-line)'
          : '1px solid #241812'
        return (
          <div
            key={def.condition}
            className="flex items-center gap-2 rounded-[8px] px-2.5 py-1.5"
            style={{ border, background: done ? 'rgb(201 183 156/.07)' : undefined }}
          >
            <span
              className="flex h-[15px] w-[15px] items-center justify-center rounded-[4px] text-[10px] font-bold"
              style={
                done
                  ? {
                      border: '1.5px solid var(--color-steel)',
                      background: 'var(--color-steel)',
                      color: 'var(--color-forge-black)',
                    }
                  : { border: '1.5px solid #3A2213' }
              }
            >
              {done ? '✓' : ''}
            </span>
            <span
              className="flex-1 text-[11px] font-bold"
              style={{ color: done ? 'var(--color-steel)' : 'var(--color-ink-dim)' }}
            >
              {def.exerciseName}
            </span>
            <span
              className="label-mono text-[9px] tracking-normal"
              style={{ color: done ? 'var(--color-steel-line)' : '#4A3A2C' }}
            >
              {ABS_GOAL_COPY.conditionDetail(def.weighted, repMaxByName.get(def.exerciseName) ?? 0)}
            </span>
          </div>
        )
      })}
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-[#6B5A4C]">{ABS_GOAL_COPY.orderNote}</span>
        <span
          className="label-mono text-[10px] font-bold tracking-normal"
          style={{ color: reached ? '#FFB300' : 'var(--color-ink-mid)' }}
        >
          {reached
            ? MUSCLE_GOAL_COPY.reached
            : selectedLevel === 'big'
              ? ABS_GOAL_COPY.countWeighted(weightedCleared)
              : ABS_GOAL_COPY.countBodyweight(bodyweightCleared)}
        </span>
      </div>
    </div>
  )
}

/**
 * 設定①の腹行(spec §2-2)。5部位ゲージの直後に置く。外形はGoalGaugeRowと共通。
 * 係数軸を持たないため GOAL_COEF / targetE1Rm / isCapped の経路には載せない
 */
export default function AbsGoalRow({
  draft,
  reached,
  focused,
  onFocus,
  onPickLevel,
}: {
  draft?: AbsGoalDraft
  /** 状態4(到達・判定待ち)。行タップで鏡チェック */
  reached: boolean
  focused: boolean
  onFocus: () => void
  onPickLevel: (level: GoalLevel) => void
}) {
  const cleared = useLiveQuery(() => listClearedAbsConditions()) ?? new Set<AbsCondition>()
  const attained = absAttained(cleared)
  const maintain = draft?.mode === 'maintain'

  const borderColor = maintain
    ? 'var(--color-steel-line)'
    : reached
      ? '#FFB300'
      : focused
        ? '#FF5C1A'
        : '#241812'
  const rowBg = maintain
    ? 'rgba(201,183,156,.05)'
    : reached
      ? 'rgba(255,179,0,.07)'
      : focused
        ? 'rgba(255,92,26,.06)'
        : 'transparent'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => e.key === 'Enter' && onFocus()}
      className={`rounded-card px-4 py-3 text-left ${reached ? 'anim-pulse' : ''}`}
      style={{ border: `1px solid ${borderColor}`, background: rowBg }}
    >
      {/* 1段目: 部位名+段位(kg表記なし。到達段位は段位名で表す: spec §2-4) */}
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-ink">{MUSCLE_GROUP_LABELS.abs}</span>
        <span
          className="label-mono text-xs font-bold tracking-normal"
          style={{
            color: maintain
              ? 'var(--color-steel)'
              : draft
                ? focused
                  ? '#FF7A33'
                  : '#D9CFC6'
                : '#6B5A4C',
          }}
        >
          {draft ? ABS_GOAL_COPY.levelLabels[draft.level] : MUSCLE_GOAL_COPY.unset}
          {attained !== null && ` ・ ${ABS_GOAL_COPY.attained(ABS_GOAL_COPY.levelLabels[attained])}`}
          {maintain && ` ${MUSCLE_GOAL_COPY.maintainMark}`}
        </span>
      </div>

      {/* 2段目: 段位バッジ(高さ26px・階段状にしない) */}
      <div className="mt-1.5">
        <AbsTierBadges cleared={cleared} selectedLevel={draft?.level} onPick={onPickLevel} />
      </div>

      {/* 3段目: 条件チェックリスト(設定済みのみ) */}
      {draft && (
        <AbsConditionChecklist cleared={cleared} selectedLevel={draft.level} reached={reached} />
      )}

      {/* 最終段: 生活言語キャプション */}
      {draft && (
        <p className="mt-1.5 border-t border-[#1A110B] pt-1.5 text-[11px] leading-normal text-ink-dim">
          {ABS_GOAL_COPY.captions[draft.level]}
        </p>
      )}
    </div>
  )
}
