'use strict';

// CJS backwards-compatibility shim.
// Makes `require('steamcommunity')` return the SteamCommunity class directly,
// while still exposing all named exports as properties on it.
const m = require('./dist/index.js');
module.exports = m.SteamCommunity;
Object.assign(module.exports, m);
