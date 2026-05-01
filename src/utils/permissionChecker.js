'use strict';

const { PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');
const logger = require('./logger');
const config = require('../../config.json');

/**
 * Check if a member has admin-level permissions.
 */
function isAdmin(member) {
  if (!member) return false;
  if (member.id === process.env.OWNER_ID) return true;
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

/**
 * Check if a member is the bot owner.
 */
function isOwner(member) {
  return member?.id === process.env.OWNER_ID;
}

/**
 * Full permission check for music commands.
 * Returns { allowed: boolean, reason: string }
 */
async function checkMusicPermission(interaction) {
  const { member, guild, channel } = interaction;

  // Owner always passes
  if (isOwner(member)) return { allowed: true };

  let settings;
  try {
    settings = await GuildSettings.findOne({ guildId: guild.id });
  } catch (err) {
    logger.error(`Permission check DB error: ${err.message}`);
    return { allowed: true }; // Fail open so music still works
  }

  if (!settings) return { allowed: true };

  // Check if user is blacklisted
  if (settings.blacklist?.users?.includes(member.id)) {
    return { allowed: false, reason: 'You are blacklisted from using music commands.' };
  }

  // Check if channel is blacklisted
  if (settings.blacklist?.channels?.includes(channel.id)) {
    return { allowed: false, reason: 'Music commands are disabled in this channel.' };
  }

  // Check whitelist (if enabled, only whitelisted channels/users can use commands)
  const hasChannelWhitelist = settings.whitelist?.channels?.length > 0;
  const hasUserWhitelist = settings.whitelist?.users?.length > 0;

  if (hasChannelWhitelist && !settings.whitelist.channels.includes(channel.id)) {
    return { allowed: false, reason: 'Music commands can only be used in whitelisted channels.' };
  }

  if (hasUserWhitelist) {
    const isWhitelistedUser = settings.whitelist.users.includes(member.id);
    const isDJ = await hasDJRole(member, settings);
    const isAdminMember = isAdmin(member);
    if (!isWhitelistedUser && !isDJ && !isAdminMember) {
      return { allowed: false, reason: 'Only whitelisted users can use music commands.' };
    }
  }

  return { allowed: true };
}

/**
 * Check if a member has a DJ role.
 */
async function hasDJRole(member, settings) {
  if (!settings?.djRoles?.length) return false;
  return member.roles.cache.some((r) => settings.djRoles.includes(r.id));
}

/**
 * Check if a member can perform DJ-level actions (skip other's songs, etc.).
 */
async function canDJ(member, guild) {
  if (isOwner(member) || isAdmin(member)) return true;

  let settings;
  try {
    settings = await GuildSettings.findOne({ guildId: guild.id });
  } catch {
    return false;
  }

  if (!settings?.djRoles?.length) return true; // No DJ roles set → everyone can DJ
  return hasDJRole(member, settings);
}

/**
 * Check if member is in the same VC as the bot.
 */
function isInSameVoiceChannel(member, guild) {
  const botVC = guild.members.me?.voice?.channel;
  const userVC = member.voice?.channel;
  if (!botVC) return true; // Bot not in VC, user can summon it
  if (!userVC) return false;
  return botVC.id === userVC.id;
}

module.exports = {
  isAdmin,
  isOwner,
  checkMusicPermission,
  hasDJRole,
  canDJ,
  isInSameVoiceChannel,
};
