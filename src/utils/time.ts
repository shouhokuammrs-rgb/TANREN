/**
 * 就寝・起床時刻('HH:mm')から睡眠時間(時間)を算出する(ISS-007)。
 * 日跨ぎ(23:30→06:30)に対応。同時刻は0時間。形式不正はnull
 */
export function calcSleepHours(sleepStart: string, sleepEnd: string): number | null {
  const toMinutes = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
    if (!m) return null
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return null
    return h * 60 + min
  }
  const start = toMinutes(sleepStart)
  const end = toMinutes(sleepEnd)
  if (start === null || end === null) return null
  return ((end - start + 1440) % 1440) / 60
}
