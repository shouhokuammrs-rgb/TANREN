// YouTube連携(ISS-003)。公式embedのみ使用し、ダウンロード・再ホストは行わない(DEC-003)

/** YouTube動画IDの形式(11文字) */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

/**
 * 共有・コピペされたYouTube URLから動画IDを抽出する。
 * 対応形式: youtu.be/<id> / watch?v=<id> / shorts/<id> / embed/<id> / live/<id> / 生ID。
 * 抽出できなければnull
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\.|^m\./, '')
  const candidate = (() => {
    if (host === 'youtu.be') {
      return url.pathname.split('/')[1]
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v')
      if (v) return v
      const [, kind, id] = url.pathname.split('/')
      if (kind === 'shorts' || kind === 'embed' || kind === 'live') return id
    }
    return undefined
  })()

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null
}

/** プライバシー強化モード(youtube-nocookie.com)の埋め込みURL */
export function embedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`
}

/** サムネイルURL(mqdefaultは全動画で存在が保証されているサイズ) */
export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
}

/** 「動画を探す」用のYouTube検索URL */
export function searchUrl(keyword: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`
}
