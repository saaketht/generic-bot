const { SlashCommandBuilder } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const play = require('play-dl');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const voiceConnections = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stream')
        .setDescription('Stream audio from YouTube or local file')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play audio from YouTube or local file')
                .addStringOption(option =>
                    option.setName('source')
                        .setDescription('YouTube URL or local file name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop streaming and leave the voice channel')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'play') {
            const source = interaction.options.getString('source');
            const voiceChannel = interaction.member.voice.channel;

            if (!voiceChannel) {
                return interaction.reply('You need to be in a voice channel to use this command!');
            }

            await interaction.deferReply();

            try {
                logger.info(`Attempting to join voice channel: ${voiceChannel.id}`);
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                connection.on(VoiceConnectionStatus.Ready, () => {
                    logger.info('The connection has entered the Ready state - ready to play audio!');
                });

                connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                    } catch (error) {
                        connection.destroy();
                        voiceConnections.delete(interaction.guildId);
                    }
                });

                const player = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Pause,
                    },
                });

                let stream;
                if (source.includes('youtube.com') || source.includes('youtu.be')) {
                    // YouTube URL
                    logger.info(`Attempting to stream YouTube video: ${source}`);
                    const yt_info = await play.video_info(source);
                    stream = await play.stream(source);
                } else {
                    // Local file
                    const audioPath = path.join(__dirname, '..', '..', 'audio', source);
                    if (!fs.existsSync(audioPath)) {
                        throw new Error(`Audio file not found: ${source}`);
                    }
                    logger.info(`Attempting to stream local file: ${audioPath}`);
                    stream = fs.createReadStream(audioPath);
                }

                const resource = createAudioResource(stream.stream, {
                    inputType: stream.type,
                    inlineVolume: true
                });

                resource.volume.setVolume(0.5); // Set volume to 50%

                player.play(resource);
                connection.subscribe(player);

                voiceConnections.set(interaction.guildId, connection);

                player.on(AudioPlayerStatus.Playing, () => {
                    logger.info('The audio player has started playing.');
                    interaction.followUp('Audio playback has started.');
                });

                player.on(AudioPlayerStatus.Idle, () => {
                    logger.info('The audio player has finished playing.');
                    connection.destroy();
                    voiceConnections.delete(interaction.guildId);
                    interaction.followUp('Audio playback has finished.');
                });

                player.on('error', error => {
                    logger.error('Error in audio player:', error);
                    interaction.followUp(`An error occurred in the audio player: ${error.message}`);
                    connection.destroy();
                    voiceConnections.delete(interaction.guildId);
                });

                await interaction.editReply(`Attempting to stream: ${source}`);
            } catch (error) {
                logger.error('Error in stream command:', error);
                await interaction.editReply(`There was an error while executing this command: ${error.message}`);
            }
        } else if (subcommand === 'stop') {
            const connection = voiceConnections.get(interaction.guildId);
            if (connection) {
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                }
                voiceConnections.delete(interaction.guildId);
                await interaction.reply('Stopped streaming and left the voice channel.');
            } else {
                await interaction.reply('I\'m not currently in a voice channel.');
            }
        }
    },
};