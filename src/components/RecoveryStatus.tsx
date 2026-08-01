// 回復ステータス統合(DEC-015 §3-2 / ISS-016)。
// フレッシュネス人体図と回復予測スロットを1コンポーネントに統合。回復は鈍色のみで表現
// (溶鉄=成長・鋼色=維持と混ぜない)。部位タップで吹き出し(同時に1つ)。
// 状態A=回復待ちあり(人体図+サマリー行) / 状態B=全部位回復済み(48pxの1行・タップで展開)
import { useState } from 'react'
import BodySvg from './BodySvg'
import { HOME_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { MuscleGroup } from '../db/types'
import {
  effectiveRecoveryHours,
  hoursUntilRecovered,
  type EngineContext,
} from '../engine'

const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

// 鈍色スケール(§3-2): 回復済み / 回復中 / 直近負荷
const DULL = { recovered: '#6B5A4C', recovering: '#8A5A3C', loaded: '#B06A3E' }

// 吹き出しの縦アンカー(BodySvg viewBox 0 0 100 190 の部位中心から上に出す・%)
const BUBBLE_TOP: Record<MuscleGroup, number> = {
  shoulders: 6,
  chest: 10,
  back: 12,
  arms: 22,
  abs: 24,
  glutes: 28,
  legs: 46,
}

export default function RecoveryStatus({
  ctx,
  freshness,
}: {
  ctx: EngineContext
  freshness: Record<MuscleGroup, number>
}) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [picked, setPicked] = useState<MuscleGroup | null>(null)
  const [expanded, setExpanded] = useState(false)

  const hoursFor = (m: MuscleGroup) => {
    const setCount = ctx.muscleStimuli.find((s) => s.muscle === m)?.setCount ?? 0
    return Math.max(1, Math.ceil(hoursUntilRecovered(freshness[m], effectiveRecoveryHours(m, setCount, ctx.tuning))))
  }

  const recovering = ALL_MUSCLES.filter((m) => freshness[m] < 100)
  const allReady = recovering.length === 0
  // サマリー行(§3-2): 最も遠い部位を1つだけ
  const farthest = recovering
    .map((m) => ({ muscle: m, hours: hoursFor(m) }))
    .sort((a, b) => b.hours - a.hours)[0]

  // 状態B: 全部位回復済み → 48pxの1行(タップで人体図を展開できる)
  if (allReady && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex h-12 w-full items-center gap-2.5 rounded-[14px] border border-[#3A2213] px-[18px] text-left"
        data-testid="recovery-all-ready"
      >
        <span className="h-2 w-2 rounded-pill" style={{ background: DULL.recovered }} />
        <span className="text-sm font-bold text-[#D9CFC6]">{HOME_COPY.recoveryAllReady}</span>
      </button>
    )
  }

  return (
    <div
      className="rounded-[14px] border border-[#3A2213] px-[18px] py-4"
      onClick={(e) => {
        // 部位(rect/circle/ellipse)以外のタップで吹き出しを閉じる
        const tag = (e.target as Element).tagName
        if (!['rect', 'circle', 'ellipse'].includes(tag)) setPicked(null)
      }}
    >
      <div className="flex items-start justify-between">
        <p className="label-mono text-[10px] text-accent-dim">{HOME_COPY.recoveryLabel}</p>
        {/* FRONT⇄BACK切替(PM裁定・熱の人体図の既存ラベル流用) */}
        <button
          type="button"
          onClick={() => {
            setSide((s) => (s === 'front' ? 'back' : 'front'))
            setPicked(null)
          }}
          className="label-mono rounded-chip border border-line-ember px-2 py-1 text-[10px] font-bold text-ink-mid"
        >
          {side === 'front' ? 'BACK →' : '← FRONT'}
        </button>
      </div>

      <div className="relative mx-auto mt-1 w-fit">
        <BodySvg
          side={side}
          className="h-[150px] w-auto"
          paint={(m) => ({
            fill:
              freshness[m] >= 100
                ? DULL.recovered
                : freshness[m] >= 40
                  ? DULL.recovering
                  : DULL.loaded,
          })}
          onPick={(m) => setPicked((prev) => (prev === m ? null : m))}
        />
        {/* 吹き出し(同時に1つのみ・§3-2) */}
        {picked && (
          <div
            className="absolute left-1/2 z-10 w-max -translate-x-1/2 rounded-[8px] border border-[#3A2213] bg-[#1A110B] px-2.5 py-2"
            style={{ top: `${BUBBLE_TOP[picked]}%` }}
            data-testid="recovery-bubble"
          >
            <p className="text-xs font-bold text-[#D9CFC6]">
              {MUSCLE_GROUP_LABELS[picked]}
              <span
                className="label-mono ml-2 text-xs font-bold tracking-normal"
                style={{ color: freshness[picked] >= 100 ? '#D9CFC6' : '#B06A3E' }}
              >
                {freshness[picked] >= 100
                  ? HOME_COPY.recoveryDone
                  : HOME_COPY.recoveryHoursLeft(hoursFor(picked))}
              </span>
            </p>
            <div className="mt-1.5 h-1 w-[90px] overflow-hidden rounded-pill bg-line-ember/60">
              <span
                className="block h-full"
                style={{
                  width: `${Math.min(100, freshness[picked])}%`,
                  background: freshness[picked] >= 100 ? DULL.recovered : DULL.recovering,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {farthest && (
        <p className="mt-2 text-center text-[13px] font-bold text-[#D9CFC6]">
          {HOME_COPY.recoverySummary(MUSCLE_GROUP_LABELS[farthest.muscle], farthest.hours)}
        </p>
      )}
    </div>
  )
}
