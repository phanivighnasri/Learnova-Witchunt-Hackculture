let sharedCtx = null

const getCtx = () => {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume()
  return sharedCtx
}

const tone = (freq, duration, type = 'sine', volume = 0.08) => {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (_) {}
}

let pourOsc = null
let pourGain = null
let pourCtx = null

const audio = {
  startPour: (rate = 0.5) => {
    try {
      if (pourOsc) return
      pourCtx = new (window.AudioContext || window.webkitAudioContext)()
      pourOsc = pourCtx.createOscillator()
      pourGain = pourCtx.createGain()
      pourOsc.connect(pourGain)
      pourGain.connect(pourCtx.destination)
      pourOsc.frequency.value = 600 + rate * 400
      pourOsc.type = 'sine'
      pourGain.gain.value = 0.018
      pourOsc.start()
    } catch (_) {}
  },

  updatePour: (rate) => {
    try {
      if (pourOsc && pourCtx) {
        pourOsc.frequency.setValueAtTime(600 + rate * 400, pourCtx.currentTime)
      }
    } catch (_) {}
  },

  stopPour: () => {
    try {
      if (pourOsc) { pourOsc.stop(); pourOsc = null }
      if (pourCtx) { pourCtx.close(); pourCtx = null }
      pourGain = null
    } catch (_) {}
  },

  bubble: () => {
    try {
      const ctx = getCtx()
      const bufLen = Math.floor(ctx.sampleRate * 0.1)
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen) * 0.8
      }
      const src = ctx.createBufferSource()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      filter.type = 'bandpass'
      filter.frequency.value = 1000 + Math.random() * 600
      filter.Q.value = 2
      gain.gain.value = 0.18
      src.buffer = buf
      src.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      src.start()
    } catch (_) {}
  },

  // Three ascending tones: 523, 659, 784 Hz — success chime
  success: () => {
    try {
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.22, 'sine', 0.08), i * 160)
      })
    } catch (_) {}
  },

  wrong: () => tone(200, 0.22, 'square', 0.05),

  reading: () => tone(880, 0.12, 'sine', 0.06),
}

export default audio
