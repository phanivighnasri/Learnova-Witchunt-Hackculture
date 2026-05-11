import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT = { dyslexia: false, deafHoH: false, switchAccess: false, colorblind: false }
const LS_KEY = 'lablens-a11y'

const Ctx = createContext({ settings: DEFAULT, toggle: () => {}, reset: () => {}, triggerAlert: () => {} })
export const useAccessibility = () => useContext(Ctx)

function load() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') } }
  catch { return DEFAULT }
}

let fontInjected = false
function injectFont() {
  if (fontInjected) return
  fontInjected = true
  const s = document.createElement('style')
  s.id = 'open-dyslexic-face'
  s.textContent = `@font-face{font-family:"OpenDyslexic";src:url("https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.woff2") format("woff2");font-weight:normal;font-style:normal;font-display:swap;}`
  document.head.appendChild(s)
}

function applyDocClasses({ dyslexia, colorblind, switchAccess }) {
  const cl = document.documentElement.classList
  cl.toggle('dyslexia-mode', dyslexia)
  cl.toggle('colorblind-mode', colorblind)
  cl.toggle('switch-access-mode', switchAccess)
}

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const [flash, setFlash] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => { injectFont() }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
    applyDocClasses(settings)
  }, [settings])

  // Clean up doc classes on unmount
  useEffect(() => () => applyDocClasses(DEFAULT), [])

  const toggle = useCallback((key) => setSettings(p => ({ ...p, [key]: !p[key] })), [])
  const reset  = useCallback(() => setSettings(DEFAULT), [])

  const triggerAlert = useCallback((type, message) => {
    if (!settings.deafHoH) return
    if (navigator.vibrate) {
      navigator.vibrate(type === 'warning' ? [80, 40, 80, 40, 80] : [160, 50, 160])
    }
    const color   = type === 'warning' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'
    const caption = message || (type === 'success' ? '✓ Success!' : type === 'warning' ? '⚠️ Warning!' : 'ℹ️ Info')
    const id = Date.now()
    setFlash({ id, color, caption })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFlash(null), 2200)
  }, [settings.deafHoH])

  return (
    <Ctx.Provider value={{ settings, toggle, reset, triggerAlert }}>
      {children}
      <AnimatePresence>
        {flash && <A11yFlash key={flash.id} color={flash.color} caption={flash.caption} />}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

// Flash overlay + caption + volume bars — position:fixed, always on top
function A11yFlash({ color, caption }) {
  return (
    <>
      {/* Edge border pulse */}
      <motion.div
        initial={{ opacity: 0.95 }}
        animate={{ opacity: [0.95, 0.5, 0.95, 0.5, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
          boxShadow: `inset 0 0 0 8px ${color}`,
        }}
      />
      {/* Caption */}
      <motion.div
        role="status" aria-live="assertive"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'fixed', top: 44, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, pointerEvents: 'none',
          background: color, color: 'white',
          borderRadius: 12, padding: '10px 22px',
          fontSize: 16, fontWeight: 700,
          boxShadow: `0 4px 24px ${color}80`,
          whiteSpace: 'nowrap',
        }}
      >
        {caption}
      </motion.div>
      {/* Volume bars */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        aria-hidden="true"
        style={{
          position: 'fixed', bottom: 44, right: 20, zIndex: 9999,
          display: 'flex', alignItems: 'flex-end', gap: 3, pointerEvents: 'none',
        }}
      >
        {[12, 20, 28, 20, 12].map((h, i) => (
          <motion.div key={i}
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{ duration: 0.35, delay: i * 0.06, repeat: 4, ease: 'easeInOut' }}
            style={{ width: 5, height: h, borderRadius: 3, background: color, transformOrigin: 'bottom' }}
          />
        ))}
      </motion.div>
    </>
  )
}
