/**
 * 写真の圧縮(Phase 2決定事項): 長辺1280pxのJPEG(品質0.85)に縮小してIndexedDBに保存する。
 * エクスポートJSONのサイズ肥大を防ぐため
 */
export const PHOTO_MAX_EDGE_PX = 1280
const JPEG_QUALITY = 0.85

export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, PHOTO_MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', JPEG_QUALITY)
    })
  } finally {
    bitmap.close()
  }
}
