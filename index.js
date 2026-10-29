require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const {
  Client, GatewayIntentBits, Partials, ChannelType, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder
} = require("discord.js");
const config = require("./config.json");
const { getTickets, saveTickets, nextTicketNumber } = require("./storage");
const { isStaff, isAdmin } = require("./permissions");
const { sendLog, makeEmbed } = require("./logging");
const { createTranscript } = require("./transcript");

if (!process.env.DISCORD_TOKEN) throw new Error("Hiányzik a DISCORD_TOKEN a .env fájlból.");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message]
});

const commandFiles = ["ticket-panel.js", "ticket-add.js", "ticket-remove.js", "ticket-stats.js"];
const commands = new Map(commandFiles.map(file => {
  const command = require(path.join(__dirname, file));
  return [command.data.name, command];
}));

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel("Claim").setEmoji("🛡️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Lezárás").setEmoji("🔒").setStyle(ButtonStyle.Danger)
  );
}

function getTicketByChannel(channelId) {
  return getTickets().find(t => t.channelId === channelId && t.status === "open");
}

async function createTicket(interaction, type) {
  const category = config.tickets.supportTypes.find(t => t.value === type);
  if (!category) return interaction.reply({ content: "Ismeretlen ticketkategória.", ephemeral: true });

  const allTickets = getTickets();
  const active = allTickets.filter(t => t.userId === interaction.user.id && t.guildId === interaction.guildId && t.status === "open");
  if (active.length >= (config.tickets.maxOpenPerUser || 2)) {
    return interaction.reply({ content: `Már van ${active.length} nyitott ticketed. Előbb zárd le valamelyiket.`, ephemeral: true });
  }

  // Each ticket type can have its own Discord category. If a type-specific ID
  // is not configured, fall back to the legacy shared ticketCategoryId.
  const typeCategoryId = config.channels.ticketCategoryIds?.[type];
  const fallbackCategoryId = config.channels.ticketCategoryId;
  const categoryId = typeCategoryId && !typeCategoryId.startsWith("PASTE_")
    ? typeCategoryId
    : fallbackCategoryId;
  const parent = categoryId && !categoryId.startsWith("PASTE_") ? categoryId : null;
  const number = nextTicketNumber();
  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 18) || "user";
  const overwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] }
  ];
  const roleIds = [...new Set([...(config.roles.staffRoleIds || []), ...(config.roles.adminRoleIds || [])])]
    .filter(id => id && !id.startsWith("PASTE_"));
  for (const roleId of roleIds) {
    overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] });
  }

  let channel;
  try {
    channel = await interaction.guild.channels.create({
      name: `${config.tickets.namePrefix || "ticket"}-${String(number).padStart(4, "0")}-${safeName}`.slice(0, 100),
      type: ChannelType.GuildText,
      parent,
      topic: `Accept ticket #${number} | tulajdonos: ${interaction.user.id} | kategória: ${category.label}`,
      permissionOverwrites: overwrites,
      reason: `Ticket létrehozva: ${interaction.user.tag}`
    });
  } catch (error) {
    console.error("Ticketcsatorna létrehozása sikertelen:", error);
    return interaction.reply({ content: "Nem sikerült létrehozni a ticketet. Ellenőrizd a bot jogosultságait és a kategóriaazonosítót.", ephemeral: true });
  }

  const ticket = {
    number, guildId: interaction.guildId, channelId: channel.id,
    userId: interaction.user.id, username: interaction.user.tag,
    type, typeLabel: category.label, status: "open",
    createdAt: new Date().toISOString(), claimedBy: null, closedBy: null,
    addedUsers: []
  };
  allTickets.push(ticket);
  saveTickets(allTickets);

  const embed = new EmbedBuilder()
    .setColor(config.brand.color || "#168BFF")
    .setTitle(`${category.emoji || "🎫"} ${category.label} • #${number}`)
    .setDescription(
      `Szia ${interaction.user}!\n\n` +
      `Köszönjük, hogy az **Accept RolePlay** ügyfélszolgálatához fordultál. A csapatunk hamarosan foglalkozik az ügyeddel.\n\n` +
      `**Kérjük, írd le részletesen a problémát**, és ha releváns, mellékelj képernyőképet vagy egyéb bizonyítékot.\n\n` +
      `> **Ticket azonosító:** \`#${number}\`\n` +
      `> **Kategória:** ${category.label}\n` +
      `> **Állapot:** 🟢 Nyitva`
    )
    .addFields(
      { name: "🔒 Privát ügyintézés", value: "Ezt a csatornát kizárólag te és a megfelelő jogosultságú stafftagok láthatják.", inline: true },
      { name: "📌 Fontos", value: "Kérjük, maradj ennél az egy ticketnél, és várd meg a staff válaszát.", inline: true }
    )
    .setFooter({ text: config.brand.footer || config.brand.name })
    .setTimestamp();

  await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [ticketButtons()] });
  await interaction.reply({ content: `✅ Elkészült a ticketed: ${channel}`, ephemeral: true });
  await sendLog(client, config, "🎫 Ticket megnyitva", `Új ticket: #${number}`, [
    { name: "Felhasználó", value: `${interaction.user.tag} (${interaction.user.id})` },
    { name: "Kategória", value: category.label, inline: true },
    { name: "Csatorna", value: `${channel}`, inline: true }
  ]);
}

