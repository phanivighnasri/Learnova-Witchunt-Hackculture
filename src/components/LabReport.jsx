import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { callGroq, buildChemPrompt, buildBioPrompt, buildPhysicsPrompt } from '../utils/gemini'
import ParticleField from './ParticleField'

// ── pH Graph (line chart) ──────────────────────────────────────────────────
function PHGraph({ history }) {
  if (!history || history.length < 2) return null
  const W = 280, H = 80
  const min = 1, max = 14
  const pts = history.map((v, i) => ({
    x: (i / (history.length - 1)) * (W - 16) + 8,
    y: H - 10 - ((v - min) / (max - min)) * (H - 20),
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const finalPH = history[history.length - 1]
  const color = finalPH <= 3 ? '#c0392b' : finalPH <= 6 ? '#e67e22' : finalPH <= 7.5 ? '#2ecc71' : '#2980b9'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} rx="8" fill="rgba(0,0,0,0.25)" />
      {/* Grid lines */}
      {[3,7,11].map(v => {
        const y = H - 10 - ((v - min) / (max - min)) * (H - 20)
        return <g key={v}>
          <line x1="8" y1={y} x2={W-8} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x="10" y={y - 2} fill="rgba(255,255,255,0.2)" fontSize="7">pH {v}</text>
        </g>
      })}
      {/* Line */}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      {/* Area fill */}
      <path d={`${d} L ${pts[pts.length-1].x} ${H-8} L ${pts[0].x} ${H-8} Z`}
        fill={color} opacity="0.08" />
      {/* End dot */}
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="4" fill={color} />
      {/* Labels */}
      <text x="8" y={H-2} fill="rgba(255,255,255,0.25)" fontSize="7">Start</text>
      <text x={W-30} y={H-2} fill="rgba(255,255,255,0.25)" fontSize="7">End</text>
    </svg>
  )
}

// ── Label Score Visual ─────────────────────────────────────────────────────
function LabelScore({ correctCount }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1, type: 'spring' }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: i < correctCount ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${i < correctCount ? '#2ecc71' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
        >
          {i < correctCount ? '✓' : '○'}
        </motion.div>
      ))}
    </div>
  )
}

// ── Angle Graph ────────────────────────────────────────────────────────────
function AngleGraph({ anglesExplored, tirCount }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: '#3498db' }}>{anglesExplored}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>angles explored</div>
      </div>
      <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: '#ff4444' }}>{tirCount}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>TIR triggers</div>
      </div>
    </div>
  )
}

// ── Typewriter Effect ──────────────────────────────────────────────────────
function Typewriter({ text, isStreaming }) {
  return (
    <div style={{ lineHeight: 1.7, fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>
      {text}
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ display: 'inline-block', width: 2, height: '1em', background: '#6b4fff', marginLeft: 2, verticalAlign: 'middle' }}
        />
      )}
    </div>
  )
}

// ── Main Lab Report ────────────────────────────────────────────────────────
const EXPERIMENT_META = {
  chemistry: { name: 'Acid-Base Neutralization', subject: 'Chemistry', icon: '⚗️', color: '#e74c3c' },
  biology: { name: 'Onion Cell Microscopy', subject: 'Biology', icon: '🔬', color: '#f39c12' },
  physics: { name: "Snell's Law & Refraction", subject: 'Physics', icon: '⚡', color: '#3498db' },
}

