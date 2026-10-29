const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getTickets, saveTickets } = require("../utils/storage");
const { isStaff } = require("../utils/permissions");
const { sendLog } = require("../utils/logging");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-add").setDescription("Felhasználó hozzáadása az aktuális tickethez")
    .addUserOption(o => o.setName("felhasznalo").setDescription("Hozzáadandó felhasználó").setRequired(true)),
  async execute(interaction) {
    if (!isStaff(interaction.member, config)) return interaction.reply({ content: "⛔ Staff jogosultság szükséges.", ephemeral: true });
    const ticket = getTickets().find(t => t.channelId === interaction.channelId && t.status === "open");
    if (!ticket) return interaction.reply({ content: "Ez a csatorna nem nyitott ticket.", ephemeral: true });
    const user = interaction.options.getUser("felhasznalo");
    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    ticket.addedUsers = [...new Set([...(ticket.addedUsers || []), user.id])];
    saveTickets(getTickets().map(t => t.channelId === ticket.channelId ? ticket : t));
    await sendLog(interaction.client, config, "➕ Felhasználó hozzáadva", `Ticket #${ticket.number}`, [
      { name: "Staff", value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: "Felhasználó", value: `${user.tag} (${user.id})` }
    ]);
    return interaction.reply({ content: `✅ ${user} hozzáadva a tickethez.` });
  }
};
