const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
dotenv.config();

// instantiate client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
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
            console.log(`[WARNING] The command at ${filePath} is missing a require "data" or "execute" property.`);
        }
    }
}

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

client.login(process.env.token);