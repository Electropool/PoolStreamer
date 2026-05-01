'use strict';

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [];
const commandsDir = path.join(__dirname, 'commands');

function loadCommandsRecursive(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsRecursive(fullPath);
    } else if (entry.endsWith('.js')) {
      try {
        const raw = require(fullPath);
        const items = raw.data && raw.execute ? [raw] : Object.values(raw).filter((v) => v?.data);
        for (const cmd of items) {
          if (cmd.data) commands.push(cmd.data.toJSON());
        }
      } catch (err) {
        console.warn(`⚠️  Failed to load ${entry}: ${err.message}`);
      }
    }
  }
}

loadCommandsRecursive(commandsDir);

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Deleting global commands (to prevent duplicates)...');
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('✅ Successfully deleted global commands.');

    console.log(`🔄 Deploying ${commands.length} slash commands to guild: 860971061377630228...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, '860971061377630228'),
      { body: commands }
    );

    console.log(`✅ Successfully deployed ${data.length} commands to guild.`);
  } catch (err) {
    console.error(`❌ Deploy failed: ${err.message}`);
    process.exit(1);
  }
})();
