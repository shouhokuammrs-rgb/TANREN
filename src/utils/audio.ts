// タイマー音(Web Audio)。
// iOS SafariはAudioContextが時間経過・画面遷移・着信等でsuspended/interruptedに戻るため(ISS-005)、
// ユーザータップのたびにunlockAudio()でresumeを試行し、再生直前にも状態を確認して復帰させる

let audioCtx: AudioContext | null = null

function tryResume(): void {
  if (audioCtx && audioCtx.state !== 'running') {
    void audioCtx.resume().catch(() => {})
  }
}

/** ユーザー操作(タップ)の中で毎回呼ぶ。初回は作成、以降はresume試行 */
export function unlockAudio(): void {
  try {
    audioCtx ??= new AudioContext()
    tryResume()
  } catch {
    audioCtx = null
  }
}

/** 音が実際に鳴らせる状態か(タイマー画面のフォールバック表示用) */
export function audioReady(): boolean {
  return audioCtx?.state === 'running'
}

function tone(freq: number, durationMs: number, volume = 0.4): void {
  if (!audioCtx) return
  if (audioCtx.state !== 'running') {
    // resumeは非同期のためこのビープはスキップし、次のビープまでの復帰を試みる
    tryResume()
    return
  }
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const now = audioCtx.currentTime
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + durationMs / 1000)
}

/** 残り3秒のカウント音 */
export function countBeep(): void {
  tone(880, 120)
}

/** インターバル終了音 */
export function finishChime(): void {
  tone(660, 200)
  setTimeout(() => tone(880, 200), 220)
  setTimeout(() => tone(1100, 420), 440)
}
