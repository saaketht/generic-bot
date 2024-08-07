const {REST, Routes} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
dotenv.config();

const commands = [];
// get all command folders from commands dir
const folderPath = path.join(__dirname, 'commands');
const commandDirs = fs.readdirSync(folderPath);

for (const dir of commandDirs) {
    // get all command files
    const commandPath = path.join(folderPath, dir);
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
    // get json output of each command's data
    for (const file of commandFiles) {
        const filePath = path.join(commandPath, file);
        const command = require(filePath) // import command
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a "data" or "execute" property`);
        }
    }
}

// construct REST module instance
const rest = new REST().setToken(process.env.token);

// deploy commands
(async () => {
    try {
        console.log(`started refreshing ${commands.length} application (/) commands`);
        // put method is used to refresh all commands in guild w current set
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.clientId, process.env.guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();