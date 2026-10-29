const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTickets } = require("../utils/storage");
const { isStaff } = require("../utils/permissions");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder().setName("ticket-stats").setDescription("Ticketstatisztikák megtekintése"),
  async execute(interaction) {
    if (!isStaff(interaction.member, config)) {
      return interaction.reply({ content: "⛔ Ehhez a parancshoz staff jogosultság szükséges.", ephemeral: true });
    }
    const tickets = getTickets();
    const open = tickets.filter(t => t.status === "open").length;
    const closed = tickets.filter(t => t.status === "closed").length;
    const claimed = tickets.filter(t => t.status === "open" && t.claimedBy).length;
    const embed = new EmbedBuilder().setColor(config.brand.color)
      .setTitle("📊 Accept Ticket Statisztikák")
      .addFields(
        { name: "Összes ticket", value: String(tickets.length), inline: true },
        { name: "Nyitott", value: String(open), inline: true },
        { name: "Lezárt", value: String(closed), inline: true },
        { name: "Felvett / claimelt", value: String(claimed), inline: true }
      ).setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
