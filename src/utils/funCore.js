/**
 * Fun Core Helpers for Naruto Bot Casino & Games
 */

async function animate(message, frames, intervalMs = 1000) {
  if (!frames || frames.length === 0) return null;
  const sent = await message.channel.send({ embeds: [frames[0]] });
  for (let i = 1; i < frames.length; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    await sent.edit({ embeds: [frames[i]] }).catch(() => {});
  }
  return sent;
}

module.exports = {
  animate
};
