const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
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
    },
};