import { useState } from 'react'
import { motion } from 'framer-motion'
import ParticleField from './ParticleField'

export default function StudentSetup({ onDone, onBack, name: initName }) {
  const [name, setName] = useState(initName || '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) { setError('Please enter your name'); return }
    onDone({ name: name.trim() })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <ParticleField color="#6b4fff" count={40} />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: 32,
          backdropFilter: 'blur(12px)',
        }}
      >
        <motion.button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0, fontFamily: 'inherit' }}
        >
          ← Back
        </motion.button>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Ready to Experiment?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Your name will appear on your AI-generated lab report.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Your Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: 16, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Groq AI badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#7ab3f8' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              AI tutor powered by Groq · your report is generated instantly
            </span>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ color: '#ff6b6b', fontSize: 13, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '10px 14px' }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            onClick={submit}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 8, padding: '16px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6b4fff, #8b5cf6)',
              color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(107,79,255,0.45)',
              fontFamily: 'inherit',
            }}
          >
            Enter the Lab →
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
