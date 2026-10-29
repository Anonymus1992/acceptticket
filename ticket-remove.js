const { SlashCommandBuilder } = require("discord.js");
const { getTickets, saveTickets } = require("../utils/storage");
const { isStaff } = require("../utils/permissions");
const { sendLog } = require("../utils/logging");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-remove").setDescription("Felhasználó eltávolítása az aktuális ticketből")
    .addUserOption(o => o.setName("felhasznalo").setDescription("Eltávolítandó felhasználó").setRequired(true)),
  async execute(interaction) {
    if (!isStaff(interaction.member, config)) return interaction.reply({ content: "⛔ Staff jogosultság szükséges.", ephemeral: true });
    const ticket = getTickets().find(t => t.channelId === interaction.channelId && t.status === "open");
    if (!ticket) return interaction.reply({ content: "Ez a csatorna nem nyitott ticket.", ephemeral: true });
    const user = interaction.options.getUser("felhasznalo");
    if (user.id === ticket.userId) return interaction.reply({ content: "A ticket tulajdonosát ezzel a paranccsal nem távolíthatod el.", ephemeral: true });
    await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});
    ticket.addedUsers = (ticket.addedUsers || []).filter(id => id !== user.id);
    const tickets = getTickets();
    saveTickets(tickets.map(t => t.channelId === ticket.channelId ? ticket : t));
    await sendLog(interaction.client, config, "➖ Felhasználó eltávolítva", `Ticket #${ticket.number}`, [
      { name: "Staff", value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: "Felhasználó", value: `${user.tag} (${user.id})` }
    ]);
    return interaction.reply({ content: `✅ ${user.tag} eltávolítva a ticketből.` });
  }
};
