const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { setupMessageListener } = require('./events/messageCreate/chatbotHandler');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./utils/logger');
require('dotenv').config()

// instantiate client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});
client.commands = new Collection();

// access 'commands' folder and read enclosed folders
const commandsPath = path.join(__dirname, 'commands');
const commandDirs = fs.readdirSync(commandsPath);

for (const dir of commandDirs) {
    // read each command within each enclosed command folder
    const commandPath = path.join(commandsPath, dir);
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandPath, file);
        const command = require(filePath); // import each command to index.js
        // set new item in Collection with command name as key and exported module as value
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}
logger.info(`Loaded ${client.commands.size} commands`);

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Set up the message listener
setupMessageListener(client);

process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error);
});

client.login(process.env.token);