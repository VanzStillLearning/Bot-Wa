import { exec } from 'child_process'
import os from 'os' // Tambahin import ini buat deteksi server

const pluginConfig = {
    name: 'speedtest',
    alias: ['is', 'internetspeed', 'testspeed'],
    category: 'tools',
    description: 'Mengecek kecepatan internet server bot',
    usage: '.speedtest',
    example: '.speedtest',
    isOwner: false, 
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.reply(
        `🚀 *ᴍᴇɴɢᴜᴋᴜʀ ᴋᴇᴄᴇᴘᴀᴛᴀɴ...*\n\n` +
        `> _Menggunakan Fast.com (Netflix)..._\n` +
        `> _Mohon tunggu 10-20 detik._`
    )

    // Deteksi otomatis OS dan environment
    const platform = os.platform() === 'win32' ? 'Windows' : 
                     os.platform() === 'linux' ? 'Linux' : 
                     os.platform() === 'android' ? 'Android (Termux)' : os.type()
    
    // Cek apakah lagi jalan di dalam GitHub Actions
    const isGithub = process.env.GITHUB_ACTIONS ? ' (GitHub Actions)' : ''
    
    // Gabungin info servernya
    const serverName = `${platform} ${os.release()}${isGithub}`

    // Menggunakan npx bawaan Node.js untuk mengeksekusi fast-cli
    const cmd = 'npx --yes fast-cli --upload'

    exec(cmd, async (error, stdout, stderr) => {
        if (error) {
            return m.reply(
                `❌ *ɢᴀɢᴀʟ*\n\n` +
                `> Terjadi kesalahan saat mengetes kecepatan.\n` +
                `> _${error.message}_`
            )
        }

        // Membersihkan teks output
        const result = stdout.trim()
            .split('\n')
            .map(line => `> ⚡ ${line}`)
            .join('\n')

        await m.reply(
            `📊 *sᴘᴇᴇᴅᴛᴇsᴛ ʀᴇsᴜʟᴛs*\n\n` +
            `${result}\n\n` +
            `_🖥️ Server: ${serverName}_` // Nah ini jadinya otomatis bro!
        )
    })
}

export { pluginConfig as config, handler }