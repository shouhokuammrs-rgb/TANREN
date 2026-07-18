// トーストのストア(Phase 5)。Reactコンテキスト不要でどこからでもshowToast()できる。
// 表示本体はcomponents/Toast.tsxのToastHost(App直下に1つマウント)

export type ToastTone = 'success' | 'info' | 'error'

export interface ToastMessage {
  text: string
  tone: ToastTone
}

let listener: ((msg: ToastMessage) => void) | null = null

export function showToast(text: string, tone: ToastTone = 'success'): void {
  listener?.({ text, tone })
}

export function subscribeToast(fn: (msg: ToastMessage) => void): () => void {
  listener = fn
  return () => {
    listener = null
  }
}
