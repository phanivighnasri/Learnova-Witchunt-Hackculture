import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSensors from '../../hooks/useSensors'
import haptics from '../../utils/haptics'
import audio from '../../utils/audio'
import SensorIndicator from '../SensorIndicator'
import { useAccessibility } from '../../contexts/AccessibilityContext'

// ── Chemistry data ─────────────────────────────────────────────────────────
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
  'HCl+NaOH':     { eq:'HCl + NaOH → NaCl + H₂O',                    product:'NaCl',        name:'Table Salt',        funFact:'Common table salt — essential for life!',        hot:true,  gas:false },
  'H2SO4+NaOH':   { eq:'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',             product:'Na₂SO₄',      name:'Sodium Sulphate',   funFact:'Used in detergents and paper manufacturing.',   hot:true,  gas:false },
  'HCl+CaOH2':    { eq:'2HCl + Ca(OH)₂ → CaCl₂ + 2H₂O',             product:'CaCl₂',       name:'Calcium Chloride',  funFact:'Used as road salt and food firming agent.',     hot:true,  gas:false },
  'CH3COOH+NaOH': { eq:'CH₃COOH + NaOH → CH₃COONa + H₂O',           product:'CH₃COONa',    name:'Sodium Acetate',    funFact:'This is used in hand warmers! ✋🔥',            hot:false, gas:false },
  'H2SO4+CaOH2':  { eq:'H₂SO₄ + Ca(OH)₂ → CaSO₄ + 2H₂O',            product:'CaSO₄',       name:'Gypsum',            funFact:'This makes plaster of Paris! 🏛️',            hot:true,  gas:false },
  'HCl+NH4OH':    { eq:'NH₄OH + HCl → NH₄Cl + H₂O',                  product:'NH₄Cl',       name:'Ammonium Chloride', funFact:'Used in fertilizers! 🌱',                      hot:false, gas:true  },
  'H2SO4+NH4OH':  { eq:'H₂SO₄ + 2NH₄OH → (NH₄)₂SO₄ + 2H₂O',         product:'(NH₄)₂SO₄',  name:'Ammonium Sulphate', funFact:'Nitrogen-rich fertilizer used worldwide! 🌾',   hot:false, gas:true  },
  'CH3COOH+CaOH2':{ eq:'2CH₃COOH + Ca(OH)₂ → Ca(CH₃COO)₂ + 2H₂O', product:'Ca(CH₃COO)₂', name:'Calcium Acetate',   funFact:'Used as food additive and acidity regulator.',  hot:false, gas:false },
  'CH3COOH+NH4OH':{ eq:'CH₃COOH + NH₄OH → CH₃COONH₄ + H₂O',         product:'CH₃COONH₄',  name:'Ammonium Acetate',  funFact:'Used in analytical chemistry and food science.', hot:false, gas:false },
}
const getRxn = (a, b) => REACTIONS[`${a}+${b}`] || { eq:`${a} + ${b} → Salt + H₂O`, product:'Salt', name:'Salt', funFact:'Acids and bases always form a salt and water.', hot:false, gas:false }

// ── Helpers ────────────────────────────────────────────────────────────────
function calcPH(startPH, baseFill) {
  if (baseFill <= 0) return startPH
  if (baseFill < 0.55) return startPH + (6.4 - startPH) * (baseFill / 0.55)
  if (baseFill < 0.62) return 6.4 + ((baseFill - 0.55) / 0.07) * 1.2
  return 7.6 + (12.0 - 7.6) * Math.min(1, (baseFill - 0.62) / 0.38)
}
function indicatorColor(indicator, ph, active) {
  if (!active) return 'rgba(180,220,255,0.25)'
  if (indicator === 'phenolphthalein') {
    if (ph < 8.2) return 'rgba(180,220,255,0.25)'
    const t = Math.min(1, (ph - 8.2) / 3.8)
    return `rgba(255,${Math.round(20+(1-t)*130)},${Math.round((1-t)*150)},${0.45+t*0.4})`
  }
  return ph <= 7 ? 'rgba(210,50,60,0.65)' : 'rgba(50,100,210,0.65)'
}
function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}
function phOrbColor(ph) {
  if (ph === null) return '#444'
  if (ph < 4)   return '#ef4444'
  if (ph < 5)   return '#f97316'
  if (ph < 6)   return '#eab308'
  if (ph < 6.5) return '#84cc16'
  return '#22c55e'
}

