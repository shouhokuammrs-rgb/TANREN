// 5タブ化(DEC-015 §1)。アイコンなし・2〜3字ラベル+アクティブドット。
// 通知(未判定の鏡チェック)は「成長」タブのドットを#FFB300に変える方式(数値バッジなし)
import { useLiveQuery } from 'dexie-react-hooks'
import { NavLink } from 'react-router-dom'
import { TAB_LABELS } from '../constants/copy'
import { db } from '../db/db'

const TABS = [
  { to: '/', label: TAB_LABELS.home },
  { to: '/workout', label: TAB_LABELS.workout },
  { to: '/growth', label: TAB_LABELS.growth },
  { to: '/log', label: TAB_LABELS.log },
  { to: '/settings', label: TAB_LABELS.settings },
]

export default function TabBar() {
  // 未判定の鏡チェック(状態4)が1つでもあれば成長タブに通知ドット
  const hasPendingMirror = useLiveQuery(async () => {
    const goals = await db.muscle_goals.toArray()
    return goals.some((g) => g.reachedAt !== undefined && g.mode === 'growth')
  })

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line-ember bg-forge-black/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md py-3">
        {TABS.map((tab) => {
          const notify = tab.to === '/growth' && hasPendingMirror === true
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              // タップ領域44px以上。アクティブ=#FFE3CC+ドット(§1)
              className={({ isActive }) =>
                `flex min-h-11 flex-1 flex-col items-center justify-center gap-[5px] whitespace-nowrap text-[11px] ${
                  isActive ? 'font-bold text-[#FFE3CC]' : 'font-medium text-[#6B5A4C]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="h-[5px] w-[5px] rounded-pill"
                    style={{
                      background: notify ? '#FFB300' : isActive ? '#FF5C1A' : 'transparent',
                    }}
                  />
                  {tab.label}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
