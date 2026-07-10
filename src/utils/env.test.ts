import { describe, expect, it } from 'vitest'
import { isPreviewHost, PRODUCTION_HOST } from './env'
import { shouldRemindExport } from './backup'

describe('isPreviewHost(ISS-009-2)', () => {
  it('本番ホストはプレビュー扱いしない', () => {
    expect(isPreviewHost(PRODUCTION_HOST)).toBe(false)
  })

  it('本番以外の*.vercel.appはプレビュー', () => {
    expect(isPreviewHost('tanren-git-feature-x.vercel.app')).toBe(true)
    expect(isPreviewHost('tanren-abc123.vercel.app')).toBe(true)
  })

  it('開発環境・他ドメインは対象外', () => {
    expect(isPreviewHost('localhost')).toBe(false)
    expect(isPreviewHost('example.com')).toBe(false)
    // 似せた別ドメインも対象外(末尾一致のみ)
    expect(isPreviewHost('vercel.app.example.com')).toBe(false)
  })
})

describe('shouldRemindExport(ISS-009-3)', () => {
  const now = new Date('2026-07-10T12:00:00')

  it('記録データがなければ出さない', () => {
    expect(shouldRemindExport(null, false, now)).toBe(false)
  })

  it('データありで未エクスポートなら出す', () => {
    expect(shouldRemindExport(null, true, now)).toBe(true)
  })

  it('7日以内なら出さない・7日超で出す(境界値)', () => {
    const exactly7d = new Date(now.getTime() - 7 * 24 * 3_600_000)
    const over7d = new Date(now.getTime() - 7 * 24 * 3_600_000 - 60_000)
    expect(shouldRemindExport(exactly7d, true, now)).toBe(false)
    expect(shouldRemindExport(over7d, true, now)).toBe(true)
  })
})