// ── SVG Components ─────────────────────────────────────────────────────────
function BottleSVG({ reagent, size = 70 }) {
  const { color, dark, id } = reagent
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 70 105">
      <defs>
        <linearGradient id={`bl-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={dark}/><stop offset="50%" stopColor={color}/><stop offset="100%" stopColor={dark}/>
        </linearGradient>
        <clipPath id={`bc-${id}`}><rect x="15" y="32" width="40" height="62" rx="4"/></clipPath>
      </defs>
      <rect x="15" y="32" width="40" height="62" rx="4" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5"/>
      <rect x="16" y="50" width="38" height="43" fill={`url(#bl-${id})`} clipPath={`url(#bc-${id})`} opacity="0.85"/>
      <rect x="19" y="51" width="5" height="40" fill="rgba(255,255,255,0.15)" rx="2"/>
      <rect x="27" y="18" width="16" height="16" rx="2" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5"/>
      <rect x="24" y="12" width="22" height="8" rx="3" fill={color} opacity="0.9"/>
      <rect x="17" y="60" width="36" height="24" rx="3" fill={dark} opacity="0.92"/>
      <text x="35" y="73" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="700" fontFamily="Inter,sans-serif">{reagent.sym}</text>
      <text x="35" y="81" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="5.5" fontFamily="Inter,sans-serif">
        {reagent.full.length > 16 ? reagent.full.slice(0,14)+'…' : reagent.full}
      </text>
    </svg>
  )
}
function WaterBottleSVG({ size = 60 }) {
  return (
    <svg width={size} height={size*1.4} viewBox="0 0 60 84">
      <defs><clipPath id="wbc"><rect x="12" y="24" width="36" height="52" rx="4"/></clipPath></defs>
      <rect x="12" y="24" width="36" height="52" rx="4" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5"/>
      <rect x="13" y="36" width="34" height="39" fill="rgba(100,200,255,0.3)" clipPath="url(#wbc)"/>
      <rect x="16" y="37" width="4" height="36" fill="rgba(255,255,255,0.15)" rx="2"/>
      <rect x="22" y="13" width="16" height="13" rx="2" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1.5"/>
      <rect x="19" y="8" width="22" height="7" rx="3" fill="#7fb3c8" opacity="0.9"/>
      <rect x="14" y="46" width="32" height="20" rx="3" fill="rgba(100,180,220,0.35)"/>
      <text x="30" y="57" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700" fontFamily="Inter,sans-serif">H₂O</text>
      <text x="30" y="64" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="5" fontFamily="Inter,sans-serif">Distilled</text>
    </svg>
  )
}
function TestTube({ fill, color, isGlowing, bubbles }) {
  const TW = 44, TH = 210
  const liquidH = Math.max(0, fill) * (TH - 40)
  const liquidY = TH - 20 - liquidH
  return (
    <svg width={TW+24} height={TH} viewBox={`0 0 ${TW+24} ${TH}`}
      style={{ filter: isGlowing ? 'drop-shadow(0 0 22px rgba(34,197,94,0.9))' : 'drop-shadow(0 0 8px rgba(0,0,0,0.6))' }}>
      <defs>
        <clipPath id="ttc2">
          <path d={`M 10 8 L 10 ${TH-18} Q 10 ${TH-4} ${10+TW/2} ${TH-4} Q ${10+TW} ${TH-4} ${10+TW} ${TH-18} L ${10+TW} 8 Z`}/>
        </clipPath>
      </defs>
      {fill > 0 && <>
        <rect x="10" y={liquidY} width={TW} height={liquidH} fill={color} clipPath="url(#ttc2)" opacity="0.88"/>
        {/* Surface shimmer */}
        <ellipse cx={10+TW/2} cy={liquidY} rx={TW/2-3} ry="4" fill="rgba(255,255,255,0.25)" clipPath="url(#ttc2)"/>
      </>}
      {/* Bubble particles */}
      {bubbles.map(b => <circle key={b.id} cx={12+b.x} cy={b.y} r={b.r} fill={`${color}88`} opacity={b.o}/>)}
      {/* Glass walls */}
      <path d={`M 10 6 L 10 ${TH-18} Q 10 ${TH-3} ${10+TW/2} ${TH-3} Q ${10+TW} ${TH-3} ${10+TW} ${TH-18} L ${10+TW} 6`}
        fill="rgba(200,230,255,0.04)" stroke="rgba(168,212,240,0.75)" strokeWidth="2"/>
      {/* Left sheen */}
      <rect x="13" y="10" width="6" height={TH-30} fill="rgba(255,255,255,0.2)" rx="3"/>
      {/* Measurement lines */}
      {[0.25,0.5,0.75].map(f => {
        const y = TH-20-f*(TH-40)
        const ml = (f*5).toFixed(0)
        return <g key={f}>
          <line x1={10+TW} y1={y} x2={10+TW+7} y2={y} stroke="rgba(168,212,240,0.5)" strokeWidth="1"/>
          <text x={10+TW+9} y={y+3} fill="rgba(168,212,240,0.45)" fontSize="6" fontFamily="monospace">{ml}mL</text>
        </g>
      })}
      {/* Neck rim */}
      <rect x="16" y="0" width={TW-12} height="9" rx="3" fill="rgba(168,212,240,0.18)" stroke="rgba(168,212,240,0.55)" strokeWidth="1.5"/>
    </svg>
  )
}
function TempGauge({ tempC }) {
  const fill = Math.min(1, Math.max(0, (tempC-20)/70))
  const mercH = fill * 74
  const col = tempC < 40 ? '#3498db' : tempC < 60 ? '#f39c12' : '#e74c3c'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', fontFamily:'monospace' }}>{Math.round(tempC)}°C</div>
      <svg width="18" height="100" viewBox="0 0 18 100">
        <circle cx="9" cy="92" r="7" fill={col} opacity="0.9"/>
        <rect x="6" y="12" width="6" height="78" rx="3" fill="rgba(200,230,255,0.07)" stroke="rgba(168,212,240,0.45)" strokeWidth="1"/>
        <rect x="7" y={12+(74-mercH)} width="4" height={mercH} fill={col} rx="2" opacity="0.9"/>
      </svg>
    </div>
  )
}

