'use strict';

const config = require('../../config.json');

const { antiSpamThreshold, antiSpamWindow, commandCooldown } = config.permissions;

/**
 * Check command cooldown. Returns ms remaining if on cooldown, else 0.
 */
function checkCooldown(client, userId, commandName) {
  if (!client.cooldowns.has(commandName)) {
    client.cooldowns.set(commandName, new Map());
  }

  const timestamps = client.cooldowns.get(commandName);
  const now = Date.now();

  if (timestamps.has(userId)) {
    const expiry = timestamps.get(userId) + commandCooldown;
    if (now < expiry) return expiry - now;
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), commandCooldown);
  return 0;
}

/**
 * Anti-spam check. Returns true if user is spamming.
 */
function isSpamming(client, userId) {
  const now = Date.now();

  if (!client.spamMap.has(userId)) {
    client.spamMap.set(userId, []);
  }

  const timestamps = client.spamMap.get(userId);

  // Remove timestamps outside the window
  const filtered = timestamps.filter((t) => now - t < antiSpamWindow);
  filtered.push(now);
  client.spamMap.set(userId, filtered);

  return filtered.length > antiSpamThreshold;
}

module.exports = { checkCooldown, isSpamming };
