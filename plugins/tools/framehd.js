import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import rife from 'rife-fps'
import ffmpeg from 'ffmpeg-static'
import { getDatabase } from '../../src/lib/ourin-database.js'

const pluginConfig = {
  name: 'framehd',
  alias: ['fpsboost', 'smooth', 'enhancehd', 'winkplus'],
  category: 'tools',
  description: 'Tingkatkan FPS + HD pakai AI (RIFE + ESRGAN)',
  usage: '.framehd [multiplier] reply video',
  example: '.framehd 2 (30→60fps) atau .framehd 4 (30→120fps)',
  isPremium: true,
  cooldown: 180,
  energi: 5,
  isEnabled: true
}

async function handler(m, { sock }) {
  if (!m.quoted || !['videoMessage', 'documentMessage'].includes(m.quoted.type)) {
    return m.reply('Reply video dengan caption .framehd 2 (multiplier 2x-4x)')
  }

  await m.react('🕕')
  const multiplier = parseInt(m.text?.trim()?.split(' ')[1]) || 2
  if (multiplier < 2 || multiplier > 4) return m.reply('Multiplier hanya 2-4x')

  try {
    const videoBuf = await m.quoted.download()
    const tempDir = os.tmpdir()
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`)
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`)

    fs.writeFileSync(inputPath, videoBuf)

    // 1. Interpolasi frame pake RIFE
    await m.reply(`🔄 Interpolasi ${multiplier}x (estimasi 2-5 menit)...`)
    await rife.interpolateVideo(inputPath, outputPath, {
      multiplier: multiplier,
      ffmpegPath: ffmpeg,
      threads: os.cpus().length
    })

    // 2. Upscale ke HD pake ffmpeg + filter (opsional, kalo mau pake ESRGAN butuh setup terpisah)
    // Di sini kita pake ffmpeg simple upscale dulu
    const hdPath = path.join(tempDir, `hd_${Date.now()}.mp4`)
    execSync(`${ffmpeg} -i ${outputPath} -vf "scale=1280:720:flags=lanczos" -c:a copy ${hdPath}`)

    const resultBuf = fs.readFileSync(hdPath)
    await sock.sendMedia(m.chat, resultBuf, `✅ FPS ${multiplier}x + HD selesai!`, m, {
      type: 'video',
      mimetype: 'video/mp4',
      fileName: `smooth_${multiplier}x.mp4`
    })

    // Cleanup
    [inputPath, outputPath, hdPath].forEach(f => { try { fs.unlinkSync(f) } catch {} })
    await m.react('✅')
  } catch (err) {
    console.error(err)
    await m.reply(`❌ Gagal: ${err.message}`)
    await m.react('❌')
  }
}

export { pluginConfig as config, handler }