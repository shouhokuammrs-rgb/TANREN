import { WORKOUT_COPY } from '../constants/copy'

export default function WorkoutPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">{WORKOUT_COPY.title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
        {WORKOUT_COPY.placeholder}
      </div>
    </section>
  )
}
