const { Events } = require('discord.js');
const logger = require('../utils/logger');
const commandDebounce = require('../utils/commandDebounce');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        logger.info(`Command ${interaction.commandName} executed by ${interaction.user.tag}`);

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`Error executing command ${interaction.commandName}: ${error.message}`);
        }

        /* reintegrate when needed
        if (!commandDebounce(interaction.user.id, interaction.commandName)) {
            try {
                await interaction.reply({ content: 'Please wait a moment before using this command again.', ephemeral: true });
            } catch (error) {
                logger.error(`Failed to send cooldown message: ${error.message}`);
            }
            return;
        }
        */

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(`Error executing ${interaction.commandName}: ${error.message}`);
            
            const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
            
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(errorMessage).catch(e => {
                    logger.error(`Failed to send error followUp: ${e.message}`);
                });
            } else {
                await interaction.reply(errorMessage).catch(e => {
                    logger.error(`Failed to send error reply: ${e.message}`);
                });
            }

        }
    },
};