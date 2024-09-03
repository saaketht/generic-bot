const logger = require('./logger');

const commandCooldowns = new Map();

// Convert seconds to milliseconds
const secondsToMs = (seconds) => seconds * 1000;

function commandDebounce(userId, commandName, cooldownSeconds = 3) {
    const cooldownMs = secondsToMs(cooldownSeconds);
    const key = `${userId}-${commandName}`;
    const now = Date.now();
    const lastExecution = commandCooldowns.get(key);

    if (lastExecution && now - lastExecution < cooldownTime) {
        logger.warn(`Command ${commandName} executed too quickly by user ${userId}`);
        return false;
    }

    commandCooldowns.set(key, now);
    return true;
}

module.exports = commandDebounce;