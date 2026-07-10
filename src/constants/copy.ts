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

export const CONDITION_LABELS = {
  great: '絶好調',
  normal: '普通',
  tired: '疲れ気味',
} as const

export const MOVEMENT_TYPE_LABELS = {
  compound: 'コンパウンド',
  isolation: 'アイソレーション',
} as const

export const MOVEMENT_PATTERN_LABELS = {
  horizontal_press: '水平プレス',
  vertical_press: '垂直プレス',
  row: 'ロウ(引く)',
  hinge: 'ヒンジ(股関節)',
  squat: 'スクワット',
  isolation: 'アイソレーション',
  core: '体幹',
} as const

export const DETAIL_COPY = {
  primary: '主働',
  secondary: '補助',
  benchAngle: (deg: number) => `ベンチ角度 ${deg}°`,
  repRange: (min: number, max: number) => `推奨 ${min}〜${max}レップ`,
  cues: 'フォームのコツ',
  mistake: 'よくあるミス',
}

export const VIDEO_COPY = {
  section: '動画',
  search: '動画を探す',
  searchSuffix: 'フォーム やり方',
  register: 'この動画を登録',
  urlPlaceholder: 'YouTubeのURLをペースト',
  add: '登録',
  invalidUrl: 'YouTubeのURLとして認識できませんでした',
  limitReached: '登録は3件までです。不要な動画を削除してください',
  offline: 'オンラインで視聴可',
  remove: '動画を削除',
  playLabel: (n: number) => `動画${n}を再生`,
}

export const STRENGTH_COPY = {
  section: '筋力の目安',
  hint: 'ジムでの実績などを入れると、初めての種目の重量提案が実力に合います(いつでも更新可)',
  empty: '未入力(初期提案は体重比の控えめな値になります)',
  add: '筋力の目安を追加',
  addTitle: '筋力の目安を入力',
  refLift: '基準種目',
  weight: '重量(kg)',
  reps: 'レップ数',
  est1Rm: (kg: number) => `推定1RM ${kg}kg`,
  save: '登録',
  delete: '削除',
  invalid: '重量とレップ数を正しく入力してください',
  mark: (weight: number, reps: number) => `${weight}kg × ${reps}回`,
  calibrationNote: '初回の提案は目安です。キツければ迷わず下げてOK(実績から次回以降が調整されます)',
}

export const SESSION_STATUS_LABELS = {
  planned: '計画',
  in_progress: '実施中',
  completed: '完了',
  aborted: '中断',
} as const

export const HOME_COPY = {
  title: `${APP_NAME}(鍛錬)`,
  subtitle: '今日の最適メニューを、考えずに。',
  startCta: '今日のトレを始める',
  lastSession: (dateLabel: string) => `前回: ${dateLabel}`,
  noSession: 'まだトレ記録がありません。最初のトレを始めましょう💪',
}

export const HEARING_COPY = {
  title: '今日のトレ',
  resumeTitle: '前回のトレが途中です',
  resumeBody: (dateLabel: string) => `${dateLabel} 開始のセッションが残っています`,
  resume: '再開する',
  discard: '破棄する',
  stepTime: '今日使える時間は?',
  stepMuscles: '鍛えたい部位は?',
  omakase: 'おまかせ',
  chooseMuscles: '部位を選ぶ',
  musclesConfirm: 'この部位で決定',
  stepCondition: '今日のコンディションは?',
  minutesSuffix: '分',
  handoverTitle: '前回からの申し送り',
  generating: 'メニュー生成中…',
  // ISS-007: コンディション詳細(任意・折りたたみ)
  detailSection: '今日のコンディション詳細(スキップ可)',
  sleepStart: '就寝時刻',
  sleepEnd: '起床時刻',
  sleepHours: (h: number) => `睡眠 ${h.toFixed(1)}時間`,
  mealLabel: '食事',
}

export const MEAL_TIMING_LABELS = {
  before: '食前',
  within1h: '食後1時間以内',
  after2h: '食後2時間以上',
} as const

export const MENU_COPY = {
  title: '今日のメニュー',
  estimated: (min: number) => `想定 約${min}分`,
  setsReps: (sets: number, reps: number) => `${sets}セット × ${reps}レップ`,
  weight: (kg: number) => `${kg}kg`,
  bodyweight: '自重',
  interval: (sec: number) => `インターバル${sec}秒`,
  prBadge: 'PR挑戦',
  prNote: '最終セットは重量を1段上げてPRに挑戦!',
  swap: '入れ替え',
  remove: '削除',
  addExercise: '種目を追加',
  start: 'このメニューで開始',
  regenerate: '生成し直す',
  swapTitle: '代替種目を選ぶ',
  addTitle: '追加する種目を選ぶ',
  noAlternatives: '代替候補がありません',
  emptyMenu: 'メニューが空です。種目を追加するか生成し直してください',
}

