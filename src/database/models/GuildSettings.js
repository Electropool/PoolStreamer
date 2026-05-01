'use strict';

const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // DJ Roles
    djRoles: {
      type: [String],
      default: [],
    },
    // 24/7 Mode
    twentyFourSeven: {
      type: Boolean,
      default: false,
    },
    twentyFourSevenChannel: {
      type: String,
      default: null,
    },
    // Whitelist
    whitelist: {
      channels: { type: [String], default: [] },
      users: { type: [String], default: [] },
    },
    // Blacklist
    blacklist: {
      channels: { type: [String], default: [] },
      users: { type: [String], default: [] },
    },
    // Music Settings
    defaultVolume: {
      type: Number,
      default: 80,
      min: 0,
      max: 150,
    },
    autoplay: {
      type: Boolean,
      default: false,
    },
    announceNowPlaying: {
      type: Boolean,
      default: true,
    },
    // Liked songs tracking per user
    likedSongs: {
      type: Map,
      of: [String], // userId → [trackUris]
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'guild_settings',
  }
);

// ── Static Helpers ────────────────────────────────────────────────────────────

// In-memory cache to reduce DB reads
const cache = new Map();
const CACHE_TTL = 300_000; // 5 min

guildSettingsSchema.statics.getOrCreate = async function (guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.doc;

  let doc = await this.findOne({ guildId });
  if (!doc) doc = await this.create({ guildId });

  cache.set(guildId, { doc, ts: Date.now() });
  return doc;
};

guildSettingsSchema.statics.invalidateCache = function (guildId) {
  cache.delete(guildId);
};

// Invalidate cache on save
guildSettingsSchema.post('save', function () {
  cache.delete(this.guildId);
});

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

module.exports = GuildSettings;
