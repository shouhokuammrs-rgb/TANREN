// タブアイコンの状態遷移テスト(ISS-028 / tab_icons_spec.md §4)。
// RTL不使用のため、純表示コンポーネントをrenderToStaticMarkupで固定する
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { hasPendingMirrorGoal } from '../engine/goal'
import { TabItemContent } from './TabBar'
import { GrowthIcon, HomeIcon, LogIcon, SettingsIcon, WorkoutIcon } from './icons/TabIcons'

describe('タブアイコン(ISS-028)', () => {
  it('非アクティブ: アイコンはtab-idle色・グローなし・バッジなし', () => {
    const html = renderToStaticMarkup(
      <TabItemContent Icon={HomeIcon} label="ホーム" isActive={false} notify={false} />,
    )
    expect(html).toContain('text-tab-idle')
    expect(html).not.toContain('text-molten')
    expect(html).not.toContain('drop-shadow')
    expect(html).not.toContain('bg-gold')
    expect(html).toContain('ホーム')
  })

  it('アクティブ: molten色+グロー(位置ドットは存在しない)', () => {
    const html = renderToStaticMarkup(
      <TabItemContent Icon={GrowthIcon} label="成長" isActive={true} notify={false} />,
    )
    expect(html).toContain('text-molten')
    expect(html).toContain('drop-shadow(0 0 7px')
    // 旧仕様の位置ドット(5px)が復活していないこと
    expect(html).not.toContain('h-[5px]')
    expect(html).not.toContain('#FF5C1A')
  })

  it('通知共存: アクティブのmoltenアイコンにgoldバッジが重なる', () => {
    const html = renderToStaticMarkup(
      <TabItemContent Icon={GrowthIcon} label="成長" isActive={true} notify={true} />,
    )
    expect(html).toContain('text-molten')
    expect(html).toContain('bg-gold')
    expect(html).toContain('anim-pulse')
    // バッジは背景色の縁でアイコン線と分離(仕様§4)
    expect(html).toContain('border-forge-black')
  })

  it('アイコン5種すべて: aria-hidden・24pxボックス・currentColor線', () => {
    for (const Icon of [HomeIcon, WorkoutIcon, GrowthIcon, LogIcon, SettingsIcon]) {
      const html = renderToStaticMarkup(<Icon />)
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('h-6 w-6')
      expect(html).toContain('stroke="currentColor"')
      expect(html).toContain('stroke-width="1.75"')
      expect(html).toContain('viewBox="0 0 24 24"')
    }
  })

  it('ログのみ行頭ドットにfill=currentColorを持つ(他はfill=noneのみ)', () => {
    expect(renderToStaticMarkup(<LogIcon />)).toContain('fill="currentColor"')
    for (const Icon of [HomeIcon, WorkoutIcon, GrowthIcon, SettingsIcon]) {
      expect(renderToStaticMarkup(<Icon />)).not.toContain('fill="currentColor"')
    }
  })

  it('通知発火条件の回帰なし: reachedAtあり×growthのみ発火', () => {
    const at = new Date()
    expect(hasPendingMirrorGoal([])).toBe(false)
    expect(hasPendingMirrorGoal([{ mode: 'growth' }])).toBe(false)
    expect(hasPendingMirrorGoal([{ mode: 'maintain', reachedAt: at }])).toBe(false)
    expect(hasPendingMirrorGoal([{ mode: 'growth', reachedAt: at }])).toBe(true)
    expect(
      hasPendingMirrorGoal([{ mode: 'maintain', reachedAt: at }, { mode: 'growth', reachedAt: at }]),
    ).toBe(true)
  })
})
