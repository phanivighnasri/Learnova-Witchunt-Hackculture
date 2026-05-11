import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '../contexts/AccessibilityContext'

const ITEMS = [
  {
    key: 'dyslexia',
    icon: '📖',
    title: 'Dyslexia-Friendly Text',
    desc: 'OpenDyslexic font · 0.12em spacing · warm #1a1408 background',
  },
  {
    key: 'deafHoH',
    icon: '👁',
    title: 'Visual Alerts (Deaf / HoH)',
    desc: 'Screen flash + captions + vibration replace all audio cues',
  },
  {
    key: 'switchAccess',
    icon: '🖐',
    title: 'Switch Access Mode',
    desc: 'Large POUR & SHAKE buttons replace tilt and shake gestures',
  },
  {
    key: 'colorblind',
    icon: '🎨',
    title: 'Colorblind Mode',
    desc: 'pH scale uses orange / blue instead of red / green',
  },
]

function Pill({ on }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 46, height: 26, borderRadius: 13, flexShrink: 0,
        background: on ? '#6b4fff' : 'rgba(255,255,255,0.12)',
        position: 'relative', transition: 'background 0.25s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        transition: 'left 0.25s',
      }} />
    </div>
  )
}

export default function AccessibilityPanel({ isOpen, onClose }) {
  const { settings, toggle, reset } = useAccessibility()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Accessibility settings"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
              background: 'rgba(10, 8, 26, 0.97)',
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              borderRadius: '24px 24px 0 0',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
              maxWidth: 520,
              margin: '0 auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Title row */}
            <div style={{ padding: '0 24px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }} aria-hidden="true">♿</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Accessibility</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Your lab, your way</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close accessibility settings"
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  fontSize: 22, cursor: 'pointer', padding: 6, lineHeight: 1, fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
            </div>

            {/* Toggles */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ITEMS.map(item => (
                <button
                  key={item.key}
                  onClick={() => toggle(item.key)}
                  role="switch"
                  aria-checked={settings[item.key]}
                  aria-label={item.title}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: settings[item.key] ? 'rgba(107,79,255,0.13)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${settings[item.key] ? 'rgba(107,79,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
                    textAlign: 'left', minHeight: 68, fontFamily: 'inherit',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
                    {item.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                  <Pill on={settings[item.key]} />
                </button>
              ))}
            </div>

            {/* Reset */}
            <div style={{ padding: '14px 20px 0' }}>
              <button
                onClick={reset}
                aria-label="Reset all accessibility settings to defaults"
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Reset to defaults
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
