// 鏡チェック(Phase 7-5b)。到達したゴールの判定3択:
// 満足→維持 / 物足りない→1段上げ(bigは+10%直接編集) / あとで判定→状態4のまま
// サマリーの到達カードと設定画面の状態4行タップの両方から使う
import { useState } from 'react'
import { MUSCLE_GOAL_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import { judgeGoal } from '../db/queries'
import type { MuscleGoal } from '../db/types'
import { nextGoalLevel, raiseSuggestionKg, targetE1Rm } from '../engine'
import { showToast } from '../utils/toast'
import Modal from './Modal'

interface MirrorCheckActionsProps {
  goal: MuscleGoal
  bodyWeightKg: number
  /** 判定消化(またはあとで)後に呼ばれる */
  onDone: () => void
}

export function MirrorCheckActions({ goal, bodyWeightKg, onDone }: MirrorCheckActionsProps) {
  const label = MUSCLE_GROUP_LABELS[goal.muscle]
  const isBig = nextGoalLevel(goal.level) === null
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')

  const onSatisfied = async () => {
    await judgeGoal(goal.muscle, 'maintain')
    showToast(MUSCLE_GOAL_COPY.maintainDone(label), 'success')
    onDone()
  }

  const onMore = async () => {
    if (isBig) {
      // big到達: +10%の直接編集を初期値として提案(Elite係数は採用しない・DEC-013)
      setEditValue(String(raiseSuggestionKg(targetE1Rm(goal.coef, bodyWeightKg))))
      setEditOpen(true)
      return
    }
    await judgeGoal(goal.muscle, 'raise')
    showToast(MUSCLE_GOAL_COPY.raiseDone(label), 'success')
    onDone()
  }

  const onCommitBigRaise = async () => {
    const kg = Math.round(Number(editValue) * 2) / 2
    if (!Number.isFinite(kg) || kg <= 0) return
    await judgeGoal(goal.muscle, 'raise', kg)
    showToast(MUSCLE_GOAL_COPY.raiseDone(label), 'success')
    onDone()
  }

  return (
    <div className="space-y-2">
      {editOpen ? (
        <div className="flex items-end gap-2">
          <label className="flex-1 text-xs text-ink-mid">
            {MUSCLE_GOAL_COPY.raiseEditLabel}
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
            onClick={() => void onCommitBigRaise()}
            className="pill-molten h-12 px-4 text-sm"
          >
            {MUSCLE_GOAL_COPY.raiseEditConfirm}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void onSatisfied()}
            className="h-12 w-full rounded-card border text-sm font-bold"
            style={{ borderColor: 'var(--color-steel-line)', color: 'var(--color-steel)' }}
          >
            {MUSCLE_GOAL_COPY.judgeSatisfied}
          </button>
          <button
            type="button"
            onClick={() => void onMore()}
            className="pill-molten h-12 w-full text-sm"
          >
            {isBig ? MUSCLE_GOAL_COPY.judgeMoreBig : MUSCLE_GOAL_COPY.judgeMore}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="h-11 w-full rounded-chip text-xs text-ink-dim active:text-ink-mid"
          >
            {MUSCLE_GOAL_COPY.judgeLater}
          </button>
        </>
      )}
    </div>
  )
}

/** 設定画面の状態4行タップ用モーダル */
export function MirrorCheckModal({
  goal,
  bodyWeightKg,
  onClose,
}: {
  goal: MuscleGoal
  bodyWeightKg: number
  onClose: () => void
}) {
  return (
    <Modal title={MUSCLE_GOAL_COPY.mirrorTitle} onClose={onClose}>
      <p className="text-sm font-bold text-ink">
        {MUSCLE_GOAL_COPY.reachedTitle(MUSCLE_GROUP_LABELS[goal.muscle])}
      </p>
      <p className="mb-3 mt-1 text-xs text-ink-mid">{MUSCLE_GOAL_COPY.reachedBody}</p>
      <MirrorCheckActions goal={goal} bodyWeightKg={bodyWeightKg} onDone={onClose} />
    </Modal>
  )
}
