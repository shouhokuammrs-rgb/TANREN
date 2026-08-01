// 設定(IA再設計 DEC-015 §4): ①日常(常時展開)②からだと器具(アコーディオン)③データ。
// 全削除は /settings/danger に隔離(この画面では削除しない)。旧ゴール(want/avoid)セクションは撤去済み
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import CloudBackupSection from '../components/CloudBackupSection'
import GoalGaugeSection from '../components/GoalGaugeSection'
import Modal from '../components/Modal'
import { db } from '../db/db'
import {
  addStrengthMark,
  deleteStrengthMark,
  resolveInjury,
  updateEquipment,
} from '../db/queries'
import type { Equipment, Injury, StrengthMark } from '../db/types'
import {
  DANGER_COPY,
  DATA_COPY,
  EQUIPMENT_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  SETTINGS_COPY,
  STORAGE_COPY,
  STRENGTH_COPY,
  TUNING_COPY,
  formatDate,
} from '../constants/copy'
import { ENGINE_TUNING_RANGES } from '../constants/engine'
import type { EngineTuning } from '../engine/types'
import { ENGINE_TUNING_SETTING_KEY, sanitizeEngineTuning } from '../utils/engineTuning'
import { importBackup, lastExportAt } from '../utils/backup'
import { exportBackupToFile } from '../utils/exportFile'
import { persistedState, requestPersistentStorage, type PersistState } from '../utils/storage'
import { REF_LIFTS } from '../constants/strength'
import { epley1Rm } from '../engine'
import { useLocalSetting } from '../hooks/useLocalSetting'

function equipmentDetail(eq: Equipment): string | null {
  if (eq.type === 'dumbbell' && eq.weightStepsKg && eq.weightStepsKg.length > 0) {
    const steps = eq.weightStepsKg
    return SETTINGS_COPY.dumbbellSteps(steps[0], steps[steps.length - 1], steps.length)
  }
  if (eq.type === 'bench' && eq.minAngleDeg !== undefined && eq.maxAngleDeg !== undefined) {
    return SETTINGS_COPY.benchAngle(eq.minAngleDeg, eq.maxAngleDeg)
  }
  return null
}

/** 群見出し(§4-2): Mono 10px .28em + 補足1行 */
function GroupHeader({ title, note, color }: { title: string; note: string; color: string }) {
  return (
    <div className="mt-7">
      <h2 className="label-mono text-[10px]" style={{ color }}>
        {title}
      </h2>
      <p className="mt-0.5 text-[10px] text-[#6B5A4C]">{note}</p>
    </div>
  )
}

