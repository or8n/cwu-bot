const tickets = new Map();

module.exports = {
  get: (channelId) => tickets.get(channelId),
  set: (channelId, ticket) => tickets.set(channelId, ticket),
  remove: (channelId) => tickets.delete(channelId),
};