async function closeTicket(interaction, ticket) {
  const isOwner = ticket.userId === interaction.user.id;
  if (!isOwner && !isStaff(interaction.member, config)) {
    return interaction.reply({ content: "⛔ Csak a ticket tulajdonosa vagy a staff zárhatja le.", ephemeral: true });
  }
  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:close-confirm").setLabel("Igen, lezárom").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ticket:close-cancel").setLabel("Mégse").setStyle(ButtonStyle.Secondary)
  );
  return interaction.reply({ content: "Biztosan le szeretnéd zárni ezt a ticketet?", components: [confirmRow], ephemeral: true });
}

async function finalizeClose(interaction, ticket) {
  await interaction.deferReply({ ephemeral: true });
  ticket.status = "closed";
  ticket.closedAt = new Date().toISOString();
  ticket.closedBy = interaction.user.id;
  ticket.closedByTag = interaction.user.tag;

  let transcript = null;
  try {
    transcript = await createTranscript(interaction.channel, ticket, config);
  } catch (error) {
    console.error("Transcript készítési hiba:", error);
  }

  const tickets = getTickets();
  saveTickets(tickets.map(t => t.channelId === ticket.channelId ? ticket : t));

  const transcriptChannelId = config.channels.transcriptLogChannelId;
  if (transcript && transcriptChannelId && !transcriptChannelId.startsWith("PASTE_")) {
    const logChannel = await client.channels.fetch(transcriptChannelId).catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({
        embeds: [makeEmbed(config, `📄 Ticket #${ticket.number} transcript`, `A ticket lezárult. Üzenetek: ${transcript.messageCount}`, [
          { name: "Tulajdonos", value: `${ticket.username} (${ticket.userId})` },
          { name: "Lezárta", value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: "Kategória", value: ticket.typeLabel || ticket.type }
        ])],
        files: [{ attachment: transcript.fullPath, name: transcript.filename }]
      }).catch(e => console.error("Transcript feltöltése sikertelen:", e.message));
    }
  }

  await sendLog(client, config, "🔒 Ticket lezárva", `Ticket #${ticket.number}`, [
    { name: "Tulajdonos", value: `${ticket.username} (${ticket.userId})` },
    { name: "Lezárta", value: `${interaction.user.tag} (${interaction.user.id})` },
    { name: "Claimelte", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Nem volt claimelve" },
    { name: "Transcript", value: transcript ? transcript.filename : "Nem sikerült elkészíteni" }
  ]);

  await interaction.editReply({ content: `✅ Ticket #${ticket.number} lezárva.${transcript ? " A HTML-transcript elkészült." : " Figyelem: a transcript készítése sikertelen volt."}`, components: [] });

  const channel = interaction.channel;
  const closeEmbed = makeEmbed(config, `🔒 Ticket #${ticket.number} lezárva`, `Lezárta: ${interaction.user}\nA csatorna archiválásra kerül.`);
  await channel.send({ embeds: [closeEmbed] }).catch(() => {});
  if (config.tickets.deleteAfterClose) {
    const delay = Math.max(0, Number(config.tickets.closeDeleteDelaySeconds) || 8) * 1000;
    setTimeout(() => channel.delete("Lezárt Accept ticket").catch(() => {}), delay);
  } else {
    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false, ViewChannel: true, ReadMessageHistory: true }).catch(() => {});
    await channel.setName(`closed-${ticket.number}`.slice(0, 100)).catch(() => {});
    const reopenRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket:reopen").setLabel("Újranyitás").setEmoji("🔓").setStyle(ButtonStyle.Success)
    );
    await channel.send({ content: "A ticket lezárult. Stafftag a gombbal újranyithatja.", components: [reopenRow] }).catch(() => {});
  }
}

