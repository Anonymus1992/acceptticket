const { EmbedBuilder } = require("discord.js");

function makeEmbed(config, title, description) {
  return new EmbedBuilder()
    .setColor(config.brand.color || "#168BFF")
    .setTitle(title)
    .setDescription(description || "—")
    .setFooter({ text: config.brand.footer || config.brand.name })
    .setTimestamp();
}

async function sendLog(client, config, title, description, fields = []) {
  const channelId = config.channels.logChannelId;
  if (!channelId || channelId.startsWith("PASTE_")) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const embed = makeEmbed(config, title, description);
  if (fields.length) embed.addFields(fields.slice(0, 25));
  await channel.send({ embeds: [embed] }).catch((e) => console.error("Logküldési hiba:", e.message));
}

module.exports = { makeEmbed, sendLog };
