const { SlashCommandBuilder } = require('discord.js');
const Replicate = require('replicate');
const config = require('../../config');
const logger = require('../../utils/logger');
const { getFormattedDate } = require('../../utils/dateFormatter');
const { rateLimiter } = require('../../utils/rateLimiter');

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('audiogen')
        .setDescription('Generates audio based on prompts')
        .addStringOption(option =>
            option.setName('prompt_a')
                .setDescription('First audio generation prompt')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prompt_b')
                .setDescription('Second audio generation prompt (optional)'))
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Whether or not the outputs should be ephemeral')),
    async execute(interaction) {
        if (!rateLimiter(interaction.user.id, 'audiogen', 3, 300000)) {
            return interaction.reply({ content: 'Rate limit exceeded. Please try again later.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });

        const prompt_a = interaction.options.getString('prompt_a');
        const prompt_b = interaction.options.getString('prompt_b') || prompt_a;

        try {
            const input = {
                prompt_a: prompt_a,
                prompt_b: prompt_b,
                ...config.commands.audiogen
            };

            const output = await replicate.run(config.replicate.audioModel, { input });

            if (output && output.audio) {
                const fileName = `output_${getFormattedDate()}.mp3`;
                await interaction.editReply({
                    content: 'generated audio:',
                    files: [
                        {
                            attachment: output.audio,
                            name: fileName
                        }
                    ]
                });

                if (output.spectrogram) {
                    await interaction.followUp({
                        content: 'spectrogram:',
                        files: [
                            {
                                attachment: output.spectrogram,
                                name: 'spectrogram.png'
                            }
                        ],
                        ephemeral: interaction.options.getBoolean('ephemeral') ?? false
                    });
                }
                logger.info(`Successfully generated ${type} for user ${interaction.user.tag}`);
            } else {
                await interaction.editReply('Sorry, I couldn\'t generate the audio. Please try again.');
            }
        } catch (error) {
            logger.error('Error generating audio:', error);
            await interaction.editReply('An error occurred while generating the audio. Please try again later.');
        }
    },
};