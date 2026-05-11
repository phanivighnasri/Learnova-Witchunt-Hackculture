const safe = (fn) => { try { fn() } catch (_) {} }

const haptics = {
  tap:         () => safe(() => navigator.vibrate?.(10)),
  success:     () => safe(() => navigator.vibrate?.([50, 30, 80])),
  warning:     () => safe(() => navigator.vibrate?.([100, 50, 100, 50, 200])),
  pour:        () => safe(() => navigator.vibrate?.(20)),
  shake:       () => safe(() => navigator.vibrate?.([30, 10, 30])),
  achievement: () => safe(() => navigator.vibrate?.([50, 30, 50, 30, 50, 30, 200])),
  error:       () => safe(() => navigator.vibrate?.([200])),
}

export default haptics
