import { useState, useCallback } from 'react'
import { useAccessibility } from './contexts/AccessibilityContext'
import { AnimatePresence, motion } from 'framer-motion'
import HomeScreen from './components/HomeScreen'
import StudentSetup from './components/StudentSetup'
import NeutralizationExperiment from './components/experiments/NeutralizationExperiment'
import OnionMicroscopy from './components/experiments/OnionMicroscopy'
import RefractionExperiment from './components/experiments/RefractionExperiment'
import LabReport from './components/LabReport'
import SensorPermissionScreen from './components/SensorPermissionScreen'

const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}
const trans = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }

// iOS 13+ needs explicit requestPermission. Android auto-grants.
const getSensorPermStatus = () => {
  if (typeof window === 'undefined') return 'auto'
  const stored = localStorage.getItem('sensorPermission')
  if (stored) return stored
  if (typeof DeviceMotionEvent?.requestPermission === 'function') return 'needed'
  return 'auto'
}

export default function App() {
  const { settings } = useAccessibility()
  const [screen, setScreen] = useState('home')
  const [studentName, setStudentName] = useState('')
  const [pendingExp, setPendingExp] = useState(null)
  const [experimentResult, setExperimentResult] = useState(null)
  const [sensorPermStatus, setSensorPermStatus] = useState(getSensorPermStatus)

  const goToExp = useCallback((type) => {
    if (sensorPermStatus === 'needed') {
      setPendingExp(type)
      setScreen('sensorPerm')
    } else {
      setScreen(type)
    }
  }, [sensorPermStatus])

  const launchExperiment = useCallback((type) => {
    if (!studentName) { setPendingExp(type); setScreen('setup'); return }
    goToExp(type)
  }, [studentName, goToExp])

  const onSetupDone = ({ name }) => {
    setStudentName(name)
    const next = pendingExp || 'home'
    setPendingExp(null)
    if (next === 'home') { setScreen('home'); return }
    if (sensorPermStatus === 'needed') {
      setPendingExp(next)
      setScreen('sensorPerm')
    } else {
      setScreen(next)
    }
  }

  const onSensorPermDone = (status) => {
    localStorage.setItem('sensorPermission', status)
    setSensorPermStatus(status)
    const next = pendingExp || 'home'
    setPendingExp(null)
    setScreen(next)
  }

  const onExperimentComplete = (data) => {
    setExperimentResult({ ...data, studentName })
    setScreen('report')
  }

  const screens = {
    home: <HomeScreen onStart={launchExperiment} studentName={studentName} />,
    setup: <StudentSetup onDone={onSetupDone} onBack={() => setScreen('home')} name={studentName} />,
    sensorPerm: <SensorPermissionScreen onDone={onSensorPermDone} />,
    chemistry: <NeutralizationExperiment onComplete={onExperimentComplete} onBack={() => setScreen('home')} studentName={studentName} />,
    biology: <OnionMicroscopy onComplete={onExperimentComplete} onBack={() => setScreen('home')} studentName={studentName} />,
    physics: <RefractionExperiment onComplete={onExperimentComplete} onBack={() => setScreen('home')} studentName={studentName} />,
    report: experimentResult && <LabReport result={experimentResult} onTryAnother={() => setScreen('home')} />,
  }

  return (
    <div style={{ minHeight: '100vh', background: settings.dyslexia ? '#1a1408' : '#0d0d1a', color: 'white', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          variants={fade}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={trans}
          style={{ minHeight: '100vh' }}
        >
          {screens[screen] || screens.home}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
