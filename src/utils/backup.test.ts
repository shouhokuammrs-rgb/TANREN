// エクスポート→全削除→インポートで完全復元されることのDB層テスト(2-6受け入れ条件)
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { exportBackup, importBackup, wipeAllData } from './backup'

async function seedSampleData() {
  const sessionId = (await db.sessions.add({
    startedAt: new Date('2026-07-09T10:00:00'),
    endedAt: new Date('2026-07-09T10:45:00'),
    status: 'completed',
    muscles: ['chest'],
    rpe: 7,
    handoverNote: '次はフライから',
  })) as number
  const seId = (await db.session_exercises.add({
    sessionId,
    exerciseId: 1,
    order: 0,
  })) as number
  await db.sets.add({
    sessionExerciseId: seId,
    setNumber: 1,
    suggestedWeightKg: 11.5,
    suggestedReps: 8,
    actualWeightKg: 11.5,
    actualReps: 8,
    achieved: true,
    isPr: true,
    completedAt: new Date('2026-07-09T10:10:00'),
  })
  await db.photos.add({
    takenAt: new Date('2026-07-09T09:00:00'),
    pose: 'front',
    blob: new Blob([new Uint8Array([1, 2, 3, 250, 251, 252])], { type: 'image/jpeg' }),
    note: 'テスト写真',
  })
  await db.strength_marks.add({
    refLiftId: 'barbell_bench_press',
    weightKg: 45,
    reps: 7,
    recordedAt: new Date('2026-07-08T12:00:00'),
  })
  await db.goals.add({
    profileId: 1,
    goalType: 'lean',
    wantParts: ['shoulders'],
    avoidParts: [{ part: 'legs', reason: 'dislike' }],
    createdAt: new Date('2026-07-08T12:00:00'),
  })
  await db.body_stats.add({ measuredAt: new Date('2026-07-09T08:00:00'), weightKg: 58.2 })
}

describe('バックアップの完全復元(F-08)', () => {
  beforeEach(async () => {
    await db.open()
    // ログ系を空にしてから投入(マスタはシード済みのまま)
    for (const t of ['sessions', 'session_exercises', 'sets', 'photos', 'strength_marks', 'goals', 'body_stats']) {
      await db.table(t).clear()
    }
    await seedSampleData()
  })

  it('エクスポート→全削除→インポートで全テーブルが復元される', async () => {
    const before = {
      sessions: await db.sessions.count(),
      sets: await db.sets.count(),
      photos: await db.photos.count(),
      exercises: await db.exercises.count(),
      marks: await db.strength_marks.count(),
    }

    const backup = await exportBackup()
    // JSON往復(実際のファイル書き出しと同条件にする)
    const roundTripped = JSON.parse(JSON.stringify(backup))

    await wipeAllData()
    expect(await db.sessions.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
    // 全削除後もシードは再投入される
    expect(await db.exercises.count()).toBe(before.exercises)

    await importBackup(roundTripped)

    expect(await db.sessions.count()).toBe(before.sessions)
    expect(await db.sets.count()).toBe(before.sets)
    expect(await db.photos.count()).toBe(before.photos)
    expect(await db.strength_marks.count()).toBe(before.marks)
    expect(await db.exercises.count()).toBe(before.exercises)
  })

  it('Date列とBlob・フラグが正しく復元される', async () => {
    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await wipeAllData()
    await importBackup(backup)

    const session = (await db.sessions.toArray())[0]
    expect(session.startedAt).toBeInstanceOf(Date)
    expect(session.startedAt.getTime()).toBe(new Date('2026-07-09T10:00:00').getTime())
    expect(session.handoverNote).toBe('次はフライから')

    const set = (await db.sets.toArray())[0]
    expect(set.isPr).toBe(true)
    expect(set.completedAt).toBeInstanceOf(Date)

    const photo = (await db.photos.toArray())[0]
    expect(photo.takenAt).toBeInstanceOf(Date)
    const bytes = new Uint8Array(await photo.blob.arrayBuffer())
    expect([...bytes]).toEqual([1, 2, 3, 250, 251, 252])

    const goal = (await db.goals.toArray())[0]
    expect(goal.avoidParts).toEqual([{ part: 'legs', reason: 'dislike' }])
  })

  it('不正な形式はエラーになりデータを壊さない', async () => {
    const before = await db.sessions.count()
    await expect(importBackup({ version: 99 })).rejects.toThrow()
    await expect(importBackup('not json object')).rejects.toThrow()
    expect(await db.sessions.count()).toBe(before)
  })

  // ===== QA追加(Phase 7-5b): ゴール系テーブルのバックアップ網羅 =====

  it('muscle_goals(reachedAt含む)とgoal_eventsがDate復元込みで往復する', async () => {
    await db.muscle_goals.clear()
    await db.goal_events.clear()
    await db.muscle_goals.put({
      muscle: 'chest',
      level: 'solid',
      coef: 0.5,
      mode: 'growth',
      updatedAt: new Date('2026-08-01T09:00:00'),
      reachedAt: new Date('2026-08-01T10:00:00'),
    })
    await db.goal_events.add({
      muscle: 'chest',
      type: 'raise',
      at: new Date('2026-08-01T10:05:00'),
      note: '32kg(直接編集)',
    })

    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await wipeAllData()
    expect(await db.muscle_goals.count()).toBe(0)
    expect(await db.goal_events.count()).toBe(0)
    await importBackup(backup)

    const goal = await db.muscle_goals.get('chest')
    expect(goal?.coef).toBe(0.5)
    expect(goal?.updatedAt).toBeInstanceOf(Date)
    expect(goal?.reachedAt).toBeInstanceOf(Date)
    expect(goal?.reachedAt?.getTime()).toBe(new Date('2026-08-01T10:00:00').getTime())

    const event = (await db.goal_events.toArray())[0]
    expect(event.type).toBe('raise')
    expect(event.at).toBeInstanceOf(Date)
    expect(event.note).toBe('32kg(直接編集)')
  })

  it('reachedAt未設定のゴールはインポート後もundefinedのまま(状態4に誤遷移しない)', async () => {
    await db.muscle_goals.clear()
    await db.muscle_goals.put({
      muscle: 'back',
      level: 'toned',
      coef: 0.35,
      mode: 'growth',
      updatedAt: new Date('2026-08-01T09:00:00'),
    })
    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await wipeAllData()
    await importBackup(backup)
    expect((await db.muscle_goals.get('back'))?.reachedAt).toBeUndefined()
  })

  it('旧形式バックアップ(ゴール系テーブルのキーなし)も後方互換で取り込める', async () => {
    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    delete backup.tables.muscle_goals
    delete backup.tables.goal_events

    await importBackup(backup)
    expect(await db.muscle_goals.count()).toBe(0)
    expect(await db.goal_events.count()).toBe(0)
    // 他テーブルは通常どおり復元される
    expect(await db.sessions.count()).toBe(1)
  })
})
