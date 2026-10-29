const {
  SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits
} = require("discord.js");
const config = require("./config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Accept ügyfélszolgálati panel kiküldése")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const options = config.tickets.supportTypes.map((type) => ({
      label: type.label.slice(0, 100),
      value: type.value,
      description: (type.description || type.label).slice(0, 100),
      emoji: type.emoji || "🎫"
    })).slice(0, 25);

    const embed = new EmbedBuilder()
      .setColor(config.brand.color || "#168BFF")
      .setTitle("💠 ACCEPT ROLEPLAY • ÜGYFÉLSZOLGÁLAT")
      .setDescription(
        "Üdvözlünk az **Accept RolePlay ügyfélszolgálatán!**\n\n" +
        "Segítünk, hogy a felmerülő kérdésed vagy problémád a megfelelő csapathoz kerüljön. " +
        "Az alábbi menüből válaszd ki az ügyedhez leginkább illő kategóriát, és a rendszer létrehoz egy privát ticketet.\n\n" +
        "🔹 **Kérjük, egy ügyben csak egy ticketet nyiss.**\n" +
        "🔹 Írd le pontosan a problémát, és csatolj bizonyítékot, ha szükséges.\n" +
        "🔹 Kérjük, légy türelmes, amíg a csapatunk válaszol."
      )
      .addFields(
        { name: "🛡️ Adminügy", value: "Adminisztrációs vagy vezetőségi ügyek.", inline: true },
        { name: "🎧 Támogatás", value: "Segítségkérés és támogatás.", inline: true },
        { name: "🏴 Frakció probléma", value: "Frakcióval kapcsolatos ügyek.", inline: true },
        { name: "💬 Általános segítség", value: "Minden más kérdés.", inline: true }
      )
      .setFooter({ text: config.brand.footer || "Accept RolePlay • Support Team" })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket:create")
      .setPlaceholder("📩 Válaszd ki a ticket típusát…")
      .addOptions(options);

    await interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)]
    });
    await interaction.reply({ content: "✅ Az Accept ügyfélszolgálati panel sikeresen elküldve.", ephemeral: true });
  }
};
