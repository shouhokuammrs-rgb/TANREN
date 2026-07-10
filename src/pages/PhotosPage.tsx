import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { LOG_COPY, PHOTO_COPY, POSE_LABELS, formatDate } from '../constants/copy'
import { addPhoto, deletePhoto, listPhotos } from '../db/queries'
import type { Photo, PhotoPose } from '../db/types'
import { compressImage } from '../utils/image'

const POSES = Object.keys(POSE_LABELS) as PhotoPose[]

/** BlobのオブジェクトURLを寿命管理付きで返す */
function usePhotoUrl(photo: Photo | undefined): string | undefined {
  const url = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : undefined), [photo])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

/** 写真比較ビュー(2-5): 2枚並べ+日付スライダー */
export default function PhotosPage() {
  const [pose, setPose] = useState<PhotoPose>('front')
  const [sliderIndex, setSliderIndex] = useState(0)
  const photos = useLiveQuery(() => listPhotos(pose), [pose])

  // 右=最新、左=スライダーで選ぶ過去写真
  const latest = photos?.[photos.length - 1]
  const olderPool = photos?.slice(0, Math.max(0, photos.length - 1)) ?? []
  const left = olderPool[Math.min(sliderIndex, Math.max(0, olderPool.length - 1))]
  const leftUrl = usePhotoUrl(left)
  const latestUrl = usePhotoUrl(latest)

  const onAdd = async (file: File) => {
    const compressed = await compressImage(file)
    await addPhoto(pose, compressed)
  }

  return (
    <section className="space-y-4">
      <div>
        <Link to="/" className="text-xs text-slate-500">
          ← {LOG_COPY.backToList}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{PHOTO_COPY.title}</h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {POSES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPose(p)
              setSliderIndex(0)
            }}
            className={`h-11 rounded-lg text-sm font-bold ${
              pose === p ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {POSE_LABELS[p]}
          </button>
        ))}
      </div>

      <label className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-600 text-sm text-slate-300 active:bg-slate-800">
        📷 + {PHOTO_COPY.add}({POSE_LABELS[pose]})
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onAdd(file)
            e.target.value = ''
          }}
        />
      </label>

      {photos?.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          {PHOTO_COPY.empty}
        </p>
      )}

      {photos && photos.length === 1 && latest && (
        <div>
          <PhotoCard url={latestUrl} caption={formatDate(latest.takenAt)} photo={latest} />
          <p className="mt-2 text-xs text-slate-500">{PHOTO_COPY.needTwo}</p>
        </div>
      )}

      {photos && photos.length >= 2 && latest && left && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <PhotoCard url={leftUrl} caption={formatDate(left.takenAt)} photo={left} />
            <PhotoCard
              url={latestUrl}
              caption={`${formatDate(latest.takenAt)}(${PHOTO_COPY.latest})`}
              photo={latest}
            />
          </div>
          {olderPool.length > 1 && (
            <div>
              <p className="mb-1 text-xs text-slate-400">{PHOTO_COPY.sliderLabel}</p>
              <input
                type="range"
                min={0}
                max={olderPool.length - 1}
                step={1}
                value={Math.min(sliderIndex, olderPool.length - 1)}
                onChange={(e) => setSliderIndex(Number(e.target.value))}
                className="h-11 w-full accent-orange-500"
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function PhotoCard({
  url,
  caption,
  photo,
}: {
  url: string | undefined
  caption: string
  photo: Photo
}) {
  return (
    <figure className="overflow-hidden rounded-xl bg-slate-900">
      {url && <img src={url} alt={caption} className="aspect-[3/4] w-full object-cover" />}
      <figcaption className="flex items-center justify-between px-2 py-1.5 text-[11px] text-slate-400">
        {caption}
        <button
          type="button"
          aria-label={PHOTO_COPY.delete}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 active:bg-slate-800"
          onClick={() => {
            if (window.confirm(PHOTO_COPY.deleteConfirm)) void deletePhoto(photo.id!)
          }}
        >
          🗑
        </button>
      </figcaption>
    </figure>
  )
}
