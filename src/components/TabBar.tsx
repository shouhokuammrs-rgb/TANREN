// 5タブ化(DEC-015 §1)+アイコン24px+ラベル併記(ISS-028 / tab_icons_spec.md)。
// アクティブ表現は位置ドット廃止→アイコン色(molten)+グロー。
// 通知(未判定の鏡チェック)は「成長」アイコン右上の独立バッジ(bg-gold・数値なし)
import { useLiveQuery } from 'dexie-react-hooks'
import { NavLink } from 'react-router-dom'
import type { ComponentType } from 'react'
import { TAB_LABELS } from '../constants/copy'
import { db } from '../db/db'
import { hasPendingMirrorGoal } from '../engine/goal'
import { GrowthIcon, HomeIcon, LogIcon, SettingsIcon, WorkoutIcon } from './icons/TabIcons'

const TABS = [
  { to: '/', label: TAB_LABELS.home, Icon: HomeIcon },
  { to: '/workout', label: TAB_LABELS.workout, Icon: WorkoutIcon },
  { to: '/growth', label: TAB_LABELS.growth, Icon: GrowthIcon },
  { to: '/log', label: TAB_LABELS.log, Icon: LogIcon },
  { to: '/settings', label: TAB_LABELS.settings, Icon: SettingsIcon },
]

// アクティブアイコンのグロー(仕様§4)
const ACTIVE_GLOW = { filter: 'drop-shadow(0 0 7px rgb(255 92 26 / .55))' }

// タブ1個分の中身(純表示・状態はpropsのみ)。単体テスト対象
export function TabItemContent({
  Icon,
  label,
  isActive,
  notify,
}: {
  Icon: ComponentType
  label: string
  isActive: boolean
  notify: boolean
}) {
  return (
    <>
      <span
        className={`relative h-6 w-6 transition-colors duration-150 ease-out ${
          isActive ? 'text-molten' : 'text-tab-idle'
        }`}
        style={isActive ? ACTIVE_GLOW : undefined}
      >
        <Icon />
        {/* 通知バッジ: アクティブとも共存(moltenアイコンにgoldバッジ・仕様§4) */}
        {notify && (
          <span className="anim-pulse absolute -top-px -right-0.5 h-[7px] w-[7px] rounded-pill border-[1.5px] border-forge-black bg-gold" />
        )}
      </span>
      {label}
    </>
  )
}

export default function TabBar() {
  // 未判定の鏡チェック(状態4)が1つでもあれば成長タブに通知バッジ
  const pendingMirror = useLiveQuery(async () => {
    const goals = await db.muscle_goals.toArray()
    return hasPendingMirrorGoal(goals)
  })

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line-ember bg-forge-black/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md py-3">
        {TABS.map((tab) => {
          const notify = tab.to === '/growth' && pendingMirror === true
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              // タップ領域はタブ全体(min-h-11 + flex-1)。押下中はactive:opacity-70
              className={({ isActive }) =>
                `group flex min-h-11 flex-1 flex-col items-center justify-center gap-[5px] whitespace-nowrap text-[11px] transition-colors duration-150 ease-out active:opacity-70 ${
                  isActive ? 'font-bold text-text-hot' : 'font-medium text-tab-idle'
                }`
              }
            >
              {({ isActive }) => (
                <TabItemContent Icon={tab.Icon} label={tab.label} isActive={isActive} notify={notify} />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
