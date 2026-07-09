// 日本語UI文言はこのファイルに集約する(CLAUDE.md コーディングルール)

export const APP_NAME = 'TANREN'

export const TAB_LABELS = {
  home: 'ホーム',
  workout: '今日のトレ',
  log: 'ログ',
  settings: '設定',
} as const

export const MUSCLE_GROUP_LABELS = {
  chest: '胸',
  back: '背中',
  shoulders: '肩',
  arms: '腕',
  legs: '脚',
  abs: '腹',
  glutes: '尻',
} as const

export const EQUIPMENT_TYPE_LABELS = {
  dumbbell: 'ダンベル',
  bench: 'ベンチ',
  bodyweight: '自重',
  other: 'その他',
} as const

export const HOME_COPY = {
  title: `${APP_NAME}(鍛錬)`,
  subtitle: '今日の最適メニューを、考えずに。',
  placeholder: 'Phase 1でここに「今日のトレを始める」導線とサマリーが入ります。',
}

export const WORKOUT_COPY = {
  title: '今日のトレ',
  placeholder: 'Phase 1でここにヒヤリング(時間・部位・コンディション)→メニュー生成→実行画面が入ります。',
}

export const LOG_COPY = {
  title: 'ログ',
  placeholder: 'Phase 1でここにセッション履歴が入ります。',
}

export const SETTINGS_COPY = {
  title: '設定',
  equipmentSection: '器具',
  equipmentEmpty: '器具が登録されていません。',
  equipmentCount: (n: number) => `×${n}`,
  dumbbellSteps: (min: number, max: number, steps: number) =>
    `${min}〜${max}kg・${steps}段階`,
  benchAngle: (min: number, max: number) => `角度 ${min}°〜${max}°`,
  seedNote: 'ダンベルの重量ステップは仮設定です(実物確認後に編集可能にします: DEC-002)',
}
