import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AVOID_REASON_LABELS,
  GAP_COPY,
  GOAL_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  POSE_LABELS,
  SETUP_COPY,
} from '../constants/copy'
import { db } from '../db/db'
import { addPhoto, loadGoal, saveGoal, updateProfile } from '../db/queries'
import type { AvoidReason, GoalType, MuscleGroup, PhotoPose } from '../db/types'
import { ALL_MUSCLES, analyzeGap } from '../engine'
import type { GapAnalysis } from '../engine'
import { compressImage } from '../utils/image'

const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS) as GoalType[]
const POSES = Object.keys(POSE_LABELS) as PhotoPose[]
const AVOID_REASONS = Object.keys(AVOID_REASON_LABELS) as AvoidReason[]

type Step = 'profile' | 'goal' | 'photos' | 'hearing' | 'result'

/** 初期セットアップウィザード(F-01)+ギャップ分析結果(F-03) */
export default function SetupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('profile')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [goalType, setGoalType] = useState<GoalType>('lean')
  const [focusParts, setFocusParts] = useState<MuscleGroup[]>([])
  const [photos, setPhotos] = useState<Partial<Record<PhotoPose, Blob>>>({})
  const [wantParts, setWantParts] = useState<MuscleGroup[]>([])
  const [avoidParts, setAvoidParts] = useState<{ part: MuscleGroup; reason: AvoidReason }[]>([])
  const [injuryParts, setInjuryParts] = useState<MuscleGroup[]>([])
  const [injuryNote, setInjuryNote] = useState('')
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null)

  useEffect(() => {
    void db.profiles.orderBy('id').first().then((p) => {
      if (!p) return
      setHeight(String(p.heightCm))
      setWeight(String(p.weightKg))
      if (p.bodyFatPct !== undefined) setBodyFat(String(p.bodyFatPct))
    })
    // 既存の目標があればプリフィル(設定からの再実行用)。?analysis=1なら分析結果へ直行
    void loadGoal().then((goal) => {
      if (!goal) return
      setGoalType(goal.goalType)
      setFocusParts(goal.focusParts ?? [])
      setWantParts(goal.wantParts)
      setAvoidParts(goal.avoidParts)
      if (searchParams.get('analysis') === '1') {
        setAnalysis(analyzeGap(goal))
        setStep('result')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const cycleAvoid = (part: MuscleGroup) => {
    // タップで 未選択→怪我→好みでない→十分発達→未選択 と巡回
    const current = avoidParts.find((a) => a.part === part)
    if (!current) {
      setAvoidParts([...avoidParts, { part, reason: 'injury' }])
      return
    }
    const idx = AVOID_REASONS.indexOf(current.reason)
    if (idx === AVOID_REASONS.length - 1) {
      setAvoidParts(avoidParts.filter((a) => a.part !== part))
    } else {
      setAvoidParts(
        avoidParts.map((a) => (a.part === part ? { ...a, reason: AVOID_REASONS[idx + 1] } : a)),
      )
    }
  }

  const finish = async () => {
    const profile = await db.profiles.orderBy('id').first()
    const goal = {
      profileId: profile?.id ?? 1,
      goalType,
      focusParts: goalType === 'focus' ? focusParts : undefined,
      wantParts,
      avoidParts,
    }
    await saveGoal(goal)
    for (const [pose, blob] of Object.entries(photos) as [PhotoPose, Blob][]) {
      await addPhoto(pose, blob)
    }
    for (const part of injuryParts) {
      await db.injuries.add({
        bodyPart: part,
        note: injuryNote || undefined,
        reportedAt: new Date(),
        isActive: 1,
      })
    }
    setAnalysis(analyzeGap({ ...goal, createdAt: new Date() }))
    setStep('result')
  }

  const stepButton = (label: string, onClick: () => void, primary = true) => (
    <button
      type="button"
      onClick={onClick}
      className={`h-14 w-full rounded-card font-bold ${
        primary ? 'bg-molten text-white active:bg-molten-bright' : 'bg-line-ember/40 text-ink-mid active:bg-line-ember'
      }`}
    >
      {label}
    </button>
  )

  const numberInput = (
    value: string,
    onChange: (v: string) => void,
    label: string,
  ) => (
    <label className="block text-xs text-ink-mid">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
      />
    </label>
  )

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">{SETUP_COPY.title}</h1>

      {step === 'profile' && (
        <>
          <h2 className="text-sm font-semibold text-ink-mid">{SETUP_COPY.stepProfile}</h2>
          {numberInput(height, setHeight, SETUP_COPY.heightCm)}
          {numberInput(weight, setWeight, SETUP_COPY.weightKg)}
          {numberInput(bodyFat, setBodyFat, SETUP_COPY.bodyFatPct)}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {stepButton(SETUP_COPY.next, async () => {
            const h = Number(height)
            const w = Number(weight)
            if (!(h > 0) || !(w > 0)) {
              setError(SETUP_COPY.invalidProfile)
              return
            }
            await updateProfile({
              heightCm: h,
              weightKg: w,
              bodyFatPct: bodyFat ? Number(bodyFat) : undefined,
            })
            setError(null)
            setStep('goal')
          })}
        </>
      )}

      {step === 'goal' && (
        <>
          <h2 className="text-sm font-semibold text-ink-mid">{SETUP_COPY.stepGoal}</h2>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_TYPES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoalType(g)}
                className={`h-14 rounded-card text-sm font-bold ${
                  goalType === g ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {GOAL_TYPE_LABELS[g]}
              </button>
            ))}
          </div>
          {goalType === 'focus' && (
            <div>
              <p className="mb-1 text-xs text-ink-mid">{SETUP_COPY.focusParts}</p>
              <div className="grid grid-cols-4 gap-2">
                {ALL_MUSCLES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFocusParts(toggle(focusParts, m))}
                    className={`h-11 rounded-chip text-sm font-bold ${
                      focusParts.includes(m) ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                    }`}
                  >
                    {MUSCLE_GROUP_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {stepButton(SETUP_COPY.next, () => setStep('photos'))}
          {stepButton(SETUP_COPY.backStep, () => setStep('profile'), false)}
        </>
      )}

      {step === 'photos' && (
        <>
          <h2 className="text-sm font-semibold text-ink-mid">{SETUP_COPY.stepPhotos}</h2>
          <p className="text-xs text-ink-dim">{SETUP_COPY.photoHint}</p>
          <div className="grid grid-cols-3 gap-2">
            {POSES.map((pose) => (
              <label
                key={pose}
                className={`flex h-24 cursor-pointer flex-col items-center justify-center rounded-card text-sm font-semibold ${
                  photos[pose] ? 'bg-molten/20 text-molten-bright' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {photos[pose] ? '✓ ' : '+ '}
                {POSE_LABELS[pose]}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const compressed = await compressImage(file)
                    setPhotos((prev) => ({ ...prev, [pose]: compressed }))
                  }}
                />
              </label>
            ))}
          </div>
          {stepButton(SETUP_COPY.next, () => setStep('hearing'))}
          {stepButton(SETUP_COPY.backStep, () => setStep('goal'), false)}
        </>
      )}

      {step === 'hearing' && (
        <>
          <h2 className="text-sm font-semibold text-ink-mid">{SETUP_COPY.stepHearing}</h2>
          <div>
            <p className="mb-1 text-xs text-ink-mid">{SETUP_COPY.wantParts}</p>
            <div className="grid grid-cols-4 gap-2">
              {ALL_MUSCLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWantParts(toggle(wantParts, m))}
                  className={`h-11 rounded-chip text-sm font-bold ${
                    wantParts.includes(m) ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                  }`}
                >
                  {MUSCLE_GROUP_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-mid">{SETUP_COPY.avoidParts}</p>
            <div className="grid grid-cols-4 gap-2">
              {ALL_MUSCLES.map((m) => {
                const avoid = avoidParts.find((a) => a.part === m)
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => cycleAvoid(m)}
                    className={`flex h-14 flex-col items-center justify-center rounded-chip text-sm font-bold ${
                      avoid ? 'bg-destructive/70 text-white' : 'bg-line-ember/40 text-ink-mid'
                    }`}
                  >
                    {MUSCLE_GROUP_LABELS[m]}
                    {avoid && (
                      <span className="text-[10px] font-normal">
                        {AVOID_REASON_LABELS[avoid.reason]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-mid">{SETUP_COPY.injuryParts}</p>
            <div className="grid grid-cols-4 gap-2">
              {ALL_MUSCLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInjuryParts(toggle(injuryParts, m))}
                  className={`h-11 rounded-chip text-sm font-bold ${
                    injuryParts.includes(m) ? 'bg-destructive text-white' : 'bg-line-ember/40 text-ink-mid'
                  }`}
                >
                  {MUSCLE_GROUP_LABELS[m]}
                </button>
              ))}
            </div>
            {injuryParts.length > 0 && (
              <textarea
                value={injuryNote}
                onChange={(e) => setInjuryNote(e.target.value)}
                placeholder={SETUP_COPY.injuryNote}
                rows={1}
                className="mt-2 w-full rounded-chip bg-line-ember/40 p-2 text-sm placeholder:text-ink-dim"
              />
            )}
          </div>
          {stepButton(SETUP_COPY.finish, () => void finish())}
          {stepButton(SETUP_COPY.backStep, () => setStep('photos'), false)}
        </>
      )}

      {step === 'result' && analysis && (
        <>
          <h2 className="text-sm font-semibold text-ink-mid">{GAP_COPY.title}</h2>
          <ol className="space-y-2">
            {analysis.top3.map((entry, i) => (
              <li key={entry.muscle} className="flex items-center gap-3 rounded-card bg-ember-tint border border-line-ember p-4">
                <span className="text-lg font-bold text-molten-bright">{GAP_COPY.top3(i + 1)}</span>
                <div>
                  <p className="font-semibold">{MUSCLE_GROUP_LABELS[entry.muscle]}</p>
                  <p className="text-xs text-ink-mid">{entry.reason}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-card bg-ember-tint border border-line-ember p-4">
            <p className="mb-2 text-xs font-semibold text-ink-mid">{GAP_COPY.weeklyTargets}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.map((m) => (
                <span key={m} className="rounded-pill bg-line-ember/40 px-3 py-1.5 text-xs">
                  {MUSCLE_GROUP_LABELS[m]}{' '}
                  <span className="font-bold text-molten-bright">
                    {analysis.weeklySetTargets[m]}
                  </span>
                  {GAP_COPY.setsUnit}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-dim">{GAP_COPY.hint}</p>
          {stepButton(GAP_COPY.toHome, () => navigate('/'))}
        </>
      )}
    </section>
  )
}
