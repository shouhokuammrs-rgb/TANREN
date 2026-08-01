// ホーム(IA再設計 DEC-015 §3): 回復ステータス統合 → 今日のメニュー → 開始CTA → 成長1行サマリー
// → 未判定の鏡チェックバナー。CTAはファーストビュー内に収める。
// 旧構成(統計カード/ボリュームグラフ/体重グラフ/成長カード/回復予測スロット/写真リンク)は撤去
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { MirrorCheckModal } from '../components/MirrorCheck'
import RecoveryStatus from '../components/RecoveryStatus'
import {
  APP_NAME,
  HOME_COPY,
  MENU_COPY,
  MUSCLE_GROUP_LABELS,
  SETUP_COPY,
  STORAGE_COPY,
} from '../constants/copy'
import { db } from '../db/db'
import { lastExportAt, shouldRemindExport } from '../utils/backup'
import { loadEngineContext, loadGrowthSessions } from '../db/queries'
import { generateMenu, muscleFreshnessMap, weeklyTopGain } from '../engine'
import { useLocalSetting } from '../hooks/useLocalSetting'

export default function HomePage() {
  const [bannerDismissed, setBannerDismissed] = useLocalSetting('setupBannerDismissed', false)
  const [mirrorOpen, setMirrorOpen] = useState(false)

  // ISS-023: セットアップバナーの判定はmuscle_goals基準(旧goalsテーブルは読まない)
  const muscleGoalCount = useLiveQuery(() => db.muscle_goals.count())
  const exportReminder = useLiveQuery(async () => {
    const hasData = (await db.sessions.count()) > 0
    return { show: shouldRemindExport(lastExportAt(), hasData), never: lastExportAt() === null }
  })
  const engineCtx = useLiveQuery(() => loadEngineContext())
  const freshness = engineCtx ? muscleFreshnessMap(engineCtx) : undefined
  const growthSessions = useLiveQuery(() => loadGrowthSessions())
  const profile = useLiveQuery(() => db.profiles.orderBy('id').first())
  // 未判定の鏡チェック(状態4)。最古の1件をバナー表示(§3-5)
  const pendingGoals = useLiveQuery(async () => {
    const goals = await db.muscle_goals
      .filter((g) => g.reachedAt !== undefined && g.mode === 'growth')
      .toArray()
    return goals.sort((a, b) => (a.reachedAt?.getTime() ?? 0) - (b.reachedAt?.getTime() ?? 0))
  })

  // 成長1行サマリー(§3-4): 直近7日でe1RM上昇幅最大の部位。該当なしはブロック非表示
  const topGain = useMemo(
    () => weeklyTopGain(growthSessions ?? [], new Date()),
    [growthSessions],
  )

  // 今日のメニュー(§3-3): おまかせ45分・普通を想定したプレビュー(種目3件+所要時間)
  const preview = useMemo(
    () =>
      engineCtx
        ? generateMenu(engineCtx, { availableMinutes: 45, targetMuscles: [], condition: 'normal' })
        : null,
    [engineCtx],
  )
  const exerciseById = useMemo(
    () => new Map((engineCtx?.exercises ?? []).map((e) => [e.id!, e])),
    [engineCtx],
  )

  const now = new Date()
  const oldestPending = pendingGoals?.[0]

  return (
    <section className="space-y-4">
      {/* 1. ヘッダー(ワードマーク+日付) */}
      <header className="flex items-baseline justify-between">
        <span className="label-mono text-[12px] font-bold text-molten">{APP_NAME}</span>
        <span className="label-mono text-[11px] tracking-normal text-ink-dim">
          {now.getMonth() + 1}/{now.getDate()}
        </span>
      </header>

      {/* 部位別ゴール未設定バナー(ISS-023): muscle_goals 0件のみ表示・導線は設定①。
          鏡チェックバナー(#FFB300)と区別する鈍色枠(Designer指定) */}
      {muscleGoalCount === 0 && !bannerDismissed && (
        <div className="rounded-[12px] border border-[#3A2213] p-3">
          <p className="text-sm text-ink-mid">{SETUP_COPY.banner}</p>
          <div className="mt-2 flex gap-2">
            <Link
              to="/settings"
              className="pill-molten flex h-11 flex-1 items-center justify-center text-sm"
            >
              {SETUP_COPY.bannerCta}
            </Link>
            <button
              type="button"
              className="pill-ghost h-11 px-4 text-sm"
              onClick={() => setBannerDismissed(true)}
            >
              {SETUP_COPY.bannerSkip}
            </button>
          </div>
        </div>
      )}

      {/* 2. 回復ステータス(統合・ISS-016) */}
      {engineCtx && freshness && <RecoveryStatus ctx={engineCtx} freshness={freshness} />}

      {/* 3. 今日のメニュー(おまかせ45分・普通のプレビュー) */}
      <div
        className="rounded-[14px] border border-[#3A2213] p-4"
        style={{ background: 'rgba(255,92,26,.06)' }}
      >
        <div className="flex items-baseline justify-between">
          <p className="label-mono text-[10px] text-accent-dim">{HOME_COPY.menuSection}</p>
          {preview && preview.items.length > 0 && (
            <span className="label-mono text-[11px] tracking-normal text-accent-dim">
              {HOME_COPY.menuEstimate(preview.estimatedMinutes)}
            </span>
          )}
        </div>
        {preview === null ? (
          <p className="mt-2 text-center text-sm text-ink-dim">…</p>
        ) : preview.items.length === 0 ? (
          <p className="mt-2 text-sm text-ink-mid">{MENU_COPY.restDayTitle}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {preview.items.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-ink">
                  {exerciseById.get(item.exerciseId)?.name ?? ''}
                </span>
                <span className="label-mono text-xs tracking-normal text-[#B06A3E]">
                  {MENU_COPY.setsReps(item.sets, item.suggestedReps)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 4. 開始CTA(56px・ファーストビュー内) */}
      <Link
        to="/workout"
        className="pill-molten flex h-14 w-full items-center justify-center text-[17px]"
      >
        {HOME_COPY.startCta}
      </Link>

      {/* 5. 成長1行サマリー(上昇部位なしは非表示) */}
      {topGain && (
        <Link
          to="/growth"
          className="flex items-center justify-between rounded-[12px] border border-[#241812] px-4 py-3"
        >
          <span className="text-[13px] font-bold text-[#D9CFC6]">
            {HOME_COPY.growthSummaryLabel(MUSCLE_GROUP_LABELS[topGain.muscle])}{' '}
            <span className="label-mono text-[13px] font-bold tracking-normal text-[#FF7A33]">
              {HOME_COPY.growthSummaryGain(topGain.gainKg)}
            </span>
          </span>
          <span className="text-[#6B5A4C]">→</span>
        </Link>
      )}

      {/* 6. 未判定の鏡チェックバナー(最古1件+他n件・§3-5) */}
      {oldestPending && (
        <button
          type="button"
          onClick={() => setMirrorOpen(true)}
          className="anim-pulse w-full rounded-[12px] p-3 text-left text-sm font-bold"
          style={{ border: '1px solid #FFB300', background: 'rgba(255,179,0,.07)', color: '#FFB300' }}
        >
          🏆 {HOME_COPY.mirrorBanner(MUSCLE_GROUP_LABELS[oldestPending.muscle])}
          {pendingGoals && pendingGoals.length > 1 && (
            <span className="ml-1 text-xs font-normal">
              {HOME_COPY.mirrorOthers(pendingGoals.length - 1)}
            </span>
          )}
        </button>
      )}

      {exportReminder?.show && (
        <div className="card-ember flex items-center justify-between gap-2 p-3 text-xs text-ink-mid">
          <span>💾 {exportReminder.never ? STORAGE_COPY.reminderNever : STORAGE_COPY.reminder}</span>
          <Link to="/settings" className="pill-ghost shrink-0 px-3 py-2 text-xs">
            {STORAGE_COPY.reminderCta}
          </Link>
        </div>
      )}

      {mirrorOpen && oldestPending && (
        <MirrorCheckModal
          goal={oldestPending}
          bodyWeightKg={profile?.weightKg ?? 58}
          onClose={() => setMirrorOpen(false)}
        />
      )}
    </section>
  )
}
