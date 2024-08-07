const { SlashCommandBuilder } = require('discord.js');
const Replicate = require('replicate');
const dotenv = require('dotenv');
dotenv.config();

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
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });
        const prompt = interaction.options.getString('prompt');
        try {
            const input = {
                prompt: prompt,
                num_outputs: 1,
                aspect_ratio: "1:1",
                output_format: "webp",
                output_quality: 90
            };

            const output = await replicate.run("black-forest-labs/flux-schnell", { input });

            if (Array.isArray(output) && output.length > 0) {
                const imageUrl = output[0];
                await interaction.editReply({ content: 'your image:', files: [imageUrl] });
            } else {
                await interaction.editReply('Sorry, shit aint working. please try again.');
            }
        } catch (error) {
            console.error('error generating image:', error);
            await interaction.editReply('an error occurred while generating the image. please try again later.');
        }
    },
};