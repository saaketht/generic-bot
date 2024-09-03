const axios = require('axios');
const logger = require('./logger');

const activeStreams = new Map();

exports.handleSSEStream = async (url, headers, data, onMessage, onError, onComplete, userId, commandName) => {
    const streamKey = `${userId}-${commandName}`;
    
    // Cancel existing stream if present
    if (activeStreams.has(streamKey)) {
        activeStreams.get(streamKey).cancel();
        activeStreams.delete(streamKey);
        logger.info(`Cancelled existing stream for ${streamKey}`);
    }

    const source = axios.CancelToken.source();
    activeStreams.set(streamKey, source);

    try {
        const response = await axios({
            method: 'POST',
            url: url,
            headers: headers,
            data: data,
            responseType: 'stream',
            cancelToken: source.token
        });

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonData = line.slice(6);
                    onMessage(jsonData);
                }
            }
        });

        response.data.on('end', () => {
            activeStreams.delete(streamKey);
            onComplete();
        });

    } catch (error) {
        if (axios.isCancel(error)) {
            logger.info(`Request cancelled for ${streamKey}`);
        } else {
            logger.error('SSE Error:', error);
            onError(error);
        }
        activeStreams.delete(streamKey);
    }
};

exports.cancelStream = (userId, commandName) => {
    const streamKey = `${userId}-${commandName}`;
    if (activeStreams.has(streamKey)) {
        activeStreams.get(streamKey).cancel();
        activeStreams.delete(streamKey);
        logger.info(`Manually cancelled stream for ${streamKey}`);
    }
};