import { HOME_COPY } from '../constants/copy'

export default function HomePage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">{HOME_COPY.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{HOME_COPY.subtitle}</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
        {HOME_COPY.placeholder}
      </div>
    </section>
  )
}
