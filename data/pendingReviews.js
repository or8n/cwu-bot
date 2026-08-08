const pending = new Map();

module.exports = {
  get: (userId) => pending.get(String(userId)),
  set: (userId, value) => pending.set(String(userId), value),
  remove: (userId) => pending.delete(String(userId)),
  has: (userId) => pending.has(String(userId)),
};
