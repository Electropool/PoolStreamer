'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadEvents(client) {
  const eventsDir = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'));
  let loaded = 0;

  for (const file of files) {
    try {
      const raw = require(path.join(eventsDir, file));
      const events = Array.isArray(raw) ? raw : [raw];

      for (const event of events) {
        if (!event.name || !event.execute) {
          logger.warn(`⚠️  Event in ${file} is missing name or execute.`);
          continue;
        }
        if (event.once) {
          client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
          client.on(event.name, (...args) => event.execute(client, ...args));
        }
        loaded++;
      }
    } catch (err) {
      logger.error(`❌ Failed to load event ${file}: ${err.message}`);
    }
  }

  logger.info(`✅ Loaded ${loaded} Discord events`);
}

module.exports = { loadEvents };
