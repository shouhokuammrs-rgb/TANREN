// タイマー音(Web Audio)。iOS Safariはユーザー操作内でAudioContextを作成/resumeする必要が
// あるため、セット完了タップ時にunlockAudio()を呼んでおく

let audioCtx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
  } catch {
    audioCtx = null
  }
}

function tone(freq: number, durationMs: number, volume = 0.4): void {
  if (!audioCtx || audioCtx.state !== 'running') return
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
