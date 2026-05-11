import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import haptics from '../../utils/haptics'

// ── Data ──────────────────────────────────────────────────────────────────
const MATERIALS = {
  water:   { id:'water',   label:'Water',   n:1.33, bg:'rgba(30,100,200,0.28)',  border:'rgba(60,150,230,0.6)',  speed:'2.26', fact:'Why your legs look shorter in a swimming pool!' },
  glass:   { id:'glass',   label:'Glass',   n:1.50, bg:'rgba(180,220,255,0.10)', border:'rgba(180,220,255,0.55)', speed:'2.00', fact:'Used in every lens — cameras, glasses, telescopes.' },
  diamond: { id:'diamond', label:'Diamond', n:2.42, bg:'rgba(220,240,255,0.07)', border:'rgba(230,245,255,0.65)', speed:'1.24', fact:"Diamond's extreme n is exactly why it sparkles!" },
}
const MAT_LIST = Object.values(MATERIALS)
const TABLE_ANGLES = [20, 30, 40, 50, 60]
const N_GLASS = 1.50
const CRIT_DEG = Math.asin(1 / N_GLASS) * 180 / Math.PI  // ≈41.8°

const QUIZ = [
  { q:'Light goes from air into water. The refracted ray will be…',
    opts:['Closer to the normal','Further from the normal','At the same angle'],
    correct:0, explain:'In a denser medium light bends toward the normal — angle gets smaller.' },
  { q:'Which material bends light the most?',
    opts:['Air  (n = 1.00)','Water  (n = 1.33)','Glass  (n = 1.50)','Diamond  (n = 2.42)'],
    correct:3, explain:'Higher refractive index = more bending. Diamond wins at n = 2.42.' },
  { q:'Total internal reflection occurs when light travels from…',
    opts:['Fast medium → slow medium','Slow medium → fast medium','Air into water'],
    correct:1, explain:'Going from slow (dense) to fast (less dense) at a steep angle traps the light inside.' },
]

const TIR_APPS = [
  { icon:'🌐', title:'Optical Fiber',  desc:'Internet cables carry data as light pulses across oceans. TIR keeps the light inside the glass fiber for thousands of km with almost no loss.' },
  { icon:'💎', title:'Diamond Sparkle', desc:'Diamonds are cut so most angles cause TIR. Light bounces around inside every facet before escaping, creating brilliant sparkle.' },
  { icon:'🔬', title:'Endoscope',       desc:'Doctors thread flexible fiber-optic tubes inside the body. TIR carries the image out — no major surgery needed.' },
]

// ── Helpers ───────────────────────────────────────────────────────────────
function snellAirToMat(t1deg, n) {
  const s2 = Math.sin(t1deg * Math.PI / 180) / n
  return s2 < 1 ? Math.asin(s2) * 180 / Math.PI : null
}

// ── Laser Ray SVG primitive ───────────────────────────────────────────────
function Ray({ x1, y1, x2, y2, color = '#ff4444', dim = false }) {
  const op = dim ? 0.35 : 0.92
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="6" opacity={op * 0.13} style={{ filter:'blur(3px)' }} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" opacity={op} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.38)" strokeWidth="0.7" opacity={op} strokeLinecap="round" />
    </g>
  )
}

