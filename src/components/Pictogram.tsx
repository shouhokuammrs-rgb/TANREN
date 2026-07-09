import type { MovementPattern } from '../db/types'

// 動作パターン別の簡易ピクトグラム(ISS-001)。
// 種目個別ではなくパターン単位。Phase 4のデザイン磨き込みで差し替え予定の仮グラフィック
const PATTERN_PATHS: Record<MovementPattern, string[]> = {
  // ベンチ(下の台)+バーを真上に押す
  horizontal_press: ['M3 20h18', 'M6 20v-3h12v3', 'M7 12h10', 'M5 9v6', 'M19 9v6', 'M12 9V3', 'M9.5 5.5 12 3l2.5 2.5'],
  // 頭上へ押し上げる(床+バー+長い上矢印)
  vertical_press: ['M5 21h14', 'M7 9h10', 'M5 6v6', 'M19 6v6', 'M12 6V2', 'M10 4l2-2 2 2'],
  // 前傾姿勢で引き上げる
  row: ['M4 21h16', 'M5 17l7-9 7-1', 'M13 17v-6', 'M10.5 13.5 13 11l2.5 2.5'],
  // 股関節から曲げる(脚は垂直・上体が倒れる)
  hinge: ['M4 21h16', 'M9 21v-9', 'M9 12l9-6', 'M9 12l-3-2', 'M15 21v-2'],
  // しゃがみ込み(ジグザグの脚+担いだ荷重)
  squat: ['M4 21h16', 'M9 21v-4l5-3V9', 'M8 7h10', 'M14 9l3 3'],
  // 単関節の弧(カールの軌道)
  isolation: ['M6 20V10', 'M6 15a7 7 0 0 1 11-4', 'M15.5 8.5 17 11l-2.7.8'],
  // 体幹の屈曲(床+丸まる上体)
  core: ['M3 20h18', 'M6 20c0-5 4-8 9-8', 'M15 12a3 3 0 1 1 0 .01'],
}

interface PictogramProps {
  pattern: MovementPattern
  className?: string
}

export default function Pictogram({ pattern, className = 'h-10 w-10' }: PictogramProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATTERN_PATHS[pattern].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
