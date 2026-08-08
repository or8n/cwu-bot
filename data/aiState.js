const states = new Map();

module.exports = {
  get: (channelId) => states.get(String(channelId)) || {},
  set: (channelId, value) => states.set(String(channelId), value),
  remove: (channelId) => states.delete(String(channelId)),
};
