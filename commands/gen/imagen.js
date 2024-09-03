const Replicate = require('replicate');
const logger = require('../../utils/logger');
const { SlashCommandBuilder } = require('discord.js');
const { rateLimiter } = require('../../utils/rateLimiter');
const { handleReplicateResponse } = require('../../utils/apiHandler');
const config = require('../../config.json');

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

  
module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagen')
        .setDescription('provides image generation')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('image generation prompt')
                .setRequired(true))
        .addBooleanOption(option =>
		    option.setName('ephemeral')
			    .setDescription('whether or not the outputs should be ephemeral')),
    async execute(interaction) {
        if (!rateLimiter(interaction.user.id, 'imagen', 5, 1)) {
            return interaction.reply({ content: 'Rate limit exceeded. Please try again later.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });
        const prompt = interaction.options.getString('prompt');
        try {
            const input = {
                prompt: prompt,
                ...config.commands.imagen
            };

            const output = await replicate.run(config.replicate.imageModel, { input });
            await handleReplicateResponse(output, interaction, 'image');
        } catch (error) {
            logger.error('Error generating image:', error);
            let errorMessage = 'An error occurred while generating the image.';
            if (error.response) {
                errorMessage += ` Status: ${error.response.status}`;
            }
            errorMessage += ' Please try again later or contact support if the issue persists.';
            await interaction.editReply(errorMessage);
        }
    },
};