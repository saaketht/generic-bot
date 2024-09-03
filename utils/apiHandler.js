exports.handleReplicateResponse = async (output, interaction, type) => {
    if (Array.isArray(output) && output.length > 0) {
        const url = output[0];
        await interaction.editReply({ content: `Your ${type}:`, files: [url] });
    } else {
        await interaction.editReply(`Sorry, I couldn't generate the ${type}. Please try again.`);
    }
}