/** 群②アコーディオン(§4-3): 閉52px+要約、一度に1項目、開閉状態は保存しない */
function AccordionItem({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div
      className="rounded-card border border-[#3A2213]"
      style={open ? { background: 'rgba(255,255,255,.015)' } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex h-[52px] w-full items-center justify-between px-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[13px] font-bold text-[#D9CFC6]">{title}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="label-mono truncate text-[11px] tracking-normal text-[#8A5A3C]">
            {summary}
          </span>
          <span
            className={`text-[#6B5A4C] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            ⌄
          </span>
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export default function SettingsPage() {
  const equipment = useLiveQuery(() => db.equipment.toArray())
  const injuries = useLiveQuery(() => db.injuries.where('isActive').equals(1).toArray())
  const marks = useLiveQuery(() => db.strength_marks.orderBy('recordedAt').reverse().toArray())
  const [autoTimer, setAutoTimer] = useLocalSetting('autoStartTimer', true)
  const [tuning, setTuning] = useLocalSetting<EngineTuning>(ENGINE_TUNING_SETTING_KEY, {})
  const [editing, setEditing] = useState<Equipment | null>(null)
  // アコーディオンは一度に1項目・再訪時は全閉(状態を保存しない)
  const [openItem, setOpenItem] = useState<string | null>(null)
  const toggle = (id: string) => setOpenItem((prev) => (prev === id ? null : id))

  // 閉時の現在値要約(§4-3)
  const dumbbell = equipment?.find((e) => e.type === 'dumbbell')
  const equipmentSummary =
    dumbbell?.weightStepsKg && dumbbell.weightStepsKg.length > 0
      ? `${dumbbell.weightStepsKg[dumbbell.weightStepsKg.length - 1]}kgダンベル ×${dumbbell.quantity}`
      : SETTINGS_COPY.summaryNone
  const strengthSummary =
    marks && marks.length > 0 ? SETTINGS_COPY.summaryCount(marks.length) : SETTINGS_COPY.summaryNone
  const injuriesSummary =
    injuries && injuries.length > 0
      ? SETTINGS_COPY.summaryCount(injuries.length)
      : SETTINGS_COPY.summaryInjuriesNone
  const timerSummary = autoTimer ? SETTINGS_COPY.summaryTimerOn : SETTINGS_COPY.summaryTimerOff
  const tuningCount = Object.keys(tuning).length
  const tuningSummary =
    tuningCount > 0
      ? SETTINGS_COPY.summaryTuningCustom(tuningCount)
      : SETTINGS_COPY.summaryTuningDefault

  return (
    <section>
      <h1 className="text-2xl font-bold">{SETTINGS_COPY.title}</h1>

      {/* ① 日常: ゴールゲージ+体重(GoalGaugeSection内のステッパー) */}
      <GroupHeader
        title={SETTINGS_COPY.groupDaily}
        note={SETTINGS_COPY.groupDailyNote}
        color="#FF7A33"
      />
      <GoalGaugeSection />

      {/* ② からだと器具: アコーディオン既定閉 */}
      <GroupHeader
        title={SETTINGS_COPY.groupBody}
        note={SETTINGS_COPY.groupBodyNote}
        color="#8A5A3C"
      />
      <div className="mt-2.5 space-y-2.5">
        <AccordionItem
          title={SETTINGS_COPY.equipmentSection}
          summary={equipmentSummary}
          open={openItem === 'equipment'}
          onToggle={() => toggle('equipment')}
        >
          <EquipmentContent equipment={equipment} onEdit={setEditing} />
        </AccordionItem>
        <AccordionItem
          title={STRENGTH_COPY.section}
          summary={strengthSummary}
          open={openItem === 'strength'}
          onToggle={() => toggle('strength')}
        >
          <StrengthContent marks={marks} />
        </AccordionItem>
        <AccordionItem
          title={SETTINGS_COPY.injuriesSection}
          summary={injuriesSummary}
          open={openItem === 'injuries'}
          onToggle={() => toggle('injuries')}
        >
          <InjuriesContent injuries={injuries} />
        </AccordionItem>
        <AccordionItem
          title={SETTINGS_COPY.timerSection}
          summary={timerSummary}
          open={openItem === 'timer'}
          onToggle={() => toggle('timer')}
        >
          <label className="mt-2 flex h-14 items-center justify-between rounded-card bg-ember-tint px-4">
            <span className="text-sm">{SETTINGS_COPY.timerAutoStart}</span>
            <input
              type="checkbox"
              checked={autoTimer}
              onChange={(e) => setAutoTimer(e.target.checked)}
              className="h-6 w-6 accent-molten"
            />
          </label>
        </AccordionItem>
        <AccordionItem
          title={TUNING_COPY.section}
          summary={tuningSummary}
          open={openItem === 'tuning'}
          onToggle={() => toggle('tuning')}
        >
          <EngineTuningContent tuning={tuning} setTuning={setTuning} />
        </AccordionItem>
      </div>

      {/* ③ データ: 常時展開。全削除は隔離画面へ */}
      <GroupHeader
        title={SETTINGS_COPY.groupData}
        note={SETTINGS_COPY.groupDataNote}
        color="#C9B79C"
      />
      <CloudBackupSection />
      <DataSection />

      {editing?.type === 'dumbbell' && (
        <DumbbellWizard equipment={editing} onClose={() => setEditing(null)} />
      )}
      {editing?.type === 'bench' && (
        <BenchEditor equipment={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  )
}

/** 器具一覧(群②の中身。旧セクションの内容を再利用) */
function EquipmentContent({
  equipment,
  onEdit,
}: {
  equipment: Equipment[] | undefined
  onEdit: (eq: Equipment) => void
}) {
  return (
    <ul className="space-y-2">
      {equipment?.length === 0 && (
        <li className="rounded-card border border-dashed border-line-ember p-4 text-sm text-ink-mid">
          {SETTINGS_COPY.equipmentEmpty}
        </li>
      )}
      {equipment?.map((eq) => {
        const detail = equipmentDetail(eq)
        const editable = eq.type === 'dumbbell' || eq.type === 'bench'
        return (
          <li key={eq.id} className="rounded-card bg-ember-tint border border-line-ember p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">
                {eq.name}
                {eq.quantity > 1 && (
                  <span className="ml-1 text-sm text-ink-mid">
                    {SETTINGS_COPY.equipmentCount(eq.quantity)}
                  </span>
                )}
              </span>
              <span className="text-xs text-ink-dim">{EQUIPMENT_TYPE_LABELS[eq.type]}</span>
            </div>
            {detail && <p className="mt-1 text-sm text-ink-mid">{detail}</p>}
            {editable && (
              <button
                type="button"
                className="mt-2 h-11 w-full rounded-chip bg-line-ember/40 text-xs text-ink-mid active:bg-line-ember"
                onClick={() => onEdit(eq)}
              >
                {SETTINGS_COPY.edit}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 怪我・制限(群②の中身) */
function InjuriesContent({ injuries }: { injuries: Injury[] | undefined }) {
  return (
    <ul className="space-y-2">
      {(injuries === undefined || injuries.length === 0) && (
        <li className="rounded-card border border-dashed border-line-ember p-4 text-sm text-ink-mid">
          {SETTINGS_COPY.injuriesEmpty}
        </li>
      )}
      {injuries?.map((injury) => (
        <li
          key={injury.id}
          className="flex items-center justify-between rounded-card bg-ember-tint border border-line-ember p-4"
        >
          <div>
            <p className="text-sm font-semibold text-destructive">
              {MUSCLE_GROUP_LABELS[injury.bodyPart]}
            </p>
            <p className="text-xs text-ink-dim">
              {SETTINGS_COPY.injuryReportedAt(formatDate(injury.reportedAt))}
              {injury.note ? `・${injury.note}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="h-11 rounded-chip bg-line-ember/40 px-4 text-xs text-ink-mid active:bg-line-ember"
            onClick={() => void resolveInjury(injury.id!)}
          >
            {SETTINGS_COPY.injuryResolve}
          </button>
        </li>
      ))}
    </ul>
  )
}

