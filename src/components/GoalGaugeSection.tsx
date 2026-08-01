// 部位別ゴール設定(DEC-013 / 5b「目盛」)。視覚仕様の正: docs/design/handoff/5b_goal_model_handoff.md
// ゲージ一望+体重ステッパー連動。X座標は maxV = max(がっつり目標, 上限) × 1.14 で正規化し、
// 体重変更でノッチ・現在地・スタートは動くが上限帯だけ33.6kgの位置に留まる(=本UIの主張)
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  GOAL_COEF,
  GOAL_TARGET_MUSCLES,
  type GoalTargetMuscle,
} from '../constants/goals'
import { MUSCLE_GOAL_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import { db } from '../db/db'
import { addBodyWeight, loadGrowthSessions, saveMuscleGoal } from '../db/queries'
import type { GoalLevel, GoalMode } from '../db/types'
import {
  coefForDirectEdit,
  equipmentE1RmCap,
  goalProgress,
  goalTrendByMuscle,
  isCapped,
  targetE1Rm,
} from '../engine'
import { showToast } from '../utils/toast'

const LEVELS: GoalLevel[] = ['toned', 'solid', 'big']

interface GoalDraft {
  level: GoalLevel
  coef: number
  mode: GoalMode
}

/** X座標の正規化(仕様§3): x = min(97, 値/maxV×100)% */
function xPct(value: number, maxV: number): number {
  return Math.min(97, (value / maxV) * 100)
}

export default function GoalGaugeSection() {
  const storedGoals = useLiveQuery(() => db.muscle_goals.toArray())
  const dumbbell = useLiveQuery(() =>
    db.equipment.where('type').equals('dumbbell').first(),
  )
  const profile = useLiveQuery(() => db.profiles.orderBy('id').first())
  const growthSessions = useLiveQuery(() => loadGrowthSessions())
  const trend = useMemo(
    () => goalTrendByMuscle(growthSessions ?? [], new Date()),
    [growthSessions],
  )

  const [drafts, setDrafts] = useState<Partial<Record<GoalTargetMuscle, GoalDraft>>>({})
  const [focused, setFocused] = useState<GoalTargetMuscle>('chest')
  const [weightDraft, setWeightDraft] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [dirty, setDirty] = useState(false)

  // DB値でドラフト初期化(保存済みゴール+現在体重)
  useEffect(() => {
    if (storedGoals === undefined) return
    setDrafts((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const init: Partial<Record<GoalTargetMuscle, GoalDraft>> = {}
      for (const g of storedGoals) {
        init[g.muscle as GoalTargetMuscle] = { level: g.level, coef: g.coef, mode: g.mode }
      }
      return init
    })
  }, [storedGoals])

  const weightKg = weightDraft ?? profile?.weightKg ?? 58
  const capKg = equipmentE1RmCap(dumbbell?.weightStepsKg ?? [])

  const pickLevel = (muscle: GoalTargetMuscle, level: GoalLevel) => {
    setFocused(muscle)
    setDrafts((prev) => ({
      ...prev,
      [muscle]: { level, coef: GOAL_COEF[muscle][level], mode: prev[muscle]?.mode ?? 'growth' },
    }))
    setDirty(true)
  }

  const stepWeight = (direction: 1 | -1) => {
    // INS §6: ±0.5kg刻み・範囲40〜120kg
    setWeightDraft(Math.min(120, Math.max(40, weightKg + direction * 0.5)))
    setDirty(true)
  }

  const commitDirectEdit = () => {
    const kg = Math.round(Number(editValue) * 2) / 2 // 0.5kg刻み丸め
    setEditOpen(false)
    if (!Number.isFinite(kg) || kg <= 0) return
    const current = drafts[focused]
    if (!current) return
    // DEC-013: 固定kg保存禁止。編集kg÷編集時点体重を係数化して保持
    setDrafts((prev) => ({
      ...prev,
      [focused]: { ...current, coef: coefForDirectEdit(kg, weightKg) },
    }))
    setDirty(true)
  }

  const onSave = async () => {
    for (const muscle of GOAL_TARGET_MUSCLES) {
      const draft = drafts[muscle]
      if (draft) await saveMuscleGoal({ muscle, ...draft })
    }
    if (weightDraft !== null && weightDraft !== profile?.weightKg) {
      await addBodyWeight(weightDraft)
    }
    setDirty(false)
    showToast(MUSCLE_GOAL_COPY.saved, 'success')
  }

  const focusedDraft = drafts[focused]
  const focusedTarget = focusedDraft ? targetE1Rm(focusedDraft.coef, weightKg) : undefined

  return (
    <>
      <h2 className="mt-6 text-sm font-semibold text-ink-mid">🎯 {MUSCLE_GOAL_COPY.section}</h2>
      <p className="mt-1 text-xs text-ink-dim">{MUSCLE_GOAL_COPY.hint}</p>

      {/* ヒーロー(選択部位の目標e1RM・仕様§2) */}
      <div className="mt-2">
        <p className="text-[15px] font-bold text-ink-mid">{MUSCLE_GROUP_LABELS[focused]}</p>
        <div className="flex items-baseline gap-2">
          <span className="num-hero glow-text text-[56px] leading-none">
            {focusedTarget !== undefined ? focusedTarget : '—'}
          </span>
          <span className="label-mono text-[11px] tracking-normal text-accent-dim">
            {MUSCLE_GOAL_COPY.heroUnit}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="label-mono text-[11px] tracking-normal text-accent-dim">
            {focusedDraft
              ? MUSCLE_GOAL_COPY.heroSub(
                  MUSCLE_GOAL_COPY.levelLabels[focusedDraft.level],
                  weightKg,
                  focusedDraft.coef,
                )
              : MUSCLE_GOAL_COPY.unset}
          </span>
          <button
            type="button"
            disabled={!focusedDraft}
            onClick={() => {
              setEditValue(focusedTarget !== undefined ? String(focusedTarget) : '')
              setEditOpen((v) => !v)
            }}
            className="label-mono rounded-chip border border-line-ember px-2 py-1 text-xs font-bold tracking-normal text-accent-dim disabled:opacity-40"
          >
            {MUSCLE_GOAL_COPY.directEdit}
          </button>
        </div>
        {editOpen && (
          <div className="mt-2 flex items-end gap-2">
            <label className="flex-1 text-xs text-ink-mid">
              {MUSCLE_GOAL_COPY.directEditTitle}
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
              />
            </label>
            <button
              type="button"
              onClick={commitDirectEdit}
              className="h-12 rounded-chip bg-line-ember px-4 text-sm font-semibold text-white active:bg-line-ember/70"
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* 体重ステッパー(仕様§2・タップ領域44px) */}
      <div className="mt-3 rounded-[12px] border border-[#241812] px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          {(
            [
              ['−', -1],
              ['+', 1],
            ] as const
          ).map(([sign, dir], i) => (
            <span key={sign} className={i === 0 ? 'order-1' : 'order-3'}>
              <button
                type="button"
                onClick={() => stepWeight(dir)}
                className="flex h-11 w-11 items-center justify-center"
                aria-label={`体重${sign}0.5kg`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-pill border border-line-ember text-ink-mid">
                  {sign}
                </span>
              </button>
            </span>
          ))}
          <span className="num-hero order-2 text-[26px] leading-none">
            {weightKg}
            <span className="label-mono ml-1 text-[11px] tracking-normal text-accent-dim">
              {MUSCLE_GOAL_COPY.weightUnit}
            </span>
          </span>
        </div>
        <p className="label-mono mt-1 text-center text-[9px] tracking-normal text-[#4A3A2C]">
          {MUSCLE_GOAL_COPY.weightStepperNote}
        </p>
      </div>

      {/* ゲージ行×5(仕様§3・§4) */}
      <div className="mt-4 flex flex-col gap-3.5">
        {GOAL_TARGET_MUSCLES.map((muscle) => (
          <GoalGaugeRow
            key={muscle}
            muscle={muscle}
            draft={drafts[muscle]}
            weightKg={weightKg}
            capKg={capKg}
            startE1Rm={trend[muscle]?.startE1Rm}
            currentE1Rm={trend[muscle]?.currentE1Rm}
            focused={muscle === focused}
            onFocus={() => setFocused(muscle)}
            onPickLevel={(level) => pickLevel(muscle, level)}
          />
        ))}
      </div>

      <p className="mt-3 text-[10px] text-ink-dim">{MUSCLE_GOAL_COPY.footerNote}</p>

      <button
        type="button"
        disabled={!dirty}
        onClick={() => void onSave()}
        className="pill-molten mt-4 h-14 w-full text-[16px] disabled:opacity-40"
      >
        {MUSCLE_GOAL_COPY.save}
      </button>
    </>
  )
}

function GoalGaugeRow({
  muscle,
  draft,
  weightKg,
  capKg,
  startE1Rm,
  currentE1Rm,
  focused,
  onFocus,
  onPickLevel,
}: {
  muscle: GoalTargetMuscle
  draft?: GoalDraft
  weightKg: number
  capKg: number
  startE1Rm?: number
  currentE1Rm?: number
  focused: boolean
  onFocus: () => void
  onPickLevel: (level: GoalLevel) => void
}) {
  const target = draft ? targetE1Rm(draft.coef, weightKg) : undefined
  const capped = target !== undefined && capKg > 0 && isCapped(target, capKg)
  const progress =
    target !== undefined ? goalProgress(startE1Rm, currentE1Rm, target) : undefined
  const maintain = draft?.mode === 'maintain'
  // 状態4(到達)は表示のみ(行タップの鏡チェック遷移は後半)
  const reached =
    !maintain && target !== undefined && currentE1Rm !== undefined && currentE1Rm >= target

  // 正規化(仕様§3): maxV = max(がっつり目標, 上限) × 1.14
  const bigTarget = targetE1Rm(GOAL_COEF[muscle].big, weightKg)
  const maxV = Math.max(bigTarget, capKg) * 1.14

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
      {/* 1段目: 部位名+レベル・目標 */}
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-ink">{MUSCLE_GROUP_LABELS[muscle]}</span>
        <span
          className="label-mono text-xs font-bold tracking-normal"
          style={{
            color: maintain
              ? 'var(--color-steel)'
              : draft
                ? capped
                  ? '#8A5A3C'
                  : focused
                    ? '#FF7A33'
                    : '#D9CFC6'
                : '#6B5A4C',
          }}
        >
          {draft && target !== undefined
            ? `${MUSCLE_GOAL_COPY.levelLabels[draft.level]} ${target}kg`
            : MUSCLE_GOAL_COPY.unset}
          {maintain && ` ${MUSCLE_GOAL_COPY.maintainMark}`}
        </span>
      </div>

      {/* 2段目: トラック領域(高さ26px絶対配置・仕様§3) */}
      <div className="relative mt-1.5 h-[26px]">
        <div className="absolute left-0 right-0 top-[11px] h-1 rounded-[2px] bg-[#241812]" />
        {/* 進捗フィル: startX→curX */}
        {draft && progress && startE1Rm !== undefined && currentE1Rm !== undefined && (
          <div
            className="absolute top-[11px] h-1"
            style={{
              left: `${xPct(startE1Rm, maxV)}%`,
              width: `${Math.max(0, xPct(currentE1Rm, maxV) - xPct(startE1Rm, maxV))}%`,
              background: maintain
                ? 'var(--color-steel)'
                : 'linear-gradient(90deg,#8A431C,#FF5C1A)',
            }}
          />
        )}
        {/* 上限帯: 33.6kg位置から右端(体重で動かない) */}
        {capKg > 0 && (
          <div
            className="absolute top-[8px] h-[10px] rounded-r-[3px]"
            style={{
              left: `${xPct(capKg, maxV)}%`,
              right: 0,
              background: 'repeating-linear-gradient(-45deg, #241812 0 3px, transparent 3px 6px)',
            }}
          />
        )}
        {/* スタート/現在地マーカー */}
        {startE1Rm !== undefined && draft && (
          <div
            className="absolute top-[7px] h-3 w-0.5"
            style={{ left: `${xPct(startE1Rm, maxV)}%`, background: 'var(--color-steel-line)' }}
          />
        )}
        {currentE1Rm !== undefined && draft && (
          <div
            className="absolute top-0 h-[26px] w-0.5 bg-[#FFE3CC]"
            style={{ left: `${xPct(currentE1Rm, maxV)}%` }}
          />
        )}
        {/* ノッチ×3(18px円・選択レベルのみ点灯) */}
        {LEVELS.map((level) => {
          const notchKg = targetE1Rm(GOAL_COEF[muscle][level], weightKg)
          const selected = draft?.level === level
          return (
            <button
              key={level}
              type="button"
              aria-label={`${MUSCLE_GROUP_LABELS[muscle]} ${MUSCLE_GOAL_COPY.levelLabels[level]}`}
              onClick={(e) => {
                e.stopPropagation()
                onPickLevel(level)
              }}
              className="absolute top-[4px] h-[18px] w-[18px] -ml-[9px] rounded-pill border-2"
              style={{
                left: `${xPct(notchKg, maxV)}%`,
                borderColor: selected ? (maintain ? 'var(--color-steel)' : reached ? '#FFB300' : '#FF5C1A') : '#3A2213',
                background: selected
                  ? maintain
                    ? 'var(--color-steel)'
                    : reached
                      ? '#FFB300'
                      : '#FF5C1A'
                  : '#140B06',
                boxShadow:
                  selected && !maintain
                    ? `0 0 10px ${reached ? 'rgba(255,179,0,.6)' : 'rgba(255,92,26,.6)'}`
                    : undefined,
              }}
            />
          )
        })}
      </div>

      {/* 3段目: 現在値/進捗(設定済みのみ) */}
      {draft && (
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="label-mono text-[9px] tracking-normal text-[#6B5A4C]">
            {currentE1Rm !== undefined
              ? MUSCLE_GOAL_COPY.currentLabel(Math.round(currentE1Rm * 10) / 10)
              : MUSCLE_GOAL_COPY.noProgress}
          </span>
          <span
            className="label-mono text-xs font-bold tracking-normal"
            style={{ color: maintain ? 'var(--color-steel)' : '#FFE3CC' }}
          >
            {reached
              ? MUSCLE_GOAL_COPY.reached
              : progress
                ? MUSCLE_GOAL_COPY.progress(Math.round(progress.ratio * 100), progress.remainingKg)
                : ''}
          </span>
        </div>
      )}

      {/* capped警告(仕様§4状態3: 選択は妨げない) */}
      {capped && (
        <p className="mt-1 text-[10px] text-adjusting">{MUSCLE_GOAL_COPY.cappedWarning}</p>
      )}

      {/* 4段目: 生活言語キャプション(選択中レベルの説明・罫線上) */}
      {draft && (
        <p className="mt-1.5 border-t border-[#1A110B] pt-1.5 text-[11px] leading-normal text-ink-dim">
          {MUSCLE_GOAL_COPY.captions[muscle][draft.level]}
        </p>
      )}
    </div>
  )
}
