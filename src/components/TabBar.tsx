import { NavLink } from 'react-router-dom'
import { TAB_LABELS } from '../constants/copy'

const TABS = [
  {
    to: '/',
    label: TAB_LABELS.home,
    // house
    path: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  },
  {
    to: '/workout',
    label: TAB_LABELS.workout,
    // dumbbell
    path: 'M2 12h2m16 0h2M6 8v8M9 6v12M15 6v12M18 8v8M9 12h6',
  },
  {
    to: '/log',
    label: TAB_LABELS.log,
    // chart
    path: 'M4 4v16h16M8 16v-5m4 5V8m4 8v-3',
  },
  {
    to: '/settings',
    label: TAB_LABELS.settings,
    // gear (simplified)
    path: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3a7 7 0 0 1-.1 1.2l2 1.6-2 3.4-2.4-1a7 7 0 0 1-2 1.2L14 21h-4l-.5-2.6a7 7 0 0 1-2-1.2l-2.4 1-2-3.4 2-1.6A7 7 0 0 1 5 12a7 7 0 0 1 .1-1.2l-2-1.6 2-3.4 2.4 1a7 7 0 0 1 2-1.2L10 3h4l.5 2.6a7 7 0 0 1 2 1.2l2.4-1 2 3.4-2 1.6A7 7 0 0 1 19 12Z',
  },
]

export default function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            // タップターゲット44px以上(h-16 = 64px)
            className={({ isActive }) =>
              `flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                isActive ? 'text-orange-400' : 'text-slate-400'
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={tab.path} />
            </svg>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
