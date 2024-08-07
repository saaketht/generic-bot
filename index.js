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

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    console.log(`interaction ${interaction} initiated by ${interaction.user.username}`);

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} found`)
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'there was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'there was an error while executing this command!', ephemeral: true });
        }
    }
})

// run once when client is 'ready'
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// login
client.login(process.env.token);