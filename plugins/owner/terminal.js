import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const pluginConfig = {
  name: "exec",
  alias: ["$", "sh"],
  category: "owner",
  description: "Menjalankan perintah terminal Linux langsung via WhatsApp",
  usage: "$ <perintah>",
  example: "$ ls -la",
  isOwner: true, // Wajib true demi keamanan server!
  isEnabled: true,
};

async function handler(m, { text, command }) {
  // Mengambil teks setelah command (misal: $ ls -> mengambil "ls")
  let targetCommand = text || m.text.slice(command.length + 1).trim();

  if (!targetCommand) {
    return m.reply(`⚠️ Masukkan perintah terminal yang mau dijalankan!\nContoh: \`$ ls -la\``);
  }

  await m.react("⚙️");

  try {
    // Menjalankan perintah di sistem VPS (timeout 2 menit)
    const { stdout, stderr } = await execPromise(targetCommand, { timeout: 120000 });
    
    let output = "";
    if (stdout) output += stdout;
    if (stderr) output += `\n[STDERR]:\n${stderr}`;

    if (!output.trim()) {
      output = "Perintah berhasil dieksekusi tanpa output teks.";
    }

    // Batasi teks jika terlalu panjang agar tidak nge-spam chat WhatsApp
    if (output.length > 3500) {
      output = output.slice(0, 3500) + "\n\n... (Output dipotong karena terlalu panjang)";
    }

    await m.reply(`💻 *TERMINAL OUTPUT*\n\n\`\`\`${output}\`\`\``);
    await m.react("✅");
  } catch (err) {
    await m.react("❌");
    await m.reply(`❌ *EXEC ERROR*\n\n\`\`\`${err.message}\`\`\``);
  }
}

export { pluginConfig as config, handler };