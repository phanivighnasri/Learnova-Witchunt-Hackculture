import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import haptics from '../../utils/haptics'

// ── Stage 1: Peel ─────────────────────────────────────────────────────────
function StagePeel({ onDone }) {
  const [swipeProgress, setSwipeProgress] = useState(0)
  const [torn, setTorn] = useState(false)
  const [peeled, setPeeled] = useState(false)
  const [toast, setToast] = useState('')
  const startX = useRef(null)
  const startTime = useRef(null)

  const handleStart = (clientX) => {
    startX.current = clientX
    startTime.current = Date.now()
    setSwipeProgress(0)
  }

  const handleMove = (clientX) => {
    if (startX.current === null) return
    const dx = clientX - startX.current
    const elapsed = Date.now() - startTime.current
    const speed = Math.abs(dx) / (elapsed || 1) // px/ms

    if (dx < 0) return

    if (speed > 2.5 && dx > 40) {
      haptics.error()
      setTorn(true)
      setToast('Too fast! Real peeling requires precision 🪲')
      setTimeout(() => { setTorn(false); setToast(''); startX.current = null }, 1500)
      return
    }

    const progress = Math.min(1, dx / 220)
    setSwipeProgress(progress)

    if (progress >= 1) {
      haptics.tap()
      setPeeled(true)
      startX.current = null
      setTimeout(() => onDone(), 1200)
    }
  }

  const handleEnd = () => {
    if (swipeProgress < 1 && !peeled) {
      setSwipeProgress(0)
      startX.current = null
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Stage 1 / 4</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Peel the Onion Layer</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          Slowly swipe right to peel the outermost transparent layer
        </p>
      </div>

      <div
        onMouseDown={e => handleStart(e.clientX)}
        onMouseMove={e => e.buttons > 0 && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onTouchStart={e => handleStart(e.touches[0].clientX)}
        onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
        onTouchEnd={handleEnd}
        style={{ cursor: 'ew-resize', touchAction: 'none' }}
      >
        <svg viewBox="0 0 280 280" width="280" height="280" style={{ display: 'block' }}>
          <defs>
            <radialGradient id="onion-bg" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor="#4a0a3a" />
              <stop offset="50%" stopColor="#2d0a28" />
              <stop offset="100%" stopColor="#0d0d1a" />
            </radialGradient>
            <clipPath id="peel-clip">
              <rect x="0" y="0" width={280 - swipeProgress * 280} height="280" />
            </clipPath>
          </defs>

          {/* Onion cross-section background */}
          <ellipse cx="140" cy="160" rx="110" ry="120" fill="url(#onion-bg)" />

          {/* Inner layers */}
          <ellipse cx="140" cy="160" rx="95" ry="103" fill="none" stroke="#7d1f6a" strokeWidth="6" opacity="0.7" />
          <ellipse cx="140" cy="160" rx="78" ry="85" fill="none" stroke="#a83288" strokeWidth="5" opacity="0.65" />
          <ellipse cx="140" cy="165" rx="58" ry="62" fill="#f3e6c0" opacity="0.85" />
          <ellipse cx="140" cy="165" rx="44" ry="47" fill="#ecdcac" />
          <ellipse cx="140" cy="165" rx="28" ry="30" fill="#e5d098" />
          <ellipse cx="140" cy="165" rx="14" ry="16" fill="#d9c078" />

          {/* Outer peelable layer (shimmering) */}
          <ellipse cx="140" cy="155" rx="108" ry="118" fill="rgba(255,255,255,0.06)" stroke="#c06090" strokeWidth="2.5" clipPath="url(#peel-clip)" />
          {[1, 2, 3, 4].map(i => (
            <ellipse key={i} cx="140" cy="155" rx={104 - i * 5} ry={113 - i * 4}
              fill="none" stroke="rgba(255,200,220,0.12)" strokeWidth="1" clipPath="url(#peel-clip)" />
          ))}
          {/* Shimmer overlay on outer layer */}
          <ellipse cx="140" cy="155" rx="108" ry="118"
            fill="rgba(255,180,210,0.08)"
            style={{ animation: 'pulse-glow 2s infinite' }}
            clipPath="url(#peel-clip)"
          />

          {/* Peeled portion flying off */}
          {swipeProgress > 0.1 && (
            <g transform={`translate(${swipeProgress * 100}, ${-swipeProgress * 30}) rotate(${swipeProgress * 15})`} opacity={1 - swipeProgress * 0.5}>
              <path d={`M ${140 + swipeProgress * 60} 60 Q ${180 + swipeProgress * 40} 120 ${140 + swipeProgress * 80} 250`}
                stroke="rgba(255,200,220,0.5)" strokeWidth="20" fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* Torn crack effect */}
          {torn && (
            <path d="M 130 80 L 145 120 L 125 150 L 148 190 L 130 220" stroke="#ef4444" strokeWidth="3" fill="none" opacity="0.8" />
          )}

          {/* Slide indicator at bottom */}
          {!peeled && (
            <g>
              <rect x="60" y="260" width="160" height="14" rx="7" fill="rgba(255,255,255,0.07)" />
              <rect x="60" y="260" width={160 * swipeProgress} height="14" rx="7" fill="rgba(107,79,255,0.7)" />
              <text x="140" y="280" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">Swipe right →</text>
            </g>
          )}

          {peeled && (
            <text x="140" y="270" textAnchor="middle" fill="#2ecc71" fontSize="13" fontWeight="700">✓ Layer peeled!</text>
          )}
        </svg>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(231,76,60,0.9)', borderRadius: 10, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, color: 'white', whiteSpace: 'nowrap',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 100,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Stage 2: Mount & Stain ────────────────────────────────────────────────
function StageStain({ onDone }) {
  const [stained, setStained] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [stainRadius, setStainRadius] = useState(0)

  const handleDrop = (e) => {
    if (stained) return
    const rect = e.currentTarget.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    const x = ((touch.clientX - rect.left) / rect.width) * 200
    const y = ((touch.clientY - rect.top) / rect.height) * 120
    setDropPos({ x: Math.max(20, Math.min(180, x)), y: Math.max(20, Math.min(100, y)) })
    setStained(true)
    // Animate stain spread
    let r = 0
    const iv = setInterval(() => {
      r += 5
      setStainRadius(r)
      if (r >= 120) { clearInterval(iv); setTimeout(() => onDone(), 800) }
    }, 30)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Stage 2 / 4</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Mount & Stain with Iodine</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          Tap the iodine dropper to release a drop onto the specimen
        </p>
      </div>

      <div style={{ position: 'relative', width: 280 }}>
        {/* Dropper */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={handleDrop}
          onTouchStart={handleDrop}
          style={{
            position: 'absolute', top: -60, right: 20, zIndex: 10,
            cursor: 'pointer', touchAction: 'none',
          }}
        >
          <svg width="60" height="90" viewBox="0 0 60 90">
            <rect x="22" y="0" width="16" height="55" rx="5" fill="#b8860b" opacity="0.9" />
            <path d="M22 55 L38 55 L36 72 L24 72 Z" fill="#daa520" opacity="0.9" />
            <path d="M28 72 L32 72 L31 80 L29 80 Z" fill="#daa520" />
            {!stained && (
              <motion.circle
                cx="30" cy="84" r="5" fill="rgba(218,165,32,0.8)"
                animate={{ cy: [84, 84, 120], r: [5, 6, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              />
            )}
          </svg>
        </motion.div>

        {/* Glass slide */}
        <svg viewBox="0 0 200 120" width="100%" height="140" onClick={!stained ? handleDrop : undefined} style={{ cursor: 'pointer' }}>
          <defs>
            <radialGradient id="stain-spread" cx={`${dropPos?.x / 200 * 100 || 50}%`} cy={`${dropPos?.y / 120 * 100 || 50}%`} r="60%">
              <stop offset="0%" stopColor="#b8860b" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#8b6914" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b8860b" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Slide base */}
          <rect x="10" y="20" width="180" height="80" rx="4" fill="rgba(200,220,255,0.06)" stroke="rgba(200,220,255,0.3)" strokeWidth="1.5" />
          {/* Specimen strip (peeled layer) */}
          <rect x="30" y="35" width="140" height="50" rx="2" fill="rgba(255,240,220,0.12)" stroke="rgba(255,240,220,0.3)" strokeWidth="1" />
          {/* Cell outlines - faint */}
          {[0, 1, 2, 3, 4].map(col =>
            [0, 1, 2].map(row => (
              <rect key={`${col}-${row}`}
                x={35 + col * 26} y={38 + row * 15}
                width="24" height="13" rx="2"
                fill="none" stroke="rgba(255,230,190,0.15)" strokeWidth="0.8"
              />
            ))
          )}
          {/* Iodine stain spreading */}
          {stained && dropPos && (
            <motion.circle
              cx={dropPos.x} cy={dropPos.y}
              r={stainRadius}
              fill="url(#stain-spread)"
              opacity="0.7"
            />
          )}
          {/* Reflection on slide */}
          <line x1="15" y1="25" x2="15" y2="95" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          {!stained && (
            <text x="100" y="65" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11">Tap to stain</text>
          )}
        </svg>
      </div>

      {stained && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 16, padding: '10px 18px',
            background: 'rgba(218,165,32,0.15)', border: '1px solid rgba(218,165,32,0.4)',
            borderRadius: 12, fontSize: 13, color: '#f1c40f', textAlign: 'center', lineHeight: 1.5,
          }}
        >
          💡 Iodine stains the starch in cell walls — this makes them visible under the microscope
        </motion.div>
      )}
    </div>
  )
}

// ── Stage 3: Focus ────────────────────────────────────────────────────────
function StageFocus({ onDone }) {
  const [blur, setBlur] = useState(12)
  const [revealed, setRevealed] = useState(false)
  const [flash, setFlash] = useState(false)
  const lastAngle = useRef(null)
  const svgRef = useRef(null)
  const lastHapticBlur = useRef(12)

  const clampBlur = (v) => Math.max(0, Math.min(12, v))

  const handleKnobDrag = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const touch = e.touches ? e.touches[0] : e
    const angle = Math.atan2(touch.clientY - cy, touch.clientX - cx) * 180 / Math.PI
    if (lastAngle.current !== null) {
      let delta = angle - lastAngle.current
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      setBlur(prev => {
        const next = clampBlur(prev - delta * 0.06)
        // Haptic tick every 2 px of blur reduction
        if (lastHapticBlur.current - next >= 2) {
          lastHapticBlur.current = next
          haptics.tap()
        }
        if (next <= 0.3 && prev > 0.3 && !revealed) {
          setRevealed(true)
          setFlash(true)
          haptics.achievement()
          setTimeout(() => { setFlash(false); setTimeout(onDone, 800) }, 800)
        }
        return next
      })
    }
    lastAngle.current = angle
  }, [revealed, onDone])

  const stopDrag = () => { lastAngle.current = null }

  const blurLevel = blur < 0.3 ? 0 : blur

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 24px' }}>
      {flash && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 50, pointerEvents: 'none' }} />
      )}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Stage 3 / 4</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Focus the Microscope</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          Rotate the focus knob clockwise to bring cells into view
        </p>
      </div>

      {/* Microscope viewport */}
      <div style={{ position: 'relative', width: 260, height: 260 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 260 260"
          width="260" height="260"
          onMouseMove={e => e.buttons === 1 && handleKnobDrag(e)}
          onMouseUp={stopDrag}
          onTouchMove={e => { e.preventDefault(); handleKnobDrag(e) }}
          onTouchEnd={stopDrag}
          style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        >
          <defs>
            <clipPath id="scope-clip"><circle cx="130" cy="130" r="115" /></clipPath>
            <filter id="cell-blur">
              <feGaussianBlur stdDeviation={blurLevel} />
            </filter>
            <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="transparent" />
              <stop offset="100%" stopColor="#0d0d1a" stopOpacity="1" />
            </radialGradient>
          </defs>

          {/* Black outside circle */}
          <rect x="0" y="0" width="260" height="260" fill="#0d0d1a" />
          <circle cx="130" cy="130" r="115" fill="#1a0e00" />

          {/* Blurry amber texture background */}
          <g clipPath="url(#scope-clip)" filter="url(#cell-blur)">
            <rect x="15" y="15" width="230" height="230" fill="#2a1500" />
            {/* Cell grid */}
            {[0,1,2,3,4].map(col => [0,1,2,3,4].map(row => (
              <rect key={`${col}-${row}`}
                x={20 + col * 44} y={20 + row * 44}
                width="40" height="40" rx="4"
                fill="#1f0d00" stroke="#c8890a" strokeWidth="2.5"
              />
            )))}
            {/* Nuclei */}
            {[[42,42],[130,42],[220,42],[86,86],[174,86],[42,130],[220,130],[130,174],[86,218],[174,218]].map(([cx,cy],i) => (
              <ellipse key={i} cx={cx} cy={cy} rx="8" ry="6" fill="#7d4e00" opacity="0.9" />
            ))}
            {/* Large vacuoles */}
            {[[42,42],[130,42],[220,42],[86,86],[174,86],[42,130],[220,130],[130,174],[86,218],[174,218]].map(([cx,cy],i) => (
              <ellipse key={i} cx={cx+6} cy={cy+8} rx="12" ry="10" fill="rgba(210,160,80,0.15)" />
            ))}
          </g>

          {/* Reveal crisp cells when focused */}
          {blurLevel < 2 && (
            <g clipPath="url(#scope-clip)" opacity={Math.max(0, 1 - blurLevel / 2)}>
              {[0,1,2,3,4].map(col => [0,1,2,3,4].map(row => (
                <rect key={`crisp-${col}-${row}`}
                  x={20 + col * 44} y={20 + row * 44}
                  width="40" height="40" rx="4"
                  fill="#1f0d00" stroke="#e8a020" strokeWidth="2"
                />
              )))}
              {/* Nuclei - crisp */}
              {[[42,42],[130,42],[220,42],[86,86],[174,86],[42,130],[220,130],[130,174],[86,218],[174,218]].map(([cx,cy],i) => (
                <g key={i}>
                  <ellipse cx={cx} cy={cy} rx="8" ry="6" fill="#5c3600" stroke="#8b5e00" strokeWidth="1" />
                  <text x={cx+16} y={cy+4} fill="#f1c40f" fontSize="7" opacity={0.8}>nucleus</text>
                </g>
              ))}
              {/* Vacuoles */}
              {[[42,42],[130,42],[220,42],[86,86],[174,86],[42,130],[220,130],[130,174],[86,218],[174,218]].map(([cx,cy],i) => (
                <ellipse key={i} cx={cx+5} cy={cy+9} rx="13" ry="11" fill="rgba(200,150,60,0.08)" stroke="rgba(200,150,60,0.2)" strokeWidth="0.8" />
              ))}
            </g>
          )}

          {/* Vignette */}
          <circle cx="130" cy="130" r="115" fill="url(#vignette)" />
          {/* Scope ring */}
          <circle cx="130" cy="130" r="115" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
          <circle cx="130" cy="130" r="122" fill="none" stroke="#222" strokeWidth="10" />

          {/* Focus knob indicator */}
          <g transform={`rotate(${(1 - blur/12) * 270 - 45}, 130, 130)`}>
            <circle cx="130" cy="130" r="120" fill="none" stroke="rgba(107,79,255,0.2)" strokeWidth="1" />
            <circle cx="130" cy="14" r="5" fill="#6b4fff" opacity="0.8" />
          </g>

          {/* Blur level indicator */}
          <text x="130" y="252" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
            {blurLevel < 0.5 ? 'Focus: SHARP ✓' : `Focus: ${(blur/12 * 100).toFixed(0)}% blur`}
          </text>
        </svg>
      </div>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
        {blurLevel < 2 ? '🔬 Cell structures emerging…' : 'Drag in a circle to rotate the focus knob'}
      </div>
    </div>
  )
}

// ── Stage 4: Label ────────────────────────────────────────────────────────
const STRUCTURES = [
  { id: 'wall', label: 'Cell Wall', cx: 130, cy: 90, correctX: 130, correctY: 75 },
  { id: 'membrane', label: 'Cell Membrane', cx: 130, cy: 115, correctX: 120, correctY: 100 },
  { id: 'nucleus', label: 'Nucleus', cx: 92, cy: 125, correctX: 85, correctY: 120 },
  { id: 'vacuole', label: 'Vacuole', cx: 155, cy: 140, correctX: 155, correctY: 145 },
  { id: 'cytoplasm', label: 'Cytoplasm', cx: 160, cy: 110, correctX: 160, correctY: 105 },
]
const OPTIONS = ['Cell Wall', 'Cell Membrane', 'Nucleus', 'Vacuole', 'Cytoplasm', 'Chloroplast']

function StageLabel({ onDone }) {
  const [labeled, setLabeled] = useState({})
  const [active, setActive] = useState(null)
  const [shake, setShake] = useState(null)

  const handleSelect = (option) => {
    if (!active) return
    const correct = STRUCTURES.find(s => s.id === active)?.label === option
    if (correct) {
      setLabeled(prev => ({ ...prev, [active]: option }))
    } else {
      setShake(active)
      setTimeout(() => setShake(null), 500)
    }
    setActive(null)
  }

  const correctCount = Object.keys(labeled).length
  const missed = STRUCTURES.filter(s => !labeled[s.id]).map(s => s.label)

  useEffect(() => {
    if (correctCount === 5) {
      setTimeout(() => onDone({ correctCount: 5, missedStructures: [] }), 1000)
    }
  }, [correctCount])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px' }}>
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Stage 4 / 4</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Label the Cell Structures</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Tap a pulsing ring, then select the correct label</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: 4 }}>
        <svg viewBox="0 0 260 220" width="260" height="220">
          {/* Onion cell */}
          <rect x="60" y="30" width="140" height="160" rx="12" fill="#1a0d00" stroke="#e8a020" strokeWidth="3" />
          {/* Nucleus */}
          <ellipse cx="92" cy="125" rx="22" ry="16" fill="#5c3600" stroke="#8b5e00" strokeWidth="2" />
          {/* Vacuole */}
          <ellipse cx="155" cy="140" rx="35" ry="30" fill="rgba(200,150,60,0.08)" stroke="rgba(200,150,60,0.3)" strokeWidth="1.5" />
          {/* Labels */}
          {STRUCTURES.map(s => (
            <g key={s.id}>
              {labeled[s.id] ? (
                <g>
                  <motion.circle cx={s.cx} cy={s.cy} r="8" fill="rgba(46,204,113,0.3)" stroke="#2ecc71" strokeWidth="2"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} />
                  <circle cx={s.cx} cy={s.cy} r="3" fill="#2ecc71" />
                  <text x={s.cx + 12} y={s.cy + 4} fill="#2ecc71" fontSize="9" fontWeight="700">{labeled[s.id]}</text>
                </g>
              ) : (
                <g onClick={() => setActive(active === s.id ? null : s.id)} style={{ cursor: 'pointer' }}>
                  <motion.circle cx={s.cx} cy={s.cy} r="14"
                    fill={active === s.id ? 'rgba(107,79,255,0.3)' : 'rgba(107,79,255,0.1)'}
                    stroke={active === s.id ? '#6b4fff' : '#8b6fff'}
                    strokeWidth="2"
                    animate={shake === s.id ? { x: [-4, 4, -4, 4, 0] } : {}}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.circle cx={s.cx} cy={s.cy} r="18"
                    fill="none" stroke="rgba(107,79,255,0.4)" strokeWidth="1"
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <circle cx={s.cx} cy={s.cy} r="4" fill="#6b4fff" />
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Score */}
      <div style={{ margin: '8px 0', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>
        {correctCount}/5 Labeled
      </div>

      {/* Options */}
      {active && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          {OPTIONS.map(o => (
            <motion.button key={o} whileTap={{ scale: 0.95 }} onClick={() => handleSelect(o)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>
              {o}
            </motion.button>
          ))}
        </motion.div>
      )}

      {correctCount === 5 && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          style={{ marginTop: 16, color: '#2ecc71', fontSize: 18, fontWeight: 800, textAlign: 'center' }}>
          🎉 Perfect! All 5 structures identified!
        </motion.div>
      )}

      {/* Skip button if stuck */}
      {correctCount < 5 && (
        <button
          onClick={() => onDone({ correctCount, missedStructures: missed })}
          style={{ marginTop: 16, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.3)', padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          Skip & Generate Report ({correctCount}/5)
        </button>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
export default function OnionMicroscopy({ onComplete, onBack, studentName }) {
  const [stage, setStage] = useState(0) // 0=peel, 1=stain, 2=focus, 3=label

  const stageNames = ['Peel', 'Stain', 'Focus', 'Label']
  const stageColors = ['#9b59b6', '#f39c12', '#3498db', '#2ecc71']

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 22, padding: 4, fontFamily: 'inherit' }}>←</button>
        <div>
          <div style={{ fontSize: 11, color: '#f39c12', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Biology</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Onion Cell Microscopy</div>
        </div>
      </div>

      {/* Stage progress bar */}
      <div style={{ padding: '8px 20px 4px', display: 'flex', gap: 6 }}>
        {stageNames.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stage ? stageColors[stage] : 'rgba(255,255,255,0.08)', transition: 'background 0.4s' }} />
        ))}
      </div>
      <div style={{ padding: '4px 20px 8px', display: 'flex', gap: 6 }}>
        {stageNames.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === stage ? stageColors[stage] : 'rgba(255,255,255,0.2)', fontWeight: i === stage ? 700 : 400 }}>{s}</div>
        ))}
      </div>

      {/* Stage content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {stage === 0 && <StagePeel onDone={() => setStage(1)} />}
          {stage === 1 && <StageStain onDone={() => setStage(2)} />}
          {stage === 2 && <StageFocus onDone={() => setStage(3)} />}
          {stage === 3 && (
            <StageLabel onDone={(data) => onComplete({ type: 'biology', ...data })} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
