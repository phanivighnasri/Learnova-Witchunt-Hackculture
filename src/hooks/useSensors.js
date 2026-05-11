import { useState, useEffect, useRef } from 'react'

const useSensors = () => {
  const gammaRef = useRef(0)
  const magRef = useRef(9.8)
  const historyRef = useRef([])
  const lastShakeRef = useRef(0)

  const [sensorData, setSensorData] = useState({
    gamma: 0,
    beta: 0,
    magnitude: 9.8,
    isPouring: false,
    pourRate: 0,
    isShaking: false,
    isSteady: false,
    isActive: false,
  })

  useEffect(() => {
    const onOrientation = (e) => {
      if (e.gamma === null || e.gamma === undefined) return

      gammaRef.current = 0.7 * gammaRef.current + 0.3 * e.gamma
      const g = gammaRef.current
      const pouring = Math.abs(g) > 25
      const pourRate = pouring ? Math.min((Math.abs(g) - 25) / 45, 1) : 0

      setSensorData(prev => ({
        ...prev,
        gamma: g,
        beta: e.beta || 0,
        isPouring: pouring,
        pourRate,
        isActive: true,
      }))
    }

    const onMotion = (e) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x === null) return

      const raw = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2)
      magRef.current = 0.6 * magRef.current + 0.4 * raw
      const mag = magRef.current

      historyRef.current.push(mag)
      if (historyRef.current.length > 20) historyRef.current.shift()
      const avg = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length
      const variance = historyRef.current.reduce((s, v) => s + Math.abs(v - avg), 0) / historyRef.current.length
      const steady = variance < 1.2 && historyRef.current.length >= 20

      const now = Date.now()
      const shaking = mag > 22 && now - lastShakeRef.current > 600
      if (shaking) {
        lastShakeRef.current = now
        try { navigator.vibrate?.([40, 20, 40]) } catch (_) {}
      }

      setSensorData(prev => ({
        ...prev,
        magnitude: mag,
        isShaking: shaking,
        isSteady: steady,
        isActive: true,
      }))
    }

    window.addEventListener('deviceorientation', onOrientation, true)
    window.addEventListener('devicemotion', onMotion, true)

    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true)
      window.removeEventListener('devicemotion', onMotion, true)
    }
  }, [])

  return sensorData
}

export default useSensors
