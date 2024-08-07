const { SlashCommandBuilder } = require('discord.js');
const Replicate = require('replicate');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}-${day}${month}${year}`;
}

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
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });

        const prompt_a = interaction.options.getString('prompt_a');
        const prompt_b = interaction.options.getString('prompt_b') || prompt_a;

        try {
            const input = {
                alpha: 0.5,
                prompt_a: prompt_a,
                prompt_b: prompt_b,
                denoising: 0.75,
                seed_image_id: "vibes",
                num_inference_steps: 50
            };

            const output = await replicate.run(
                "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
                { input }
            );

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
            } else {
                await interaction.editReply('Sorry, I couldn\'t generate the audio. Please try again.');
            }
        } catch (error) {
            console.error('Error generating audio:', error);
            await interaction.editReply('An error occurred while generating the audio. Please try again later.');
        }
    },
};