client.once("clientReady", () => {
  console.log(`✅ ${client.user.tag} elindult. Accept Ticket System v1.0`);
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket:create") {
      await createTicket(interaction, interaction.values[0]);
      return;
    }

    if (!interaction.isButton()) return;
    const id = interaction.customId;
    const ticket = getTickets().find(t => t.channelId === interaction.channelId);

    if (id === "ticket:close-cancel") {
      return interaction.update({ content: "Lezárás megszakítva.", components: [] });
    }
    if (!ticket) return interaction.reply({ content: "Nem található ticketadat ehhez a csatornához.", ephemeral: true });

    if (id === "ticket:claim") {
      if (!isStaff(interaction.member, config)) return interaction.reply({ content: "⛔ Csak staff claimelhet ticketet.", ephemeral: true });
      if (ticket.status !== "open") return interaction.reply({ content: "Ez a ticket már le van zárva.", ephemeral: true });
      if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !isAdmin(interaction.member, config)) {
        return interaction.reply({ content: `Ezt a ticketet már <@${ticket.claimedBy}> felvette. Admin átveheti.`, ephemeral: true });
      }
      ticket.claimedBy = interaction.user.id;
      ticket.claimedAt = new Date().toISOString();
      saveTickets(getTickets().map(t => t.channelId === ticket.channelId ? ticket : t));
      await sendLog(client, config, "🛡️ Ticket claimelve", `Ticket #${ticket.number}`, [
        { name: "Staff", value: `${interaction.user.tag} (${interaction.user.id})` }
      ]);
      return interaction.reply({ content: `🛡️ ${interaction.user} felvette a ticketet.` });
    }

    if (id === "ticket:close") return closeTicket(interaction, ticket);

    if (id === "ticket:close-confirm") {
      if (ticket.status !== "open") return interaction.update({ content: "Ez a ticket már le van zárva.", components: [] });
      return finalizeClose(interaction, ticket);
    }

    if (id === "ticket:reopen") {
      if (!isStaff(interaction.member, config)) return interaction.reply({ content: "⛔ Csak staff nyithatja újra.", ephemeral: true });
      if (ticket.status !== "closed") return interaction.reply({ content: "A ticket nincs lezárva.", ephemeral: true });
      ticket.status = "open";
      ticket.reopenedAt = new Date().toISOString();
      ticket.reopenedBy = interaction.user.id;
      saveTickets(getTickets().map(t => t.channelId === ticket.channelId ? ticket : t));
      await interaction.channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
      await interaction.channel.setName(`${config.tickets.namePrefix || "ticket"}-${String(ticket.number).padStart(4, "0")}`).catch(() => {});
      await sendLog(client, config, "🔓 Ticket újranyitva", `Ticket #${ticket.number}`, [
        { name: "Staff", value: `${interaction.user.tag} (${interaction.user.id})` }
      ]);
      return interaction.reply({ content: `✅ Ticket #${ticket.number} újranyitva.` });
    }
  } catch (error) {
    console.error("Interakciós hiba:", error);
    const reply = { content: "Váratlan hiba történt. Ellenőrizd a bot konzolját és a konfigurációt.", ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(reply).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

client.on("messageDelete", async message => {
  if (!message.guild || message.author?.bot) return;
  const ticket = getTickets().find(t => t.channelId === message.channelId);
  if (!ticket) return;
  await sendLog(client, config, "🗑️ Üzenet törölve ticketből", `Ticket #${ticket.number}`, [
    { name: "Szerző", value: message.author ? `${message.author.tag} (${message.author.id})` : "Ismeretlen" },
    { name: "Üzenet ID", value: message.id },
    { name: "Tartalom", value: (message.content || "Nincs szöveges tartalom").slice(0, 1000) }
  ]);
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  const ticket = getTickets().find(t => t.channelId === newMessage.channelId);
  if (!ticket || oldMessage.content === newMessage.content) return;
  await sendLog(client, config, "✏️ Üzenet szerkesztve ticketben", `Ticket #${ticket.number}`, [
    { name: "Szerző", value: newMessage.author ? `${newMessage.author.tag} (${newMessage.author.id})` : "Ismeretlen" },
    { name: "Előtte", value: (oldMessage.content || "Nincs tartalom").slice(0, 900) },
    { name: "Utána", value: (newMessage.content || "Nincs tartalom").slice(0, 900) }
  ]);
});

client.login(process.env.DISCORD_TOKEN);
