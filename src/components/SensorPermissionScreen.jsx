import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SensorPermissionScreen({ onDone }) {
  const [status, setStatus] = useState('pending') // 'pending' | 'granting' | 'granted' | 'denied'

  const handleActivate = async () => {
    setStatus('granting')
    try {
      let motionOk = true
      let orientOk = true
      if (typeof DeviceMotionEvent?.requestPermission === 'function') {
        motionOk = (await DeviceMotionEvent.requestPermission()) === 'granted'
      }
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        orientOk = (await DeviceOrientationEvent.requestPermission()) === 'granted'
      }
      if (motionOk && orientOk) {
        setStatus('granted')
        setTimeout(() => onDone('granted'), 900)
      } else {
        setStatus('denied')
      }
    } catch (_) {
      setStatus('denied')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', textAlign: 'center', userSelect: 'none',
    }}>
      {/* Animated phone + motion rings */}
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 52 }}>
        {status === 'pending' && [1, 2, 3].map(i => (
          <motion.div key={i}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1 + i * 0.4, opacity: [0, 0.45, 0] }}
            transition={{ duration: 2.2, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid rgba(107,79,255,${0.6 - i * 0.14})`,
            }}
          />
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: status === 'granted' ? 'rgba(46,204,113,0.18)' : 'rgba(107,79,255,0.18)',
          border: `2.5px solid ${status === 'granted' ? 'rgba(46,204,113,0.7)' : 'rgba(107,79,255,0.6)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.div
            animate={status === 'granting' ? { rotate: [0, 18, -18, 12, -12, 0] } : {}}
            transition={{ duration: 0.9, repeat: status === 'granting' ? Infinity : 0 }}
            style={{ fontSize: 44 }}
          >
            {status === 'granted' ? '✅' : status === 'denied' ? '🚫' : '📱'}
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status !== 'denied' ? (
          <motion.div key="main"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
          >
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 14px', letterSpacing: -0.5 }}>
              {status === 'granted' ? "You're all set!" : 'Wake up your lab'}
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 310, margin: '0 0 52px' }}>
              {status === 'granted'
                ? 'Sensors active. Tilt to pour, shake to mix!'
                : "Learnova uses your phone's gyroscope to let you physically pour, shake and hold test tubes"}
            </p>
            {status !== 'granted' && (
              <>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleActivate}
                  disabled={status === 'granting'}
                  style={{
                    width: '100%', maxWidth: 340, padding: '20px 0',
                    borderRadius: 18, border: 'none',
                    background: status === 'granting'
                      ? 'rgba(107,79,255,0.45)'
                      : 'linear-gradient(135deg,#6b4fff,#9b5cfa)',
                    color: 'white', fontSize: 19, fontWeight: 800,
                    cursor: status === 'granting' ? 'default' : 'pointer',
                    boxShadow: '0 8px 40px rgba(107,79,255,0.5)',
                    fontFamily: 'inherit', marginBottom: 20,
                  }}
                >
                  {status === 'granting' ? 'Activating…' : 'Activate Sensors'}
                </motion.button>
                <button onClick={() => onDone('denied')} style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.35)', fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  textDecoration: 'underline', padding: '8px 0',
                }}>
                  Skip — use touch controls
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="denied"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 14px', color: '#fca5a5' }}>
              Motion access denied
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 300, margin: '0 0 40px' }}>
              No worries — the touch controls work great too. Re-enable later in iOS Settings → Safari → Motion & Orientation Access.
            </p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onDone('denied')} style={{
              width: '100%', maxWidth: 340, padding: '18px 0',
              borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.07)',
              color: 'white', fontSize: 17, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Continue with touch controls
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
