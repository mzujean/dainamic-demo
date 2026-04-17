'use client'
import { useState, useEffect } from 'react'

type Clip = {
  id: string
  name: string
  type: string
  size: string
  created: string
  viewUrl: string
  thumbnail: string
  driveUrl: string
}

type QueueItem = {
  id: string
  title: string
  caption: string
  topic: string
  platform: string
  scheduled_for: string
  status: string
  video_url: string | null
}

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', emoji: '📘' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
]

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-amber-100 text-amber-800',
  posted: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
}

export default function ContentClient({ initialQueue = [] }: { initialQueue?: any[] }) {
  const [activeTab, setActiveTab] = useState<'clips' | 'create' | 'queue'>('clips')
  const [clips, setClips] = useState<Clip[]>([])
  const [loadingClips, setLoadingClips] = useState(true)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram'])
  const [posting, setPosting] = useState(false)
  const [postResult, setPostResult] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])

  useEffect(() => {
    fetchClips()
  }, [])

  async function fetchClips() {
    setLoadingClips(true)
    try {
      const res = await fetch('/api/drive-clips')
      const data = await res.json()
      if (data.success) setClips(data.clips)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingClips(false)
    }
  }

  async function generateCaption() {
    if (!selectedClip) return
    setGenerating(true)
    try {
      const res = await fetch('/api/content-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_scripts',
          context: {
            topic: selectedClip.name.replace('.mp4', ''),
            count: 1,
            pillar: 'Natural hair care',
          }
        })
      })
      const data = await res.json()
      if (data.success && data.data.scripts?.[0]) {
        setCaption(data.data.scripts[0].caption)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  async function postNow() {
    if (!selectedClip || !caption || selectedPlatforms.length === 0) return
    setPosting(true)
    setPostResult(null)
    try {
      const res = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          videoUrl: selectedClip.driveUrl,
          platforms: selectedPlatforms,
        })
      })
      const data = await res.json()
      setPostResult(data)
      if (data.success) {
        setQueue(prev => [{
          id: Date.now().toString(),
          title: selectedClip.name,
          caption,
          topic: 'video',
          platform: selectedPlatforms.join(', '),
          scheduled_for: new Date().toISOString(),
          status: 'posted',
          video_url: selectedClip.driveUrl,
        }, ...prev])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  function selectClip(clip: Clip) {
    setSelectedClip(clip)
    setCaption('')
    setPostResult(null)
    setActiveTab('create')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Content Engine</h1>
            <p className="text-sm text-gray-500">Dainamic Hair · {clips.length} clips ready</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            <span className="text-sm text-gray-600">Drive connected</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'clips', label: `📁 Clips (${clips.length})` },
            { id: 'create', label: '✏️ Create & Post' },
            { id: 'queue', label: `📋 Posted (${queue.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CLIPS TAB */}
        {activeTab === 'clips' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Select a clip to create a post</p>
              <button
                onClick={fetchClips}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                ↻ Refresh
              </button>
            </div>
            {loadingClips ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-xl h-48 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {clips.map(clip => (
                  <div
                    key={clip.id}
                    onClick={() => selectClip(clip)}
                    className={`bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      selectedClip?.id === clip.id ? 'border-green-500' : 'border-gray-200'
                    }`}
                  >
                    {clip.thumbnail ? (
                      <img
                        src={clip.thumbnail}
                        alt={clip.name}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                        <span className="text-3xl">🎬</span>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-800 truncate">{clip.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{clip.size}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); selectClip(clip) }}
                        className="mt-2 w-full bg-green-600 text-white text-xs py-1.5 rounded-lg hover:bg-green-700"
                      >
                        Use this clip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREATE & POST TAB */}
        {activeTab === 'create' && (
          <div className="space-y-5">
            {/* Selected clip */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Selected clip</label>
              {selectedClip ? (
                <div className="flex items-center gap-4">
                  {selectedClip.thumbnail && (
                    <img src={selectedClip.thumbnail} className="w-20 h-14 object-cover rounded-lg" alt="" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedClip.name}</p>
                    <p className="text-xs text-gray-400">{selectedClip.size}</p>
                    <a href={selectedClip.driveUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline">View in Drive →</a>
                  </div>
                  <button
                    onClick={() => setActiveTab('clips')}
                    className="ml-auto text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
                  >
                    Change clip
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab('clips')}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-sm text-gray-400 hover:border-green-400 hover:text-green-600"
                >
                  + Select a clip from Drive
                </button>
              )}
            </div>

            {/* Caption */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Caption</label>
                <button
                  onClick={generateCaption}
                  disabled={generating || !selectedClip}
                  className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                >
                  {generating ? 'Generating...' : '✨ Generate with AI'}
                </button>
              </div>
              <textarea
                value={caption}
               onChange={e => setCaption(e.target.value)}
               placeholder="Write your caption or generate one with AI..."
               rows={5}
               className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-gray-900 bg-white"
               style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
              <p className="text-xs text-gray-400 mt-1">{caption.length} characters</p>
            </div>

            {/* Platforms */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Post to</label>
              <div className="flex gap-3">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedPlatforms.includes(p.id)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post result */}
            {postResult && (
              <div className={`rounded-xl p-4 text-sm ${postResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {postResult.success ? '✅ Posted successfully!' : '❌ Post failed'}
                {postResult.results && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(postResult.results).map(([platform, result]: [string, any]) => (
                      <p key={platform} className="text-xs">
                        {platform}: {result.id ? '✅ Success' : `❌ ${result.error?.message || 'Failed'}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Post button */}
            <button
              onClick={postNow}
              disabled={posting || !selectedClip || !caption || selectedPlatforms.length === 0}
              className="w-full bg-green-600 text-white rounded-xl py-4 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {posting ? '📤 Posting...' : '🚀 Post Now'}
            </button>
          </div>
        )}

        {/* QUEUE TAB */}
        {activeTab === 'queue' && (
          <div className="space-y-3">
            {queue.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">No posts yet this session</p>
                <button
                  onClick={() => setActiveTab('clips')}
                  className="mt-3 text-green-600 text-sm font-medium"
                >
                  Create your first post
                </button>
              </div>
            ) : (
              queue.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                          {item.status}
                        </span>
                        <span className="text-xs text-gray-400">{item.platform}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.caption}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.scheduled_for).toLocaleString('en-ZA')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

