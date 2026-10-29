const fs = require("node:fs/promises");
const path = require("node:path");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

async function createTranscript(channel, ticket, config) {
  const messages = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) }).catch(() => null);
    if (!batch?.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100 || messages.length >= 5000) break;
  }
  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const rows = messages.map((m) => {
    const body = escapeHtml(m.content || "");
    const attachments = [...m.attachments.values()].map((a) =>
      `<div class="attachment"><a href="${escapeHtml(a.url)}">${escapeHtml(a.name || "Csatolmány")}</a></div>`
    ).join("");
    const embeds = m.embeds.map((e) =>
      `<div class="attachment">Beágyazott tartalom${e.title ? ": " + escapeHtml(e.title) : ""}</div>`
    ).join("");
    return `<article class="message">
      <div class="meta"><strong>${escapeHtml(m.author?.tag || "Ismeretlen felhasználó")}</strong>
      <span>${new Date(m.createdTimestamp).toLocaleString("hu-HU")}</span></div>
      <div class="body">${body || "<em>(nincs szöveges tartalom)</em>"}</div>${attachments}${embeds}
    </article>`;
  }).join("\n");

  const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Accept Ticket #${ticket.number} transcript</title>
  <style>
  :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#080d18;color:#e8f1ff;font:15px/1.5 system-ui,Segoe UI,sans-serif}
  header{padding:28px max(20px,calc((100% - 900px)/2));background:linear-gradient(120deg,#071d3b,#102b52);border-bottom:1px solid #168bff}
  main{max-width:900px;margin:24px auto;padding:0 16px}.message{background:#101a2b;border:1px solid #233550;border-radius:12px;padding:14px 16px;margin:12px 0;overflow-wrap:anywhere}
  .meta{display:flex;gap:12px;justify-content:space-between;color:#a8c3e8;flex-wrap:wrap}.meta strong{color:#fff}.body{white-space:pre-wrap;margin-top:8px}
  .attachment{margin-top:8px}.attachment a{color:#69b7ff}.muted{color:#9db2cf}
  </style></head><body><header><h1>Accept Ticket #${ticket.number}</h1>
  <div>Nyitotta: ${escapeHtml(ticket.username)} (${escapeHtml(ticket.userId)})</div>
  <div>Lezárta: ${escapeHtml(ticket.closedByTag || "—")} • Kategória: ${escapeHtml(ticket.typeLabel || ticket.type)}</div>
  <div class="muted">Exportálva: ${new Date().toLocaleString("hu-HU")}</div></header>
  <main>${rows || "<p>Nem található üzenet.</p>"}</main></body></html>`;

  const dir = path.join(__dirname, "../../transcripts");
  await fs.mkdir(dir, { recursive: true });
  const filename = `ticket-${ticket.number}-${Date.now()}.html`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, html, "utf8");
  return { filename, fullPath, messageCount: messages.length };
}

module.exports = { createTranscript };
