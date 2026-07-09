interface StepperProps {
  label: string
  value: number
  display?: string
  onChange: (next: number) => void
  /** +/-を押したときの次の値を返す(重量は器具の刻み、レップは±1) */
  step: (current: number, direction: 1 | -1) => number
}

/** トレ中に片手で素早く実績を入力するための±ステッパー(タップターゲット44px以上) */
export default function Stepper({ label, value, display, onChange, step }: StepperProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <div className="flex items-center">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-l-lg bg-slate-800 text-xl text-slate-300 active:bg-slate-700"
          onClick={() => onChange(step(value, -1))}
        >
          −
        </button>
        <span className="flex h-11 min-w-14 items-center justify-center bg-slate-800/60 px-1 text-sm font-semibold tabular-nums">
          {display ?? value}
        </span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-r-lg bg-slate-800 text-xl text-slate-300 active:bg-slate-700"
          onClick={() => onChange(step(value, 1))}
        >
          +
        </button>
      </div>
    </div>
  )
}
