'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadCommands(client) {
  const commandsDir = path.join(__dirname, '../commands');
  let loaded = 0;

  const categories = fs.readdirSync(commandsDir).filter((f) =>
    fs.statSync(path.join(commandsDir, f)).isDirectory()
  );

  for (const category of categories) {
    const files = fs
      .readdirSync(path.join(commandsDir, category))
      .filter((f) => f.endsWith('.js'));

    for (const file of files) {
      try {
        const raw = require(path.join(commandsDir, category, file));
        const commands = [];

        if (raw.data && raw.execute) {
          commands.push(raw);
        } else {
          for (const key of Object.keys(raw)) {
            const cmd = raw[key];
            if (cmd && cmd.data && cmd.execute) commands.push(cmd);
          }
        }

        for (const command of commands) {
          client.commands.set(command.data.name, command);
          loaded++;
        }
      } catch (err) {
        logger.error(`Failed to load command ${file}: ${err.message}`);
      }
    }
  }

  logger.info(`✅ Loaded ${loaded} commands`);
}

module.exports = { loadCommands };
