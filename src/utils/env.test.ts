import { describe, expect, it } from 'vitest'
import { isPreviewHost, productionUrl } from './env'
import { shouldRemindExport } from './backup'

// 本番ホストはビルド時環境変数のため、テストは値を明示して判定ロジックを固定する(ISS-010)
const PROD = 'tanren-lake.vercel.app'

describe('isPreviewHost(ISS-009-2 / ISS-010)', () => {
  it('本番ドメイン自身は警告しない(偽陽性ケース)', () => {
    expect(isPreviewHost(PROD, PROD)).toBe(false)
  })

  it('プレビューURLでは警告する(偽陰性ケース)', () => {
    expect(isPreviewHost('tanren-git-feature-x.vercel.app', PROD)).toBe(true)
    expect(isPreviewHost('tanren-abc123-team.vercel.app', PROD)).toBe(true)
  })

  it('本番ホスト未設定なら常に警告しない(ISS-010: 無効化)', () => {
    expect(isPreviewHost('tanren-git-feature-x.vercel.app', undefined)).toBe(false)
    expect(isPreviewHost('anything.vercel.app', undefined)).toBe(false)
  })

  it('開発環境・他ドメインは対象外', () => {
    expect(isPreviewHost('localhost', PROD)).toBe(false)
    expect(isPreviewHost('example.com', PROD)).toBe(false)
    // 似せた別ドメインも対象外(末尾一致のみ)
    expect(isPreviewHost('vercel.app.example.com', PROD)).toBe(false)
  })
})

describe('productionUrl', () => {
  it('ホスト設定時はURL、未設定はundefined', () => {
    expect(productionUrl(PROD)).toBe(`https://${PROD}/`)
    expect(productionUrl(undefined)).toBeUndefined()
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
