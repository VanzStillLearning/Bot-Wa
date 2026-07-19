import { exec } from 'child_process'

const pluginConfig = {
    name: 'speedtest',
    alias: ['speed', 'ping', 'testspeed'],
    category: 'tools',
    description: 'Mengecek kecepatan internet server bot',
    usage: '.speedtest',
    example: '.speedtest',
    isOwner: false, // Bisa diganti 'true' kalau cuma lu yang boleh pakai
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15, // Dikasih cooldown biar server ga spam request
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.reply(
        `🚀 *ᴍᴇɴɢᴜᴋᴜʀ ᴋᴇᴄᴇᴘᴀᴛᴀɴ sᴇʀᴠᴇʀ...*\n\n` +
        `> _Mohon tunggu, proses ini biasanya memakan waktu 15 - 30 detik._`
    )

    // Trik dewa: Menjalankan script speedtest Python langsung dari URL tanpa perlu install module
    const cmd = 'curl -sL https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 - --simple'

    exec(cmd, async (error, stdout, stderr) => {
        if (error) {
            return m.reply(
                `❌ *ɢᴀɢᴀʟ*\n\n` +
                `> Terjadi kesalahan saat mengetes kecepatan.\n` +
                `> _${error.message}_`
            )
        }

        if (stderr && !stdout) {
            return m.reply(
                `⚠️ *ᴇʀʀᴏʀ*\n\n` +
                `> _${stderr}_`
            )
        }

        // Membersihkan output agar rapi di WA
        // Format asli dari --simple adalah:
        // Ping: 12.3 ms
        // Download: 1000.5 Mbit/s
        // Upload: 800.2 Mbit/s
        const formattedResult = stdout
            .trim()
            .split('\n')
            .map(line => `> ⚡ ${line}`)
            .join('\n')

        await m.reply(
            `📊 *sᴘᴇᴇᴅᴛᴇsᴛ ʀᴇsᴜʟᴛs*\n\n` +
            `${formattedResult}\n\n` +
            `_🖥️ Server: Ubuntu (GitHub Actions)_`
        )
    })
}

export { pluginConfig as config, handler }