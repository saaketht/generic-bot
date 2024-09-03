const cache = new Map();

exports.rateLimiter = (userId, commandName, limit, timeWindow) => {
    const key = `${userId}-${commandName}`;
    const now = Date.now();
    let userHistory = cache.get(key) || [];
    
    userHistory = userHistory.filter(timestamp => now - timestamp < timeWindow);
    
    if (userHistory.length >= limit) {
        logger.warn(`Rate limit exceeded for user ${userId} on command ${commandName}`);
        return false; // Rate limit exceeded
    }
    
    userHistory.push(now);
    cache.set(key, userHistory);
    return true; // Command allowed
}