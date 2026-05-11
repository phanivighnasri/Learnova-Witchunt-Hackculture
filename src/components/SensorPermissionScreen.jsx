import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// state: 'pending' | 'granted' | 'denied' | 'unavailable'
export default function SensorPermissionScreen({ onGrant, onSkip }) {
  const [state, setState] = useState('pending')
  const [loading, setLoading] = useState(false)

  const handleAllow = async () => {
    setLoading(true)
    try {
      let orientationOk = true
      let motionOk = true

      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission()
        orientationOk = res === 'granted'
      }
      if (typeof DeviceMotionEvent?.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission()
        motionOk = res === 'granted'
      }

      // If neither API exists, sensors are available without permission (Android/desktop)
      const noPermissionApi =
        typeof DeviceOrientationEvent?.requestPermission !== 'function' &&
        typeof DeviceMotionEvent?.requestPermission !== 'function'

      if (noPermissionApi || (orientationOk && motionOk)) {
        setState('granted')
        setTimeout(onGrant, 600)
      } else if (!orientationOk && !motionOk) {
        setState('unavailable')
      } else {
        setState('denied')
      }
    } catch {
      setState('denied')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      {/* Phone icon with pulsing rings */}
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 44 }}>
        {state === 'pending' && [1, 2, 3].map(i => (
          <motion.div key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1 + i * 0.35, opacity: [0, 0.5, 0] }}
            transition={{ duration: 2, delay: i * 0.45, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid rgba(107,79,255,${0.55 - i * 0.12})`,
            }}
          />
        ))}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: state === 'granted'
            ? 'rgba(46,204,113,0.15)'
            : state === 'denied' || state === 'unavailable'
            ? 'rgba(220,38,38,0.15)'
            : 'rgba(107,79,255,0.15)',
          border: `2px solid ${state === 'granted' ? 'rgba(46,204,113,0.55)' : state === 'denied' || state === 'unavailable' ? 'rgba(220,38,38,0.4)' : 'rgba(107,79,255,0.55)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
        }}>
          {state === 'granted' ? '✅' : state === 'denied' ? '🚫' : state === 'unavailable' ? '📵' : '📱'}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === 'pending' && (
          <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
              LabLens needs motion access
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 300, marginBottom: 44 }}>
              To pour liquids and shake test tubes, we need your phone's gyroscope and accelerometer.
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAllow}
              disabled={loading}
              style={{
                width: '100%', maxWidth: 320, padding: '18px 0',
                borderRadius: 16, border: 'none',
                background: loading ? 'rgba(107,79,255,0.4)' : 'linear-gradient(135deg,#6b4fff,#8b5cf6)',
                color: 'white', fontSize: 18, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 4px 28px rgba(107,79,255,0.45)',
                fontFamily: 'inherit', marginBottom: 16, display: 'block',
              }}
            >
              {loading ? 'Requesting…' : 'Allow Motion Sensors'}
            </motion.button>
            <button
              onClick={onSkip}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.4)', fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0',
                textDecoration: 'underline',
              }}
            >
              Use tap controls instead
            </button>
          </motion.div>
        )}

        {state === 'granted' && (
          <motion.div key="granted" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#2ecc71' }}>
              Sensors ready!
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>
              Tilt your phone to pour. Starting experiment…
            </p>
          </motion.div>
        )}

        {state === 'denied' && (
          <motion.div key="denied" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: '#fca5a5' }}>
              Permission denied
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 300, marginBottom: 32 }}>
              Motion access was denied. You can still run the experiment using the on-screen controls.
            </p>
            <button
              onClick={onSkip}
              style={{
                width: '100%', maxWidth: 320, padding: '16px 0',
                borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: 'white', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Continue with tap controls
            </button>
          </motion.div>
        )}

        {state === 'unavailable' && (
          <motion.div key="unavailable" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'rgba(255,255,255,0.6)' }}>
              Sensors unavailable
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 300, marginBottom: 32 }}>
              This device doesn't support motion sensors. Use the on-screen controls instead.
            </p>
            <button
              onClick={onSkip}
              style={{
                width: '100%', maxWidth: 320, padding: '16px 0',
                borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: 'white', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Continue with tap controls
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
