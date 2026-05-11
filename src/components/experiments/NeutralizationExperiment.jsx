import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSensors from '../../hooks/useSensors'
import haptics from '../../utils/haptics'
import SensorPermissionScreen from '../SensorPermissionScreen'
import SensorIndicator from '../SensorIndicator'
import { useAccessibility } from '../../contexts/AccessibilityContext'

// ── Reagent data ──────────────────────────────────────────────────────────
const ACIDS = {
  HCl:     { id:'HCl',     sym:'HCl',     full:'Hydrochloric Acid', color:'#e74c3c', dark:'#922b21', startPH:{'0.1M':2.0,'0.5M':1.6,'1M':1.3}, waterFirst:false },
  H2SO4:   { id:'H2SO4',   sym:'H₂SO₄',   full:'Sulphuric Acid',    color:'#e67e22', dark:'#a04000', startPH:{'0.1M':1.7,'0.5M':1.3,'1M':1.0}, waterFirst:true  },
  CH3COOH: { id:'CH3COOH', sym:'CH₃COOH', full:'Acetic Acid',       color:'#d4ac0d', dark:'#7d6608', startPH:{'0.1M':3.0,'0.5M':2.7,'1M':2.4}, waterFirst:false },
}
const BASES = {
  NaOH:  { id:'NaOH',  sym:'NaOH',    full:'Sodium Hydroxide',   color:'#3498db', dark:'#1f618d' },
  CaOH2: { id:'CaOH2', sym:'Ca(OH)₂', full:'Calcium Hydroxide',  color:'#1abc9c', dark:'#0e6655' },
  NH4OH: { id:'NH4OH', sym:'NH₄OH',   full:'Ammonium Hydroxide', color:'#9b59b6', dark:'#6c3483' },
}
const REACTIONS = {
  'HCl+NaOH':     { eq:'HCl + NaOH → NaCl + H₂O',                    product:'NaCl',        name:'Table Salt',        funFact:'Common table salt — essential for life!',         hot:true,  gas:false },
  'H2SO4+NaOH':   { eq:'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',             product:'Na₂SO₄',      name:'Sodium Sulphate',   funFact:'Used in detergents and paper manufacturing.',    hot:true,  gas:false },
  'HCl+CaOH2':    { eq:'2HCl + Ca(OH)₂ → CaCl₂ + 2H₂O',             product:'CaCl₂',       name:'Calcium Chloride',  funFact:'Used as road salt and food firming agent.',      hot:true,  gas:false },
  'CH3COOH+NaOH': { eq:'CH₃COOH + NaOH → CH₃COONa + H₂O',           product:'CH₃COONa',    name:'Sodium Acetate',    funFact:'This is used in hand warmers! ✋🔥',             hot:false, gas:false },
  'H2SO4+CaOH2':  { eq:'H₂SO₄ + Ca(OH)₂ → CaSO₄ + 2H₂O',            product:'CaSO₄',       name:'Gypsum',            funFact:'This makes plaster of Paris! 🏛️',             hot:true,  gas:false },
  'HCl+NH4OH':    { eq:'NH₄OH + HCl → NH₄Cl + H₂O',                  product:'NH₄Cl',       name:'Ammonium Chloride', funFact:'Used in fertilizers! 🌱',                       hot:false, gas:true  },
  'H2SO4+NH4OH':  { eq:'H₂SO₄ + 2NH₄OH → (NH₄)₂SO₄ + 2H₂O',         product:'(NH₄)₂SO₄',  name:'Ammonium Sulphate', funFact:'Nitrogen-rich fertilizer used worldwide! 🌾',    hot:false, gas:true  },
  'CH3COOH+CaOH2':{ eq:'2CH₃COOH + Ca(OH)₂ → Ca(CH₃COO)₂ + 2H₂O',  product:'Ca(CH₃COO)₂', name:'Calcium Acetate',  funFact:'Used as a food additive and acidity regulator.', hot:false, gas:false },
  'CH3COOH+NH4OH':{ eq:'CH₃COOH + NH₄OH → CH₃COONH₄ + H₂O',         product:'CH₃COONH₄',  name:'Ammonium Acetate',  funFact:'Used in analytical chemistry and food science.',  hot:false, gas:false },
}
const getRxn = (a, b) => REACTIONS[`${a}+${b}`] || { eq:`${a} + ${b} → Salt + H₂O`, product:'Salt', name:'Salt', funFact:'Acids and bases always form a salt and water.', hot:false, gas:false }

// ── Helpers ───────────────────────────────────────────────────────────────
function calcPH(startPH, baseFill) {
  if (baseFill <= 0) return startPH
  if (baseFill < 0.55) return startPH + (6.4 - startPH) * (baseFill / 0.55)
  if (baseFill < 0.62) return 6.4 + ((baseFill - 0.55) / 0.07) * 1.2
  return 7.6 + (12.0 - 7.6) * Math.min(1, (baseFill - 0.62) / 0.38)
}

