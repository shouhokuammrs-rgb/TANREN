// 初期セットアップウィザード(F-01)。
// ISS-023: 旧「目標ボディ」ステップ(goalType/wantParts)とギャップ分析結果は撤去済み——
// 目標は部位別ゴール(DEC-013・設定①)に一本化。ここではプロフィール・写真・怪我のみ聞く
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MUSCLE_GROUP_LABELS, POSE_LABELS, SETUP_COPY } from '../constants/copy'
import { db } from '../db/db'
import { addPhoto, updateProfile } from '../db/queries'
import type { MuscleGroup, PhotoPose } from '../db/types'
import { ALL_MUSCLES } from '../engine'
import { compressImage } from '../utils/image'

const POSES = Object.keys(POSE_LABELS) as PhotoPose[]

type Step = 'profile' | 'photos' | 'injury'

export default function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('profile')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Partial<Record<PhotoPose, Blob>>>({})
  const [injuryParts, setInjuryParts] = useState<MuscleGroup[]>([])
  const [injuryNote, setInjuryNote] = useState('')

  useEffect(() => {
    void db.profiles.orderBy('id').first().then((p) => {
      if (!p) return
      setHeight(String(p.heightCm))
      setWeight(String(p.weightKg))
      if (p.bodyFatPct !== undefined) setBodyFat(String(p.bodyFatPct))
    })
  }, [])

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const finish = async () => {
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
    navigate('/')
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
            setStep('photos')
          })}
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
          {stepButton(SETUP_COPY.next, () => setStep('injury'))}
          {stepButton(SETUP_COPY.backStep, () => setStep('profile'), false)}
        </>
      )}

      {step === 'injury' && (
        <>
          <h2 className="text-sm font-semibold text-ink-mid">{SETUP_COPY.stepInjury}</h2>
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
          {/* ウィザード末尾の1行案内(ISS-023・Designer指定: Noto 400 12px #8A5A3C) */}
          <p className="text-xs font-normal text-[#8A5A3C]">{SETUP_COPY.finalNote}</p>
          {stepButton(SETUP_COPY.finish, () => void finish())}
          {stepButton(SETUP_COPY.backStep, () => setStep('photos'), false)}
        </>
      )}
    </section>
  )
}
