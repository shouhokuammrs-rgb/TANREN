// 上端セーフエリア適用の固定テスト(ISS-027)。
// E2Eビューポートではenv(safe-area-inset-top)を再現できないため、
// シェル・fixed全画面要素への適用有無をソースレベルで固定する(実機確認はEiichi)
import { describe, expect, it } from 'vitest'
import indexHtml from '../index.html?raw'
import appSource from './App.tsx?raw'
import growthSource from './pages/GrowthPage.tsx?raw'
import tabBarSource from './components/TabBar.tsx?raw'

describe('上端セーフエリア(ISS-027)', () => {
  it('viewport-fit=cover が宣言されている(前提)', () => {
    expect(indexHtml).toContain('viewport-fit=cover')
  })

  it('アプリシェルに safe-area-inset-top が一括適用されている', () => {
    expect(appSource).toContain('pt-[env(safe-area-inset-top)]')
  })

  it('fixed全画面要素(成長フルスクリーン推移)にも個別適用されている', () => {
    expect(growthSource).toContain('max(1.5rem,env(safe-area-inset-top))')
  })

  it('下端系fixed(タブバー)は既存のsafe-area-inset-bottom対応が維持されている', () => {
    expect(tabBarSource).toContain('env(safe-area-inset-bottom)')
  })
})
