import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SensorIndicator({ gamma = 0, magnitude = 9.8, isPouring = false, isShaking = false, isSteady = false, sensorActive }) {
  const [visible, setVisible] = useState(true)

  if (sensorActive === false) return null

  const state = isPouring ? 'POURING' : isShaking ? 'SHAKING' : isSteady ? 'STEADY' : 'IDLE'
  const stateColor = isPouring ? '#3b82f6' : isShaking ? '#f59e0b' : isSteady ? '#2ecc71' : 'rgba(255,255,255,0.25)'

  return (
    <>
      {/* Eye toggle button */}
      <button
        onClick={() => setVisible(v => !v)}
        style={{
          position: 'fixed', top: 10, left: 10, zIndex: 200,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          padding: '4px 7px', fontSize: 14, lineHeight: 1,
        }}
        aria-label={visible ? 'Hide sensor debug overlay' : 'Show sensor debug overlay'}
      >
        {visible ? '👁' : '🙈'}
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed', top: 36, left: 10, zIndex: 199,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 12px',
              pointerEvents: 'none', minWidth: 120,
            }}
            aria-label={`Sensor debug: gamma ${Math.round(gamma)}°, magnitude ${magnitude.toFixed(1)}, state ${state}`}
            aria-live="polite"
          >
            <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7 }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 2, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>Sensor Debug</div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>γ  </span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{Math.round(gamma)}°</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>|a| </span>
                <span style={{ color: '#7fb3c8', fontWeight: 700 }}>{magnitude.toFixed(1)}</span>
              </div>
              <div style={{ marginTop: 3 }}>
                <span style={{ color: stateColor, fontWeight: 800, fontSize: 10 }}>{state}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