function indicatorColor(indicator, ph, hasIndicator) {
  if (!hasIndicator) return 'rgba(180,220,255,0.25)'
  if (indicator === 'phenolphthalein') {
    if (ph < 8.2) return 'rgba(180,220,255,0.25)'
    const t = Math.min(1, (ph - 8.2) / 3.8)
    return `rgba(255,${Math.round(20 + (1-t)*130)},${Math.round((1-t)*150)},${0.45 + t*0.4})`
  }
  return ph <= 7 ? 'rgba(210,50,60,0.65)' : 'rgba(50,100,210,0.65)'
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

// ── SVGs ──────────────────────────────────────────────────────────────────
function BottleSVG({ reagent, size = 70 }) {
  const { color, dark, id } = reagent
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 70 105">
      <defs>
        <linearGradient id={`bl-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={dark} /><stop offset="50%" stopColor={color} /><stop offset="100%" stopColor={dark} />
        </linearGradient>
        <clipPath id={`bc-${id}`}><rect x="15" y="32" width="40" height="62" rx="4" /></clipPath>
      </defs>
      <rect x="15" y="32" width="40" height="62" rx="4" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5" />
      <rect x="16" y="50" width="38" height="43" fill={`url(#bl-${id})`} clipPath={`url(#bc-${id})`} opacity="0.85" />
      <rect x="19" y="51" width="5" height="40" fill="rgba(255,255,255,0.15)" rx="2" />
      <rect x="27" y="18" width="16" height="16" rx="2" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5" />
      <rect x="24" y="12" width="22" height="8" rx="3" fill={color} opacity="0.9" />
      <rect x="17" y="60" width="36" height="24" rx="3" fill={dark} opacity="0.92" />
      <text x="35" y="73" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="700" fontFamily="Inter,sans-serif">{reagent.sym}</text>
      <text x="35" y="81" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="5.5" fontFamily="Inter,sans-serif">
        {reagent.full.length > 16 ? reagent.full.slice(0,14)+'…' : reagent.full}
      </text>
    </svg>
  )
}

function WaterBottleSVG({ size = 60 }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 60 84">
      <defs><clipPath id="wbc"><rect x="12" y="24" width="36" height="52" rx="4" /></clipPath></defs>
      <rect x="12" y="24" width="36" height="52" rx="4" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5" />
      <rect x="13" y="36" width="34" height="39" fill="rgba(100,200,255,0.3)" clipPath="url(#wbc)" />
      <rect x="16" y="37" width="4" height="36" fill="rgba(255,255,255,0.15)" rx="2" />
      <rect x="22" y="13" width="16" height="13" rx="2" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5" />
      <rect x="19" y="8" width="22" height="7" rx="3" fill="#7fb3c8" opacity="0.9" />
      <rect x="14" y="46" width="32" height="20" rx="3" fill="rgba(100,180,220,0.35)" />
      <text x="30" y="57" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700" fontFamily="Inter,sans-serif">H₂O</text>
      <text x="30" y="64" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="5" fontFamily="Inter,sans-serif">Distilled</text>
    </svg>
  )
}

function TestTube({ liquidFill, color, isGlowing, bubbleParticles }) {
  const TW = 54, TH = 200
  const liquidH = Math.max(0, liquidFill) * (TH - 36)
  const liquidY = TH - 18 - liquidH
  return (
    <svg viewBox={`0 0 ${TW} ${TH}`} width={TW} height={TH}
      style={{ filter: isGlowing ? 'drop-shadow(0 0 18px rgba(255,255,255,0.9))' : 'drop-shadow(0 0 10px rgba(0,0,0,0.6))' }}>
      <defs>
        <clipPath id="ttc">
          <path d={`M 12 8 L 12 ${TH-20} Q 12 ${TH-4} 27 ${TH-4} Q 42 ${TH-4} 42 ${TH-20} L 42 8 Z`} />
        </clipPath>
      </defs>
      {liquidFill > 0 && <>
        <rect x="12" y={liquidY} width="30" height={liquidH} fill={color} clipPath="url(#ttc)" opacity="0.88" />
        <rect x="12" y={liquidY} width="30" height="3" fill="rgba(255,255,255,0.22)" clipPath="url(#ttc)" />
      </>}
      {bubbleParticles.map(p => <circle key={p.id} cx={p.x} cy={p.y} r={p.r} fill={`${color}70`} opacity={p.o} />)}
      <path d={`M 12 6 L 12 ${TH-20} Q 12 ${TH-3} 27 ${TH-3} Q 42 ${TH-3} 42 ${TH-20} L 42 6`}
        fill="rgba(200,230,255,0.04)" stroke="rgba(168,212,240,0.7)" strokeWidth="2" />
      <line x1="16" y1="10" x2="16" y2={TH-22} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="10" x2="20" y2={TH-24} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" />
      {[0.25,0.5,0.75].map(f => {
        const y = TH - 18 - f*(TH-36)
        return <line key={f} x1="40" y1={y} x2="46" y2={y} stroke="rgba(168,212,240,0.4)" strokeWidth="1" />
      })}
      <rect x="10" y="4" width="34" height="4" rx="2" fill="rgba(168,212,240,0.25)" stroke="rgba(168,212,240,0.55)" strokeWidth="1" />
    </svg>
  )
}

function TempGauge({ tempC }) {
  const fill = Math.min(1, Math.max(0, (tempC - 20) / 70))
  const mercH = fill * 74
  const col = tempC < 40 ? '#3498db' : tempC < 60 ? '#f39c12' : '#e74c3c'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>{Math.round(tempC)}°C</div>
      <svg width="18" height="100" viewBox="0 0 18 100">
        <circle cx="9" cy="92" r="7" fill={col} opacity="0.9" />
        <rect x="6" y="12" width="6" height="78" rx="3" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1" />
        <rect x="7" y={12+(74-mercH)} width="4" height={mercH} fill={col} rx="2" opacity="0.9" />
      </svg>
    </div>
  )
}