const TUNING_KEYS = Object.keys(ENGINE_TUNING_RANGES) as (keyof EngineTuning)[]

/** エンジン上級者設定(DEC-010)。アコーディオン化に伴い内側の折りたたみは廃止 */
function EngineTuningContent({
  tuning,
  setTuning,
}: {
  tuning: EngineTuning
  setTuning: (t: EngineTuning) => void
}) {
  // 入力途中のテキストを保持し、blur時にclamp+保存する
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const commit = (key: keyof EngineTuning, raw: string) => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    const value = Number(raw)
    if (raw.trim() === '' || !Number.isFinite(value)) {
      // 空・不正入力はその項目だけデフォルトに戻す
      const next = { ...tuning }
      delete next[key]
      setTuning(next)
      return
    }
    setTuning(sanitizeEngineTuning({ ...tuning, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-dim">{TUNING_COPY.hint}</p>
      {TUNING_KEYS.map((key) => {
        const range = ENGINE_TUNING_RANGES[key]
        const item = TUNING_COPY.items[key]
        return (
          <label key={key} className="block text-xs text-ink-mid">
            <span className="flex items-baseline justify-between">
              <span className="font-semibold">{item.label}</span>
              <span className="text-[10px] text-ink-dim">
                {TUNING_COPY.rangeLabel(range.min, range.max, item.unit)}・
                {TUNING_COPY.defaultLabel(range.default, item.unit)}
              </span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={range.min}
              max={range.max}
              value={drafts[key] ?? String(tuning[key] ?? range.default)}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
              onBlur={(e) => commit(key, e.target.value)}
              className={`mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base ${
                tuning[key] !== undefined ? 'text-molten-bright font-bold' : 'text-ink'
              }`}
            />
            <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-dim">
              {item.description}
            </span>
          </label>
        )
      })}
      <button
        type="button"
        onClick={() => {
          setTuning({})
          setDrafts({})
        }}
        className="h-12 w-full rounded-card border border-line-ember text-sm font-semibold text-ink-mid active:bg-line-ember/60"
      >
        ↺ {TUNING_COPY.reset}
      </button>
    </div>
  )
}

/** データ管理(F-08+ISS-009)。全削除は /settings/danger へ隔離(§4-4) */
function DataSection() {
  const [busy, setBusy] = useState(false)
  const [persist, setPersist] = useState<PersistState | null>(null)
  const [lastExport, setLastExport] = useState<Date | null>(lastExportAt)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void persistedState().then(setPersist)
  }, [])

  const persistLabel =
    persist === 'granted'
      ? STORAGE_COPY.granted
      : persist === 'denied'
        ? STORAGE_COPY.denied
        : persist === 'unsupported'
          ? STORAGE_COPY.unsupported
          : '…'

  const onExport = async () => {
    setBusy(true)
    try {
      await exportBackupToFile()
      setLastExport(lastExportAt())
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file: File) => {
    if (!window.confirm(DATA_COPY.importConfirm)) return
    try {
      const data = JSON.parse(await file.text())
      await importBackup(data)
      window.alert(DATA_COPY.importDone)
    } catch {
      window.alert(DATA_COPY.importError)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {/* データ保護(ISS-009-1): 未許可ならタップで再要求 */}
      <button
        type="button"
        disabled={persist !== 'denied'}
        onClick={async () => {
          setPersist(await requestPersistentStorage())
        }}
        className="flex h-14 w-full items-center justify-between rounded-card bg-ember-tint border border-line-ember px-4 text-left"
      >
        <span>
          <span className="block text-sm">{STORAGE_COPY.protectionLabel}</span>
          <span className="block text-[10px] text-ink-dim">{STORAGE_COPY.protectionHint}</span>
        </span>
        <span
          className={`text-xs font-bold ${
            persist === 'granted'
              ? 'text-achieved'
              : persist === 'denied'
                ? 'text-adjusting'
                : 'text-ink-dim'
          }`}
        >
          {persistLabel}
        </span>
      </button>
      <p className="text-xs text-ink-dim">
        {lastExport ? STORAGE_COPY.lastExport(formatDate(lastExport)) : STORAGE_COPY.neverExported}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onExport()}
        className="h-12 w-full rounded-card bg-ember-tint border border-line-ember text-sm font-semibold text-ink-mid active:bg-line-ember/60 disabled:opacity-40"
      >
        📤 {busy ? DATA_COPY.exporting : DATA_COPY.exportBtn}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="h-12 w-full rounded-card bg-ember-tint border border-line-ember text-sm font-semibold text-ink-mid active:bg-line-ember/60"
      >
        📥 {DATA_COPY.importBtn}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void onImportFile(file)
          e.target.value = ''
        }}
      />
      {/* 全削除行: この画面では削除しない(§4-4) */}
      <Link
        to="/settings/danger"
        className="flex h-12 w-full items-center justify-between rounded-card border border-[#3A2213] px-4 text-sm font-semibold text-[#B06A3E]"
      >
        {DANGER_COPY.row}
        <span className="text-[#6B5A4C]">→</span>
      </Link>
    </div>
  )
}

