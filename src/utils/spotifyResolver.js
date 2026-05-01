'use strict';

const logger = require('./logger');

/**
 * Detects if a string is a Spotify URL.
 */
function isSpotifyUrl(query) {
  return query.includes('open.spotify.com');
}

/**
 * Parses a Spotify URL to extract track/album/playlist info.
 * For production, we use a simple regex approach or a library.
 * Since the requirement is "Convert to YouTube search", we focus on tracks.
 */
function getSpotifyType(query) {
  if (query.includes('/track/')) return 'track';
  if (query.includes('/album/')) return 'album';
  if (query.includes('/playlist/')) return 'playlist';
  return null;
}

/**
 * For a production bot, we'd ideally use the Spotify API to get metadata.
 * If the user didn't provide Spotify API keys, we can use a scraper or a plugin.
 * However, the requirement says "Spotify links must be converted to YouTube search".
 * 
 * Logic:
 * 1. Kazagumo's search engine usually handles this if configured, 
 *    but we will implement a fallback if it fails.
 */

module.exports = {
  isSpotifyUrl,
  getSpotifyType,
};
