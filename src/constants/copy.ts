// 日本語UI文言はこのファイルに集約する(CLAUDE.md コーディングルール)

export const APP_NAME = 'TANREN'

// 5タブ化(DEC-015 §1): 390px向けにラベル短縮。アイコンなし
export const TAB_LABELS = {
  home: 'ホーム',
  workout: '今日',
  growth: '成長',
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

// 部位内の強調区分(DEC-012)。メニューの種目行チップ表示用
export const EMPHASIS_LABELS = {
  upper: '上部',
  mid: '中部',
  lower: '下部',
  front: 'フロント',
  side: 'サイド',
  rear: 'リア',
  biceps: '二頭',
  triceps: '三頭',
  quad: '前もも',
  ham_glute: '裏もも・尻',
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
  // 挨拶見出し(§5・2行。鍛冶メタファー文言は使わない)
  greeting: ['今日の最適メニューを、', '考えずに。'],
  subtitle: '今日の最適メニューを、考えずに。',
  startCta: '今日のトレを始める',
  // ホーム再構成(DEC-015 §3)
  recoveryLabel: '回復ステータス',
  recoverySummary: (label: string, hours: number) => `あと${hours}時間で ${label} が回復`,
  recoveryAllReady: '全部位 回復済み',
  recoveryDone: '回復済み',
  recoveryHoursLeft: (h: number) => `あと${h}時間`,
  menuSection: '今日のメニュー',
  menuEstimate: (min: number) => `想定 約${min}分`,
  growthSummaryLabel: (label: string) => `今週 ${label}`,
  growthSummaryGain: (kg: number) => `+${kg}kg`,
  mirrorBanner: (label: string) => `${label}がゴールに到達しました — 判定する`,
  mirrorOthers: (n: number) => `他${n}件`,
  statStreak: '連続記録',
  statStreakUnit: '日',
  statWeeklyVolume: '今週ボリューム',
  statWeeklyVolumeUnit: 'kg',
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

// ISS-011: 部位フレッシュネスの事前可視化(状態語はFRESHNESS_BUCKETSのlabelを渡す)
export const FRESHNESS_COPY = {
  chipPct: (pct: number) => `${pct}%`,
  // 選択時のインライン注意。生成はブロックしない(ユーザー主権)
  selectNotice: (label: string, status: string, pct: number) =>
    `${label}は${status}(${pct}%)。効果が下がる可能性があります`,
  // 生成後警告(インライン注意と同じ状態語で整合させる)
  generatedWarning: (label: string, status: string, pct: number) =>
    `${label}は${status}(${pct}%)。軽めを推奨`,
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
  // DEC-006: 回復優先の短縮通知と休養日提案(エラー風にしない・回復は計画の一部)
  shortenedNotice: (minutes: number, muscleList: string) =>
    `今日は${minutes}分のメニューになります。理由:${muscleList}が回復中のため`,
  restDayTitle: '今日は休養日がおすすめです',
  restDayReason: '全部位が回復中のため',
  restDayHint: 'それでも動きたい日は「部位を選ぶ」で指定できます(軽め推奨)',
  restDayBack: 'ヒヤリングに戻る',
  // DEC-010 §3-1: 最短で回復する部位1つの予測(24h未満は時間表示・以上は「明日以降」)
  recoverySoon: (label: string, hours: number) => `${label}はあと約${hours}時間で回復します`,
  recoveryTomorrow: (label: string) => `${label}は明日以降に回復します`,
}

export const WORKOUT_COPY = {
  title: 'ワークアウト',
  // 実行画面(デザイン仕様書§4)の英字ラベルはMono表示
  brandLabel: 'TANREN / 実行中',
  setChip: (n: number, total: number) => `SET ${n}/${total}`,
  nowSet: (n: number) => `NOW — 第${n}セット`,
  intervalLabel: 'INTERVAL',
  weightLabel: 'WEIGHT / KG',
  repsLabel: 'REPS',
  nextLabel: 'NEXT',
  nextExercise: (name: string) => `次の種目: ${name}`,
  notesSection: 'メモ・その他',
  lastRecorded: (n: number) => `セット${n}を記録済み`,
  setLabel: (n: number) => `セット${n}`,
  suggested: (weight: string, reps: string) => `目標 ${weight} × ${reps}`,
  prSet: 'PR挑戦セット',
  // 提案値がデフォルト入力済み→±修正して記録するモデル(ISS-004)
  done: '記録',
  atFailure: '限界でした',
  // ISS-013b: 限界の対になるポジティブ側フィードバック
  hadSlack: '余裕あり',
  hadSlackLabel: '余裕',
  achievedLabel: '達成',
  // 未達は調整材料であり失敗ではないトーン(ISS-004)
  missedLabel: '調整中',
  atFailureLabel: '限界',
  undo: '取り消し',
  exerciseNotePlaceholder: '種目メモ(フォームの気づきなど)',
  sessionNotePlaceholder: 'セッション全体のメモ',
  // 実行画面メニュー一覧シート(ISS-021・参照のみ)
  menuSheetButton: 'メニュー一覧',
  menuStatusDone: '✅ 済',
  menuStatusActive: '▶ 実施中',
  menuStatusPending: '未',
  menuSetsProgress: (done: number, total: number) => `${done}/${total}`,
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
  // 準備アラーム(残り20秒)。バイブ・音非対応環境の視覚フォールバック兼用
  prepNotice: 'そろそろ準備',
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
  // ログの事後編集(ISS-020)
  editSets: '記録を編集',
  editSetsDone: '編集を終える',
  addSet: '+ セット追加',
  editedMark: '編集済み',
  deleteSetLabel: (n: number) => `セット${n}を削除`,
  deleteExerciseConfirm: (name: string) =>
    `最後のセットを削除すると「${name}」の記録ごと消えます。よろしいですか?`,
}

export const SETTINGS_COPY = {
  title: '設定',
  // IA再設計(DEC-015 §4): 3群構成
  groupDaily: '① 日常',
  groupDailyNote: 'よく触る操作',
  groupBody: '② からだと器具',
  groupBodyNote: '一度決めたら滅多に触りません',
  groupData: '③ データ',
  groupDataNote: '保全と削除',
  summaryNone: '未設定',
  summaryCount: (n: number) => `${n}件`,
  summaryInjuriesNone: 'なし',
  summaryTimerOn: '自動スタート ON',
  summaryTimerOff: '自動スタート OFF',
  summaryTuningDefault: 'デフォルト',
  summaryTuningCustom: (n: number) => `${n}項目変更`,
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

// DEC-010: エンジン上級者設定(折りたたみ・誤操作防止)
export const TUNING_COPY = {
  section: '上級者設定(エンジン調整)',
  toggleOpen: '調整項目を表示',
  toggleClose: '閉じる',
  hint: 'メニュー生成エンジンの調整値。通常は変更不要です。端末ローカル保存のため、クラウドバックアップ(DEC-008)の対象外です',
  reset: 'デフォルトに戻す',
  rangeLabel: (min: number, max: number, unit: string) => `${min}〜${max}${unit}`,
  defaultLabel: (value: number, unit: string) => `デフォルト ${value}${unit}`,
  items: {
    largeRecoveryHours: {
      label: '大筋群の基準回復時間',
      unit: '時間',
      description: '胸・背中・脚・尻の回復にかかる時間。短くすると同じ部位を高頻度で回せます',
    },
    smallRecoveryHours: {
      label: '小筋群の基準回復時間',
      unit: '時間',
      description: '肩・腕・腹の回復にかかる時間',
    },
    freshnessReadyThreshold: {
      label: 'おまかせ選択の回復下限',
      unit: '%',
      description: '回復下限を95%にすると、ほぼ回復した部位もおまかせに含まれます',
    },
    slackJumpSteps: {
      label: '「余裕あり」時の増量ステップ数',
      unit: '段',
      description: '最終セットに余裕ありを付けたとき、次回に上げる重量の段数',
    },
    defaultSets: {
      label: '基本セット数',
      unit: 'セット',
      description: '1種目あたりの標準セット数。時間が許す範囲でメニューに反映されます',
    },
  },
} as const

// PWA更新トースト(ISS-025)
export const PWA_COPY = {
  updateAvailable: '更新があります',
  reload: '再読み込み',
  close: '閉じる',
}

export const POSE_LABELS = {
  front: '正面',
  side: '横',
  back: '背面',
} as const

export const SETUP_COPY = {
  title: '初期セットアップ',
  // ISS-023: バナー判定はmuscle_goals基準・導線は設定①(部位別ゴール)へ
  banner: '部位別ゴールが未設定です。設定すると「おまかせ」があなたの目標に合わせて調整されます',
  bannerCta: 'ゴールを設定する',
  bannerSkip: 'あとで',
  stepProfile: 'プロフィール',
  heightCm: '身長(cm)',
  weightKg: '体重(kg)',
  bodyFatPct: '体脂肪率(%・任意)',
  stepPhotos: '現状写真(任意・あとで撮ってもOK)',
  photoHint: 'ビフォーアフター比較用。ローカル保存のみで外部送信されません',
  stepInjury: '怪我・違和感',
  injuryParts: '怪我・違和感のある部位(自動で回避されます)',
  injuryNote: '違和感の内容(任意)',
  // ISS-023: ウィザード末尾の1行案内(Designer指定)
  finalNote: '部位別ゴールは、設定からいつでも決められます。',
  next: '次へ',
  backStep: '戻る',
  skip: 'スキップ',
  finish: '完了',
  invalidProfile: '身長・体重を正しく入力してください',
}

export const SUMMARY_COPY = {
  title: 'ワークアウト完了。',
  caption: (dateLabel: string, minutes: number | null) =>
    minutes !== null ? `${dateLabel} ・ ${minutes}MIN` : dateLabel,
  volumeLabel: 'TOTAL VOLUME',
  volumeUnit: 'kg',
  prTitle: (name: string) => `自己ベスト更新 — ${name}`,
  prCelebration: (n: number) => `自己新 ${n}本! 💪`,
  prBadge: 'PR',
  volume: 'ボリューム',
  volumeDiff: (diff: number) => (diff >= 0 ? `前回 +${diff}` : `前回 ${diff}`),
  best: 'ベスト',
  prevBest: (s: string) => `前回ベスト ${s}`,
  firstTime: '初挑戦',
  weeklySection: '今週の部位別セット数',
  toLog: 'ログを見る',
  // ISS-020追記: トレ直後の記録ミスをその場で直す直行導線
  editRecords: '記録を修正する',
  toHome: 'ホームへ',
}

export const DASHBOARD_COPY = {
  weeklyVolume: '部位別 セット数の推移',
  // ISS-012: 週/日切り替え(デフォルト=日)
  chartModeDay: '日',
  chartModeWeek: '週',
  freshness: '回復状況(フレッシュネス)',
  freshnessFront: '前面',
  freshnessBack: '背面',
  weight: '体重の推移',
  addWeight: '体重を記録',
  weightPlaceholder: '58.0',
  weightSaved: '記録しました',
  empty: 'まだデータがありません。トレを重ねると育っていきます🌱',
  photos: '写真比較',
}

// DEC-011: 成長ビュー「熱の人体図」
export const GROWTH_COPY = {
  brandLabel: 'TANREN / 成長',
  title: '部位別の伸び',
  back: '← ホーム',
  // 成長タブ化(DEC-015 §2): セグメント+体重チップ
  segGrowth: '成長',
  segPhoto: '写真',
  // ISS-022: IA再設計で撤去された記録系3点の移設先ブロック
  volumeBlock: 'トレーニング量',
  weightChip: (kg: string) => `体重 ${kg}kg ✎`,
  weightChipStale: (days: number) => `· ${days}日前`,
  weightSave: '保存',
  weightSaved: '体重を更新しました',
  periodLabel: (days: number) => `${days}日`,
  sideFront: 'FRONT',
  sideBack: 'BACK',
  legendInsufficient: 'データ不足',
  legendHigh: '+12%以上(月換算)',
  // 変化率チップ・グラフは実測%表示(色エンコーディングのみ月換算)
  deltaPct: (rate: number) => `${rate >= 0 ? '+' : ''}${(rate * 100).toFixed(1)}%`,
  chipNeedMore: (n: number) => `あと${n}回`,
  chartTitle: (muscleLabel: string) => `${muscleLabel} — E1RM 推移`,
  anchorNote: (name: string) => `基準種目: ${name}`,
  expand: '拡大 ↗',
  e1rmUnit: 'KG e1RM',
  // ISS-018: 自重種目はレップ指標(単位は「回」)
  repsUnit: 'REPS 最大回数',
  kgSuffix: 'kg',
  repsSuffix: '回',
  e1rmSeries: 'e1RM(kg)',
  repsSeries: '最大レップ(回)',
  needMoreSessions: (needed: number, count: number) =>
    `推移を表示するにはセッションがあと${needed}回必要です(${count}/3)`,
  fsHeader: (days: number) => `E1RM 推移 / 直近${days}日`,
  historyTitle: 'セッション履歴',
  // ダッシュボード組み込み(4b)
  cardTitle: '成長 — 直近30日',
  cardDetail: '詳細 →',
  cardEmpty: 'まだ成長データがありません。同じ種目を3回記録すると熱が見えてきます',
  recoveryTitle: '回復予測',
  recoveryReady: '回復済み',
  recoveryHours: (h: number) => `あと${h}時間`,
  recoveryDays: (d: number) => `あと約${d}日`,
  recoveryAllReady: '全部位が回復済みです',
}

export const PHOTO_COPY = {
  title: '写真比較',
  add: '写真を追加',
  poseSelect: 'ポーズを選択',
  empty: 'まだ写真がありません。現在の姿を残しておくと後で比較できます',
  needTwo: '同じポーズの写真が2枚以上たまると比較スライダーが使えます',
  sliderLabel: '比較する過去写真',
  latest: '最新',
  delete: 'この写真を削除',
  deleteConfirm: 'この写真を削除しますか?',
}

export const DATA_COPY = {
  section: 'データ管理',
  exportBtn: 'JSONエクスポート',
  exporting: '書き出し中…',
  importBtn: 'JSONインポート(全置換)',
  importConfirm:
    '現在の全データを削除してインポートデータで置き換えます。この操作は元に戻せません。続けますか?',
  importDone: 'インポートが完了しました',
  importError: 'インポートに失敗しました。ファイル形式を確認してください',
  wipeBtn: '全データ削除',
  wipeConfirm1: '全データ(ログ・写真・設定)を削除します。よろしいですか?',
  wipeConfirm2: '本当に削除しますか?この操作は元に戻せません',
  wipeDone: '全データを削除しました',
}

// 全削除の隔離画面(DEC-015 §4-4)。#D8321Aはこの画面限定
export const DANGER_COPY = {
  row: '全データ削除',
  back: '← 設定へ戻る',
  title: '全データを削除',
  bullets: [
    'セッション記録・ログ',
    '部位別ゴールと判定履歴',
    '写真・体重履歴',
    '器具・筋力キャリブレーション設定',
  ],
  irreversible: 'この操作は取り消せません',
  exportFirst: '先にエクスポートする',
  inputLabel: '確認のため「削除」と入力してください',
  keyword: '削除',
  execute: '全データを削除する',
}

export const STORAGE_COPY = {
  // ISS-009-1: 永続ストレージ
  protectionLabel: 'データ保護',
  protectionHint: '端末のストレージ逼迫時にブラウザがデータを自動削除するのを防ぎます',
  granted: '有効',
  denied: '未許可(タップで再要求)',
  unsupported: 'この環境では非対応',
  // ISS-009-2: プレビューURL警告
  previewWarning: 'このURLは一時的なプレビューです。トレの記録は本番URLで行ってください',
  previewLink: '本番を開く',
  // ISS-009-3: エクスポートリマインダー
  lastExport: (dateLabel: string) => `最終エクスポート: ${dateLabel}`,
  neverExported: '最終エクスポート: まだなし',
  reminder: 'バックアップが7日以上空いています。設定からJSONエクスポートを',
  reminderNever: 'バックアップ未実施です。設定からJSONエクスポートを',
  reminderCta: '設定を開く',
}

// クラウドバックアップ(Phase 5 / DEC-006)
export const CLOUD_COPY = {
  section: 'クラウドバックアップ',
  hint: 'トレ保存のたびに全データを自動でクラウドへ退避します(ローカルが常に正・二重の安全網)',
  email: 'メールアドレス',
  password: 'パスワード',
  signIn: 'ログイン',
  signUp: '新規登録',
  signOut: 'ログアウト',
  signedInAs: (email: string) => `ログイン中: ${email}`,
  authError: 'ログインに失敗しました。メールとパスワードを確認してください',
  signUpError: '登録に失敗しました。時間をおいて再試行してください',
  invalidInput: 'メールアドレスとパスワード(6文字以上)を入力してください',
  backupNow: '今すぐバックアップ',
  restore: 'クラウドから復元',
  restoreConfirm1:
    '現在の全データを削除し、クラウドの最新バックアップで置き換えます。続けますか?',
  restoreConfirm2: '本当に復元しますか?この操作は元に戻せません',
  restoreDone: 'クラウドから復元しました',
  restoreError: '復元に失敗しました。ログイン状態とバックアップの有無を確認してください',
  lastSync: (dateLabel: string) => `最終クラウド同期: ${dateLabel}`,
  neverSynced: '最終クラウド同期: まだなし',
  pendingBadge: '未同期あり(次回オンライン時に自動同期)',
  syncDone: '☁️ クラウドへバックアップしました',
  syncOffline: 'オフラインのため保留しました。次回オンライン時に自動同期します',
  syncError: 'クラウド同期に失敗しました。設定から再試行できます',
  working: '処理中…',
}

// 部位別ゴールモデル(DEC-013 / 5b「目盛」)。視覚仕様: docs/design/handoff/5b_goal_model_handoff.md
export const MUSCLE_GOAL_COPY = {
  section: '部位別ゴール',
  hint: 'ゴールe1RMは体重×係数で自動追従します(片手kg)',
  levelLabels: { toned: '引き締め', solid: 'しっかり', big: 'がっつり' } as const,
  unset: '未設定',
  heroUnit: 'KG e1RM 目標',
  heroSub: (level: string, weightKg: number, coef: number) =>
    `${level} = 体重${weightKg}kg × ${coef.toFixed(2)}`,
  directEdit: '± 直接編集',
  directEditTitle: '目標e1RMを直接入力(kg・0.5刻み)',
  weightStepperNote: 'ノッチ = 係数 × 体重 / 上限帯 33.6kg は固定',
  weightUnit: 'kg',
  currentLabel: (kg: number) => `現在 ${kg}kg`,
  progress: (pct: number, remainingKg: number) => `${pct}% ・ あと${remainingKg}kg`,
  noProgress: '実ログ待ち(初回の記録からスタート地点が決まります)',
  cappedWarning: '⚠ 現在の器具では届きません(計測上限 33.6kg)',
  reached: '達成 — 判定待ち',
  maintainMark: '✓ 維持',
  footerNote: '※ 見え方は体脂肪率や骨格でも変わります',
  save: 'ゴールを保存',
  saved: 'ゴールを保存しました',
  // Phase 7-5b: 鏡チェック(到達判定)
  reachedTitle: (label: string) => `${label}がゴールに到達しました`,
  reachedBody: '鏡を見て判定してください',
  judgeSatisfied: '満足(維持へ)',
  judgeMore: '物足りない(1段上げ)',
  judgeMoreBig: '物足りない(目標を上げる)',
  judgeLater: 'あとで判定',
  raiseEditLabel: '新しい目標e1RM(kg・現目標+10%を提案)',
  raiseEditConfirm: 'この目標にする',
  maintainDone: (label: string) => `${label}を維持モードにしました`,
  raiseDone: (label: string) => `${label}のゴールを引き上げました`,
  resumeConfirm: '維持中のゴールを再開しますか?(メニュー生成が通常ボリュームに戻ります)',
  mirrorTitle: '鏡チェック',
  // 成長ビュー統合(§1): レップ指標部位の進捗軸に基準種目を併記
  progressAnchor: (name: string) => `基準: ${name}`,
  captions: {
    chest: {
      toned: 'Tシャツの胸元にうっすら厚みのラインが出る',
      solid: 'Tシャツの上から胸の張りがわかる',
      big: 'シャツ選びで胸囲が基準になる',
    },
    back: {
      toned: '「姿勢が良くなった」と言われる',
      solid: '後ろ姿で逆三角形の輪郭がわかる',
      big: 'ジャケットの肩幅が既製では合わなくなる',
    },
    shoulders: {
      toned: '肩のラインが丸みを帯びる',
      solid: '半袖で肩の張り出しがわかる',
      big: 'ノースリーブで三角筋の分離が見える',
    },
    arms: {
      toned: '袖から出る腕にうっすら形がある',
      solid: '半袖で明らかに鍛えているとわかる',
      big: '腕まくりで周囲がざわつく',
    },
    legs: {
      toned: 'パンツのシルエットが崩れない程度に締まる',
      solid: '細身のパンツで太ももの張りがわかる',
      big: '既製のパンツが太ももで選べなくなる',
    },
  } as const,
}

/** 日付の共通フォーマット */
export function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