/** 筋力の目安(ISS-002・群②の中身) */
function StrengthContent({ marks }: { marks: StrengthMark[] | undefined }) {
  const [adding, setAdding] = useState(false)
  const refById = new Map(REF_LIFTS.map((r) => [r.id, r]))

  return (
    <>
      <p className="text-xs text-ink-dim">{STRENGTH_COPY.hint}</p>
      <ul className="mt-2 space-y-2">
        {marks?.length === 0 && (
          <li className="rounded-card border border-dashed border-line-ember p-4 text-sm text-ink-mid">
            {STRENGTH_COPY.empty}
          </li>
        )}
        {marks?.map((mark) => (
          <li
            key={mark.id}
            className="flex items-center justify-between rounded-card bg-ember-tint border border-line-ember p-4"
          >
            <div>
              <p className="text-sm font-semibold">
                {refById.get(mark.refLiftId)?.name ?? mark.refLiftId}
              </p>
              <p className="text-xs text-ink-mid">
                {STRENGTH_COPY.mark(mark.weightKg, mark.reps)}・
                {STRENGTH_COPY.est1Rm(Math.round(epley1Rm(mark.weightKg, mark.reps) * 10) / 10)}
              </p>
            </div>
            <button
              type="button"
              className="h-11 rounded-chip bg-line-ember/40 px-4 text-xs text-ink-mid active:bg-line-ember"
              onClick={() => void deleteStrengthMark(mark.id!)}
            >
              {STRENGTH_COPY.delete}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 h-12 w-full rounded-card border border-dashed border-line-ember text-sm text-ink-mid active:bg-line-ember/60"
        onClick={() => setAdding(true)}
      >
        + {STRENGTH_COPY.add}
      </button>
      {adding && <StrengthMarkModal onClose={() => setAdding(false)} />}
    </>
  )
}

function StrengthMarkModal({ onClose }: { onClose: () => void }) {
  const [refLiftId, setRefLiftId] = useState(REF_LIFTS[0].id)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title={STRENGTH_COPY.addTitle} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-mid">{STRENGTH_COPY.refLift}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {REF_LIFTS.map((lift) => (
              <button
                key={lift.id}
                type="button"
                onClick={() => setRefLiftId(lift.id)}
                className={`h-11 rounded-chip px-3 text-left text-sm font-semibold ${
                  refLiftId === lift.id ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {lift.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-ink-mid">
            {STRENGTH_COPY.weight}
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
            />
          </label>
          <label className="flex-1 text-xs text-ink-mid">
            {STRENGTH_COPY.reps}
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
            />
          </label>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="button"
          className="h-14 w-full rounded-card bg-molten font-bold text-white active:bg-molten-bright"
          onClick={async () => {
            const w = Number(weight)
            const r = Number(reps)
            if (!Number.isFinite(w) || w <= 0 || !Number.isInteger(r) || r <= 0 || r > 30) {
              setError(STRENGTH_COPY.invalid)
              return
            }
            await addStrengthMark({ refLiftId, weightKg: w, reps: r })
            onClose()
          }}
        >
          {STRENGTH_COPY.save}
        </button>
      </div>
    </Modal>
  )
}

/** 0.5kg単位に丸める */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

/**
 * ダンベル編集ウィザード(1-2 / DEC-002差し替え):
 * 最小・最大・段階数の3問→等間隔配列を自動生成(0.5kg丸め)→タップで個別修正
 */
function DumbbellWizard({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const current = equipment.weightStepsKg ?? []
  const [minKg, setMinKg] = useState(String(current[0] ?? 2.5))
  const [maxKg, setMaxKg] = useState(String(current[current.length - 1] ?? 24))
  const [stepCount, setStepCount] = useState(String(current.length || 15))
  const [steps, setSteps] = useState<number[] | null>(current.length > 0 ? current : null)
  const [error, setError] = useState<string | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const generate = () => {
    const min = Number(minKg)
    const max = Number(maxKg)
    const count = Number(stepCount)
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isInteger(count)) {
      setError(SETTINGS_COPY.invalidRange)
      return
    }
    const generated =
      count >= 2 && max > min
        ? Array.from({ length: count }, (_, i) => roundHalf(min + (i * (max - min)) / (count - 1)))
        : null
    if (!generated || new Set(generated).size !== count) {
      setError(SETTINGS_COPY.invalidRange)
      return
    }
    setError(null)
    setSteps(generated)
  }

  const numberInput = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="flex-1 text-xs text-ink-mid">
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
    <Modal title={SETTINGS_COPY.dumbbellWizardTitle} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {numberInput(minKg, setMinKg, SETTINGS_COPY.dumbbellMin)}
          {numberInput(maxKg, setMaxKg, SETTINGS_COPY.dumbbellMax)}
          {numberInput(stepCount, setStepCount, SETTINGS_COPY.dumbbellStepCount)}
        </div>
        <button
          type="button"
          onClick={generate}
          className="h-12 w-full rounded-card bg-line-ember text-sm font-semibold text-white active:bg-line-ember/70"
        >
          {SETTINGS_COPY.dumbbellGenerate}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}

        {steps && (
          <div>
            <p className="mb-2 text-xs text-ink-mid">{SETTINGS_COPY.dumbbellGenerated}</p>
            <div className="flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setEditIndex(i)
                    setEditValue(String(s))
                  }}
                  className={`h-11 min-w-14 rounded-chip px-2 text-sm font-semibold tabular-nums ${
                    editIndex === i ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {editIndex !== null && (
              <div className="mt-3 flex items-end gap-2">
                {numberInput(
                  editValue,
                  setEditValue,
                  SETTINGS_COPY.dumbbellStepEditTitle(editIndex + 1),
                )}
                <button
                  type="button"
                  className="h-12 rounded-chip bg-line-ember px-4 text-sm font-semibold text-white active:bg-line-ember/70"
                  onClick={() => {
                    const v = Number(editValue)
                    if (!Number.isFinite(v) || v <= 0) return
                    setSteps(steps.map((s, i) => (i === editIndex ? v : s)))
                    setEditIndex(null)
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!steps}
          className="h-14 w-full rounded-card bg-molten font-bold text-white active:bg-molten-bright disabled:opacity-40"
          onClick={async () => {
            if (!steps) return
            const sorted = [...steps].sort((a, b) => a - b)
            await updateEquipment(equipment.id!, { weightStepsKg: sorted })
            onClose()
          }}
        >
          {SETTINGS_COPY.save}
        </button>
      </div>
    </Modal>
  )
}

/** ベンチ角度範囲の編集(1-2) */
function BenchEditor({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const [minDeg, setMinDeg] = useState(String(equipment.minAngleDeg ?? -20))
  const [maxDeg, setMaxDeg] = useState(String(equipment.maxAngleDeg ?? 90))
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title={SETTINGS_COPY.benchWizardTitle} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-ink-mid">
            {SETTINGS_COPY.benchMin}
            <input
              type="number"
              inputMode="numeric"
              value={minDeg}
              onChange={(e) => setMinDeg(e.target.value)}
              className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
            />
          </label>
          <label className="flex-1 text-xs text-ink-mid">
            {SETTINGS_COPY.benchMax}
            <input
              type="number"
              inputMode="numeric"
              value={maxDeg}
              onChange={(e) => setMaxDeg(e.target.value)}
              className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
            />
          </label>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="button"
          className="h-14 w-full rounded-card bg-molten font-bold text-white active:bg-molten-bright"
          onClick={async () => {
            const min = Number(minDeg)
            const max = Number(maxDeg)
            if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
              setError(SETTINGS_COPY.invalidRange)
              return
            }
            await updateEquipment(equipment.id!, { minAngleDeg: min, maxAngleDeg: max })
            onClose()
          }}
        >
          {SETTINGS_COPY.save}
        </button>
      </div>
    </Modal>
  )
}