// ── Reagent Shelf ──────────────────────────────────────────────────────────
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
          <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Chemistry Lab</div>
          <div style={{ fontSize:17, fontWeight:700 }}>Select Your Reagents</div>
        </div>
      </div>
      <div style={{ padding:'4px 20px 14px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#e74c3c', marginBottom:10 }}>⚗ Acids</div>
        <div style={{ display:'flex', gap:10 }}>
          {Object.values(ACIDS).map(a => (
            <motion.div key={a.id} whileTap={{ scale:0.94 }} onClick={() => { haptics.tap(); setAcid(a) }} style={{
              flex:'1', padding:'12px 8px', borderRadius:16, cursor:'pointer', textAlign:'center',
              background: acid?.id===a.id ? `rgba(${hexToRgb(a.color)},0.12)` : 'rgba(255,255,255,0.04)',
              border:`2px solid ${acid?.id===a.id ? a.color : 'rgba(255,255,255,0.08)'}`,
            }}>
              <BottleSVG reagent={a} size={60}/>
              <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:a.color }}>{a.sym}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:2, lineHeight:1.3 }}>{a.full}</div>
              {a.waterFirst && <div style={{ marginTop:4, fontSize:8, color:'#f39c12' }}>⚠ Dilute first</div>}
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{ padding:'0 20px 14px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#3498db', marginBottom:10 }}>🧪 Bases</div>
        <div style={{ display:'flex', gap:10 }}>
          {Object.values(BASES).map(b => (
            <motion.div key={b.id} whileTap={{ scale:0.94 }} onClick={() => { haptics.tap(); setBase(b) }} style={{
              flex:'1', padding:'12px 8px', borderRadius:16, cursor:'pointer', textAlign:'center',
              background: base?.id===b.id ? `rgba(${hexToRgb(b.color)},0.12)` : 'rgba(255,255,255,0.04)',
              border:`2px solid ${base?.id===b.id ? b.color : 'rgba(255,255,255,0.08)'}`,
            }}>
              <BottleSVG reagent={b} size={60}/>
              <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:b.color }}>{b.sym}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:2, lineHeight:1.3 }}>{b.full}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{ padding:'0 20px 14px', display:'flex', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Concentration</div>
          <div style={{ display:'flex', gap:5 }}>
            {['0.1M','0.5M','1M'].map(c => (
              <button key={c} onClick={() => { haptics.tap(); setConc(c) }} style={{
                flex:1, padding:'8px 0', borderRadius:10, fontFamily:'inherit', cursor:'pointer',
                border:`1.5px solid ${conc===c?'#6b4fff':'rgba(255,255,255,0.1)'}`,
                background: conc===c?'rgba(107,79,255,0.2)':'rgba(255,255,255,0.04)',
                color: conc===c?'#a78bfa':'rgba(255,255,255,0.4)', fontSize:12, fontWeight:600,
              }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Indicator</div>
          <div style={{ display:'flex', gap:5 }}>
            {[{id:'phenolphthalein',label:'Phenol.'},{id:'litmus',label:'Litmus'}].map(ind => (
              <button key={ind.id} onClick={() => { haptics.tap(); setIndicator(ind.id) }} style={{
                flex:1, padding:'8px 4px', borderRadius:10, fontFamily:'inherit', cursor:'pointer',
                border:`1.5px solid ${indicator===ind.id?'#6b4fff':'rgba(255,255,255,0.1)'}`,
                background: indicator===ind.id?'rgba(107,79,255,0.2)':'rgba(255,255,255,0.04)',
                color: indicator===ind.id?'#a78bfa':'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600,
              }}>{ind.label}</button>
            ))}
          </div>
        </div>
      </div>
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
          onClick={() => { if (acid && base) { haptics.tap(); onStart({ acid, base, conc, indicator }) } }}
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

// ── Lab Experiment — complete physical interaction rebuild ──────────────────
function LabExperiment({ acid, base, conc, indicator, studentName, onComplete, onBack }) {
  const rxn = getRxn(acid.id, base.id)
  const startPH = acid.startPH[conc]

  // ── Step flow ──
  const [substep, setSubstep] = useState(acid.waterFirst ? 'waterFirst' : 'pourAcid')
  // 'waterFirst' | 'pourAcid' | 'addIndicator' | 'pourBase' | 'neutralized'

  // ── Fill levels (0–1) ──
  const [waterFill, setWaterFill] = useState(0)
  const [acidFill, setAcidFill] = useState(0)
  const [baseFill, setBaseFill] = useState(0)

  // ── Physical interaction state ──
  const [heldBottle, setHeldBottle] = useState(null) // null | 'water' | 'acid' | 'base'
  const [simGamma, setSimGamma] = useState(0)         // drag fallback gamma
  const dragStartX = useRef(null)

  // ── Indicator ──
  const [indicatorDrops, setIndicatorDrops] = useState(0)
  const [fallingDrops, setFallingDrops] = useState([]) // {id, x}

  // ── Mixing ──
  const [mixBoost, setMixBoost] = useState(1) // increases with each shake
  const mixBoostRef = useRef(1)
  useEffect(() => { mixBoostRef.current = mixBoost }, [mixBoost])

  // ── Shake / bubbles / temp ──
  const [bubbleParticles, setBubbleParticles] = useState([])
  const [tubeShaking, setTubeShaking] = useState(false)
  const [tempC, setTempC] = useState(25)
  const lastShakeRef = useRef(0)

  // ── Neutralization ──
  const [neutralized, setNeutralized] = useState(false)
  const neutralizedRef = useRef(false)
  const [flashWhite, setFlashWhite] = useState(false)
  const [flashGreen, setFlashGreen] = useState(false)
  const [confetti, setConfetti] = useState([])
  const completedRef = useRef(false)

  // ── Warnings & toasts ──
  const [warnings, setWarnings] = useState([])   // {id, text, color}
  const [toasts, setToasts] = useState([])       // {id, text}
  const warnedRef = useRef(new Set())
  const fastPourTimerRef = useRef(null)

  // ── Refs for the always-running pour interval ──
  const heldRef = useRef(null)
  const substepRef = useRef(substep)
  const gammaRef = useRef(0)
  useEffect(() => { substepRef.current = substep }, [substep])
  useEffect(() => { heldRef.current = heldBottle }, [heldBottle])

  // ── Accessibility ──
  const { settings: { colorblind }, triggerAlert } = useAccessibility()

  // ── Sensors ──
  const sensorData = useSensors()
  const { gamma: realGamma, isShaking, isSteady, isActive, magnitude } = sensorData

  // When no sensors: simGamma is driven by touch drag
  const effectiveGamma = isActive ? realGamma : simGamma
  useEffect(() => { gammaRef.current = effectiveGamma }, [effectiveGamma])

  // ── Derived pour state ──
  // Acid/water on LEFT → tilt LEFT (gamma < -20) to pour
  // Base on RIGHT → tilt RIGHT (gamma > 20) to pour
  const leftBottleName = substep === 'waterFirst' ? 'water' : 'acid'
  const leftActive = heldBottle === leftBottleName && effectiveGamma < -20 &&
    (substep === 'waterFirst' || substep === 'pourAcid')
  const rightActive = heldBottle === 'base' && effectiveGamma > 20 && substep === 'pourBase'

  const leftPourRate  = leftActive  ? Math.min((Math.abs(effectiveGamma) - 20) / 50, 1) : 0
  const rightPourRate = rightActive ? Math.min((effectiveGamma - 20) / 50, 1) : 0
  const isActivelyPouring = leftActive || rightActive
  const currentPourRate = leftPourRate || rightPourRate

  // Bottle rotation: gamma * 1.2, clamped ±85°, pivots from bottom
  const leftRotation  = (heldBottle === 'acid' || heldBottle === 'water')
    ? Math.max(Math.min(effectiveGamma * 1.2, 85), -85) : 0
  const rightRotation = heldBottle === 'base'
    ? Math.max(Math.min(effectiveGamma * 1.2, 85), -85) : 0

  // ── pH ──
  const effectiveBaseFill = Math.min(1, baseFill * (1 + (mixBoostRef.current - 1) * 0.25))
  const ph = (substep === 'pourBase' || substep === 'neutralized')
    ? calcPH(startPH, effectiveBaseFill)
    : acidFill > 0 ? startPH : null

  // ── Tube visual ──
  const tubeFill = Math.min(0.9, waterFill * 0.15 + acidFill * 0.38 + baseFill * 0.32)
  const liqColor = ph !== null
    ? indicatorColor(indicator, ph, indicatorDrops >= 3)
    : substep === 'waterFirst' ? 'rgba(100,200,255,0.35)' : 'rgba(180,220,255,0.2)'
  const orbColor = phOrbColor(ph)

  // ── Ambient glow behind tube matches pH ──
  const tubeGlow = neutralized ? '0 0 48px rgba(34,197,94,0.7)' :
    ph !== null && ph >= 6 ? `0 0 32px ${orbColor}55` : 'none'

  // ── Warning helper ──
  const addWarning = useCallback((key, text, color = '#dc2626') => {
    if (warnedRef.current.has(key)) return
    warnedRef.current.add(key)
    const id = Date.now()
    setWarnings(prev => [...prev.slice(-2), { id, text, color }])
    setTimeout(() => setWarnings(prev => prev.filter(w => w.id !== id)), 3500)
    if (key === 'tooMuchAcid') {
      // Force stop pour
      setHeldBottle(null); heldRef.current = null
      try { navigator.vibrate?.([200,100,200]) } catch(_) {}
    } else if (key === 'wrongOrder') {
      try { navigator.vibrate?.([300]) } catch(_) {}
    } else {
      try { navigator.vibrate?.([150,50,150]) } catch(_) {}
    }
    triggerAlert('warning', '⚠️ Safety Warning!')
  }, [triggerAlert])

  const addToast = useCallback((text) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-2), { id, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  // ── Main pour interval — runs once, reads refs ─────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const held = heldRef.current
      const g = gammaRef.current
      const step = substepRef.current

      if (!held) return

      // Left bottle pour (acid or water): tilt LEFT (g < -20)
      if (g < -20) {
        const rate = Math.min((Math.abs(g) - 20) / 50, 1) * 0.014
        if (step === 'waterFirst' && held === 'water') {
          setWaterFill(prev => {
            const n = Math.min(1, prev + rate)
            if (n >= 0.65) setTimeout(() => setSubstep('pourAcid'), 0)
            return n
          })
          try { navigator.vibrate?.(10) } catch(_) {}
        }
        if (step === 'pourAcid' && held === 'acid') {
          setAcidFill(prev => Math.min(1, prev + rate))
          try { navigator.vibrate?.(10) } catch(_) {}
        }
      }

      // Right bottle pour (base): tilt RIGHT (g > 20)
      if (g > 20 && step === 'pourBase' && held === 'base') {
        const rate = Math.min((g - 20) / 50, 1) * 0.014 * mixBoostRef.current
        setBaseFill(prev => Math.min(1, prev + rate))
        try { navigator.vibrate?.(10) } catch(_) {}
      }
    }, 100)
    return () => clearInterval(id)
  }, []) // Never restarts

  // ── Gas bubble animation (gas-producing reactions) ─────────────────────
  useEffect(() => {
    if (!rxn.gas || !neutralized) return
    const iv = setInterval(() => {
      setBubbleParticles(prev => {
        const alive = prev.map(p => ({ ...p, y: p.y - 2, o: p.o - 0.03 })).filter(p => p.o > 0)
        if (Math.random() > 0.5) alive.push({ id: Math.random(), x: 8 + Math.random() * 24, y: 170, r: 1.5 + Math.random() * 2, o: 0.75 })
        return alive
      })
    }, 100)
    return () => clearInterval(iv)
  }, [neutralized, rxn.gas])

  // ── Warning: too much acid ─────────────────────────────────────────────
  useEffect(() => {
    if (acidFill > 0.7 && isActivelyPouring && substep === 'pourAcid') {
      addWarning('tooMuchAcid', '⚠️ Enough acid! Too much can cause burns. Always wear gloves and safety goggles in a real lab.', '#dc2626')
    }
  }, [acidFill, isActivelyPouring, substep, addWarning])

  // ── Warning: pouring too fast ──────────────────────────────────────────
  useEffect(() => {
    if (currentPourRate > 0.85 && isActivelyPouring) {
      clearTimeout(fastPourTimerRef.current)
      fastPourTimerRef.current = setTimeout(() => {
        addWarning('tooFast', '⚠️ Slow down! Rapid pouring can cause splashing and chemical burns. Tilt slowly.', '#ea580c')
      }, 1000)
    } else {
      clearTimeout(fastPourTimerRef.current)
    }
  }, [currentPourRate, isActivelyPouring, addWarning])

  // ── Warning: H₂SO₄ wrong order ────────────────────────────────────────
  useEffect(() => {
    if (acid.id === 'H2SO4' && heldBottle === 'base' && acidFill === 0) {
      addWarning('wrongOrder', '⚠️ Safety first! Always add H₂SO₄ to water, never base first. Add acid first.', '#dc2626')
    }
  }, [heldBottle, acid.id, acidFill, addWarning])

  // ── Warning: overshoot ─────────────────────────────────────────────────
  useEffect(() => {
    if (ph !== null && ph > 9 && substep === 'pourBase') {
      addWarning('overshoot', "⚠️ You've overshot! The solution is now too basic. In a real lab you'd need to start fresh.", '#2563eb')
    }
  }, [ph, substep, addWarning])

  // ── pH proximity toasts ────────────────────────────────────────────────
  const prevPHRef = useRef(null)
  useEffect(() => {
    if (ph === null || substep !== 'pourBase') return
    const prev = prevPHRef.current
    prevPHRef.current = ph
    if (prev === null) return
    if (ph >= 6.5 && (prev === null || prev < 6.5)) {
      addToast('Getting close! Slow down...')
      try { navigator.vibrate?.(5) } catch(_) {}
    }
    if (ph >= 6.9 && ph < 7.0 && (prev === null || prev < 6.9)) {
      addToast('Almost there! Tiny drops only...')
      try { navigator.vibrate?.(5) } catch(_) {}
    }
  }, [ph, substep, addToast])

  // ── Neutralization moment ──────────────────────────────────────────────
  useEffect(() => {
    if (ph === null || neutralizedRef.current) return
    if (ph >= 6.8 && ph <= 7.8) {
      neutralizedRef.current = true
      setNeutralized(true)
      setSubstep('neutralized')
      setHeldBottle(null); heldRef.current = null

      setFlashWhite(true)
      setTimeout(() => { setFlashWhite(false); setFlashGreen(true) }, 200)
      setTimeout(() => setFlashGreen(false), 900)

      try { navigator.vibrate?.([50,30,50,30,50,30,250]) } catch(_) {}
      audio.success()
      triggerAlert('success', '⚗️ Neutralized!')

      setConfetti(Array.from({ length: 42 }, (_, i) => ({
        id: i, x: 8 + Math.random() * 84, y: 5 + Math.random() * 55,
        color: ['#22c55e','#f1c40f','#6b4fff','#fff','#3498db','#e74c3c'][i % 6],
        angle: Math.random() * 360, scale: 0.4 + Math.random() * 1.2,
      })))
      setTimeout(() => setConfetti([]), 3000)

      // Auto-complete after 2.5s
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete({
            type: 'chemistry',
            startPH,
            finalPH: ph,
            timeSeconds: (Date.now() - startTimeRef.current) / 1000,
            shakeCount: Math.max(0, Math.round(mixBoostRef.current - 1)),
            pHHistory: [startPH, ph],
            acidSym: acid.sym, acidFull: acid.full,
            baseSym: base.sym, baseFull: base.full,
            concentration: conc, indicator,
            productName: rxn.name, productFormula: rxn.product,
            equation: rxn.eq, funFact: rxn.funFact,
            warningsTriggered: Array.from(warnedRef.current),
          })
        }
      }, 2500)
    }
  }, [ph, onComplete, startPH, acid, base, conc, indicator, rxn, triggerAlert])

  const startTimeRef = useRef(Date.now())

  // ── Shake detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isShaking) return
    const now = Date.now()
    if (now - lastShakeRef.current < 500) return
    lastShakeRef.current = now
    if (substep !== 'pourBase' && substep !== 'neutralized') return

    try { navigator.vibrate?.([40,20,40]) } catch(_) {}
    audio.bubble()
    setTubeShaking(true)
    setTimeout(() => setTubeShaking(false), 450)

    // Bubble burst
    const burst = Array.from({ length: 8 + Math.floor(Math.random() * 4) }, () => ({
      id: Math.random(),
      x: 5 + Math.random() * 28,
      y: 155 + Math.random() * 15,
      r: 2 + Math.random() * 4,
      o: 0.85,
    }))
    setBubbleParticles(prev => [...prev, ...burst])
    setTimeout(() => setBubbleParticles(prev => prev.filter(b => !burst.find(nb => nb.id === b.id))), 1400)

    setMixBoost(prev => Math.min(prev + 0.5, 3.5))
    setTempC(prev => prev + 2 + Math.random() * 2)
    addToast('Mixed! Reaction accelerating...')
  }, [isShaking, substep, addToast])

  // ── Pointer handlers for bottle pick-up ───────────────────────────────
  const handleBottlePointerDown = useCallback((e, bottle) => {
    // Validate step
    if (bottle === 'acid'  && substep !== 'pourAcid')   return
    if (bottle === 'base'  && substep !== 'pourBase')   return
    if (bottle === 'water' && substep !== 'waterFirst') return
    // H2SO4 wrong order guard
    if (acid.id === 'H2SO4' && bottle === 'base' && acidFill === 0) {
      addWarning('wrongOrder', '⚠️ Safety first! Always add acid to water first.', '#dc2626')
      return
    }
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch(_) {}
    setHeldBottle(bottle); heldRef.current = bottle
    dragStartX.current = e.clientX
    setSimGamma(0)
    try { navigator.vibrate?.(15) } catch(_) {}
  }, [substep, acid.id, acidFill, addWarning])

  const handleBottlePointerMove = useCallback((e) => {
    if (!isActive && heldRef.current && dragStartX.current !== null) {
      const dx = e.clientX - dragStartX.current
      setSimGamma(dx * 1.8)
    }
  }, [isActive])

  const handleBottlePointerUp = useCallback((e, bottle) => {
    setHeldBottle(null); heldRef.current = null
    dragStartX.current = null; setSimGamma(0)
    if (bottle === 'acid') {
      if (acidFill >= 0.38) {
        addToast('Good pour! Now add the indicator.')
        setTimeout(() => setSubstep('addIndicator'), 350)
      } else if (acidFill > 0.05) {
        addToast('Pour more acid — aim for about 40% fill')
      }
    }
  }, [acidFill, addToast])

  // ── Indicator drop mechanic ────────────────────────────────────────────
  const handleDropperTap = useCallback(() => {
    if (substep !== 'addIndicator' || indicatorDrops >= 3) return
    try { navigator.vibrate?.(8) } catch(_) {}
    const drop = { id: Date.now() }
    setFallingDrops(prev => [...prev, drop])
    setTimeout(() => setFallingDrops(prev => prev.filter(d => d.id !== drop.id)), 900)
    setIndicatorDrops(prev => {
      const n = prev + 1
      if (n >= 3) {
        addToast('Indicator added ✓ Now add the base slowly')
        setTimeout(() => setSubstep('pourBase'), 700)
      }
      return n
    })
  }, [substep, indicatorDrops, addToast])

  // ── Instruction text ───────────────────────────────────────────────────
  const instruction = (() => {
    const drag = !isActive ? ' (drag ← finger to simulate tilt)' : ''
    const drag2 = !isActive ? ' (drag → finger to simulate tilt)' : ''
    if (substep === 'waterFirst') return heldBottle === 'water'
      ? (leftActive ? '💧 Pouring water...' : `Tilt phone LEFT to pour${drag}`)
      : `Hold the water bottle, then tilt LEFT to pour${drag}`
    if (substep === 'pourAcid') return heldBottle === 'acid'
      ? (leftActive ? `⚗ Pouring ${acid.sym}...` : `Tilt phone LEFT to pour${drag}`)
      : `Hold the ${acid.sym} bottle and tilt LEFT to pour${drag}`
    if (substep === 'addIndicator') return `Tap the dropper ${3-indicatorDrops}× to add ${indicator === 'phenolphthalein' ? 'phenolphthalein' : 'litmus'}`
    if (substep === 'pourBase') return heldBottle === 'base'
      ? (rightActive ? `🔵 Pouring ${base.sym}...` : `Tilt phone RIGHT to pour${drag2}`)
      : `Hold the ${base.sym} bottle and tilt RIGHT to pour. Shake to mix!${drag2}`
    if (substep === 'neutralized') return '⚗️ NEUTRALIZED! Perfect titration!'
    return ''
  })()

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#0d0d1a', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', userSelect:'none', overflow:'hidden' }}>

      {/* Sensor status top-right */}
      <SensorIndicator gamma={effectiveGamma} magnitude={magnitude} isActive={isActive}/>

      {/* Flash overlays */}
      <AnimatePresence>
        {flashWhite && <motion.div initial={{ opacity:0.9 }} animate={{ opacity:0 }} transition={{ duration:0.3 }}
          style={{ position:'fixed', inset:0, background:'white', zIndex:80, pointerEvents:'none' }}/>}
      </AnimatePresence>
      <AnimatePresence>
        {flashGreen && <motion.div initial={{ opacity:0.7 }} animate={{ opacity:0 }} transition={{ duration:0.8 }}
          style={{ position:'fixed', inset:0, background:'#22c55e', zIndex:79, pointerEvents:'none' }}/>}
      </AnimatePresence>

      {/* Confetti */}
      <AnimatePresence>
        {confetti.map(c => (
          <motion.div key={c.id}
            initial={{ x:`${c.x}vw`, y:`${c.y}vh`, opacity:1, scale:c.scale, rotate:0 }}
            animate={{ y:`${c.y+60}vh`, opacity:0, rotate:c.angle+720 }}
            transition={{ duration:2.8, ease:'easeOut' }}
            style={{ position:'fixed', width:9, height:9, background:c.color, borderRadius:2, zIndex:70, pointerEvents:'none' }}/>
        ))}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ padding:'14px 20px 6px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:22, padding:4, fontFamily:'inherit' }}>←</button>
        <div>
          <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Chemistry Lab</div>
          <div style={{ fontSize:14, fontWeight:700 }}>{acid.sym} + {base.sym} → {rxn.product}</div>
        </div>
      </div>

      {/* ── Top bar: pH orb + temp ── */}
      <div style={{ padding:'6px 24px 4px', display:'flex', alignItems:'center', justifyContent:'center', gap:24 }}>
        {/* pH orb */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <motion.div
            animate={{ backgroundColor: orbColor, boxShadow: `0 0 24px ${orbColor}88` }}
            transition={{ duration:0.6 }}
            style={{ width:60, height:60, borderRadius:'50%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:`3px solid ${orbColor}` }}>
            <span style={{ fontSize:20, fontWeight:900, lineHeight:1 }}>{ph !== null ? ph.toFixed(1) : '—'}</span>
            <span style={{ fontSize:9, opacity:0.7 }}>pH</span>
          </motion.div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>
            {ph === null ? '' : ph < 5 ? 'Acidic' : ph < 7 ? 'Weakly Acidic' : ph < 7.5 ? 'Neutral' : 'Basic'}
          </div>
        </div>
        <TempGauge tempC={tempC}/>
        {/* Shakes count */}
        {mixBoost > 1 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <div style={{ fontSize:20 }}>🔄</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{Math.round(mixBoost-1)}× mixed</div>
          </div>
        )}
      </div>

      {/* ── Main scene: acid | tube | base ── */}
      <div style={{ flex:'0 0 auto', padding:'0 12px', position:'relative', height:240 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'100%' }}>

          {/* LEFT BOTTLE (water or acid) */}
          <div
            onPointerDown={e => handleBottlePointerDown(e, leftBottleName)}
            onPointerMove={handleBottlePointerMove}
            onPointerUp={e => handleBottlePointerUp(e, leftBottleName)}
            onPointerCancel={e => handleBottlePointerUp(e, leftBottleName)}
            style={{ cursor:'grab', touchAction:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}
          >
            <motion.div
              animate={{
                scale: (heldBottle === 'acid' || heldBottle === 'water') ? 1.08 : 1,
                filter: (heldBottle === 'acid' || heldBottle === 'water')
                  ? `drop-shadow(0 8px 24px ${substep==='waterFirst'?'#7fb3c8':acid.color}88)`
                  : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              }}
              transition={{ duration:0.2 }}
            >
              <div style={{
                transform: `rotate(${leftRotation}deg)`,
                transformOrigin: 'bottom center',
                transition: 'transform 0.06s ease',
              }}>
                {substep === 'waterFirst' ? <WaterBottleSVG size={72}/> : <BottleSVG reagent={acid} size={72}/>}
              </div>
            </motion.div>
            <div style={{ fontSize:9, color: substep==='waterFirst' ? '#7fb3c8' : acid.color, fontWeight:600 }}>
              {substep === 'waterFirst' ? 'H₂O' : acid.sym}
            </div>
            {!isActive && (heldBottle === 'acid' || heldBottle === 'water') && (
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>← drag</div>
            )}
          </div>

          {/* CENTER: indicator dropper + test tube */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
            {/* Indicator dropper */}
            {substep === 'addIndicator' && (
              <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
                onClick={handleDropperTap} style={{ cursor:'pointer', marginBottom:-4 }}>
                <motion.div animate={{ y:[0,-5,0] }} transition={{ duration:0.9, repeat:Infinity }}>
                  <svg width="32" height="60" viewBox="0 0 32 60">
                    <rect x="11" y="0" width="10" height="30" rx="5" fill="#a78bfa" opacity="0.9"/>
                    <path d="M11 28 L21 28 L18 46 L14 46 Z" fill="#8b5cf6" opacity="0.9"/>
                    <ellipse cx="16" cy="50" rx="3" ry="4" fill="#a78bfa" opacity="0.8"/>
                    <rect x="9" y="28" width="14" height="4" rx="2" fill="#7c3aed" opacity="0.6"/>
                  </svg>
                </motion.div>
                <div style={{ fontSize:8, color:'#a78bfa', textAlign:'center', marginTop:2 }}>
                  Tap {3-indicatorDrops}×
                </div>
              </motion.div>
            )}

            {/* Falling indicator drops */}
            <AnimatePresence>
              {fallingDrops.map(drop => (
                <motion.div key={drop.id}
                  initial={{ opacity:1, y:-20 }}
                  animate={{ opacity:0, y:60 }}
                  exit={{ opacity:0 }}
                  transition={{ duration:0.7, ease:'easeIn' }}
                  style={{ position:'absolute', width:8, height:8, borderRadius:'50%',
                    background: indicator === 'phenolphthalein' ? '#c084fc' : '#3b82f6',
                    zIndex:10, pointerEvents:'none',
                    left: '50%', transform:'translateX(-50%)' }}/>
              ))}
            </AnimatePresence>

            {/* Test tube — shakes on mix */}
            <motion.div
              animate={tubeShaking ? { x:[0,-8,8,-6,6,-4,4,0] } : { x:0 }}
              transition={{ duration:0.4, ease:'easeOut' }}
              style={{ boxShadow: tubeGlow, borderRadius:12 }}
            >
              <TestTube fill={tubeFill} color={liqColor} isGlowing={neutralized} bubbles={bubbleParticles}/>
            </motion.div>
          </div>

          {/* RIGHT BOTTLE (base) */}
          <div
            onPointerDown={e => handleBottlePointerDown(e, 'base')}
            onPointerMove={handleBottlePointerMove}
            onPointerUp={e => handleBottlePointerUp(e, 'base')}
            onPointerCancel={e => handleBottlePointerUp(e, 'base')}
            style={{ cursor:'grab', touchAction:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}
          >
            <motion.div
              animate={{
                scale: heldBottle === 'base' ? 1.08 : 1,
                opacity: substep === 'pourBase' || substep === 'neutralized' ? 1 : 0.38,
                filter: heldBottle === 'base'
                  ? `drop-shadow(0 8px 24px ${base.color}88)`
                  : substep === 'pourBase'
                    ? `drop-shadow(0 0 16px ${base.color}66)`
                    : 'none',
              }}
              transition={{ duration:0.25 }}
            >
              <div style={{
                transform: `rotate(${rightRotation}deg)`,
                transformOrigin: 'bottom center',
                transition: 'transform 0.06s ease',
              }}>
                <BottleSVG reagent={base} size={72}/>
              </div>
            </motion.div>
            <div style={{ fontSize:9, color:base.color, fontWeight:600, opacity: substep === 'pourBase' || substep === 'neutralized' ? 1 : 0.38 }}>
              {base.sym}
            </div>
            {!isActive && heldBottle === 'base' && (
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>drag →</div>
            )}
          </div>
        </div>

        {/* ── Liquid stream SVG overlay ── */}
        {/* viewBox: 0 0 100 100 = percentage coordinates */}
        <AnimatePresence>
          {(leftActive || rightActive) && (
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}
              viewBox="0 0 100 100" preserveAspectRatio="none">
              {leftActive && (() => {
                const w = 3 + leftPourRate * 10
                const col = substep === 'waterFirst' ? '#7ec8e3' : acid.color
                return (
                  <>
                    <motion.path
                      d="M 22,55 Q 34,35 47,16"
                      stroke={col} strokeWidth={w} fill="none" strokeLinecap="round"
                      animate={{ opacity:[0.75,1,0.75] }}
                      transition={{ duration:0.35, repeat:Infinity, ease:'easeInOut' }}/>
                    {[0.25,0.55,0.8].map((t,i) => {
                      const x = 22 + (47-22)*t, y = 55 + (16-55)*t
                      return <motion.circle key={i} cx={x} cy={y} r="2.5" fill={col} opacity={0.9}
                        animate={{ r:[2,3.5,2] }}
                        transition={{ duration:0.4, delay:i*0.13, repeat:Infinity }}/>
                    })}
                  </>
                )
              })()}
              {rightActive && (() => {
                const w = 3 + rightPourRate * 10
                const col = base.color
                return (
                  <>
                    <motion.path
                      d="M 78,55 Q 66,35 53,16"
                      stroke={col} strokeWidth={w} fill="none" strokeLinecap="round"
                      animate={{ opacity:[0.75,1,0.75] }}
                      transition={{ duration:0.35, repeat:Infinity, ease:'easeInOut' }}/>
                    {[0.25,0.55,0.8].map((t,i) => {
                      const x = 78 + (53-78)*t, y = 55 + (16-55)*t
                      return <motion.circle key={i} cx={x} cy={y} r="2.5" fill={col} opacity={0.9}
                        animate={{ r:[2,3.5,2] }}
                        transition={{ duration:0.4, delay:i*0.13, repeat:Infinity }}/>
                    })}
                  </>
                )
              })()}
            </svg>
          )}
        </AnimatePresence>
      </div>

      {/* ── Neutralized card ── */}
      <AnimatePresence>
        {neutralized && (
          <motion.div initial={{ opacity:0, scale:0.85, y:10 }} animate={{ opacity:1, scale:1, y:0 }}
            style={{ margin:'8px 20px', padding:'12px 16px', borderRadius:16,
              background:'rgba(34,197,94,0.12)', border:'1.5px solid rgba(34,197,94,0.5)', textAlign:'center' }}>
            <div style={{ color:'#22c55e', fontWeight:800, fontSize:17, marginBottom:4 }}>⚗️ NEUTRALIZED!</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>{rxn.eq}</div>
            <div style={{ fontSize:13, color:'#a78bfa', fontWeight:700, marginTop:6 }}>{rxn.name} formed!</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:4, lineHeight:1.4 }}>{rxn.funFact}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Instruction ── */}
      <div style={{ padding:'6px 24px', textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.55, minHeight:44 }}>
        {instruction}
      </div>

      {/* ── Indicator progress dots ── */}
      {substep === 'addIndicator' && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:4 }}>
          {[0,1,2].map(i => (
            <motion.div key={i}
              animate={{ scale: i < indicatorDrops ? 1.2 : 1, background: i < indicatorDrops ? '#a78bfa' : 'rgba(255,255,255,0.15)' }}
              style={{ width:10, height:10, borderRadius:'50%', background:'rgba(255,255,255,0.15)' }}/>
          ))}
        </div>
      )}

      {/* ── Warnings — slide up cards ── */}
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:6 }}>
        <AnimatePresence>
          {warnings.map(w => (
            <motion.div key={w.id}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
              style={{ padding:'10px 14px', borderRadius:12,
                background:`rgba(${w.color==='#dc2626'?'220,38,38':w.color==='#ea580c'?'234,88,12':'37,99,235'},0.18)`,
                border:`1.5px solid ${w.color}88`, fontSize:12, lineHeight:1.5, color:'#fca5a5' }}>
              {w.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Toasts ── */}
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity:0, y:10, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }}
            style={{ position:'fixed', bottom:100, left:'50%', transform:'translateX(-50%)', zIndex:150,
              background:'rgba(0,0,0,0.88)', color:'white', borderRadius:12, padding:'8px 18px',
              fontSize:13, fontWeight:600, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
              border:'1px solid rgba(255,255,255,0.1)' }}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Sensor live readout pill (bottom-right, always visible) ── */}
      <div style={{ position:'fixed', bottom:18, right:14, zIndex:100,
        background:'rgba(0,0,0,0.72)', backdropFilter:'blur(10px)',
        border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'5px 10px',
        fontFamily:'monospace', fontSize:11, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
        <div>📐 {Math.abs(effectiveGamma).toFixed(0)}°
          {isActivelyPouring ? ' 🫗' : isSteady ? ' 🔒' : ''}
          {isShaking ? ' 📳' : ''}
        </div>
        <div style={{ fontSize:9, color: isActive ? '#2ecc71' : '#eab308' }}>
          {isActive ? '● sensors live' : '○ touch mode'}
        </div>
      </div>
    </div>
  )
}

// ── Orchestrator ───────────────────────────────────────────────────────────
export default function NeutralizationExperiment({ onComplete, onBack, studentName }) {
  const [phase, setPhase] = useState('shelf')
  const [setup, setSetup] = useState(null)
  if (phase === 'shelf') {
    return <ReagentShelf onStart={s => { setSetup(s); setPhase('experiment') }} onBack={onBack}/>
  }
  return <LabExperiment {...setup} studentName={studentName} onComplete={onComplete} onBack={() => setPhase('shelf')}/>
}
