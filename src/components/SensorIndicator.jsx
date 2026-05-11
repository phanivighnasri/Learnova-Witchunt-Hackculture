import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SensorIndicator({ gamma = 0, magnitude = 9.8, isActive = false }) {
  const [showReadout, setShowReadout] = useState(false)
  const [touchMode, setTouchMode] = useState(false)

  useEffect(() => {
    if (isActive) { setTouchMode(false); return }
    const t = setTimeout(() => setTouchMode(true), 4000)
    return () => clearTimeout(t)
  }, [isActive])

  // Magnitude bar: 0 at rest (~9.8), 1 at vigorous shake (~26)
  const magBar = Math.min(1, Math.max(0, (magnitude - 8) / 18))

  return (
    <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      {/* Status pill */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowReadout(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 11px 5px 8px', borderRadius: 20,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
          border: `1px solid ${isActive ? 'rgba(46,204,113,0.45)' : touchMode ? 'rgba(234,179,8,0.45)' : 'rgba(255,255,255,0.1)'}`,
          cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
        }}
        aria-label={isActive ? 'Sensors live — tap for readout' : 'Touch mode — tap for readout'}
      >
        <motion.div
          animate={isActive ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: isActive ? '#2ecc71' : touchMode ? '#eab308' : 'rgba(255,255,255,0.2)',
            boxShadow: isActive ? '0 0 7px #2ecc71' : touchMode ? '0 0 7px #eab308' : 'none',
          }}
        />
        <span style={{
          fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
          color: isActive ? '#2ecc71' : touchMode ? '#eab308' : 'rgba(255,255,255,0.3)',
          whiteSpace: 'nowrap',
        }}>
          {isActive ? `${Math.abs(gamma).toFixed(1)}°` : touchMode ? 'Touch mode' : '…'}
        </span>
      </motion.button>

      {/* Live readout card */}
      <AnimatePresence>
        {showReadout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              background: 'rgba(0,0,0,0.78)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '10px 14px', minWidth: 136,
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.85 }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.38)' }}>Tilt   </span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{gamma.toFixed(1)}°</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.38)' }}>Motion </span>
                <span style={{ color: '#7fb3c8', fontWeight: 700 }}>{magnitude.toFixed(1)}g</span>
              </div>
            </div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                animate={{ width: `${Math.round(magBar * 100)}%` }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                style={{
                  height: '100%', borderRadius: 4,
                  background: magnitude > 18 ? '#f59e0b' : '#2ecc71',
                  boxShadow: magnitude > 18 ? '0 0 6px #f59e0b80' : '0 0 4px #2ecc7160',
                  minWidth: 4,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