export default function LabReport({ result, onTryAnother }) {
  const [aiText, setAIText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [aiError, setAIError] = useState('')
  const runRef = useRef(false)
  const intervalRef = useRef(null)

  const meta = EXPERIMENT_META[result.type] || EXPERIMENT_META.chemistry

  const buildPrompt = () => {
    if (result.type === 'chemistry') return buildChemPrompt(result)
    if (result.type === 'biology') return buildBioPrompt(result)
    return buildPhysicsPrompt(result)
  }

  const fetchAI = async () => {
    if (runRef.current) return
    runRef.current = true
    setIsStreaming(true)
    setAIText('')
    setAIError('')

    try {
      const fullText = await callGroq(buildPrompt())
      if (!fullText) {
        setAIError('AI feedback unavailable')
        setIsStreaming(false)
        return
      }
      let i = 0
      intervalRef.current = setInterval(() => {
        i++
        setAIText(fullText.slice(0, i))
        if (i >= fullText.length) {
          clearInterval(intervalRef.current)
          setIsStreaming(false)
        }
      }, 18)
    } catch {
      setAIError('AI feedback unavailable')
      setIsStreaming(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(fetchAI, 800)
    return () => {
      clearTimeout(t)
      clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', position: 'relative', overflowX: 'hidden' }}>
      <ParticleField color="#6b4fff" count={40} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 20px 40px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ padding: '24px 0 20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>{meta.icon}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: meta.color, marginBottom: 6 }}>
            {meta.subject} · Lab Report
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{meta.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            {result.studentName || 'Student'} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Metrics card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: 20, marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
            Experiment Data
          </div>

          {result.type === 'chemistry' && (
            <>
              {/* Reagents row */}
              {result.acidSym && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.35)', fontSize: 12, fontWeight: 600, color: '#e74c3c' }}>
                    ⚗ {result.acidSym}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.4 }}>+</div>
                  <div style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.35)', fontSize: 12, fontWeight: 600, color: '#3498db' }}>
                    🧪 {result.baseSym}
                  </div>
                  <div style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                    {result.concentration}
                  </div>
                  <div style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(107,79,255,0.1)', fontSize: 11, color: '#a78bfa' }}>
                    {result.indicator}
                  </div>
                </div>
              )}
              {/* Product + equation */}
              {result.equation && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)' }}>
                  <div style={{ fontSize: 11, color: '#2ecc71', fontWeight: 600, marginBottom: 3 }}>Product: {result.productName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{result.equation}</div>
                  {result.funFact && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, fontStyle: 'italic' }}>{result.funFact}</div>}
                </div>
              )}
              {/* pH journey */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#c0392b' }}>pH {result.startPH}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Starting pH</div>
                </div>
                <div style={{ alignSelf: 'center', fontSize: 18, opacity: 0.4 }}>→</div>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: result.finalPH <= 7.5 ? '#2ecc71' : '#2980b9' }}>pH {result.finalPH?.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Final pH</div>
                </div>
              </div>
              <div style={{ marginBottom: 6, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>pH journey</div>
              <PHGraph history={result.pHHistory} />
              <div style={{ marginTop: 10, display: 'flex', gap: 12, justifyContent: 'center', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>⏱ {Math.round(result.timeSeconds)}s</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>💥 {result.shakeCount} stirs</span>
              </div>
              {/* Safety warnings triggered */}
              {result.warningsTriggered?.length > 0 && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600, marginBottom: 4 }}>⚠️ Safety warnings triggered ({result.warningsTriggered.length})</div>
                  {result.warningsTriggered.map((w, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2 }}>• {w.slice(0, 80)}…</div>
                  ))}
                </div>
              )}
            </>
          )}

          {result.type === 'biology' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 10, textAlign: 'center' }}>
                  Structures identified: {result.correctCount}/5
                </div>
                <LabelScore correctCount={result.correctCount} />
              </div>
              {result.missedStructures?.length > 0 && (
                <div style={{ fontSize: 12, color: 'rgba(255,100,100,0.7)', textAlign: 'center', marginTop: 8 }}>
                  Missed: {result.missedStructures.join(', ')}
                </div>
              )}
            </>
          )}

          {result.type === 'physics' && (
            <AngleGraph anglesExplored={result.anglesExplored} tirCount={result.tirCount} />
          )}
        </motion.div>

        {/* AI Mentor Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'rgba(107,79,255,0.06)',
            border: '1px solid rgba(107,79,255,0.2)',
            borderLeft: '4px solid #6b4fff',
            borderRadius: 20, padding: 20, marginBottom: 20,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6b4fff, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>✦</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Mentor Note</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Powered by Groq AI ✦</div>
            </div>
            {isStreaming && (
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ marginLeft: 'auto', fontSize: 11, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 12, height: 12, border: '2px solid #6b4fff', borderTopColor: 'transparent', borderRadius: '50%' }}
                />
                Generating…
              </motion.div>
            )}
          </div>

          {aiError ? (
            <div style={{ color: '#ff6b6b', fontSize: 14, lineHeight: 1.6 }}>
              <div>⚠️ AI feedback unavailable</div>
              <button
                onClick={() => { runRef.current = false; fetchAI() }}
                style={{ marginTop: 10, background: 'rgba(107,79,255,0.2)', border: '1px solid rgba(107,79,255,0.4)', color: '#a78bfa', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Retry
              </button>
            </div>
          ) : aiText ? (
            <Typewriter text={aiText} isStreaming={isStreaming} />
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ width: 16, height: 16, border: '2px solid #6b4fff', borderTopColor: 'transparent', borderRadius: '50%' }}
              />
              Analyzing your experiment…
            </div>
          )}
        </motion.div>

        {/* Powered by Groq badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)',
            borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#7ab3f8',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Powered by Groq AI ✦</span>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <motion.button
            onClick={onTryAnother}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6b4fff, #8b5cf6)',
              color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(107,79,255,0.45)',
              fontFamily: 'inherit',
            }}
          >
            Try Another Experiment →
          </motion.button>

          <button
            onClick={() => window.print()}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            📸 Share Report
          </button>
        </motion.div>

        {/* Hackathon credit */}
        <div style={{ textAlign: 'center', marginTop: 32, color: 'rgba(255,255,255,0.15)', fontSize: 11, lineHeight: 1.7 }}>
          LabLens · WitchHunt 2026 · Education Track<br />
          Built for students who deserve a lab.
        </div>
      </div>
    </div>
  )
}
