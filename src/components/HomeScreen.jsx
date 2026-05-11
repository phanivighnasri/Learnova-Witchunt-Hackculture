import { useState } from 'react'
import { motion } from 'framer-motion'
import ParticleField from './ParticleField'
import AccessibilityPanel from './AccessibilityPanel'
import { useAccessibility } from '../contexts/AccessibilityContext'

const experiments = [
  {
    id: 'chemistry',
    name: 'Acid-Base Neutralization',
    subject: 'Chemistry',
    color: '#e74c3c',
    accent: '#ff6b6b',
    desc: 'Mix HCl with NaOH. Watch the pH transform. Tilt your phone to pour.',
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Beaker with red acidic liquid and pH 2 label" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="chem-glow" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#c0392b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c0392b" stopOpacity="0" />
          </radialGradient>
          <clipPath id="chem-clip">
            <path d="M38 90 Q38 105 50 107 L70 107 Q82 105 82 90 L82 50 L38 50 Z" />
          </clipPath>
        </defs>
        {/* Ambient glow */}
        <ellipse cx="60" cy="100" rx="35" ry="16" fill="url(#chem-glow)" />
        {/* Liquid fill */}
        <rect x="39" y="55" width="42" height="51" fill="#c0392b" clipPath="url(#chem-clip)" opacity="0.85" />
        {/* Beaker */}
        <path d="M38 30 L38 90 Q38 107 50 108 L70 108 Q82 107 82 90 L82 30" stroke="#7ecfff" strokeWidth="2.5" fill="none" opacity="0.8" />
        <line x1="38" y1="50" x2="82" y2="50" stroke="#7ecfff" strokeWidth="1.5" opacity="0.4" />
        <path d="M30 27 L90 27" stroke="#7ecfff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        {/* Glass sheen */}
        <line x1="44" y1="35" x2="44" y2="95" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bubbles */}
        <circle cx="52" cy="75" r="3" fill="rgba(255,150,150,0.5)" />
        <circle cx="65" cy="65" r="2" fill="rgba(255,150,150,0.4)" />
        <circle cx="58" cy="58" r="2.5" fill="rgba(255,150,150,0.3)" />
        {/* pH label */}
        <text x="60" y="20" textAnchor="middle" fill="#ff8888" fontSize="12" fontWeight="bold">pH 2</text>
      </svg>
    ),
  },
  {
    id: 'biology',
    name: 'Onion Cell Microscopy',
    subject: 'Biology',
    color: '#f39c12',
    accent: '#f1c40f',
    desc: 'Peel, stain, focus. Discover the hidden architecture of life.',
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Onion cells viewed through a microscope, stained orange-brown" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="bio-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f39c12" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f39c12" stopOpacity="0" />
          </radialGradient>
          <clipPath id="cell-circle">
            <circle cx="60" cy="60" r="38" />
          </clipPath>
        </defs>
        <circle cx="60" cy="60" r="42" fill="url(#bio-glow)" />
        <circle cx="60" cy="60" r="38" fill="#1a1200" opacity="0.9" />
        {/* Cell grid */}
        <g clipPath="url(#cell-circle)" opacity="0.9">
          <rect x="25" y="25" width="28" height="25" rx="3" stroke="#c8890a" strokeWidth="1.5" fill="#2a1800" />
          <rect x="55" y="25" width="28" height="25" rx="3" stroke="#c8890a" strokeWidth="1.5" fill="#2a1800" />
          <rect x="40" y="52" width="28" height="25" rx="3" stroke="#c8890a" strokeWidth="1.5" fill="#2a1800" />
          <rect x="25" y="68" width="26" height="22" rx="3" stroke="#c8890a" strokeWidth="1.5" fill="#2a1800" />
          <rect x="68" y="68" width="20" height="22" rx="3" stroke="#c8890a" strokeWidth="1.5" fill="#2a1800" />
          {/* Nuclei */}
          <ellipse cx="39" cy="37" rx="5" ry="4" fill="#7d4e00" opacity="0.8" />
          <ellipse cx="69" cy="37" rx="5" ry="4" fill="#7d4e00" opacity="0.8" />
          <ellipse cx="54" cy="64" rx="5" ry="4" fill="#7d4e00" opacity="0.8" />
        </g>
        {/* Microscope circle */}
        <circle cx="60" cy="60" r="38" stroke="#f39c12" strokeWidth="2" fill="none" opacity="0.8" />
        <circle cx="60" cy="60" r="44" stroke="#f39c12" strokeWidth="1" fill="none" opacity="0.2" />
        {/* Vignette */}
        <radialGradient id="vig">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="#0d0d1a" stopOpacity="0.8" />
        </radialGradient>
        <circle cx="60" cy="60" r="44" fill="url(#vig)" />
      </svg>
    ),
  },
  {
    id: 'physics',
    name: "Snell's Law & Refraction",
    subject: 'Physics',
    color: '#3498db',
    accent: '#5dade2',
    desc: "Bend light through glass. Discover total internal reflection. Feel Snell's Law.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Red laser beam bending through a glass block, illustrating Snell's Law" style={{ width: '100%', height: '100%' }}>
        <defs>
          <filter id="laser-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Dark background */}
        <rect x="0" y="0" width="120" height="120" fill="#080810" />
        {/* Glass block */}
        <rect x="40" y="30" width="45" height="60" rx="2" fill="rgba(184,212,240,0.12)" stroke="rgba(184,212,240,0.5)" strokeWidth="1.5" />
        {/* Incident ray */}
        <line x1="5" y1="35" x2="40" y2="60" stroke="#ff4444" strokeWidth="2.5" filter="url(#laser-glow)" />
        <line x1="5" y1="35" x2="40" y2="60" stroke="#ff8888" strokeWidth="1" />
        {/* Refracted ray inside glass */}
        <line x1="40" y1="60" x2="85" y2="70" stroke="#ff4444" strokeWidth="2" opacity="0.85" filter="url(#laser-glow)" />
        <line x1="40" y1="60" x2="85" y2="70" stroke="#ff8888" strokeWidth="0.8" />
        {/* Exit ray */}
        <line x1="85" y1="70" x2="115" y2="88" stroke="#ff4444" strokeWidth="2" opacity="0.7" filter="url(#laser-glow)" />
        {/* Angle arcs */}
        <path d="M 40 50 A 10 10 0 0 1 47 60" stroke="#ffcc00" strokeWidth="1.5" fill="none" opacity="0.8" />
        <path d="M 40 68 A 10 10 0 0 0 48 62" stroke="#00ccff" strokeWidth="1.5" fill="none" opacity="0.8" />
        {/* Normal line */}
        <line x1="40" y1="40" x2="40" y2="80" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />
        {/* Labels */}
        <text x="48" y="55" fill="#ffcc00" fontSize="8" opacity="0.9">θ₁</text>
        <text x="48" y="75" fill="#00ccff" fontSize="8" opacity="0.9">θ₂</text>
      </svg>
    ),
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15 + 0.3, duration: 0.5, ease: [0.4,0,0.2,1] } }),
}

