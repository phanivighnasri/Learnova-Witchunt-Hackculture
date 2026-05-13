import qrcode from 'qrcode-terminal'
import { networkInterfaces } from 'os'

const nets = networkInterfaces()
let ip = 'localhost'

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ip = net.address
    }
  }
}

const url = `http://${ip}:3000`
console.log('\n\x1b[35m🔬 Learnova\x1b[0m — ready for mobile testing')
console.log(`\x1b[36m   Local:   \x1b[0mhttp://localhost:3000`)
console.log(`\x1b[36m   Network: \x1b[0m${url}`)
console.log('\n\x1b[33m📱 Scan with your phone (same WiFi):\x1b[0m\n')
qrcode.generate(url, { small: true })
console.log()
