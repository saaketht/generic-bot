const axios = require('axios');
const logger = require('../../utils/logger.js');
const commandDebounce = require('../../utils/commandDebounce');
const { safeStringify } = require('../../utils/jsonUtils');
const { handleSSEStream } = require('../../utils/sseHandler.js');
const config = require('../../config.json');

CHATBOT_COOLDOWN_SECONDS = 1
exports.handleChatbotMessage = async (message) => {
    if (!process.env.PERPLEXITY_API_TOKEN) {
        logger.error('Perplexity API key is not defined');
        await message.reply('Sorry, I\'m not configured correctly. Please contact the bot administrator.');
        return;
    }
    // Check if the message contains any of the trigger words
    const hasTriggerWord = config.bot.triggerWords.some(word => 
        message.content.toLowerCase().split(" ").includes(word.toLowerCase())
    );

    if (!hasTriggerWord) return;

    // Apply debounce
    if (!commandDebounce(message.author.id, 'chatbot', CHATBOT_COOLDOWN_SECONDS)) {
        try {
            await message.reply(`Please wait ${CHATBOT_COOLDOWN_SECONDS} seconds before using the chatbot again.`);
        } catch (error) {
            logger.error(`Failed to send cooldown message: ${error.message}`);
        }
        return;
    }

    // Extract the user's query by removing the trigger word
    const query = config.bot.triggerWords.reduce((content, word) => 
        content.replace(new RegExp(word, 'gi'), ''), message.content
    ).trim();
    
    // Prepare the request data for the Perplexity AI API
    const requestData = {
        model: config.perplexityAI.model,
        messages: [
            { role: 'system', content: 'respond like a gen-z person and keep overall responses under 1000 tokens' }, // System message to guide the AI's behavior
            { role: 'user', content: query }                        // User's query
        ],
        // Include all configurable parameters
        temperature: config.perplexityAI.temperature,
        top_p: config.perplexityAI.top_p,
        top_k: config.perplexityAI.top_k,
        presence_penalty: config.perplexityAI.presence_penalty,
        frequency_penalty: config.perplexityAI.frequency_penalty,
        max_tokens: config.perplexityAI.max_tokens,
        stream: true  // Enable streaming response
    };

    // Set up headers for the API request
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_TOKEN}`
    };

    try {
        let fullResponse = '';
        // Send an initial "Thinking..." message to the user
        let userMessage = await message.reply('Thinking...');

        // Start the SSE stream
        await handleSSEStream(
            config.perplexityAI.apiUrl,
            headers,
            requestData,
            // Callback for each chunk of data received
            async (data) => {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0].delta.content) {
                    fullResponse += parsed.choices[0].delta.content;
                    // Update the message every 5 chunks or when the response is complete
                    if (fullResponse.length % 2 === 0 || parsed.choices[0].finish_reason === 'stop') {
                        await userMessage.edit(fullResponse);
                    }
                }
            },
            // Error handling callback
            async (error) => {
                logger.error('Error in Perplexity AI API call:', error);
                await userMessage.edit('Sorry, I encountered an error while thinking. Please try again later.');
            },
            // Completion callback
            async () => {
                if (fullResponse) {
                    await userMessage.edit(fullResponse);
                    logger.info(`Successfully generated response for ${message.author.tag}`);
                } else {
                    await userMessage.edit('Sorry, I couldn\'t generate a response. Please try again.');
                }
            }
        );
    } catch (error) {
        logger.error('Error in Perplexity AI API call:', safeStringify(error));
        if (error.response) {
            logger.error('Response data:', safeStringify(error.response.data));
            logger.error('Response status:', error.response.status);
            logger.error('Response headers:', safeStringify(error.response.headers));
        } else if (error.request) {
            logger.error('No response received. Request:', safeStringify(error.request));
        } else {
            logger.error('Error details:', safeStringify(error.message));
        }
        await message.reply('Sorry, I\'m having trouble thinking right now. Please try again later.');
    }
};

// Export a function to set up the message event listener
exports.setupMessageListener = (client) => {
    client.on('messageCreate', async message => {
        // Ignore messages from bots to prevent potential loops
        if (message.author.bot) return;
        
        await exports.handleChatbotMessage(message);
    });
};