export default function HomeScreen({ onStart, studentName }) {
  const [a11yOpen, setA11yOpen] = useState(false)
  const { settings } = useAccessibility()

  return (
    <div style={{ minHeight: '100vh', background: settings.dyslexia ? '#1a1408' : '#0d0d1a', position: 'relative', overflowX: 'hidden' }}>
      <ParticleField color="#6b4fff" count={70} />

      {/* Accessibility button — fixed top-right */}
      <motion.button
        onClick={() => setA11yOpen(true)}
        aria-label="Open accessibility settings"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'white', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          fontFamily: 'inherit',
        }}
      >
        ♿
      </motion.button>

      <AccessibilityPanel isOpen={a11yOpen} onClose={() => setA11yOpen(false)} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 20px 40px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ paddingTop: 60, paddingBottom: 40, textAlign: 'center' }}
        >
          {/* Logo mark */}
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(107,79,255,0.4)', '0 0 45px rgba(107,79,255,0.7)', '0 0 20px rgba(107,79,255,0.4)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 70, height: 70, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(107,79,255,0.3) 0%, rgba(107,79,255,0.05) 70%)',
              border: '2px solid rgba(107,79,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 4 L30 11 L30 25 L18 32 L6 25 L6 11 Z" stroke="#a78bfa" strokeWidth="2" fill="rgba(107,79,255,0.15)" />
              <circle cx="18" cy="18" r="5" fill="#6b4fff" opacity="0.8" />
              <circle cx="18" cy="18" r="2.5" fill="white" opacity="0.9" />
            </svg>
          </motion.div>

          <h1 className="shimmer-text" style={{ fontSize: 52, fontWeight: 900, letterSpacing: -2, marginBottom: 10, lineHeight: 1 }}>
            LabLens
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' }}>
            Your lab. Your phone. Real science.
          </p>

          {studentName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                marginTop: 20, display: 'inline-block',
                background: 'rgba(107,79,255,0.15)',
                border: '1px solid rgba(107,79,255,0.3)',
                borderRadius: 20, padding: '6px 18px',
                fontSize: 14, color: '#a78bfa',
              }}
            >
              Welcome back, {studentName} ✦
            </motion.div>
          )}
        </motion.div>

        {/* Experiment Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {experiments.map((exp, i) => (
            <motion.div
              key={exp.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileTap={{ scale: 0.97 }}
              onClick={() => onStart(exp.id)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 20,
                overflow: 'hidden',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'border-color 0.3s',
              }}
              onHoverStart={e => {}}
              whileHover={{ borderColor: exp.color + '50' }}
            >
              {/* Illustration area */}
              <div style={{
                height: 160,
                background: `radial-gradient(ellipse at center, ${exp.color}18 0%, #0d0d1a 70%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Corner glow */}
                <div style={{
                  position: 'absolute', top: -20, right: -20, width: 100, height: 100,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${exp.color}25 0%, transparent 70%)`,
                  filter: 'blur(20px)',
                }} />
                <div style={{ width: 120, height: 120 }}>
                  {exp.icon}
                </div>
                {/* Subject tag */}
                <div style={{
                  position: 'absolute', top: 14, left: 14,
                  background: exp.color + '25',
                  border: `1px solid ${exp.color}50`,
                  borderRadius: 10, padding: '4px 12px',
                  fontSize: 11, fontWeight: 600, color: exp.accent,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                }}>
                  {exp.subject}
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '18px 20px 20px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'white' }}>
                  {exp.name}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 16 }}>
                  {exp.desc}
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6b4fff, #8b5cf6)',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(107,79,255,0.4)',
                    fontFamily: 'inherit',
                  }}
                >
                  Start Experiment →
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ textAlign: 'center', marginTop: 40, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}
        >
          WitchHunt 2026 · Education Track · Powered by Gemini AI
        </motion.div>
      </div>
    </div>
  )
}