// ── STAGE 1: Intro ────────────────────────────────────────────────────────
function Stage1_Intro({ onNext, onBack }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const ts = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 2400),
      setTimeout(() => setStep(3), 4200),
    ]
    return () => ts.forEach(clearTimeout)
  }, [])

  const captions = [
    '🤔 Why does the straw look bent in water?',
    '💡 Light changes speed when it enters a new material. In water it slows to ⅔ of its speed in air.',
    '🌊 That speed change makes the ray bend at the surface. This bending is called REFRACTION.',
    '✦ The straw itself is perfectly straight — it\'s the light path that bends, fooling your eye. Let\'s explore this!',
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto' }}>
      <div style={{ padding:'16px 20px 10px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:22, padding:4, fontFamily:'inherit' }}>←</button>
        <div>
          <div style={{ fontSize:11, color:'#3498db', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Physics · Stage 1 of 4</div>
          <div style={{ fontSize:17, fontWeight:700 }}>What is Refraction?</div>
        </div>
      </div>

      <div style={{ padding:'0 20px', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
        {/* Pool scene */}
        <svg viewBox="0 0 340 210" width="100%" style={{ borderRadius:16, border:'1px solid rgba(255,255,255,0.06)', display:'block' }}>
          {/* Sky */}
          <rect x="0" y="0" width="340" height="105" fill="#0d1520" />
          {/* Water */}
          <rect x="0" y="105" width="340" height="105" fill="#0a2848" />
          {/* Water surface */}
          <rect x="0" y="103" width="340" height="4" fill="rgba(80,160,255,0.3)" />
          {/* Pool border */}
          <rect x="8" y="8" width="324" height="194" fill="none" stroke="rgba(80,130,180,0.25)" strokeWidth="2" rx="4" />
          {/* Labels */}
          <text x="16" y="28" fill="rgba(255,255,255,0.28)" fontSize="10" fontWeight="600">AIR  (n = 1.00)</text>
          <text x="16" y="132" fill="rgba(80,160,255,0.55)" fontSize="10" fontWeight="600">WATER  (n = 1.33)</text>
          {/* Straw above */}
          <line x1="148" y1="38" x2="168" y2="105" stroke="#d4a820" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
          {/* Straw below — shifted (apparent bend) */}
          <line x1="182" y1="105" x2="206" y2="178" stroke="#d4a820" strokeWidth="7" strokeLinecap="round" opacity="0.72" />
          {/* "appears bent" callout */}
          <motion.g initial={{ opacity:0 }} animate={{ opacity: step >= 1 ? 1 : 0 }} transition={{ duration:0.7 }}>
            <line x1="178" y1="107" x2="224" y2="90" stroke="rgba(255,200,0,0.55)" strokeWidth="1" strokeDasharray="3,2" />
            <text x="226" y="88" fill="rgba(255,200,0,0.82)" fontSize="9" fontWeight="600">appears bent!</text>
          </motion.g>
          {/* Animated light ray */}
          <motion.g initial={{ opacity:0 }} animate={{ opacity: step >= 2 ? 1 : 0 }} transition={{ duration:0.5 }}>
            {/* incident */}
            <line x1="78" y1="42" x2="168" y2="105" stroke="#ffe040" strokeWidth="2" strokeLinecap="round" opacity="0.88" style={{ filter:'drop-shadow(0 0 4px #ffe040)' }} />
            {/* refracted */}
            <line x1="168" y1="105" x2="218" y2="182" stroke="#ffe040" strokeWidth="2" strokeLinecap="round" opacity="0.68" style={{ filter:'drop-shadow(0 0 4px #ffe040)' }} />
            {/* normal */}
            <line x1="168" y1="70" x2="168" y2="142" stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeDasharray="4,3" />
            <text x="176" y="91" fill="rgba(255,220,50,0.75)" fontSize="9" fontWeight="700">θ₁</text>
            <text x="176" y="124" fill="rgba(255,220,50,0.65)" fontSize="9" fontWeight="700">θ₂&lt;θ₁</text>
          </motion.g>
        </svg>

        {/* Caption */}
        <div style={{ padding:'16px', background:'rgba(255,255,255,0.04)', borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', minHeight:72 }}>
          <AnimatePresence mode="wait">
            <motion.p key={step} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ margin:0, fontSize:14, color:'rgba(255,255,255,0.75)', lineHeight:1.65 }}>
              {captions[Math.min(step, captions.length - 1)]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div style={{ padding:'16px 20px 32px' }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={onNext}
          animate={{ opacity: step >= 3 ? 1 : 0.38 }}
          style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#3498db,#2980b9)', color:'white', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 24px rgba(52,152,219,0.4)' }}>
          I get it → Explore Refraction
        </motion.button>
      </div>
    </div>
  )
}

// ── STAGE 2: Explore ──────────────────────────────────────────────────────
function Stage2_Explore({ onNext, onMaterialsTracked }) {
  const [matId, setMatId] = useState('glass')
  const [theta1, setTheta1] = useState(30)
  const [explored, setExplored] = useState(new Set(['glass']))
  const [prompt, setPrompt] = useState(null)
  const svgRef = useRef(null)
  const dragging = useRef(false)
  const promptTimer = useRef(null)
  const lastHapticTheta = useRef(30)

  const mat = MATERIALS[matId]
  const theta2 = snellAirToMat(theta1, mat.n)

  const showPrompt = useCallback((text) => {
    clearTimeout(promptTimer.current)
    setPrompt(text)
    promptTimer.current = setTimeout(() => setPrompt(null), 5500)
  }, [])

  const changeMat = (id) => {
    setMatId(id)
    const next = new Set([...explored, id])
    setExplored(next)
    onMaterialsTracked(next.size)
    if (id === 'diamond') showPrompt('Diamond bends light much more than glass — that\'s why diamonds sparkle!')
    else if (id === 'water') showPrompt('This is exactly why your legs look shorter in a swimming pool!')
    else showPrompt('Glass (n=1.50) is the reference material — the easiest to measure!')
  }

  const SX = 170, SY = 132
  const t1r = theta1 * Math.PI / 180
  const t2r = theta2 !== null ? theta2 * Math.PI / 180 : null
  const rLen = 112
  const incX = SX - Math.sin(t1r) * rLen
  const incY = SY - Math.cos(t1r) * rLen
  const refX = t2r !== null ? SX + Math.sin(t2r) * 102 : null
  const refY = t2r !== null ? SY + Math.cos(t2r) * 102 : null

  const handlePtr = useCallback((cx, cy) => {
    if (!svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const sx = (cx - r.left) / r.width * 340
    const sy = (cy - r.top) / r.height * 268
    const dx = Math.abs(SX - sx)
    const dy = Math.max(8, SY - sy)
    const a = Math.atan2(dx, dy) * 180 / Math.PI
    const clamped = Math.max(5, Math.min(80, a))
    // Haptic tick every 5°
    if (Math.abs(clamped - lastHapticTheta.current) >= 5) {
      lastHapticTheta.current = clamped
      haptics.tap()
    }
    setTheta1(clamped)
    if (clamped > 55) showPrompt('Notice how θ₂ also increases — they are always linked by the same formula!')
  }, [showPrompt])

  return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto' }}>
      <div style={{ padding:'16px 20px 8px' }}>
        <div style={{ fontSize:11, color:'#3498db', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Physics · Stage 2 of 4</div>
        <div style={{ fontSize:17, fontWeight:700 }}>Explore Refraction</div>
      </div>

      {/* Material tabs */}
      <div style={{ padding:'0 16px 10px', display:'flex', gap:8 }}>
        {MAT_LIST.map(m => (
          <motion.button key={m.id} whileTap={{ scale:0.93 }} onClick={() => changeMat(m.id)} style={{
            flex:1, padding:'9px 4px', borderRadius:12, fontFamily:'inherit', cursor:'pointer',
            background: matId===m.id ? m.bg : 'rgba(255,255,255,0.04)',
            border:`1.5px solid ${matId===m.id ? m.border : 'rgba(255,255,255,0.08)'}`,
            color: matId===m.id ? 'white' : 'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700,
          }}>
            <div>{m.label}</div>
            <div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>n={m.n}</div>
          </motion.button>
        ))}
      </div>

      {/* Scene + annotation */}
      <div style={{ position:'relative', padding:'0 16px 8px' }}>
        <svg ref={svgRef} viewBox="0 0 340 268" width="100%"
          style={{ borderRadius:12, cursor:'crosshair', touchAction:'none', display:'block', border:`1px solid ${mat.border}` }}
          onMouseDown={() => dragging.current = true}
          onMouseMove={e => dragging.current && handlePtr(e.clientX, e.clientY)}
          onMouseUp={() => dragging.current = false}
          onTouchStart={e => { dragging.current = true; handlePtr(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { e.preventDefault(); handlePtr(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={() => dragging.current = false}
        >
          <rect x="0" y="0" width="340" height="132" fill="#080d18" />
          <rect x="0" y="132" width="340" height="136" fill={mat.bg} />
          <text x="14" y="20" fill="rgba(255,255,255,0.22)" fontSize="9">AIR  (n = 1.00)</text>
          <text x="14" y="154" fill={mat.border} fontSize="9" fontWeight="600">{mat.label.toUpperCase()}  (n = {mat.n})</text>
          {/* Surface */}
          <line x1="0" y1="132" x2="340" y2="132" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Normal */}
          <line x1={SX} y1="82" x2={SX} y2="190" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5,4" />
          <text x={SX+4} y="80" fill="rgba(255,255,255,0.2)" fontSize="7">normal</text>
          {/* Incident ray */}
          <Ray x1={incX} y1={incY} x2={SX} y2={SY} color="#ff4444" />
          {/* Drag handle */}
          <circle cx={incX} cy={incY} r="8" fill="#ff4444" opacity="0.9" style={{ cursor:'grab', filter:'drop-shadow(0 0 7px #ff4444)' }} />
          <circle cx={incX} cy={incY} r="12" fill="none" stroke="#ff4444" strokeWidth="1" opacity="0.38" />
          <text x={incX} y={incY+24} fill="rgba(255,255,255,0.35)" fontSize="7" textAnchor="middle">drag</text>
          {/* Refracted ray */}
          {refX !== null && <Ray x1={SX} y1={SY} x2={refX} y2={refY} color="#00d4ff" />}
          {/* Hit point */}
          <circle cx={SX} cy={SY} r="4" fill="rgba(255,255,255,0.75)" />
          {/* θ₁ arc + label */}
          <path d={`M ${SX} ${SY-30} A 30 30 0 0 1 ${SX+30*Math.sin(t1r)} ${SY-30*Math.cos(t1r)}`}
            stroke="#ffcc00" strokeWidth="1.5" fill="none" opacity="0.8" />
          <text x={SX-44} y={SY-16} fill="#ffcc00" fontSize="11" fontWeight="700">θ₁={Math.round(theta1)}°</text>
          {/* θ₂ arc + label */}
          {t2r !== null && (
            <>
              <path d={`M ${SX} ${SY+26} A 26 26 0 0 0 ${SX+26*Math.sin(t2r)} ${SY+26*Math.cos(t2r)}`}
                stroke="#00d4ff" strokeWidth="1.5" fill="none" opacity="0.8" />
              <text x={SX+22} y={SY+44} fill="#00d4ff" fontSize="11" fontWeight="700">θ₂={Math.round(theta2 ?? 0)}°</text>
            </>
          )}
        </svg>

        {/* Annotation overlay */}
        <div style={{ position:'absolute', top:14, right:28, padding:'10px 12px', borderRadius:12, background:'rgba(6,8,20,0.9)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', minWidth:138, fontSize:11 }}>
          <div style={{ color:'rgba(255,255,255,0.35)', marginBottom:5, fontSize:9, textTransform:'uppercase', letterSpacing:0.5, fontWeight:700 }}>Live readings</div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ color:'rgba(255,255,255,0.45)' }}>θ₁</span>
            <span style={{ color:'#ffcc00', fontWeight:700 }}>{Math.round(theta1)}°</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color:'rgba(255,255,255,0.45)' }}>θ₂</span>
            <span style={{ color:'#00d4ff', fontWeight:700 }}>{theta2 !== null ? Math.round(theta2)+'°' : '—'}</span>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:6 }}>
            <div style={{ color:'rgba(255,255,255,0.45)', marginBottom:2 }}>n = {mat.n}</div>
            <div style={{ color:mat.border, fontSize:10 }}>{mat.speed}×10⁸ m/s</div>
          </div>
        </div>
      </div>

      {/* Observation prompt */}
      <AnimatePresence>
        {prompt && (
          <motion.div key={prompt} initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ margin:'0 16px 8px', padding:'10px 14px', borderRadius:12, background:'rgba(107,79,255,0.11)', border:'1px solid rgba(107,79,255,0.3)', fontSize:13, color:'rgba(255,255,255,0.78)', lineHeight:1.55 }}>
            💡 {prompt}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding:'2px 16px 8px', fontSize:12, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>
        Drag the red dot · Switch materials · Watch θ₂ respond
      </div>

      <div style={{ padding:'0 16px 32px' }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => { onMaterialsTracked(explored.size); onNext() }}
          style={{
            width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit',
            background: explored.size >= 2 ? 'linear-gradient(135deg,#6b4fff,#8b5cf6)' : 'rgba(255,255,255,0.06)',
            color: explored.size >= 2 ? 'white' : 'rgba(255,255,255,0.3)',
            fontSize:16, fontWeight:700, cursor: explored.size >= 2 ? 'pointer' : 'default',
            boxShadow: explored.size >= 2 ? '0 4px 24px rgba(107,79,255,0.4)' : 'none',
          }}>
          {explored.size >= 2 ? "Discover Snell's Law →" : `Try ${2 - explored.size} more material to continue`}
        </motion.button>
      </div>
    </div>
  )
}

// ── STAGE 3: Snell's Law Table ────────────────────────────────────────────
function Stage3_Table({ onNext }) {
  const [recorded, setRecorded] = useState([])
  const [revealed, setRevealed] = useState(false)
  const activeRow = recorded.length  // next row to record

  const currentAngle = TABLE_ANGLES[Math.min(activeRow, TABLE_ANGLES.length - 1)]
  const t1r = currentAngle * Math.PI / 180
  const t2r = Math.asin(Math.sin(t1r) / N_GLASS)
  const SX = 160, SY = 100

  const handleRecord = () => {
    if (activeRow >= TABLE_ANGLES.length) return
    const target = TABLE_ANGLES[activeRow]
    const a1 = target * Math.PI / 180
    const s1 = Math.sin(a1)
    const s2 = s1 / N_GLASS
    const th2 = Math.asin(s2) * 180 / Math.PI
    const sin2 = Math.sin(th2 * Math.PI / 180)
    const row = { theta1: target, sin1: s1, theta2: th2, sin2, ratio: s1 / sin2 }
    const next = [...recorded, row]
    setRecorded(next)
    if (next.length >= TABLE_ANGLES.length) setRevealed(true)
  }

  const incX = SX - Math.sin(t1r) * 82
  const incY = SY - Math.cos(t1r) * 82
  const refX = SX + Math.sin(t2r) * 78
  const refY = SY + Math.cos(t2r) * 78

  return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 8px' }}>
        <div style={{ fontSize:11, color:'#3498db', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Physics · Stage 3 of 4</div>
        <div style={{ fontSize:17, fontWeight:700 }}>Discover Snell's Law</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 }}>Record 5 readings — the pattern will reveal itself</div>
      </div>

      {/* Mini scene */}
      <div style={{ padding:'0 16px 10px' }}>
        <svg viewBox="0 0 320 198" width="100%" style={{ borderRadius:12, border:'1px solid rgba(180,220,255,0.2)', display:'block' }}>
          <rect x="0" y="0" width="320" height="100" fill="#080d18" />
          <rect x="0" y="100" width="320" height="98" fill="rgba(180,220,255,0.08)" />
          <text x="12" y="18" fill="rgba(255,255,255,0.22)" fontSize="8">AIR (n=1.00)</text>
          <text x="12" y="118" fill="rgba(180,220,255,0.5)" fontSize="8">GLASS (n=1.50)</text>
          <line x1="0" y1="100" x2="320" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <line x1={SX} y1="62" x2={SX} y2="142" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3" />
          <Ray x1={incX} y1={incY} x2={SX} y2={SY} color="#ff4444" />
          <Ray x1={SX} y1={SY} x2={refX} y2={refY} color="#00d4ff" />
          <circle cx={SX} cy={SY} r="3.5" fill="white" opacity="0.8" />
          <text x={SX-50} y={SY-8} fill="#ffcc00" fontSize="11" fontWeight="700">θ₁={currentAngle}°</text>
          <text x={SX+8} y={SY+32} fill="#00d4ff" fontSize="11" fontWeight="700">θ₂={Math.round(t2r * 180 / Math.PI)}°</text>
        </svg>
      </div>

      {/* Table */}
      <div style={{ padding:'0 16px 10px' }}>
        <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'0 3px', fontSize:12 }}>
          <thead>
            <tr>
              {['θ₁','sin θ₁','θ₂','sin θ₂','Ratio'].map(h => (
                <th key={h} style={{ padding:'5px 6px', textAlign:'center', color:'rgba(255,255,255,0.38)', fontSize:10, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_ANGLES.map((angle, i) => {
              const rec = recorded[i]
              const isActive = i === activeRow && !revealed
              return (
                <tr key={angle} style={{ background: isActive ? 'rgba(107,79,255,0.1)' : 'transparent' }}>
                  <td style={{ padding:'7px 6px', textAlign:'center', color:'#ffcc00', fontWeight:700,
                    outline: isActive ? '1px solid rgba(107,79,255,0.4)' : 'none', borderRadius:6 }}>{angle}°</td>
                  <td style={{ padding:'7px 6px', textAlign:'center', color:'rgba(255,255,255,0.55)' }}>
                    {Math.sin(angle * Math.PI / 180).toFixed(3)}
                  </td>
                  {rec ? (
                    <>
                      <motion.td initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }}
                        style={{ padding:'7px 6px', textAlign:'center', color:'#00d4ff', fontWeight:700 }}>{Math.round(rec.theta2)}°</motion.td>
                      <motion.td initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1 }}
                        style={{ padding:'7px 6px', textAlign:'center', color:'rgba(255,255,255,0.55)' }}>{rec.sin2.toFixed(3)}</motion.td>
                      <motion.td initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.2 }}
                        style={{ padding:'7px 6px', textAlign:'center', color:'#2ecc71', fontWeight:700 }}>{rec.ratio.toFixed(2)}</motion.td>
                    </>
                  ) : (
                    ['?','?','?'].map((v, j) => (
                      <td key={j} style={{ padding:'7px 6px', textAlign:'center', color:'rgba(255,255,255,0.18)' }}>{v}</td>
                    ))
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            style={{ margin:'0 16px 14px', padding:'16px', borderRadius:14, background:'rgba(255,204,0,0.07)', border:'2px solid rgba(255,204,0,0.45)', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.72)', marginBottom:8 }}>
              Every ratio equals <strong style={{ color:'#ffcc00' }}>≈ 1.50</strong> — the refractive index of glass!
            </div>
            <motion.div initial={{ scale:0.8 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:200 }}
              style={{ fontSize:22, fontWeight:900, color:'#ffcc00', textShadow:'0 0 30px rgba(255,204,0,0.6)', margin:'6px 0' }}>
              n₁ sin θ₁ = n₂ sin θ₂
            </motion.div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)' }}>sin(θ₁) / sin(θ₂) = n₂ / n₁ = 1.50 / 1.00 = 1.50</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding:'0 16px 32px' }}>
        {!revealed ? (
          <motion.button whileTap={{ scale:0.97 }} onClick={handleRecord}
            style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#6b4fff,#8b5cf6)', color:'white', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 24px rgba(107,79,255,0.4)' }}>
            Record Reading {activeRow + 1} / 5 →
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale:0.97 }} onClick={onNext} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#f39c12,#e67e22)', color:'white', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 24px rgba(243,156,18,0.4)' }}>
            ⚡ See Total Internal Reflection →
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ── STAGE 4: TIR ──────────────────────────────────────────────────────────
function Stage4_TIR({ onNext, onTIRTriggered }) {
  const [theta1, setTheta1] = useState(20)
  const [tirTriggered, setTirTriggered] = useState(false)
  const [tirFlash, setTirFlash] = useState(false)
  const prevTIR = useRef(false)
  const svgRef = useRef(null)
  const dragging = useRef(false)
  const lastHapticTheta = useRef(20)

  const isTIR = theta1 >= CRIT_DEG
  const SX = 170, SY = 122

  useEffect(() => {
    if (isTIR && !prevTIR.current) {
      setTirTriggered(true)
      setTirFlash(true)
      onTIRTriggered()
      haptics.achievement()
      setTimeout(() => setTirFlash(false), 1600)
    }
    prevTIR.current = isTIR
  }, [isTIR, onTIRTriggered])

  const t1r = theta1 * Math.PI / 180
  const srcX = SX - Math.sin(t1r) * 96
  const srcY = SY + Math.cos(t1r) * 96

  const t2sin = Math.sin(t1r) * N_GLASS
  const hasRefracted = !isTIR && t2sin < 1
  const t2r = hasRefracted ? Math.asin(t2sin) : null
  const refX = t2r !== null ? SX + Math.sin(t2r) * 88 : null
  const refY = t2r !== null ? SY - Math.cos(t2r) * 88 : null

  const reflX = SX + Math.sin(t1r) * 96
  const reflY = SY + Math.cos(t1r) * 96

  const handlePtr = useCallback((cx, cy) => {
    if (!svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const sx = (cx - r.left) / r.width * 340
    const sy = (cy - r.top) / r.height * 240
    const dx = Math.abs(SX - sx)
    const dy = Math.max(8, Math.abs(SY - sy))
    const a = Math.atan2(dx, dy) * 180 / Math.PI
    const clamped = Math.max(5, Math.min(75, a))
    if (Math.abs(clamped - lastHapticTheta.current) >= 5) {
      lastHapticTheta.current = clamped
      haptics.tap()
    }
    setTheta1(clamped)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', overflowY:'auto' }}>
      <AnimatePresence>
        {tirFlash && (
          <motion.div initial={{ opacity:0.85 }} animate={{ opacity:0 }} exit={{ opacity:0 }} transition={{ duration:1.6 }}
            style={{ position:'fixed', inset:0, background:'rgba(255,68,68,0.28)', zIndex:50, pointerEvents:'none' }} />
        )}
      </AnimatePresence>

      <div style={{ padding:'16px 20px 8px' }}>
        <div style={{ fontSize:11, color:'#3498db', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Physics · Stage 4 of 4</div>
        <div style={{ fontSize:17, fontWeight:700 }}>Total Internal Reflection</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 }}>Light travels from glass into air — increase angle past ~42°</div>
      </div>

      <div style={{ padding:'0 16px 10px', position:'relative' }}>
        <svg ref={svgRef} viewBox="0 0 340 240" width="100%"
          style={{ borderRadius:12, cursor:'crosshair', touchAction:'none', display:'block', border:'1px solid rgba(180,220,255,0.2)' }}
          onMouseDown={() => dragging.current = true}
          onMouseMove={e => dragging.current && handlePtr(e.clientX, e.clientY)}
          onMouseUp={() => dragging.current = false}
          onTouchStart={e => { dragging.current = true; handlePtr(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { e.preventDefault(); handlePtr(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={() => dragging.current = false}
        >
          {/* Air top */}
          <rect x="0" y="0" width="340" height="122" fill="#080d18" />
          {/* Glass bottom */}
          <rect x="0" y="122" width="340" height="118" fill="rgba(180,220,255,0.09)" />
          <text x="14" y="18" fill="rgba(255,255,255,0.22)" fontSize="9">AIR  (n=1.00)</text>
          <text x="14" y="144" fill="rgba(180,220,255,0.5)" fontSize="9">GLASS  (n=1.50)  — light originates here</text>
          {/* Surface */}
          <line x1="0" y1="122" x2="340" y2="122" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Normal */}
          <line x1={SX} y1="76" x2={SX} y2="168" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3" />
          {/* Incident ray */}
          <Ray x1={srcX} y1={srcY} x2={SX} y2={SY} color="#00d4ff" />
          {/* Source drag handle */}
          <circle cx={srcX} cy={srcY} r="8" fill="#00d4ff" opacity="0.9" style={{ cursor:'grab', filter:'drop-shadow(0 0 7px #00d4ff)' }} />
          <circle cx={srcX} cy={srcY} r="12" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.35" />
          <text x={srcX} y={srcY+23} fill="rgba(255,255,255,0.32)" fontSize="7" textAnchor="middle">drag</text>
          {/* Refracted ray into air */}
          <AnimatePresence>
            {hasRefracted && refX !== null && (
              <motion.g initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <Ray x1={SX} y1={SY} x2={refX} y2={refY} color="#ff4444" />
              </motion.g>
            )}
          </AnimatePresence>
          {/* Reflected ray (always present, bright on TIR) */}
          <Ray x1={SX} y1={SY} x2={reflX} y2={reflY} color="#ffaa00" dim={!isTIR} />
          {/* Hit point */}
          <circle cx={SX} cy={SY} r="4" fill={isTIR ? '#ffaa00' : 'rgba(255,255,255,0.75)'}
            style={{ filter: isTIR ? 'drop-shadow(0 0 10px #ffaa00)' : 'none' }} />
          {/* θ₁ label */}
          <text x={SX - 58} y={SY + 24} fill="#00d4ff" fontSize="11" fontWeight="700">θ₁ = {Math.round(theta1)}°</text>
          {/* Critical angle marker */}
          <text x={SX + 6} y={SY - 8} fill="rgba(255,165,0,0.5)" fontSize="8">crit ≈ 42°</text>
          {/* TIR label */}
          <AnimatePresence>
            {isTIR && (
              <motion.g initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                <rect x="88" y="46" width="164" height="28" rx="8" fill="rgba(255,68,68,0.14)" stroke="rgba(255,68,68,0.6)" strokeWidth="1.5" />
                <text x="170" y="65" textAnchor="middle" fill="#ff6b6b" fontSize="12" fontWeight="700">⚡ Total Internal Reflection!</text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* Slider */}
      <div style={{ padding:'0 16px 12px' }}>
        <input type="range" min="5" max="75" value={Math.round(theta1)}
          onChange={e => setTheta1(Number(e.target.value))}
          style={{ width:'100%', accentColor: isTIR ? '#ff4444' : '#00d4ff' }} />
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.28)', marginTop:3 }}>
          <span>5°</span>
          <span style={{ color:'rgba(255,165,0,0.6)' }}>↑ ~42° TIR threshold</span>
          <span>75°</span>
        </div>
      </div>

      {/* Real-world cards */}
      <AnimatePresence>
        {tirTriggered && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} style={{ padding:'0 16px 12px' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>🌍 Real-world uses of TIR</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {TIR_APPS.map((app, i) => (
                <motion.div key={app.title} initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.14 }}
                  style={{ padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>{app.icon}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{app.title}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.48)', lineHeight:1.55 }}>{app.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!tirTriggered && (
        <div style={{ padding:'0 16px 12px', textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.32)' }}>
          Drag the slider or the blue dot past ~42° to trigger TIR
        </div>
      )}

      <div style={{ padding:'0 16px 32px', marginTop:'auto' }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={onNext}
          style={{
            width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit',
            background: tirTriggered ? 'linear-gradient(135deg,#6b4fff,#8b5cf6)' : 'rgba(255,255,255,0.06)',
            color: tirTriggered ? 'white' : 'rgba(255,255,255,0.3)',
            fontSize:16, fontWeight:700, cursor: tirTriggered ? 'pointer' : 'default',
            boxShadow: tirTriggered ? '0 4px 24px rgba(107,79,255,0.4)' : 'none',
          }}>
          {tirTriggered ? '🎯 Take the Mini Quiz →' : 'Trigger TIR to continue'}
        </motion.button>
      </div>
    </div>
  )
}

// ── Quiz ──────────────────────────────────────────────────────────────────
function QuizSection({ onDone }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const done = current >= QUIZ.length
  const q = !done ? QUIZ[current] : null
  const isCorrect = selected !== null && q !== null && selected === q.correct

  const handleSelect = (idx) => {
    if (selected !== null) return
    setSelected(idx)
    setShowResult(true)
  }

  const handleNext = () => {
    setAnswers(prev => [...prev, selected === q.correct])
    setSelected(null)
    setShowResult(false)
    setCurrent(c => c + 1)
  }

  if (done) {
    const score = answers.filter(Boolean).length
    return (
      <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', maxWidth:480, margin:'0 auto', textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:14 }}>{score === 3 ? '🏆' : score >= 2 ? '⭐' : '📚'}</div>
        <div style={{ fontSize:28, fontWeight:900, marginBottom:6 }}>Quiz Complete!</div>
        <div style={{ fontSize:24, fontWeight:700, marginBottom:18, color: score === 3 ? '#2ecc71' : score >= 2 ? '#f1c40f' : '#e74c3c' }}>
          {score} / 3 correct
        </div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.48)', lineHeight:1.7, marginBottom:32 }}>
          {score === 3 ? "Perfect! You've fully understood Snell's Law and TIR." : score >= 2 ? "Great work — you've got the core concepts." : "Good effort — re-explore Stage 2 to strengthen your understanding!"}
        </div>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => onDone(score)}
          style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#6b4fff,#8b5cf6)', color:'white', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 24px rgba(107,79,255,0.4)' }}>
          🔬 Generate AI Lab Report →
        </motion.button>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto' }}>
      <div style={{ padding:'20px 20px 12px', textAlign:'center' }}>
        <div style={{ fontSize:11, color:'#f39c12', fontWeight:700, textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>Mini Quiz · {current + 1} of {QUIZ.length}</div>
        <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden', marginBottom:6 }}>
          <motion.div animate={{ width:`${(current / QUIZ.length) * 100}%` }} style={{ height:'100%', background:'#f39c12', borderRadius:4 }} />
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>Score: {answers.filter(Boolean).length} / {current}</div>
      </div>

      <div style={{ flex:1, padding:'0 20px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ padding:'16px', background:'rgba(255,255,255,0.04)', borderRadius:14, border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:16, fontWeight:600, lineHeight:1.55 }}>Q{current + 1}: {q.q}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {q.opts.map((opt, i) => {
            const isSel = selected === i
            const isRight = i === q.correct
            let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.1)', color = 'rgba(255,255,255,0.72)'
            if (showResult) {
              if (isRight)     { bg = 'rgba(46,204,113,0.14)'; border = 'rgba(46,204,113,0.55)'; color = '#2ecc71' }
              else if (isSel)  { bg = 'rgba(231,76,60,0.14)';  border = 'rgba(231,76,60,0.55)';  color = '#e74c3c' }
            } else if (isSel) { bg = 'rgba(107,79,255,0.14)'; border = '#6b4fff' }
            return (
              <motion.button key={i} whileTap={{ scale: selected !== null ? 1 : 0.97 }}
                onClick={() => handleSelect(i)}
                style={{ padding:'12px 16px', borderRadius:12, border:`1.5px solid ${border}`, background:bg, color, fontSize:14, textAlign:'left', cursor: selected !== null ? 'default' : 'pointer', fontFamily:'inherit' }}>
                {opt}
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              style={{ padding:'12px 14px', borderRadius:12, background: isCorrect ? 'rgba(46,204,113,0.09)' : 'rgba(231,76,60,0.09)', border:`1px solid ${isCorrect ? 'rgba(46,204,113,0.4)' : 'rgba(231,76,60,0.4)'}` }}>
              <div style={{ fontWeight:700, color: isCorrect ? '#2ecc71' : '#e74c3c', marginBottom:4 }}>{isCorrect ? '✓ Correct!' : '✗ Not quite'}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.58)', lineHeight:1.55 }}>{q.explain}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding:'12px 20px 32px' }}>
        {showResult && (
          <motion.button whileTap={{ scale:0.97 }} onClick={handleNext} initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#6b4fff,#8b5cf6)', color:'white', fontSize:15, fontWeight:700, cursor:'pointer' }}>
            {current + 1 < QUIZ.length ? 'Next Question →' : 'See Results →'}
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ── Orchestrator ──────────────────────────────────────────────────────────
export default function RefractionExperiment({ onComplete, onBack, studentName }) {
  const [stage, setStage] = useState('intro')
  const [materialsCount, setMaterialsCount] = useState(1)
  const [tirTriggered, setTirTriggered] = useState(false)

  const go = (s) => setStage(s)

  const handleComplete = (quizScore) => {
    onComplete({
      type: 'physics',
      anglesExplored: materialsCount,
      tirCount: tirTriggered ? 1 : 0,
      materialsExplored: materialsCount,
      quizScore,
      quizTotal: 3,
    })
  }

  const backMap = { explore:'intro', table:'explore', tir:'table', quiz:'tir' }

  return (
    <div style={{ maxWidth:480, margin:'0 auto', position:'relative' }}>
      {stage !== 'intro' && (
        <div style={{ position:'fixed', top:14, left:14, zIndex:200 }}>
          <button onClick={() => go(backMap[stage] || 'intro')}
            style={{ background:'rgba(6,8,20,0.75)', border:'1px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.8)', padding:'6px 14px', borderRadius:20, cursor:'pointer', fontFamily:'inherit', fontSize:12, backdropFilter:'blur(8px)' }}>
            ← Back
          </button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0, x:-30 }}>
            <Stage1_Intro onNext={() => go('explore')} onBack={onBack} />
          </motion.div>
        )}
        {stage === 'explore' && (
          <motion.div key="explore" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
            <Stage2_Explore onNext={() => go('table')} onMaterialsTracked={setMaterialsCount} />
          </motion.div>
        )}
        {stage === 'table' && (
          <motion.div key="table" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
            <Stage3_Table onNext={() => go('tir')} />
          </motion.div>
        )}
        {stage === 'tir' && (
          <motion.div key="tir" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
            <Stage4_TIR onNext={() => go('quiz')} onTIRTriggered={() => setTirTriggered(true)} />
          </motion.div>
        )}
        {stage === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
            <QuizSection onDone={handleComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
