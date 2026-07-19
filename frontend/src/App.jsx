import { useState, useEffect, useRef } from 'react'
import ImageCards from './ImageCards'

const API_BASE = import.meta.env.VITE_API_URL || ''

const COLOR_THEMES = [
  { name: 'Sunset', colors: ['#833ab4', '#fd1d1d', '#fcb045'] },
  { name: 'Ocean', colors: ['#0ea5e9', '#6366f1', '#8b5cf6'] },
  { name: 'Forest', colors: ['#10b981', '#059669', '#047857'] },
  { name: 'Fire', colors: ['#ef4444', '#f59e0b', '#f97316'] },
  { name: 'Night', colors: ['#1e1b4b', '#312e81', '#4338ca'] },
  { name: 'Rose', colors: ['#ec4899', '#f43f5e', '#e11d48'] },
  { name: 'Minimal', colors: ['#18181b', '#27272a', '#3f3f46'] },
  { name: 'Sky', colors: ['#0284c7', '#0ea5e9', '#38bdf8'] },
]

const TONES = ['Professional', 'Casual', 'Gen-Z', 'Funny', 'Educational', 'Motivational']
const LANGUAGES = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam']
const AI_MODELS = [
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', desc: 'Best quality — detailed, creative content' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', desc: 'Fast & smart — great balance' },
  { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', desc: 'Fastest — quick, concise output' },
]

