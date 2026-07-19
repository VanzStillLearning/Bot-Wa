import { exec } from 'child_process'

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
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.reply(
        `🚀 *ᴍᴇɴɢᴜᴋᴜʀ ᴋᴇᴄᴇᴘᴀᴛᴀɴ...*\n\n` +
        `> _Menggunakan Fast.com (Netflix)..._\n` +
        `> _Mohon tunggu 15-20 detik._`
    )

    // Menggunakan npx bawaan Node.js untuk mengeksekusi fast-cli tanpa perlu install
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
            `_🖥️ Server: Ubuntu (GitHub Actions + WARP)_`
        )
    })
}

export { pluginConfig as config, handler }