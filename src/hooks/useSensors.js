import { useState, useEffect, useRef } from 'react'

const useSensors = () => {
  const [gamma, setGamma] = useState(0)
  const [magnitude, setMagnitude] = useState(9.8)
  const [isPouring, setIsPouring] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isSteady, setIsSteady] = useState(false)
  const [sensorActive, setSensorActive] = useState(null) // null=unknown, true, false

  const smoothGamma = useRef(0)
  const smoothMag = useRef(9.8)
  const magHistory = useRef([])
  const lastShakeTime = useRef(0)
  const shakeResetTimer = useRef(null)
  const fallbackTimer = useRef(null)
  const gotEvent = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    fallbackTimer.current = setTimeout(() => {
      if (!gotEvent.current) setSensorActive(false)
    }, 3000)

    const handleOrientation = (e) => {
      if (e.gamma === null) return
      if (!gotEvent.current) {
        gotEvent.current = true
        clearTimeout(fallbackTimer.current)
        setSensorActive(true)
      }
      smoothGamma.current = 0.75 * smoothGamma.current + 0.25 * (e.gamma || 0)
      setGamma(smoothGamma.current)
      setIsPouring(Math.abs(smoothGamma.current) > 25)
    }

    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration
      if (!acc) return

      const rawMag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2)
      smoothMag.current = 0.7 * smoothMag.current + 0.3 * rawMag
      setMagnitude(smoothMag.current)

      // Rolling variance steady detection (15-reading window)
      magHistory.current = [...magHistory.current.slice(-14), smoothMag.current]
      if (magHistory.current.length >= 15) {
        const avg = magHistory.current.reduce((a, b) => a + b, 0) / magHistory.current.length
        const variance = magHistory.current.reduce((a, b) => a + Math.abs(b - avg), 0) / magHistory.current.length
        setIsSteady(variance < 1.5)
      }

      // Shake: spike above 20 with 500ms debounce
      const now = Date.now()
      if (smoothMag.current > 20 && now - lastShakeTime.current > 500) {
        lastShakeTime.current = now
        setIsShaking(true)
        clearTimeout(shakeResetTimer.current)
        shakeResetTimer.current = setTimeout(() => setIsShaking(false), 150)
      }
    }

    window.addEventListener('deviceorientation', handleOrientation, true)
    window.addEventListener('devicemotion', handleMotion, true)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('devicemotion', handleMotion, true)
      clearTimeout(fallbackTimer.current)
      clearTimeout(shakeResetTimer.current)
    }
  }, [])

  return { gamma, magnitude, isPouring, isShaking, isSteady, sensorActive }
}

export default useSensors