function App() {
  const [url, setUrl] = useState('')
  const [customIdea, setCustomIdea] = useState('')
  const [inputMode, setInputMode] = useState('youtube') // 'youtube' or 'idea'
  const [tone, setTone] = useState('Professional')
  const [language, setLanguage] = useState('English')
  const [model, setModel] = useState('openai/gpt-4.1')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [result, setResult] = useState(null)
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [isRefineListening, setIsRefineListening] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [darkMode, setDarkMode] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [toast, setToast] = useState('')
  const [generationSteps, setGenerationSteps] = useState([])
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showToneMenu, setShowToneMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const modelMenuRef = useRef(null)
  const toneMenuRef = useRef(null)
  const langMenuRef = useRef(null)
  const progressRef = useRef(null)

  const REFINE_SUGGESTIONS = [
    'Make it funnier',
    'Add statistics',
    'Shorter captions',
    'More professional',
    'Add stronger CTA',
    'Translate to Hindi',
  ]

  // User branding settings
  const [branding, setBranding] = useState({
    name: 'ContentForge',
    instagram: '@yourhandle',
    linkedin: 'Your Name',
    twitter: '@yourhandle',
    colorTheme: 0,
  })

  // Load history and theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('contentforge-history')
    if (saved) {
      try { setHistory(JSON.parse(saved)) } catch {}
    }
    const savedTheme = localStorage.getItem('contentforge-darkmode')
    if (savedTheme !== null) setDarkMode(savedTheme === 'true')
  }, [])

  // Apply dark/light mode to body
  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : 'light-mode'
    localStorage.setItem('contentforge-darkmode', darkMode)
  }, [darkMode])

  // Close settings/history when clicking outside
  const panelRef = useRef(null)
  const resultsRef = useRef(null)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowSettings(false)
        setShowHistory(false)
      }
    }
    if (showSettings || showHistory) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings, showHistory])

  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [result])

  // Close quick option menus on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) setShowModelMenu(false)
      if (toneMenuRef.current && !toneMenuRef.current.contains(e.target)) setShowToneMenu(false)
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) setShowLangMenu(false)
    }
    if (showModelMenu || showToneMenu || showLangMenu) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showModelMenu, showToneMenu, showLangMenu])

  // Speech-to-text using Web Speech API
  const recognitionRef = useRef(null)

  const handleVoiceInput = () => {
    // If already listening, stop it
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Try Chrome.')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = language === 'English' ? 'en-US' : language === 'Hindi' ? 'hi-IN' : language === 'Kannada' ? 'kn-IN' : language === 'Spanish' ? 'es-ES' : language === 'French' ? 'fr-FR' : language === 'German' ? 'de-DE' : language === 'Telugu' ? 'te-IN' : language === 'Tamil' ? 'ta-IN' : language === 'Arabic' ? 'ar-SA' : language === 'Portuguese' ? 'pt-BR' : language === 'Japanese' ? 'ja-JP' : 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    let finalTranscript = ''

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      // Only take the final result from the last result set
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
    }
    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      if (finalTranscript.trim()) {
        setCustomIdea(prev => prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim())
      }
    }
    recognition.start()
  }

  // Export as PDF
  const exportAsPDF = () => {
    if (!result) return
    const content = `
CONTENTFORGE - Generated Content Report
========================================
Date: ${new Date().toLocaleString()}
Tone: ${tone} | Language: ${language}

--- SUMMARY ---
${result.summary}

--- INSTAGRAM ---
Caption: ${result.instagram?.caption}
Hashtags: ${result.instagram?.hashtags}

--- LINKEDIN ---
${result.linkedin?.post}

--- X (TWITTER) THREAD ---
${result.twitter?.thread?.map((t, i) => `${i + 1}. ${t}`).join('\n')}

--- VIRAL HOOKS ---
${result.hooks?.map((h, i) => `${i + 1}. ${h}`).join('\n')}
`
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`<html><head><title>ContentForge Export</title><style>
      body { font-family: 'Segoe UI', sans-serif; padding: 40px; line-height: 1.7; color: #222; }
      h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
      h2 { color: #333; margin-top: 24px; }
      pre { white-space: pre-wrap; font-family: inherit; }
    </style></head><body><h1>ContentForge Report</h1><pre>${content}</pre></body></html>`)
    printWindow.document.close()
    printWindow.print()
  }

  // Refine: send current result + user instructions to AI for tweaks
  const handleRefine = async () => {
    if (!result || !refineText.trim()) return
    setLoading(true)
    setStep('🔧 AI is refining your content...')
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, instructions: refineText, tone, language, model }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Invalid response') }
      if (!res.ok) throw new Error(data.error || 'Refinement failed')
      setResult(data)
      setReview(null)
      setRefineText('')
      saveToHistory(data, '🔧 Refined: ' + refineText.slice(0, 40))
      setStep('')
    } catch (err) {
      const friendlyMessage = err.message.includes('captions/subtitles') || err.message.includes('publicly accessible')
        ? 'Could not extract a transcript from that video. Please try a public YouTube video with captions enabled, or switch to Idea mode and type your topic directly.'
        : 'Generation failed: ' + err.message
      setError(friendlyMessage)
      setStep('')
    } finally {
      setLoading(false)
    }
  }

  // Voice input for refine box
  const refineRecognitionRef = useRef(null)
  const handleRefineVoice = () => {
    if (isRefineListening && refineRecognitionRef.current) {
      refineRecognitionRef.current.stop()
      return
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Try Chrome.')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    refineRecognitionRef.current = recognition
    recognition.lang = language === 'English' ? 'en-US' : language === 'Hindi' ? 'hi-IN' : language === 'Kannada' ? 'kn-IN' : language === 'Spanish' ? 'es-ES' : language === 'French' ? 'fr-FR' : language === 'German' ? 'de-DE' : language === 'Telugu' ? 'te-IN' : language === 'Tamil' ? 'ta-IN' : language === 'Arabic' ? 'ar-SA' : language === 'Portuguese' ? 'pt-BR' : language === 'Japanese' ? 'ja-JP' : 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1
    let finalTranscript = ''
    recognition.onstart = () => setIsRefineListening(true)
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
      }
    }
    recognition.onerror = () => { setIsRefineListening(false); refineRecognitionRef.current = null }
    recognition.onend = () => {
      setIsRefineListening(false)
      refineRecognitionRef.current = null
      if (finalTranscript.trim()) setRefineText(prev => prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim())
    }
    recognition.start()
  }

  const saveToHistory = (data, source) => {
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      source,
      tone,
      language,
      summary: data.summary?.slice(0, 120) + '...',
      data,
    }
    const updated = [entry, ...history].slice(0, 10)
    setHistory(updated)
    localStorage.setItem('contentforge-history', JSON.stringify(updated))
  }

  const loadFromHistory = (entry) => {
    setResult(entry.data)
    setReview(entry.review || null)
    setShowHistory(false)
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('contentforge-history')
    setResult(null)
    setReview(null)
    setRefineText('')
  }

  const handleReview = async () => {
    if (!result) return
    setReviewLoading(true)
    setReview(null)
    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, model }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Invalid review response') }
      if (!res.ok) throw new Error(data.error || 'Review failed')
      setReview(data)
      // Save review into the latest matching history entry
      const updatedHistory = history.map((entry, i) => {
        if (i === 0 && JSON.stringify(entry.data) === JSON.stringify(result)) {
          return { ...entry, review: data }
        }
        return entry
      })
      setHistory(updatedHistory)
      localStorage.setItem('contentforge-history', JSON.stringify(updatedHistory))
    } catch (err) {
      alert('Review failed: ' + err.message)
    } finally {
      setReviewLoading(false)
    }
  }

  const handleApplyImprovements = async () => {
    if (!result || !review?.improvements) return
    setLoading(true)
    setStep('✨ AI is applying improvements to your content...')
    try {
      const res = await fetch(`${API_BASE}/api/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, improvements: review.improvements, tone, language, model }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Invalid response') }
      if (!res.ok) throw new Error(data.error || 'Improvement failed')
      setResult(data)
      setReview(null)
      saveToHistory(data, '✨ Improved version')
      setStep('')
    } catch (err) {
      setError('Improvement failed: ' + err.message)
      setStep('')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (inputMode === 'youtube' && !url.trim()) {
      setError('Please paste a YouTube URL')
      return
    }
    if (inputMode === 'idea' && !customIdea.trim()) {
      setError('Please type your idea or topic')
      return
    }

    setError('')
    setResult(null)
    setLoading(true)
    setGenerationSteps([])

    requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    const updateStep = (steps) => setGenerationSteps([...steps])

    try {
      let contentToGenerate = ''

      if (inputMode === 'youtube') {
        // Step 1: Get transcript from YouTube
        setStep('📝 Extracting video transcript...')
        updateStep([
          { label: 'Extracting video transcript', status: 'active' },
          { label: 'Analyzing content', status: 'pending' },
          { label: 'Generating platform posts', status: 'pending' },
          { label: 'Creating carousel slides', status: 'pending' },
          { label: 'Preparing downloads', status: 'pending' },
        ])
        const transcriptRes = await fetch(`${API_BASE}/api/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(30000),
        })

        const transcriptText = await transcriptRes.text()
        let transcriptData
        try {
          transcriptData = JSON.parse(transcriptText)
        } catch {
          throw new Error('Server returned an invalid response. Please try again.')
        }
        if (!transcriptRes.ok) {
          throw new Error(transcriptData.error || 'Failed to get transcript')
        }
        contentToGenerate = transcriptData.transcript
      } else {
        // Custom idea mode — use the user's text directly
        contentToGenerate = customIdea
        updateStep([
          { label: 'Analyzing content', status: 'active' },
          { label: 'Generating platform posts', status: 'pending' },
          { label: 'Creating carousel slides', status: 'pending' },
          { label: 'Preparing downloads', status: 'pending' },
        ])
      }

      // Step 2: Generate content with AI
      setStep('🤖 AI is generating social media content... (this may take 15-30 seconds)')
      setGenerationSteps(prev => prev.map(s =>
        s.label === 'Extracting video transcript' ? { ...s, status: 'done' } :
        s.label === 'Analyzing content' ? { ...s, status: 'active' } : s
      ))
      const generateRes = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: contentToGenerate, tone, language, model }),
        signal: AbortSignal.timeout(60000),
      })

      const generateText = await generateRes.text()
      let generateData
      try {
        generateData = JSON.parse(generateText)
      } catch {
        throw new Error('AI returned an invalid response. Please try again.')
      }
      if (!generateRes.ok) {
        throw new Error(generateData.error || 'AI generation failed')
      }

      setResult(generateData)
      setReview(null)
      setGenerationSteps(prev => prev.map(s => ({ ...s, status: 'done' })))
      saveToHistory(generateData, inputMode === 'youtube' ? url : customIdea.slice(0, 60))
      setStep('')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStep('')
      setGenerationSteps([])
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setToast('Copied to clipboard!')
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}${result || showSettings || showHistory ? ' has-results' : ''}`}>
      {/* Toast Notification */}
      {toast && <div className="toast-notification">{toast}</div>}

      {/* Animated Background Blobs */}
      <div className="bg-blobs">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
        <div className="bg-blob bg-blob-3"></div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="logo-area">
          <span className="hackathon-badge">🏆 OpenAI Codex Hackathon 2026</span>
          <h1>ContentForge</h1>
        </div>
        <p className="header-subtitle">
          Transform YouTube videos, voice notes, and ideas into LinkedIn posts, Instagram carousels, and X content in seconds.
        </p>
        <p className="header-tagline">One Idea. Endless Content.</p>

        {/* Platform Badges */}
        <div className="platform-badges">
          <span className="platform-chip">📸 Instagram</span>
          <span className="platform-chip">💼 LinkedIn</span>
          <span className="platform-chip">𝕏  (Twitter)</span>
        </div>

        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* Product Stats */}
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">6</span>
          <span className="stat-label">Languages</span>
          <span className="stat-tooltip">English, Hindi, Kannada, Tamil, Telugu, Malayalam</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">6</span>
          <span className="stat-label">Content Tones</span>
          <span className="stat-tooltip">Professional, Casual, Gen-Z, Funny, Educational, Motivational</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">3</span>
          <span className="stat-label">Platforms</span>
          <span className="stat-tooltip">Instagram Carousels, LinkedIn Posts, X (Twitter) Threads</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">AI</span>
          <span className="stat-label">Quality Scoring</span>
          <span className="stat-tooltip">Scores engagement, readability, hook strength, platform fit & call-to-action</span>
        </div>
      </div>

      {/* Input Section */}
      <main className="main">
        {/* Toolbar + Panels */}
        <div ref={panelRef}>
        <div className="toolbar">
          <button className="settings-toggle" onClick={() => { setShowSettings(!showSettings); setShowHistory(false) }}>
            ⚙️ {showSettings ? 'Hide' : ''} Customize
          </button>
          <button className="settings-toggle" onClick={() => { setShowHistory(!showHistory); setShowSettings(false) }}>
            📜 History{history.length > 0 ? ` (${history.length})` : ''}
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <h3>Branding & Preferences</h3>
            <div className="settings-grid">
              <div className="setting-field">
                <label>Brand / Channel Name</label>
                <input
                  type="text"
                  value={branding.name}
                  onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                  placeholder="Your Brand Name"
                />
              </div>
              <div className="setting-field">
                <label>Instagram Handle</label>
                <input
                  type="text"
                  value={branding.instagram}
                  onChange={(e) => setBranding({ ...branding, instagram: e.target.value })}
                  placeholder="@yourhandle"
                />
              </div>
              <div className="setting-field">
                <label>LinkedIn Name</label>
                <input
                  type="text"
                  value={branding.linkedin}
                  onChange={(e) => setBranding({ ...branding, linkedin: e.target.value })}
                  placeholder="Your Name"
                />
              </div>
              <div className="setting-field">
                <label>X (Twitter) Handle</label>
                <input
                  type="text"
                  value={branding.twitter}
                  onChange={(e) => setBranding({ ...branding, twitter: e.target.value })}
                  placeholder="@yourhandle"
                />
              </div>
            </div>
            <div className="color-picker-section">
              <label>Slide Color Theme</label>
              <div className="color-themes">
                {COLOR_THEMES.map((theme, index) => (
                  <button
                    key={index}
                    className={`color-theme-btn ${branding.colorTheme === index ? 'active' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${theme.colors.join(', ')})` }}
                    onClick={() => setBranding({ ...branding, colorTheme: index })}
                    title={theme.name}
                  >
                    {branding.colorTheme === index && '✓'}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-actions">
              <button
                className="save-settings-btn"
                onClick={() => setShowSettings(false)}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="settings-panel history-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Recent Generations</h3>
              {history.length > 0 && (
                <button className="copy-btn" onClick={clearHistory} style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}>Clear All</button>
              )}
            </div>
            {history.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No history yet. Generate some content first!</p>
            ) : (
              <div className="history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="history-item" onClick={() => loadFromHistory(entry)}>
                    <div className="history-meta">
                      <span className="history-date">{entry.date}</span>
                      <span className="history-tone">{entry.tone} • {entry.language}</span>
                    </div>
                    <p className="history-source">{entry.source}</p>
                    <p className="history-summary">{entry.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        <div className="input-section">
          {/* Input Mode Tabs */}
          <div className="input-tabs">
            <button
              className={`tab-btn ${inputMode === 'youtube' ? 'active' : ''}`}
              onClick={() => { setInputMode('youtube'); setCustomIdea(''); setResult(null); setReview(null); setError('') }}
            >
              📺 YouTube Video
            </button>
            <button
              className={`tab-btn ${inputMode === 'idea' ? 'active' : ''}`}
              onClick={() => { setInputMode('idea'); setUrl(''); setResult(null); setReview(null); setError('') }}
            >
              💡 Idea / Topic
            </button>
          </div>

          <div className="input-group">
            {inputMode === 'youtube' ? (
              <>
                <input
                  type="text"
                  placeholder="Paste a YouTube URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="url-input"
                />
                <p className="input-helper-text">Example: https://youtube.com/watch?v=...</p>
              </>
            ) : (
              <div className="idea-input-wrapper">
                <textarea
                  placeholder="Describe your content idea..."
                  value={customIdea}
                  onChange={(e) => setCustomIdea(e.target.value)}
                  disabled={loading}
                  className="idea-input"
                  rows={4}
                />
                <button
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={handleVoiceInput}
                  disabled={loading}
                  title={isListening ? 'Click to stop' : 'Speak your idea'}
                >
                  {isListening ? '⏹️ Stop' : '🎙️ Speak'}
                </button>
                <p className="input-helper-text">e.g. "5 tips for productivity" or "Why AI is changing healthcare"</p>
              </div>
            )}
            {/* Quick Options Bar */}
            <div className="quick-options-bar">
              <div className="quick-option" ref={modelMenuRef}>
                <button className="quick-option-btn" onClick={() => { setShowModelMenu(!showModelMenu); setShowToneMenu(false); setShowLangMenu(false) }}>
                  ✨ {AI_MODELS.find(m => m.id === model)?.name || 'GPT-4.1'} ▾
                </button>
                {showModelMenu && (
                  <div className="quick-option-menu">
                    {AI_MODELS.map(m => (
                      <button
                        key={m.id}
                        className={`quick-menu-item ${model === m.id ? 'active' : ''}`}
                        onClick={() => { setModel(m.id); setShowModelMenu(false) }}
                      >
                        <span className="quick-menu-name">{m.name}</span>
                        <span className="quick-menu-desc">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="quick-option" ref={toneMenuRef}>
                <button className="quick-option-btn" onClick={() => { setShowToneMenu(!showToneMenu); setShowModelMenu(false); setShowLangMenu(false) }}>
                  🎯 {tone} ▾
                </button>
                {showToneMenu && (
                  <div className="quick-option-menu">
                    {TONES.map(t => (
                      <button
                        key={t}
                        className={`quick-menu-item simple ${tone === t ? 'active' : ''}`}
                        onClick={() => { setTone(t); setShowToneMenu(false) }}
                      >
                        <span className="quick-menu-name">{t}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="quick-option" ref={langMenuRef}>
                <button className="quick-option-btn" onClick={() => { setShowLangMenu(!showLangMenu); setShowModelMenu(false); setShowToneMenu(false) }}>
                  🌍 {language} ▾
                </button>
                {showLangMenu && (
                  <div className="quick-option-menu">
                    {LANGUAGES.map(l => (
                      <button
                        key={l}
                        className={`quick-menu-item simple ${language === l ? 'active' : ''}`}
                        onClick={() => { setLanguage(l); setShowLangMenu(false) }}
                      >
                        <span className="quick-menu-name">{l}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="generate-btn"
            >
              <span className="btn-content">
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Generating...
                  </>
                ) : (
                  '🚀 Generate Social Content'
                )}
              </span>
            </button>
          </div>

          {/* Progress indicator */}
          {step && (
            <div className="step-indicator">{step}</div>
          )}

          {/* Progress Steps */}
          {loading && generationSteps.length > 0 && (
            <div ref={progressRef} className="progress-steps">
              {generationSteps.map((s, i) => (
                <div key={i} className={`progress-step ${s.status}`}>
                  <span className="progress-step-icon">
                    {s.status === 'done' ? '✓' : s.status === 'active' ? <span className="spinner-sm"></span> : '○'}
                  </span>
                  <span className="progress-step-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && <div className="error-message">❌ {error}</div>}
        </div>

        {/* Results Section */}
        {result && (
          <div ref={resultsRef} className="results">
            {/* Generation Info Banner */}
            <div className="gen-info-banner">
              <div className="gen-info-items">
                <span className="gen-info-item"><strong>Source:</strong> {inputMode === 'youtube' ? 'YouTube Video' : 'User Idea'}</span>
                <span className="gen-info-item"><strong>Language:</strong> {language}</span>
                <span className="gen-info-item"><strong>Tone:</strong> {tone}</span>
                <span className="gen-info-item"><strong>Platforms:</strong> Instagram, LinkedIn, X</span>
                <span className="gen-info-item"><strong>Model:</strong> {AI_MODELS.find(m => m.id === model)?.name || 'GPT-4.1'}</span>
              </div>
            </div>

            {/* Refine Box */}
            <div className="refine-box">
              <h3>🔧 Refine Your Output</h3>
              <p className="refine-hint">Tell AI what to change or click a suggestion below</p>
              <div className="refine-chips">
                {REFINE_SUGGESTIONS.map((s) => (
                  <button key={s} className="refine-chip" onClick={() => setRefineText(s)}>{s}</button>
                ))}
              </div>
              <div className="refine-input-wrapper">
                <textarea
                  className="refine-input"
                  placeholder="Type your tweaks here or click 🎙️ to speak..."
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  rows={2}
                  disabled={loading}
                />
                <button
                  className={`voice-btn refine-voice-btn ${isRefineListening ? 'listening' : ''}`}
                  onClick={handleRefineVoice}
                  disabled={loading}
                >
                  {isRefineListening ? '⏹️' : '🎙️'}
                </button>
              </div>
              <button
                className="generate-btn refine-submit-btn"
                onClick={handleRefine}
                disabled={loading || !refineText.trim()}
              >
                <span className="btn-content">{loading ? '⏳ Refining...' : '🔧 Refine & Regenerate'}</span>
              </button>
            </div>

            {/* Summary */}
            <div className="result-card">
              <h2>Summary</h2>
              <p>{result.summary}</p>
            </div>

            {/* Instagram */}
            <div className="result-card instagram">
              <div className="result-card-header">
                <h2>📸 Instagram Post</h2>
                <div className="result-badges">
                  <span className="result-badge badge-tone">{tone}</span>
                  <span className="result-badge badge-platform badge-insta">Instagram</span>
                </div>
              </div>
              <div className="content-box">
                <p>{result.instagram?.caption}</p>
                <p className="hashtags">{result.instagram?.hashtags}</p>
              </div>
              <button className="copy-btn" onClick={() => copyToClipboard(result.instagram?.caption + '\n\n' + result.instagram?.hashtags)}>
                📋 Copy
              </button>
            </div>

            {/* LinkedIn */}
            <div className="result-card linkedin">
              <div className="result-card-header">
                <h2>💼 LinkedIn Post</h2>
                <div className="result-badges">
                  <span className="result-badge badge-tone">{tone}</span>
                  <span className="result-badge badge-platform badge-linkedin">LinkedIn</span>
                </div>
              </div>
              <div className="content-box">
                <p style={{ whiteSpace: 'pre-line' }}>{result.linkedin?.post}</p>
              </div>
              <button className="copy-btn" onClick={() => copyToClipboard(result.linkedin?.post)}>
                📋 Copy
              </button>
            </div>

            {/* Twitter/X Thread */}
            <div className="result-card twitter">
              <div className="result-card-header">
                <h2>𝕏 Thread</h2>
                <div className="result-badges">
                  <span className="result-badge badge-tone">{tone}</span>
                  <span className="result-badge badge-platform badge-twitter">X / Twitter</span>
                </div>
              </div>
              <div className="content-box">
                {result.twitter?.thread?.map((tweet, index) => (
                  <div key={index} className="tweet">
                    <span className="tweet-number">{index + 1}/{result.twitter.thread.length}</span>
                    <p>{tweet}</p>
                  </div>
                ))}
              </div>
              <button className="copy-btn" onClick={() => copyToClipboard(result.twitter?.thread?.join('\n\n'))}>
                📋 Copy Thread
              </button>
            </div>

            {/* Hooks */}
            <div className="result-card hooks">
              <h2>🔥 Viral Hook Options</h2>
              <div className="content-box">
                {result.hooks?.map((hook, index) => (
                  <div key={index} className="hook-item">
                    <span>Option {index + 1}:</span> {hook}
                  </div>
                ))}
              </div>
            </div>

            {/* Downloadable Image Cards */}
            <ImageCards result={result} branding={branding} colorTheme={COLOR_THEMES[branding.colorTheme]} onExportPDF={exportAsPDF} />

            {/* ForgeScore™ AI Review */}
            <div className="result-card review-section forgescore-card">
              <div className="forgescore-header">
                <h2>ForgeScore™ AI Review</h2>
                <div className="result-badges">
                  <span className="result-badge badge-tone">{tone}</span>
                  <span className="result-badge badge-lang">{language}</span>
                </div>
              </div>
              {!review && !reviewLoading && (
                <button className="generate-btn review-btn" onClick={handleReview}>
                  <span className="btn-content">🔍 Analyze Content Quality</span>
                </button>
              )}
              {reviewLoading && <div className="step-indicator">🔍 Running ForgeScore™ analysis...</div>}
              {review && (
                <div className="review-results">
                  <div className="review-overall">
                    <div className="review-overall-left">
                      <span className="review-score-label-tm">ForgeScore™</span>
                      <span className="review-score-big">{review.overall_score}/10</span>
                    </div>
                    <div className="review-overall-right">
                      <span className="review-verdict">{review.verdict}</span>
                      <span className={`engagement-label ${review.overall_score >= 8 ? 'high' : review.overall_score >= 6 ? 'medium' : 'low'}`}>
                        {review.overall_score >= 8 ? '🟢 High Engagement Potential' : review.overall_score >= 6 ? '🟡 Medium Engagement Potential' : '🔴 Needs Improvement'}
                      </span>
                    </div>
                  </div>
                  <div className="review-scores">
                    {review.scores && Object.entries(review.scores).map(([key, val]) => (
                      <div key={key} className="review-score-item">
                        <div className="review-score-header">
                          <span className="review-score-label">{key.replace(/_/g, ' ')}</span>
                          <span className="review-score-num">{val.score}/10</span>
                        </div>
                        <div className="review-bar">
                          <div className="review-bar-fill" style={{ width: `${val.score * 10}%` }}></div>
                        </div>
                        <p className="review-feedback">{val.feedback}</p>
                      </div>
                    ))}
                  </div>
                  <div className="review-lists">
                    <div>
                      <h4>✅ Strengths</h4>
                      <ul>{review.top_strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div>
                      <h4>💡 Improvements</h4>
                      <ul>{review.improvements?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  </div>
                  <div className="review-actions">
                    <button className="generate-btn improve-btn" onClick={handleApplyImprovements} disabled={loading}>
                      <span className="btn-content">{loading ? '⏳ Improving...' : '✨ Apply Improvements & Regenerate'}</span>
                    </button>
                    <button className="copy-btn" style={{ marginTop: '0' }} onClick={() => handleReview()}>🔄 Re-analyze</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Built by <span className="footer-brand">ZeroToShip</span> • Powered by OpenAI • OpenAI Codex Hackathon 2026</p>
      </footer>
    </div>
  )
}

export default App
