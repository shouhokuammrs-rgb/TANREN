import { describe, expect, it } from 'vitest'
import { extractYouTubeVideoId, embedUrl, searchUrl } from './youtube'

const ID = 'dQw4w9WgXcQ'

describe('extractYouTubeVideoId(URL形式のゆらぎ対応)', () => {
  it('youtu.be形式', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${ID}`)).toBe(ID)
    expect(extractYouTubeVideoId(`https://youtu.be/${ID}?si=abcdef&t=42`)).toBe(ID)
  })

  it('watch?v=形式(www/mサブドメイン・追加パラメータ)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${ID}&list=PL123&index=2`)).toBe(ID)
  })

  it('shorts / embed / live形式', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
    expect(extractYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(ID)
    expect(extractYouTubeVideoId(`https://www.youtube.com/live/${ID}?feature=share`)).toBe(ID)
  })

  it('生の動画IDと前後の空白', () => {
    expect(extractYouTubeVideoId(`  ${ID}  `)).toBe(ID)
  })

  it('不正な入力はnull', () => {
    expect(extractYouTubeVideoId('')).toBeNull()
    expect(extractYouTubeVideoId('こんにちは')).toBeNull()
    expect(extractYouTubeVideoId('https://example.com/watch?v=' + ID)).toBeNull()
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(extractYouTubeVideoId('https://youtu.be/')).toBeNull()
  })
})

describe('embedUrl / searchUrl', () => {
  it('プライバシー強化モード(nocookie)で埋め込む', () => {
    expect(embedUrl(ID)).toContain('youtube-nocookie.com/embed/' + ID)
  })

  it('検索キーワードをURLエンコードする', () => {
    expect(searchUrl('ダンベルフライ フォーム')).toBe(
      `https://www.youtube.com/results?search_query=${encodeURIComponent('ダンベルフライ フォーム')}`,
    )
  })
})
