// ログタブ月カレンダーの導出(ISS-026・純関数)。実施日はsessionsから導出し新規テーブルなし。
// 週の開始は月曜(ボリューム集計の週バケットと同じ流儀)

export interface CalendarCell {
  date: Date
  /** 表示対象月のセルか(前後月の埋めセルはfalse) */
  inMonth: boolean
}

/** 月曜始まりの月グリッド(前後月の埋めセル込み・長さは7の倍数) */
export function monthGrid(year: number, monthIndex: number): CalendarCell[] {
  const first = new Date(year, monthIndex, 1)
  const startOffset = (first.getDay() + 6) % 7 // 月曜=0
  const last = new Date(year, monthIndex + 1, 0)
  const endOffset = 6 - ((last.getDay() + 6) % 7)
  const total = startOffset + last.getDate() + endOffset
  const start = new Date(year, monthIndex, 1 - startOffset)
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { date, inMonth: date.getMonth() === monthIndex }
  })
}

/** ローカル日付キー(同日判定用) */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** トレ実施日のキー集合(同日複数セッションは1つに畳む) */
export function trainedDayKeys(sessions: { startedAt: Date }[]): Set<string> {
  return new Set(sessions.map((s) => dayKey(s.startedAt)))
}

/** 前後月ナビ(年跨ぎ対応) */
export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1)
  return { year: d.getFullYear(), monthIndex: d.getMonth() }
}
