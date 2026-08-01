// 実行画面メニュー一覧シート(ISS-021)の状態導出。
// メニュー生成結果+実績(sets.completedAt)の突合のみで導出し、新規テーブルは持たない

export type MenuEntryStatus = 'done' | 'active' | 'pending'

/**
 * 種目ごとの状態を導出する(表示順前提)。
 * - done: 全セット完了
 * - active: 最初に未完了セットを含む種目(実行画面のfirstIncompleteと同じ規則)
 * - pending: それ以降の未着手・未完了種目
 */
export function entryStatuses(entries: { sets: { completedAt?: Date }[] }[]): MenuEntryStatus[] {
  let activeAssigned = false
  return entries.map((entry) => {
    const done = entry.sets.length > 0 && entry.sets.every((s) => s.completedAt !== undefined)
    if (done) return 'done'
    if (!activeAssigned) {
      activeAssigned = true
      return 'active'
    }
    return 'pending'
  })
}
