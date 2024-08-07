const { Client, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('replies with Pong!'),
	async execute(interaction) {
		const sent = await interaction.reply({ content: 'pinging...', fetchReply: true });
		interaction.editReply(`pong! roundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
	},
};