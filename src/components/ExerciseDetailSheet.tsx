import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Modal from './Modal'
import Pictogram from './Pictogram'
import {
  DETAIL_COPY,
  EQUIPMENT_TYPE_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  VIDEO_COPY,
} from '../constants/copy'
import { db } from '../db/db'
import { addExerciseVideo, removeExerciseVideo } from '../db/queries'
import type { Exercise } from '../db/types'
import { embedUrl, extractYouTubeVideoId, searchUrl, thumbnailUrl } from '../utils/youtube'

interface ExerciseDetailSheetProps {
  exercise: Exercise
  onClose: () => void
}

/** 種目詳細シート(ISS-001)+動画連携(ISS-003)。トレ中に片手で読める簡潔さ優先 */
export default function ExerciseDetailSheet({ exercise: initial, onClose }: ExerciseDetailSheetProps) {
  // 動画の登録・削除を即時反映するためライブ購読(propは初期表示用スナップショット)
  const exercise = useLiveQuery(() => db.exercises.get(initial.id!), [initial.id]) ?? initial
  const secondary = exercise.muscleGroups.filter((m) => m !== exercise.primaryMuscle)

  return (
    <Modal title={exercise.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-card bg-line-ember/40 text-molten-bright">
            <Pictogram pattern={exercise.movementPattern} />
          </div>
          <div className="text-xs text-ink-mid">
            <p>
              {MOVEMENT_PATTERN_LABELS[exercise.movementPattern]}・
              {MOVEMENT_TYPE_LABELS[exercise.movementType]}
            </p>
            <p className="mt-0.5">
              {exercise.requiredEquipment.map((e) => EQUIPMENT_TYPE_LABELS[e]).join('+')}
              {exercise.benchAngleDeg !== undefined && (
                <span className="ml-2 text-molten-bright">
                  {DETAIL_COPY.benchAngle(exercise.benchAngleDeg)}
                </span>
              )}
            </p>
            <p className="mt-0.5">{DETAIL_COPY.repRange(exercise.repRangeMin, exercise.repRangeMax)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-pill bg-molten px-2.5 py-1 font-bold text-white">
            {DETAIL_COPY.primary}: {MUSCLE_GROUP_LABELS[exercise.primaryMuscle]}
          </span>
          {secondary.map((m) => (
            <span key={m} className="rounded-pill bg-line-ember/40 px-2.5 py-1 text-ink-mid">
              {DETAIL_COPY.secondary}: {MUSCLE_GROUP_LABELS[m]}
            </span>
          ))}
        </div>

        {exercise.note && <p className="text-xs text-ink-mid">{exercise.note}</p>}

        <div>
          <p className="mb-1 text-xs font-semibold text-ink-mid">{DETAIL_COPY.cues}</p>
          <ul className="space-y-1.5">
            {exercise.formCues.map((cue) => (
              <li key={cue} className="flex gap-2 rounded-chip bg-line-ember/40 p-2 text-sm">
                <span className="text-molten-bright">✓</span>
                {cue}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-ink-mid">{DETAIL_COPY.mistake}</p>
          <p className="flex gap-2 rounded-chip bg-destructive/10 p-2 text-sm text-destructive">
            <span>⚠️</span>
            {exercise.commonMistake}
          </p>
        </div>

        <VideoSection exercise={exercise} />
      </div>
    </Modal>
  )
}

/** 動画連携(ISS-003 / DEC-003): YouTube検索導線+登録・nocookie埋め込み再生 */
function VideoSection({ exercise }: { exercise: Exercise }) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [brokenThumbs, setBrokenThumbs] = useState<string[]>([])
  const videoIds = exercise.youtubeVideoIds ?? []
  const online = navigator.onLine

  const register = async () => {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      setError(VIDEO_COPY.invalidUrl)
      return
    }
    const ok = await addExerciseVideo(exercise.id!, videoId)
    if (!ok) {
      setError(VIDEO_COPY.limitReached)
      return
    }
    setError(null)
    setUrl('')
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-mid">{VIDEO_COPY.section}</p>

      {videoIds.length > 0 && (
        <ul className="mb-2 space-y-2">
          {videoIds.map((videoId, i) =>
            playingId === videoId ? (
              <li key={videoId} className="overflow-hidden rounded-chip">
                {/* 遅延読み込み: タップされた動画だけiframeを生成(プライバシー強化モード) */}
                <iframe
                  src={embedUrl(videoId)}
                  title={VIDEO_COPY.playLabel(i + 1)}
                  className="aspect-video w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </li>
            ) : (
              <li key={videoId} className="relative">
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-chip bg-line-ember/40"
                  onClick={() => online && setPlayingId(videoId)}
                  aria-label={VIDEO_COPY.playLabel(i + 1)}
                >
                  {online ? (
                    <div className="relative">
                      {!brokenThumbs.includes(videoId) && (
                        <img
                          src={thumbnailUrl(videoId)}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                          onError={() => setBrokenThumbs((prev) => [...prev, videoId])}
                        />
                      )}
                      {brokenThumbs.includes(videoId) && <div className="aspect-video w-full" />}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-black/60 pl-1 text-xl text-white">
                          ▶
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center text-sm text-ink-mid">
                      📡 {VIDEO_COPY.offline}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-pill bg-black/60 text-ink-mid"
                  aria-label={VIDEO_COPY.remove}
                  onClick={() => void removeExerciseVideo(exercise.id!, videoId)}
                >
                  ✕
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <a
        href={searchUrl(exercise.searchKeyword ?? `${exercise.name} ${VIDEO_COPY.searchSuffix}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-chip bg-line-ember/40 text-sm font-semibold text-ink-mid active:bg-line-ember"
      >
        ▶ {VIDEO_COPY.search} ↗
      </a>

      <div className="mt-2 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(null)
          }}
          placeholder={VIDEO_COPY.urlPlaceholder}
          className="h-12 min-w-0 flex-1 rounded-chip bg-line-ember/40 px-3 text-sm text-ink placeholder:text-ink-dim"
        />
        <button
          type="button"
          disabled={url.trim() === ''}
          className="h-12 shrink-0 rounded-chip bg-line-ember px-4 text-sm font-semibold text-white active:bg-line-ember/70 disabled:opacity-40"
          onClick={() => void register()}
        >
          {VIDEO_COPY.add}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
