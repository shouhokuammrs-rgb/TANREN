import { LOG_COPY } from '../constants/copy'

export default function LogPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">{LOG_COPY.title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
        {LOG_COPY.placeholder}
      </div>
    </section>
  )
}