export const WORKOUT_COPY = {
  title: 'ワークアウト',
  setLabel: (n: number) => `セット${n}`,
  suggested: (weight: string, reps: string) => `目標 ${weight} × ${reps}`,
  prSet: 'PR挑戦セット',
  // 提案値がデフォルト入力済み→±修正して記録するモデル(ISS-004)
  done: '記録',
  atFailure: '限界でした',
  achievedLabel: '達成',
  // 未達は調整材料であり失敗ではないトーン(ISS-004)
  missedLabel: '調整中',
  atFailureLabel: '限界',
  undo: '取り消し',
  exerciseNotePlaceholder: '種目メモ(フォームの気づきなど)',
  sessionNotePlaceholder: 'セッション全体のメモ',
  finish: 'トレ終了',
  interrupt: '中断して保存',
  interruptConfirm: '途中までの記録を残して中断します。よろしいですか?',
  repsUnit: 'レップ',
  weightUnit: 'kg',
}

export const FINISH_COPY = {
  title: 'トレおつかれさま!💪',
  rpe: 'キツさ(RPE 1-10)',
  conditionNote: '体調メモ(睡眠・食事・気分など)',
  painTitle: '痛み・違和感があった部位',
  painNote: '痛みメモ(どこがどう痛む?)',
  painHint: '選んだ部位は次回のメニューで自動回避されます',
  handover: '次回への申し送り',
  handoverPlaceholder: '例: 次はフライを先にやりたい',
  save: '保存して終了',
}

export const TIMER_COPY = {
  resting: 'インターバル中',
  finished: '次のセットへ!',
  skip: 'スキップ',
  secondsSuffix: '秒',
  soundSuspended: '音が停止中。タップで有効化(終了は点滅でも知らせます)',
}

export const LOG_COPY = {
  title: 'ログ',
  empty: 'まだ記録がありません',
  completion: (rate: number) => `完遂率${rate}%`,
  duration: (min: number) => `${min}分`,
  detailTitle: 'トレ詳細',
  planned: (weight: string, reps: string) => `目標 ${weight}×${reps}`,
  actual: (weight: string, reps: string) => `実績 ${weight}×${reps}`,
  notDone: '未実施',
  achievedMark: '達成',
  missedMark: '未達',
  rpeLabel: 'RPE',
  editNotes: 'メモ・RPEを編集',
  saveNotes: '保存',
  saved: '保存しました',
  backToList: '一覧へ戻る',
  notFound: 'セッションが見つかりません',
  sleepLine: (start: string, end: string, hours: number) =>
    `睡眠 ${start}〜${end}(${hours.toFixed(1)}時間)`,
  deleteSession: 'このセッションを削除',
  deleteConfirm: 'このセッションを削除しますか?元に戻せません',
}

export const SETTINGS_COPY = {
  title: '設定',
  equipmentSection: '器具',
  equipmentEmpty: '器具が登録されていません。',
  equipmentCount: (n: number) => `×${n}`,
  dumbbellSteps: (min: number, max: number, steps: number) =>
    `${min}〜${max}kg・${steps}段階`,
  benchAngle: (min: number, max: number) => `角度 ${min}°〜${max}°`,
  edit: '編集',
  dumbbellWizardTitle: 'ダンベルの重量設定',
  dumbbellMin: '最小重量(kg)',
  dumbbellMax: '最大重量(kg)',
  dumbbellStepCount: '段階数',
  dumbbellGenerate: '重量リストを生成',
  dumbbellGenerated: '生成された重量(タップで個別修正)',
  dumbbellStepEditTitle: (n: number) => `${n}段階目の重量(kg)`,
  benchWizardTitle: 'ベンチの角度範囲',
  benchMin: '最小角度(°)',
  benchMax: '最大角度(°)',
  save: '保存',
  cancel: 'キャンセル',
  invalidRange: '最小・最大・段階数の組み合わせが正しくありません',
  timerSection: 'タイマー',
  timerAutoStart: 'セット完了でタイマー自動起動',
  injuriesSection: '痛み・違和感フラグ',
  injuriesEmpty: '有効なフラグはありません',
  injuryResolve: '解除',
  injuryReportedAt: (dateLabel: string) => `${dateLabel} 登録`,
}

/** 日付の共通フォーマット */
export function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
