import type { Profile } from '../db/types'

// Eiichiの初期プロフィール(要件§4)。Phase 2のセットアップウィザードで編集可能になる
export const INITIAL_PROFILE: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> = {
  heightCm: 168,
  weightKg: 58,
}
