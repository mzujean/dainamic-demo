'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Film, Send, Trash2, RefreshCw, CheckCircle, X, Plus, Clock } from 'lucide-react'
import Card from '@/components/Card'

type StoredClip = {
  name: string
  size: number
  createdAt: string
  publicUrl: string
}

type QueueItem = {
  id: string
  title: string
  caption: string
  platform: string
  scheduled_for: string
  status: string
  video_url: string | null
}

type Tab = 'upload' | 'create' | 'posted'

export default function ContentClient({ initialQueue = [] }: { initialQueue?: any[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [clips, setClips] = useState<StoredClip[]>([])
  const [loadingClips, setLoadingClips] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [selectedClip, setSelectedClip] = useState<StoredClip | null>(null)
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const [postResult, setPostResult] = useState<any>(null)
  const [posted, setPosted] = useState<QueueItem[]>(initialQueue)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchClips() }, [])

  async function fetchClips() {
    setLoadingClips(true)
    try {
      const res = await fetch('/api/content/upload')
      const data = await res.json()
      if (data.success) setClips(data.clips || [])
    } catch (err) {
      console.error('Failed to fetch clips:', err)
    }
    setLoadingClips(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(`Uploading ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('video', file)

      const res = await fetch('/api/content/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setUploadProgress('✅ Uploaded!')
        fetchClips()
        setTimeout(() => setUploadProgress(''), 2000)
      } else {
        setUploadProgress(`❌ ${data.error}`)
      }
    } catch (err) {
      setUploadProgress('❌ Upload failed')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteClip(name: string) {
    setDeleting(name)
    try {
      await fetch('/api/content/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: name }),
      })
      setClips(prev => prev.filter(c => c.name !== name))
      if (selectedClip?.name === name) setSelectedClip(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleting(null)
  }

  function selectClip(clip: StoredClip) {
    setSelectedClip(clip)
    setCaption('')
    setPostResult(null)
    setActiveTab('create')
  }

  async function postToFacebook() {
    if (!selectedClip || !caption) return
    setPosting(true)
    setPostResult(null)
    try {
      const res = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          videoUrl: selectedClip.publicUrl,
          fileName: selectedClip.name,
          platforms: ['facebook'],
        }),
      })
      const data = await res.json()
      setPostResult(data)

      if (data.success) {
        setPosted(prev => [{
          id: Date.now().toString(),
          title: selectedClip.name,
          caption,
          platform: 'facebook',
          scheduled_for: new Date().toISOString(),
          status: 'posted',
          video_url: selectedClip.publicUrl,
        }, ...prev])
        // Remove clip from list after successful post (it'll auto-delete from storage)
        setClips(prev => prev.filter(c => c.name !== selectedClip.name))
        setSelectedClip(null)
      }
    } catch (err) {
      setPostResult({ success: false, error: String(err) })
    }
    setPosting(false)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const btn = (active: boolean, color = '#a78bfa') => ({
    padding: '9px 16px', borderRadius: 10,
    border: `0.5px solid ${active ? color : 'var(--glass-border)'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : 'var(--text-tertiary)',
    fontSize: 12, cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: 6, fontWeight: active ? 500 : 400,
    whiteSpace: 'nowrap' as const,
  })

  const input = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '0.5px solid rgba(255,255,255,0.12)', background: 'var(--bg-2)',
    color: 'var(--text-primary)', fontSize: 13,
    boxSizing: 'border-box' as const, marginBottom: 12,
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>Content</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {clips.length} clip{clips.length !== 1 ? 's' : ''} ready · {posted.filter(p => p.status === 'posted').length} posted
        </p>
      </div>

      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={btn(activeTab === 'upload', '#60a5fa')} onClick={() => setActiveTab('upload')}>
          <Upload size={13} /> Upload & Clips
        </button>
        <button style={btn(activeTab === 'create', '#a78bfa')} onClick={() => setActiveTab('create')}>
          <Send size={13} /> Create Post
        </button>
        <button style={btn(activeTab === 'posted', '#2dd4bf')} onClick={() => setActiveTab('posted')}>
          <CheckCircle size={13} /> Posted ({posted.filter(p => p.status === 'posted').length})
        </button>
      </div>

      {/* UPLOAD & CLIPS TAB */}
      {activeTab === 'upload' && (
        <>
          {/* Upload area */}
          <Card padding="24px" style={{ marginBottom: 20 }}>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '40px 20px', borderRadius: 12,
                border: '1px dashed var(--glass-border)', background: 'transparent',
                color: 'var(--text-tertiary)', fontSize: 13, cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Upload size={32} style={{ opacity: 0.4 }} />
              {uploading ? 'Uploading...' : 'Tap to record or choose a video'}
            </button>
            {uploadProgress && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 8,
                background: uploadProgress.includes('✅') ? 'rgba(45,212,191,0.1)' : uploadProgress.includes('❌') ? 'rgba(239,68,68,0.1)' : 'var(--bg-2)',
                fontSize: 12,
                color: uploadProgress.includes('✅') ? '#2dd4bf' : uploadProgress.includes('❌') ? '#ef4444' : 'var(--text-secondary)',
              }}>
                {uploadProgress}
              </div>
            )}
          </Card>

          {/* Clips list */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Your clips
            </div>
            <button onClick={fetchClips} disabled={loadingClips} style={{ ...btn(false), padding: '6px 10px' }}>
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {loadingClips ? (
            <Card padding="40px" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading clips...</div>
            </Card>
          ) : clips.length === 0 ? (
            <Card padding="40px" style={{ textAlign: 'center' }}>
              <Film size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No clips yet — upload your first video above</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clips.map((clip) => (
                <Card key={clip.name} padding="14px 18px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 8,
                        background: 'rgba(96,165,250,0.12)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Film size={16} color="#60a5fa" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clip.name.replace(/^\d+_/, '')}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {formatSize(clip.size)} · {new Date(clip.createdAt).toLocaleDateString('en-ZA')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => selectClip(clip)}
                        style={{ ...btn(true, '#a78bfa'), padding: '7px 12px' }}
                      >
                        <Send size={11} /> Post
                      </button>
                      <button
                        onClick={() => deleteClip(clip.name)}
                        disabled={deleting === clip.name}
                        style={{ ...btn(false), padding: '7px 10px', color: '#ef4444' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE POST TAB */}
      {activeTab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected clip */}
          <Card padding="20px">
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>Selected clip</div>
            {selectedClip ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(167,139,250,0.12)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Film size={15} color="#a78bfa" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {selectedClip.name.replace(/^\d+_/, '')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {formatSize(selectedClip.size)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('upload')} style={btn(false)}>
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('upload')}
                style={{
                  width: '100%', padding: '28px 20px', borderRadius: 10,
                  border: '1px dashed var(--glass-border)', background: 'transparent',
                  color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Plus size={14} /> Select a clip
              </button>
            )}
          </Card>

          {/* Caption */}
          <Card padding="20px">
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>Caption</div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write your caption for this post..."
              rows={5}
              style={{
                ...input, marginBottom: 0, resize: 'vertical' as const,
                minHeight: 100, fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
              {caption.length} characters
            </div>
          </Card>

          {/* Platform */}
          <Card padding="20px">
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>Posting to</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                ...btn(true, '#1877f2'), padding: '10px 16px',
              }}>
                <span style={{ fontSize: 14 }}>📘</span> Facebook
              </div>
              <div style={{
                ...btn(false), padding: '10px 16px', opacity: 0.4,
              }}>
                <span style={{ fontSize: 14 }}>📸</span> Instagram (soon)
              </div>
              <div style={{
                ...btn(false), padding: '10px 16px', opacity: 0.4,
              }}>
                <span style={{ fontSize: 14 }}>🎵</span> TikTok (soon)
              </div>
            </div>
          </Card>

          {/* Post result */}
          {postResult && (
            <Card padding="16px" style={{
              borderColor: postResult.success ? 'rgba(45,212,191,0.3)' : 'rgba(239,68,68,0.3)',
            }}>
              <div style={{
                fontSize: 13, fontWeight: 500,
                color: postResult.success ? '#2dd4bf' : '#ef4444',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {postResult.success
                  ? <><CheckCircle size={14} /> Posted to Facebook!</>
                  : <><X size={14} /> Post failed</>
                }
              </div>
              {postResult.success && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  Video will be auto-deleted from storage in 5 minutes to save space.
                </div>
              )}
              {!postResult.success && postResult.results?.facebook && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
                  {JSON.stringify(postResult.results.facebook.error || postResult.results.facebook)}
                </div>
              )}
            </Card>
          )}

          {/* Post button */}
          <button
            onClick={postToFacebook}
            disabled={posting || !selectedClip || !caption}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: selectedClip && caption ? '#1877f2' : 'var(--bg-2)',
              color: selectedClip && caption ? 'white' : 'var(--text-tertiary)',
              fontSize: 14, fontWeight: 600, cursor: selectedClip && caption ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: posting ? 0.7 : 1,
            }}
          >
            {posting
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Posting to Facebook...</>
              : <><Send size={14} /> Post to Facebook</>
            }
          </button>
        </div>
      )}

      {/* POSTED TAB */}
      {activeTab === 'posted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posted.length === 0 ? (
            <Card padding="40px" style={{ textAlign: 'center' }}>
              <Clock size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No posts yet — upload a clip and post it</div>
            </Card>
          ) : (
            posted.map(item => (
              <Card key={item.id} padding="16px 20px">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
                        background: item.status === 'posted' ? 'rgba(45,212,191,0.12)' : 'rgba(251,191,36,0.12)',
                        color: item.status === 'posted' ? '#2dd4bf' : '#fbbf24',
                      }}>
                        {item.status}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>📘 {item.platform}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.4, maxHeight: 44, overflow: 'hidden' }}>
                      {item.caption}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
                      {new Date(item.scheduled_for).toLocaleString('en-ZA')}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
