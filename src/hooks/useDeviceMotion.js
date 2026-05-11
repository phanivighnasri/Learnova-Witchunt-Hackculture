import { useState, useEffect, useRef, useCallback } from 'react'

export default function useDeviceMotion() {
  const [tilt, setTilt] = useState(0)       // beta axis degrees
  const [gamma, setGamma] = useState(0)      // left-right tilt
  const [shake, setShake] = useState(0)      // accel magnitude
  const [hasMotion, setHasMotion] = useState(false)
  const lastMag = useRef(0)
  const shakeTimer = useRef(null)

  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEvent.requestPermission()
        return result === 'granted'
      } catch { return false }
    }
    return true
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.DeviceMotionEvent && !window.DeviceOrientationEvent) return

    const handleOrientation = (e) => {
      setHasMotion(true)
      if (e.beta != null) setTilt(e.beta)
      if (e.gamma != null) setGamma(e.gamma)
    }

    const handleMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration
      if (!a) return
      const mag = Math.sqrt((a.x||0)**2 + (a.y||0)**2 + (a.z||0)**2)
      const delta = Math.abs(mag - lastMag.current)
      lastMag.current = mag
      if (delta > 2.5) {
        setShake(delta)
        clearTimeout(shakeTimer.current)
        shakeTimer.current = setTimeout(() => setShake(0), 500)
      }
    }

    window.addEventListener('deviceorientation', handleOrientation)
    window.addEventListener('devicemotion', handleMotion)
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('devicemotion', handleMotion)
      clearTimeout(shakeTimer.current)
    }
  }, [])

  return { tilt, gamma, shake, hasMotion, requestPermission }
}
