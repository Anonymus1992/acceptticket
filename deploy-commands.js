require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

for (const key of ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"]) {
  if (!process.env[key]) throw new Error(`Hiányzó .env beállítás: ${key}`);
}
const commands = [];
const dir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(dir).filter(f => f.endsWith(".js"))) {
  const command = require(path.join(dir, file));
  commands.push(command.data.toJSON());
}
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
  .then(() => console.log(`✅ ${commands.length} slash parancs regisztrálva.`))
  .catch(error => { console.error(error); process.exitCode = 1; });