// ── Reagent Shelf ─────────────────────────────────────────────────────────
function ReagentShelf({ onStart, onBack }) {
  const [acid, setAcid] = useState(null)
  const [base, setBase] = useState(null)
  const [conc, setConc] = useState('0.5M')
  const [indicator, setIndicator] = useState('phenolphthalein')
  const rxn = acid && base ? getRxn(acid.id, base.id) : null

  return (
    <div style={{ minHeight:'100vh', background:'#0d0d1a', overflowY:'auto', paddingBottom:32 }}>
      <div style={{ padding:'16px 20px 8px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:22, padding:4, fontFamily:'inherit' }}>←</button>
        <div>
          <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Chemistry</div>
          <div style={{ fontSize:17, fontWeight:700 }}>Select Your Reagents</div>
        </div>
      </div>

      {/* Acids */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#e74c3c', marginBottom:10 }}>⚗ Acids</div>
        <div style={{ display:'flex', gap:10 }}>
          {Object.values(ACIDS).map(a => (
            <motion.div key={a.id} whileTap={{ scale:0.94 }} onClick={() => setAcid(a)} style={{
              flex:'1', padding:'12px 8px', borderRadius:16, cursor:'pointer', textAlign:'center',
              background: acid?.id===a.id ? `rgba(${hexToRgb(a.color)},0.12)` : 'rgba(255,255,255,0.04)',
              border:`2px solid ${acid?.id===a.id ? a.color : 'rgba(255,255,255,0.08)'}`,
            }}>
              <BottleSVG reagent={a} size={60} />
              <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:a.color }}>{a.sym}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:2, lineHeight:1.3 }}>{a.full}</div>
              {a.waterFirst && <div style={{ marginTop:4, fontSize:8, color:'#f39c12' }}>⚠ Dilute first</div>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bases */}
      <div style={{ padding:'0 20px 14px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#3498db', marginBottom:10 }}>🧪 Bases</div>
        <div style={{ display:'flex', gap:10 }}>
          {Object.values(BASES).map(b => (
            <motion.div key={b.id} whileTap={{ scale:0.94 }} onClick={() => setBase(b)} style={{
              flex:'1', padding:'12px 8px', borderRadius:16, cursor:'pointer', textAlign:'center',
              background: base?.id===b.id ? `rgba(${hexToRgb(b.color)},0.12)` : 'rgba(255,255,255,0.04)',
              border:`2px solid ${base?.id===b.id ? b.color : 'rgba(255,255,255,0.08)'}`,
            }}>
              <BottleSVG reagent={b} size={60} />
              <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:b.color }}>{b.sym}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:2, lineHeight:1.3 }}>{b.full}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Water */}
      <div style={{ padding:'0 20px 14px', display:'flex', alignItems:'center', gap:14 }}>
        <WaterBottleSVG size={50} />
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'#7fb3c8' }}>H₂O — Distilled Water</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.4 }}>
            {acid?.waterFirst ? 'Required first step for H₂SO₄ (safety rule)' : 'Available for dilution'}
          </div>
        </div>
      </div>

      {/* Concentration + Indicator */}
      <div style={{ padding:'0 20px 14px', display:'flex', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Concentration</div>
          <div style={{ display:'flex', gap:5 }}>
            {['0.1M','0.5M','1M'].map(c => (
              <button key={c} onClick={() => setConc(c)} style={{
                flex:1, padding:'8px 0', borderRadius:10, fontFamily:'inherit', cursor:'pointer',
                border:`1.5px solid ${conc===c ? '#6b4fff' : 'rgba(255,255,255,0.1)'}`,
                background: conc===c ? 'rgba(107,79,255,0.2)' : 'rgba(255,255,255,0.04)',
                color: conc===c ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontSize:12, fontWeight:600,
              }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Indicator</div>
          <div style={{ display:'flex', gap:5 }}>
            {[{id:'phenolphthalein',label:'Phenol.'},{id:'litmus',label:'Litmus'}].map(ind => (
              <button key={ind.id} onClick={() => setIndicator(ind.id)} style={{
                flex:1, padding:'8px 4px', borderRadius:10, fontFamily:'inherit', cursor:'pointer',
                border:`1.5px solid ${indicator===ind.id ? '#6b4fff' : 'rgba(255,255,255,0.1)'}`,
                background: indicator===ind.id ? 'rgba(107,79,255,0.2)' : 'rgba(255,255,255,0.04)',
                color: indicator===ind.id ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600,
              }}>{ind.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Reaction preview */}
      <AnimatePresence>
        {rxn && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            style={{ margin:'0 20px 14px', padding:'12px 16px', borderRadius:14, background:'rgba(107,79,255,0.08)', border:'1px solid rgba(107,79,255,0.2)' }}>
            <div style={{ fontSize:11, color:'#a78bfa', marginBottom:4 }}>Predicted reaction</div>
            <div style={{ fontSize:13, fontWeight:600 }}>{rxn.eq}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:3 }}>Product: {rxn.name}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding:'0 20px' }}>
        <motion.button whileTap={{ scale:0.97 }}
          onClick={() => acid && base && onStart({ acid, base, conc, indicator })}
          style={{
            width:'100%', padding:'16px 0', borderRadius:14, border:'none', fontFamily:'inherit',
            background: acid && base ? 'linear-gradient(135deg,#6b4fff,#8b5cf6)' : 'rgba(255,255,255,0.06)',
            color: acid && base ? 'white' : 'rgba(255,255,255,0.3)',
            fontSize:16, fontWeight:700, cursor: acid && base ? 'pointer' : 'default',
            boxShadow: acid && base ? '0 4px 24px rgba(107,79,255,0.4)' : 'none',
          }}>
          {acid && base ? 'Start Experiment →' : 'Select one acid and one base'}
        </motion.button>
      </div>
    </div>
  )
}

// ── Lab Experiment ────────────────────────────────────────────────────────
const WARNINGS = {
  waterOnAcid: '⚠️ DANGER! Never add water to concentrated H₂SO₄ — the reaction is violently exothermic and can cause spattering. Always add acid to water slowly.',
  baseBeforeAcid: '⚠️ Add the acid first, then the base. This is standard titration procedure.',
  violentShake: '⚠️ Careful! Vigorous mixing with strong acids can cause splashing. Mix gently.',
  overshoot: '⚠️ You\'ve added too much base! The solution is now strongly alkaline. In a real lab you\'d need to start over or back-titrate.',
}

function LabExperiment({ acid, base, conc, indicator, studentName, onComplete, onBack }) {
  const rxn = getRxn(acid.id, base.id)
  const startPH = acid.startPH[conc]

  const initialSubstep = acid.waterFirst ? 'waterFirst' : 'addAcid'
  const [substep, setSubstep] = useState(initialSubstep)
  const [waterFill, setWaterFill] = useState(0)
  const [acidFill, setAcidFill] = useState(0)
  const [baseFill, setBaseFill] = useState(0)
  const [hasIndicator, setHasIndicator] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)
  const [warnings, setWarnings] = useState([])
  const [neutralized, setNeutralized] = useState(false)
  const [flashWhite, setFlashWhite] = useState(false)
  const [confetti, setConfetti] = useState([])
  const [bubbleParticles, setBubbleParticles] = useState([])
  const [slider, setSlider] = useState(0)
  const [startTime] = useState(Date.now())
  const [pHHistory, setPHHistory] = useState([startPH])
  const [triggeredWarnings, setTriggeredWarnings] = useState([])

  const neutralizedRef = useRef(false)
  const warnedRef = useRef(new Set())
  const { gamma, magnitude, isPouring, isShaking, isSteady, sensorActive } = useSensors()
  const { settings: { switchAccess, deafHoH, colorblind }, triggerAlert } = useAccessibility()

  // iOS permission gate (shown once, before experiment)
  const needsPermission = typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  const [permissionGranted, setPermissionGranted] = useState(!needsPermission)

  // Pour haptics interval ref
  const pourHapticRef2 = useRef(null)

  // Switch Access: POUR button hold state
  const [isPouringBtn, setIsPouringBtn] = useState(false)
  const [scanIdx, setScanIdx] = useState(0)
  const substepRef = useRef(substep)
  useEffect(() => { substepRef.current = substep }, [substep])

  // Reading-taken toast (hold still)
  const [readingTaken, setReadingTaken] = useState(false)
  const [readingToast, setReadingToast] = useState(false)

  // Desktop fallback toast (show once)
  const [desktopToast, setDesktopToast] = useState(false)
  const desktopToastShown = useRef(false)

  const totalFill = waterFill * 0.2 + acidFill * 0.38 + baseFill * 0.32
  const ph = (substep === 'addBase' || substep === 'neutralized') ? calcPH(startPH, baseFill)
           : acidFill > 0 ? startPH : null
  const tempC = 25 + (rxn.hot ? (acid.id === 'H2SO4' ? 55 : 25) : 8) * Math.min(1, baseFill * 2.2)
  const liqColor = ph !== null ? indicatorColor(indicator, ph, hasIndicator) : 'rgba(180,220,255,0.2)'

  // Pour rate: real sensor (gamma) OR desktop slider fallback
  const absGamma = Math.abs(gamma)
  const pourRate = sensorActive
    ? (isPouring ? Math.max(0, (absGamma - 25) / 65) * 0.012 : 0)
    : slider * 0.003

  // Pour stream visual dimensions
  const streamWidth = sensorActive
    ? Math.max(3, Math.min(14, absGamma - 25))
    : Math.max(3, Math.min(14, slider / 6))
  const streamColor = substep === 'addBase' ? base.color
    : substep === 'waterFirst' ? '#7ec8e3'
    : acid.color

  const addWarning = useCallback((key, text) => {
    if (warnedRef.current.has(key)) return
    warnedRef.current.add(key)
    const id = Date.now()
    setWarnings(prev => [...prev.slice(-2), { id, text }])
    setTriggeredWarnings(prev => [...prev, text])
    triggerAlert('warning', '⚠️ Safety Warning!')
    setTimeout(() => setWarnings(prev => prev.filter(w => w.id !== id)), 7000)
  }, [triggerAlert])

  useEffect(() => {
    if (pourRate <= 0) return
    if (substep === 'waterFirst') {
      setWaterFill(prev => {
        const next = Math.min(1, prev + pourRate)
        if (next >= 0.75) setTimeout(() => setSubstep('addAcid'), 0)
        return next
      })
    } else if (substep === 'addAcid') {
      setAcidFill(prev => {
        const next = Math.min(1, prev + pourRate)
        if (next >= 0.72) setTimeout(() => setSubstep('addIndicator'), 0)
        return next
      })
      setPHHistory(h => [...h.slice(-100), startPH])
    } else if (substep === 'addBase') {
      setBaseFill(prev => Math.min(1, prev + pourRate * 0.75))
    }
  }, [pourRate, substep, startPH])

  // pH history + neutralization + overshoot
  useEffect(() => {
    if (ph === null) return
    setPHHistory(h => [...h.slice(-100), ph])
    if (ph >= 6.8 && ph <= 7.5 && !neutralizedRef.current) {
      neutralizedRef.current = true
      setNeutralized(true)
      setSubstep('neutralized')
      setFlashWhite(true)
      triggerAlert('success', '⚗️ Neutralized!')
      haptics.achievement()
      setConfetti(Array.from({ length: 38 }, (_, i) => ({
        id: i, x: 15 + Math.random() * 70, y: 15 + Math.random() * 40,
        color: ['#2ecc71','#f1c40f','#6b4fff','#fff','#3498db'][i % 5],
        angle: Math.random() * 360, scale: 0.5 + Math.random() * 1,
      })))
      setTimeout(() => { setFlashWhite(false); setConfetti([]) }, 3000)
    }
    if (ph > 10 && substep === 'addBase') addWarning('overshoot', WARNINGS.overshoot)
  }, [ph, substep, addWarning])

  // Shake — fires once per gesture (isShaking pulses true→false)
  useEffect(() => {
    if (!isShaking) return
    setShakeCount(c => c + 1)
    haptics.shake()
    if (acid.id === 'H2SO4') addWarning('violentShake', WARNINGS.violentShake)
  }, [isShaking, acid.id, addWarning])

  // Continuous pour haptics (every 300 ms while isPouring on real sensor)
  useEffect(() => {
    if (isPouring && sensorActive && (substep === 'waterFirst' || substep === 'addAcid' || substep === 'addBase')) {
      pourHapticRef2.current = setInterval(() => haptics.pour(), 300)
    } else {
      clearInterval(pourHapticRef2.current)
    }
    return () => clearInterval(pourHapticRef2.current)
  }, [isPouring, sensorActive, substep])

  // "Hold still" reading toast — fires once when phone steady during addBase
  useEffect(() => {
    if (!isSteady || !sensorActive || substep !== 'addBase' || readingTaken) return
    setReadingTaken(true)
    haptics.tap()
    setReadingToast(true)
    setTimeout(() => setReadingToast(false), 2500)
  }, [isSteady, sensorActive, substep, readingTaken])

  // Desktop fallback toast — show once
  useEffect(() => {
    if (sensorActive === false && !desktopToastShown.current) {
      desktopToastShown.current = true
      setDesktopToast(true)
      setTimeout(() => setDesktopToast(false), 4000)
    }
  }, [sensorActive])

  // Switch Access: hold-to-pour interval
  useEffect(() => {
    if (!isPouringBtn || !switchAccess) return
    const RATE = 0.018
    const id = setInterval(() => {
      const s = substepRef.current
      if (s === 'waterFirst') {
        setWaterFill(prev => { const n = Math.min(1, prev + RATE); if (n >= 0.75) setTimeout(() => setSubstep('addAcid'), 0); return n })
      } else if (s === 'addAcid') {
        setAcidFill(prev => { const n = Math.min(1, prev + RATE); if (n >= 0.72) setTimeout(() => setSubstep('addIndicator'), 0); return n })
        setPHHistory(h => [...h.slice(-100), startPH])
      } else if (s === 'addBase') {
        setBaseFill(prev => Math.min(1, prev + RATE * 0.75))
      }
    }, 80)
    return () => clearInterval(id)
  }, [isPouringBtn, switchAccess, startPH])

  // Switch Access: scanning highlight cycle
  useEffect(() => {
    if (!switchAccess) return
    const count = substep === 'addBase' ? 2 : 1
    const id = setInterval(() => setScanIdx(i => (i + 1) % count), 2000)
    return () => clearInterval(id)
  }, [switchAccess, substep])

  const doShake = useCallback(() => {
    setShakeCount(c => c + 1)
    if (acid.id === 'H2SO4') addWarning('violentShake', WARNINGS.violentShake)
  }, [acid.id, addWarning])

  // Safety: trying to pour water after acid already in tube (H2SO4 scenario)
  const handleWaterOnAcid = () => {
    if (acid.id === 'H2SO4' && acidFill > 0) {
      addWarning('waterOnAcid', WARNINGS.waterOnAcid)
    }
  }

  // Bubbles
  useEffect(() => {
    if (!rxn.gas || !neutralized) return
    const iv = setInterval(() => {
      setBubbleParticles(prev => {
        const alive = prev.map(p => ({ ...p, y: p.y - 1.8, o: p.o - 0.025 })).filter(p => p.o > 0)
        if (Math.random() > 0.45) alive.push({ id: Math.random(), x: 20 + Math.random() * 14, y: 160, r: 1.5 + Math.random() * 2, o: 0.7 })
        return alive
      })
    }, 110)
    return () => clearInterval(iv)
  }, [neutralized, rxn.gas])

  const handleDropperTap = () => {
    if (substep !== 'addIndicator') return
    setHasIndicator(true)
    setSubstep('addBase')
  }

  const handleComplete = () => onComplete({
    type: 'chemistry',
    startPH,
    finalPH: ph ?? startPH,
    timeSeconds: (Date.now() - startTime) / 1000,
    shakeCount,
    pHHistory,
    acidSym: acid.sym,
    acidFull: acid.full,
    baseSym: base.sym,
    baseFull: base.full,
    concentration: conc,
    indicator,
    productName: rxn.name,
    productFormula: rxn.product,
    equation: rxn.eq,
    funFact: rxn.funFact,
    warningsTriggered: triggeredWarnings,
  })

  const phBarGradient = colorblind
    ? 'linear-gradient(90deg,#e07b00 0%,#f5a623 25%,#f1c40f 40%,#3b82f6 50%,#2563eb 60%,#1e40af 100%)'
    : 'linear-gradient(90deg,#c0392b 0%,#e67e22 25%,#f1c40f 40%,#2ecc71 50%,#27ae60 60%,#2980b9 100%)'

  const steps = [
    ...(acid.waterFirst ? [{ id:'waterFirst', label:'Add Water' }] : []),
    { id:'addAcid', label:'Add Acid' },
    { id:'addIndicator', label:'Indicator' },
    { id:'addBase', label:'Neutralize' },
    { id:'neutralized', label:'Done ✓' },
  ]
  const stepOrder = steps.map(s => s.id)
  const currentStepIdx = stepOrder.indexOf(substep)

  // iOS permission gate
  if (!permissionGranted) {
    return (
      <SensorPermissionScreen
        onGrant={() => setPermissionGranted(true)}
        onSkip={() => setPermissionGranted(true)}
      />
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d0d1a', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto' }}>
      {/* Live sensor debug overlay */}
      <SensorIndicator gamma={gamma} magnitude={magnitude} isPouring={isPouring} isShaking={isShaking} isSteady={isSteady} sensorActive={sensorActive} />

      {/* Hold-still reading toast */}
      <AnimatePresence>
        {readingToast && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ position:'fixed', bottom:120, left:'50%', transform:'translateX(-50%)', zIndex:200,
              background:'rgba(46,204,113,0.95)', color:'white', borderRadius:12, padding:'10px 20px',
              fontSize:14, fontWeight:700, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(46,204,113,0.5)' }}>
            📏 Reading taken ✓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop fallback toast */}
      <AnimatePresence>
        {desktopToast && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ position:'fixed', bottom:120, left:'50%', transform:'translateX(-50%)', zIndex:200,
              background:'rgba(107,79,255,0.92)', color:'white', borderRadius:12, padding:'10px 20px',
              fontSize:13, fontWeight:600, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(107,79,255,0.5)' }}>
            📱 Use phone for full experience
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flashWhite && (
          <motion.div initial={{ opacity:0.85 }} animate={{ opacity:0 }} exit={{ opacity:0 }} transition={{ duration:1.8 }}
            style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.45)', zIndex:50, pointerEvents:'none' }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confetti.map(c => (
          <motion.div key={c.id}
            initial={{ x:`${c.x}vw`, y:`${c.y}vh`, opacity:1, scale:c.scale }}
            animate={{ y:`${c.y+55}vh`, opacity:0, rotate:c.angle+360 }}
            exit={{ opacity:0 }} transition={{ duration:2.5, ease:'easeOut' }}
            style={{ position:'fixed', width:8, height:8, background:c.color, borderRadius:2, zIndex:60, pointerEvents:'none' }} />
        ))}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding:'16px 20px 8px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:22, padding:4, fontFamily:'inherit' }}>←</button>
        <div>
          <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Chemistry</div>
          <div style={{ fontSize:15, fontWeight:700 }}>{acid.sym} + {base.sym} → {rxn.product}</div>
        </div>
      </div>

      {/* Warnings */}
      <AnimatePresence>
        {warnings.map(w => (
          <motion.div key={w.id} initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:40 }}
            style={{ margin:'0 16px 6px', padding:'10px 14px', borderRadius:12, background:'rgba(220,38,38,0.15)', border:'1.5px solid rgba(220,38,38,0.5)', fontSize:12, lineHeight:1.5, color:'#fca5a5' }}>
            {w.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Step pills */}
      <div style={{ padding:'0 20px 8px', display:'flex', gap:5, flexWrap:'wrap' }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            padding:'5px 10px', borderRadius:20, fontSize:10, fontWeight:600,
            background: i < currentStepIdx ? 'rgba(107,79,255,0.2)' : i === currentStepIdx ? 'rgba(107,79,255,0.15)' : 'rgba(255,255,255,0.04)',
            border:`1px solid ${i === currentStepIdx ? '#6b4fff' : i < currentStepIdx ? 'rgba(107,79,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: i <= currentStepIdx ? '#a78bfa' : 'rgba(255,255,255,0.3)',
          }}>
            {i < currentStepIdx ? '✓ ' : ''}{s.label}
          </div>
        ))}
      </div>

      {/* Scene */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:16, padding:'0 16px', position:'relative' }}>
        {/* Acid bottle */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <motion.div
            style={sensorActive && (substep === 'addAcid' || substep === 'waterFirst')
              ? { transform: `rotate(${Math.min(gamma, 70)}deg)`, transition: 'transform 0.1s ease' }
              : {}}
            animate={!sensorActive && substep === 'addAcid' ? { rotate:[-4,4,-4] } : sensorActive ? {} : { rotate:0 }}
            transition={{ duration:1.8, repeat: !sensorActive && substep === 'addAcid' ? Infinity : 0 }}>
            <BottleSVG reagent={acid} size={55} />
          </motion.div>
          <div style={{ fontSize:9, color:acid.color, fontWeight:600 }}>{acid.sym}</div>
          {acid.waterFirst && substep !== 'waterFirst' && acidFill > 0 && (
            <motion.button whileTap={{ scale:0.9 }} onClick={handleWaterOnAcid}
              style={{ fontSize:9, padding:'2px 8px', borderRadius:10, border:'1px solid rgba(100,180,255,0.3)', background:'rgba(100,180,255,0.08)', color:'rgba(100,180,255,0.7)', cursor:'pointer', fontFamily:'inherit' }}>
              + H₂O
            </motion.button>
          )}
        </div>

        {/* Center: test tube + gauges */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          {/* Live pour stream — proportional width to tilt angle */}
          <AnimatePresence>
            {pourRate > 0 && (substep === 'waterFirst' || substep === 'addAcid' || substep === 'addBase') && (
              <motion.div key="stream"
                initial={{ scaleY:0, opacity:0 }} animate={{ scaleY:1, opacity:0.82 }}
                exit={{ scaleY:0, opacity:0 }} transition={{ duration:0.1 }}
                style={{ width: streamWidth, height:26,
                  background:`linear-gradient(to bottom,${streamColor},transparent)`,
                  borderRadius:4, transformOrigin:'top', pointerEvents:'none' }} />
            )}
          </AnimatePresence>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
            <TempGauge tempC={tempC} />
            <TestTube liquidFill={Math.min(0.88, totalFill)} color={liqColor} isGlowing={neutralized} bubbleParticles={bubbleParticles} />
            {/* Dropper */}
            <div style={{ width:30, display:'flex', flexDirection:'column', alignItems:'center' }}>
              {substep === 'addIndicator' ? (
                <motion.div whileTap={{ scale:0.88 }} onClick={handleDropperTap} style={{ cursor:'pointer', textAlign:'center' }}>
                  <motion.div animate={{ y:[0,-4,0] }} transition={{ duration:1, repeat:Infinity }}>
                    <svg width="28" height="55" viewBox="0 0 28 55">
                      <rect x="9" y="0" width="10" height="26" rx="4" fill="#a78bfa" opacity="0.9" />
                      <path d="M9 24 L19 24 L16 40 L12 40 Z" fill="#8b5cf6" opacity="0.9" />
                      <ellipse cx="14" cy="44" rx="2.5" ry="3" fill="#a78bfa" opacity="0.8" />
                    </svg>
                  </motion.div>
                  <div style={{ fontSize:8, color:'#a78bfa', marginTop:2 }}>Tap!</div>
                </motion.div>
              ) : <div />}
            </div>
          </div>

          {/* pH pill */}
          {ph !== null && (
            <div style={{ padding:'5px 14px', borderRadius:20, border:`2px solid ${liqColor}`, background:'rgba(0,0,0,0.4)', textAlign:'center' }}>
              <span style={{ fontSize:22, fontWeight:900 }}>{ph.toFixed(1)}</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginLeft:4 }}>pH</span>
            </div>
          )}

          {/* Neutralized */}
          <AnimatePresence>
            {neutralized && (
              <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
                style={{ padding:'8px 14px', borderRadius:12, background:'rgba(46,204,113,0.12)', border:'1px solid rgba(46,204,113,0.45)', textAlign:'center', maxWidth:220 }}>
                <div style={{ color:'#2ecc71', fontWeight:700, fontSize:13 }}>⚗️ Neutralized!</div>
                <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10, marginTop:3, lineHeight:1.4 }}>{rxn.eq}</div>
                <div style={{ color:'#a78bfa', fontSize:11, fontWeight:600, marginTop:5 }}>{rxn.name} formed!</div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10, marginTop:2, lineHeight:1.4 }}>{rxn.funFact}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Base bottle */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <motion.div
            style={sensorActive && substep === 'addBase'
              ? { transform: `rotate(${Math.min(gamma, 70)}deg)`, transition: 'transform 0.1s ease' }
              : {}}
            animate={!sensorActive && substep === 'addBase' ? { rotate:[4,-4,4] } : sensorActive ? {} : { rotate:0 }}
            transition={{ duration:1.8, repeat: !sensorActive && substep === 'addBase' ? Infinity : 0 }}>
            <BottleSVG reagent={base} size={55} />
          </motion.div>
          <div style={{ fontSize:9, color:base.color, fontWeight:600 }}>{base.sym}</div>
        </div>
      </div>

      {/* Instruction */}
      <div data-a11y="instruction" style={{ padding:'4px 20px 6px', textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>
        {substep === 'waterFirst' && '💧 Pour water first — required safety step for H₂SO₄'}
        {substep === 'addAcid' && `⚗️ Tilt to pour ${acid.sym} into the test tube`}
        {substep === 'addIndicator' && `💜 Tap the dropper to add ${indicator === 'phenolphthalein' ? 'phenolphthalein' : 'litmus'} indicator`}
        {substep === 'addBase' && `🔵 Slowly add ${base.sym} — watch the pH rise!`}
        {substep === 'neutralized' && '✅ Perfect neutralization achieved!'}
      </div>

      {/* pH bar */}
      {ph !== null && (
        <div style={{ padding:'0 20px 8px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:9, color:'rgba(255,255,255,0.3)' }}>
            <span>pH 1 Acid</span><span>pH 7 Neutral</span><span>pH 14 Base</span>
          </div>
          <div role="img" aria-label={`pH bar showing current pH ${ph?.toFixed(1)}`} style={{ height:8, borderRadius:8, background:phBarGradient, position:'relative' }}>
            <motion.div
              animate={{ left:`${((ph-1)/13)*100}%` }}
              transition={{ type:'spring', stiffness:200, damping:25 }}
              style={{ position:'absolute', top:'50%', transform:'translate(-50%,-50%)', width:16, height:16, borderRadius:'50%', background:'white', border:'3px solid #0d0d1a', boxShadow:'0 0 8px rgba(255,255,255,0.8)' }} />
          </div>
        </div>
      )}

      {/* Switch Access buttons */}
      {switchAccess && (substep === 'waterFirst' || substep === 'addAcid' || substep === 'addBase') && (
        <div style={{ padding:'0 20px 12px', display:'flex', gap:10 }}>
          <motion.button
            aria-label="Hold to pour liquid"
            onPointerDown={() => setIsPouringBtn(true)}
            onPointerUp={() => setIsPouringBtn(false)}
            onPointerLeave={() => setIsPouringBtn(false)}
            animate={{ scale: isPouringBtn ? 0.95 : 1 }}
            style={{
              flex:1, height:80, borderRadius:16, cursor:'pointer', fontFamily:'inherit',
              border:`2px solid ${scanIdx === 0 ? '#9b59b6' : 'rgba(155,89,182,0.35)'}`,
              background: isPouringBtn ? 'rgba(155,89,182,0.32)' : 'rgba(155,89,182,0.12)',
              color:'white', fontWeight:700,
              outline: scanIdx === 0 ? '3px solid rgba(155,89,182,0.65)' : 'none',
              outlineOffset: 3,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
            }}>
            <span style={{ fontSize:22 }}>💧</span>
            <span style={{ fontSize:16 }}>POUR</span>
            <span style={{ fontSize:10, opacity:0.55 }}>Hold to pour</span>
          </motion.button>
          {substep === 'addBase' && (
            <motion.button
              aria-label="Shake to mix the solution"
              whileTap={{ scale:0.93 }}
              onClick={doShake}
              style={{
                flex:1, height:80, borderRadius:16, cursor:'pointer', fontFamily:'inherit',
                border:`2px solid ${scanIdx === 1 ? '#2980b9' : 'rgba(41,128,185,0.35)'}`,
                background:'rgba(41,128,185,0.12)',
                color:'white', fontWeight:700,
                outline: scanIdx === 1 ? '3px solid rgba(41,128,185,0.65)' : 'none',
                outlineOffset: 3,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
              }}>
              <span style={{ fontSize:22 }}>🔄</span>
              <span style={{ fontSize:16 }}>SHAKE</span>
              <span style={{ fontSize:10, opacity:0.55 }}>Tap to mix</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Desktop fallback controls */}
      {sensorActive === false && !switchAccess && (substep === 'waterFirst' || substep === 'addAcid' || substep === 'addBase') && (
        <div style={{ padding:'0 20px 10px' }}>
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'10px 14px' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:10 }}>
              🖥 Drag up to pour {substep === 'waterFirst' ? 'water' : substep === 'addAcid' ? acid.sym : base.sym}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>▲ more</span>
                <input type="range" min="0" max="60" value={slider}
                  onChange={e => setSlider(Number(e.target.value))}
                  onMouseUp={() => setSlider(0)} onTouchEnd={() => setSlider(0)}
                  orient="vertical"
                  style={{ height:80, width:28, accentColor:'#6b4fff', writingMode:'vertical-lr', direction:'rtl', cursor:'pointer' }} />
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>▼ less</span>
              </div>
              {substep === 'addBase' && (
                <motion.button
                  aria-label="Shake to mix the solution"
                  whileTap={{ scale:0.93 }}
                  onClick={doShake}
                  style={{
                    flex:1, height:80, borderRadius:16, cursor:'pointer', fontFamily:'inherit',
                    border:'2px solid rgba(41,128,185,0.45)',
                    background:'rgba(41,128,185,0.12)',
                    color:'white', fontWeight:700,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                  }}>
                  <span style={{ fontSize:22 }}>🔄</span>
                  <span style={{ fontSize:14 }}>SHAKE</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Report button */}
      <div style={{ padding:'0 20px 32px' }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={handleComplete} style={{
          width:'100%', padding:'15px 0', borderRadius:14, border:'none', fontFamily:'inherit',
          background: neutralized ? 'linear-gradient(135deg,#6b4fff,#8b5cf6)' : 'rgba(255,255,255,0.06)',
          color: neutralized ? 'white' : 'rgba(255,255,255,0.3)',
          fontSize:16, fontWeight:700, cursor: neutralized ? 'pointer' : 'default',
          boxShadow: neutralized ? '0 4px 24px rgba(107,79,255,0.4)' : 'none',
        }}>
          {neutralized ? '🧪 Generate AI Lab Report →' : 'Complete neutralization to generate report'}
        </motion.button>
      </div>
    </div>
  )
}

// ── Orchestrator ──────────────────────────────────────────────────────────
export default function NeutralizationExperiment({ onComplete, onBack, studentName }) {
  const [phase, setPhase] = useState('shelf')
  const [setup, setSetup] = useState(null)

  if (phase === 'shelf') {
    return <ReagentShelf onStart={s => { setSetup(s); setPhase('experiment') }} onBack={onBack} />
  }
  return <LabExperiment {...setup} studentName={studentName} onComplete={onComplete} onBack={() => setPhase('shelf')} />
}
