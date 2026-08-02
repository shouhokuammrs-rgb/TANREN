// タブアイコン5種(ISS-028 / tab_icons_spec.md §2〜§3)。
// SVGパスは仕様の値をそのまま使用(独自調整禁止)。色は親のtext-*からcurrentColorで継承
import type { ReactNode } from 'react'

// 共通属性: viewBox 24 / fill none / stroke currentColor 1.75 / round cap+join。
// 装飾なのでaria-hidden(読み上げはTAB_LABELSのテキストが担う)
function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function HomeIcon() {
  return (
    <IconBase>
      <path d="M3.4 10.3 L12 3.7 L20.6 10.3" />
      <path d="M5.7 9.2 V20.3 H18.3 V9.2" />
      <path d="M9.9 20.3 V14.6 H14.1 V20.3" />
    </IconBase>
  )
}

export function WorkoutIcon() {
  return (
    <IconBase>
      <path d="M8.4 12 H15.6" />
      <path d="M6.6 8.3 V15.7" />
      <path d="M17.4 8.3 V15.7" />
      <path d="M3.6 10.1 V13.9" />
      <path d="M20.4 10.1 V13.9" />
    </IconBase>
  )
}

export function GrowthIcon() {
  return (
    <IconBase>
      <path d="M12 21.7 C8.4 21.7 5.7 19.1 5.7 15.7 C5.7 11.4 9.5 9.7 9.1 4.3 C13.4 6.7 18.3 10.3 18.3 15.7 C18.3 19.1 15.6 21.7 12 21.7 Z" />
      <path d="M12 18.5 V11.5" />
      <path d="M9.5 14 L12 11.4 L14.5 14" />
    </IconBase>
  )
}

export function LogIcon() {
  return (
    <IconBase>
      <path d="M10.2 7.3 H18.6" />
      <path d="M10.2 12 H18.6" />
      <path d="M10.2 16.7 H15.4" />
      <path d="M6.3 6.2 a1.1 1.1 0 1 0 0.01 0 Z" fill="currentColor" />
      <path d="M6.3 10.9 a1.1 1.1 0 1 0 0.01 0 Z" fill="currentColor" />
      <path d="M6.3 15.6 a1.1 1.1 0 1 0 0.01 0 Z" fill="currentColor" />
    </IconBase>
  )
}

export function SettingsIcon() {
  return (
    <IconBase>
      <path d="M3.8 7.6 H20.2" />
      <path d="M3.8 16.4 H20.2" />
      <path d="M9.6 5.2 a2.4 2.4 0 1 0 0.01 0 Z" />
      <path d="M15 14 a2.4 2.4 0 1 0 0.01 0 Z" />
    </IconBase>
  )
}
