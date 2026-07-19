import clc from 'cli-color';
import fs from 'fs';
import { isImageMessage, downloadAndSaveMedia, readWhitelist } from '../lib/utils.js';

global.jpmStop = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllGroups(sock) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        return Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject
        }));
    } catch (error) {
        console.error(clc.red("[ERROR] Gagal mengambil daftar grup:"), error);
        return [];
    }
}

async function jpm(sock, sender, messages, key, messageEvent) {
    const message = messageEvent.messages?.[0];
    let imagePath = null;

    if (isImageMessage(messageEvent)) {
        try {
            const filename = `${sender}.jpeg`;
            const result = await downloadAndSaveMedia(sock, message, filename);
            if (result) imagePath = `./tmp/${filename}`;
        } catch (error) {
            console.error(clc.red("[ERROR] Saat mengunduh gambar:"), error);
        }
    }

    const parts = messages.trim().split(' ');
    if (parts.length < 2) {
        return sock.sendMessage(sender, {
            text:
`🍁 *JPM - Broadcast Grup*

Cara pakai:
.jpm <pesan>

Contoh:
.jpm Selamat pagi semuanya`
        });
    }

    const text = parts.slice(1).join(' ');
    if (!text) {
        return sock.sendMessage(sender, {
            text: "🍁 Pesan tidak boleh kosong."
        });
    }

    const allGroups = await getAllGroups(sock);
    if (!allGroups.length) {
        return sock.sendMessage(sender, {
            text: "🍁 Bot tidak berada di grup mana pun."
        });
    }

    const whitelist = readWhitelist();
    const targetGroups = whitelist
        ? allGroups.filter(group => !whitelist.includes(group.id))
        : allGroups;

    if (targetGroups.length === 0) {
        return sock.sendMessage(sender, {
            text: "🍁 Semua grup berada dalam daftar pengecualian."
        });
    }

    await sock.sendMessage(sender, {
        text:
`🍁 *JPM TELAH DIMULAI*

📢 Target Grup : ${targetGroups.length}
⏳ Delay       : ${global.jeda || 5000} ms

Mohon tunggu sampai selesai...`
    });

    let groupCount = 1;

    for (const group of targetGroups) {

    if (global.jpmStop) {
        await sock.sendMessage(sender, {
            text: `🍁 *JPM DIHENTIKAN*`
        });
        global.jpmStop = false;
        return;
    }

    console.log(clc.green(`[${groupCount}/${targetGroups.length}] Mengirim ke grup: ${group.name}`));

    try {
        await Promise.race([
            sock.sendMessage(
                group.id,
                imagePath
                    ? { image: fs.readFileSync(imagePath), caption: text }
                    : { text }
            ),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout saat mengirim pesan')), 10000)
            )
        ]);
    } catch (error) {
        console.error(clc.red(`[ERROR] Gagal mengirim ke grup ${group.name}:`));
    }

    let delay = global.jeda || 5000;
    let interval = 1000;

    for (let i = 0; i < delay; i += interval) {

        if (global.jpmStop) {
    global.jpmStop = false;
    return;
}

        await sleep(interval);
    }

    groupCount++;
}

    return sock.sendMessage(sender, {
        text:
`🍁 *JPM SELESAI*

✅ Berhasil dikirim ke ${targetGroups.length} grup.

Terima kasih telah menggunakan broadcast.`
    });
}

export default jpm;