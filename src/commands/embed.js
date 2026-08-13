const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');

// ─────────────────────────────────────────
// IN-MEMORY EMBED DRAFT SESSIONS
// key: `${guildId}:${userId}` → draft object
// ─────────────────────────────────────────
const draftSessions = new Map();

// Saved embeds per guild: guildId → Map(name → embedData)
const savedEmbeds = new Map();

function getDraft(guildId, userId) {
  const key = `${guildId}:${userId}`;
  if (!draftSessions.has(key)) {
    draftSessions.set(key, {
      title: '',
      description: '',
      color: '#FF7A00',
      imageUrl: '',
      thumbnailUrl: '',
      footer: '',
      authorName: '',
      authorIcon: '',
      fields: [],       // [{name, value, inline}]
      targetChannelId: null,
      name: ''          // optional save name
    });
  }
  return draftSessions.get(key);
}

function clearDraft(guildId, userId) {
  draftSessions.delete(`${guildId}:${userId}`);
}

function buildPreviewEmbed(draft, guild) {
  const hexColor = (draft.color && draft.color.match(/^#?[0-9a-fA-F]{6}$/))
    ? parseInt((draft.color || '').replace('#', ''), 16)
    : 0xFF7A00;

  const embed = new EmbedBuilder().setColor(hexColor);

  if (draft.authorName) {
    embed.setAuthor({
      name: draft.authorName.slice(0, 256),
      iconURL: draft.authorIcon || undefined
    });
  }
  if (draft.title) embed.setTitle(draft.title.slice(0, 256));
  if (draft.description) embed.setDescription(draft.description.slice(0, 4096));
  if (draft.thumbnailUrl) embed.setThumbnail(draft.thumbnailUrl).catch?.(() => {});
  if (draft.imageUrl) embed.setImage(draft.imageUrl).catch?.(() => {});
  if (draft.footer) embed.setFooter({ text: draft.footer.slice(0, 2048) });

  if (draft.fields.length > 0) {
    const safeFields = draft.fields.slice(0, 25).map(f => ({
      name: (f.name || '\u200b').slice(0, 256),
      value: (f.value || '\u200b').slice(0, 1024),
      inline: !!f.inline
    }));
    embed.addFields(safeFields);
  }

  embed.setTimestamp();
  return embed;
}

function buildControlPanel(draft, guild, author, clientUser) {
  const chanName = draft.targetChannelId
    ? guild?.channels?.cache?.get(draft.targetChannelId)?.name || 'set'
    : 'not set';

  const draftBox = createDynamicBox('EMBED DRAFT STATUS', [
    { key: 'Title  ', value: draft.title ? draft.title.slice(0, 12) : '(empty)' },
    { key: 'Desc   ', value: draft.description ? draft.description.slice(0, 10) + '…' : '(empty)' },
    { key: 'Color  ', value: draft.color || '#FF7A00' },
    { key: 'Image  ', value: draft.imageUrl ? 'Set ✓' : 'None' },
    { key: 'Thumb  ', value: draft.thumbnailUrl ? 'Set ✓' : 'None' },
    { key: 'Footer ', value: draft.footer ? draft.footer.slice(0, 10) + '…' : 'None' },
    { key: 'Fields ', value: draft.fields.length + ' field(s)' },
    { key: 'Channel', value: '#' + chanName.slice(0, 10) }
  ], 20, 22);

  const cmdBox = createDynamicBox('BUILDER COMMANDS', [
    { key: 'title  ', value: '<text>' },
    { key: 'desc   ', value: '<text>' },
    { key: 'color  ', value: '<#hex>' },
    { key: 'image  ', value: '<url>' },
    { key: 'thumb  ', value: '<url>' },
    { key: 'footer ', value: '<text>' },
    { key: 'author ', value: '<name> [icon-url]' },
    { key: 'field  ', value: '<name> | <value>' },
    { key: 'channel', value: '<#chan>' },
    { key: 'send   ', value: 'Send embed' },
    { key: 'reset  ', value: 'Clear draft' }
  ], 20, 22);

  const desc =
    `<a:settings_animated:1537177506170404905> **Draft Status**\n` +
    '```\n' + draftBox + '\n```\n\n' +
    `<a:pencil_animated:1537177465829724181> **Builder Commands** *(prefix with \`.embed <cmd>\`)*\n` +
    '```\n' + cmdBox + '\n```\n\n' +
    `> *Use \`.embed preview\` to see your embed before sending.*`;

  return createStyledEmbed({
    title: '📨 Embed Builder — Control Panel',
    subtitle: `${guild.name} Custom Embed Studio`,
    description: desc,
    requestedBy: author,
    clientUser
  });
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function isValidHex(str) {
  return /^#?[0-9a-fA-F]{6}$/.test(str);
}

module.exports = {
  name: 'embed',
  description: 'ProBot-style Embed Builder: Create, customize and send rich embeds to any channel',
  aliases: [
    'embedsend', 'embedbuild', 'embedcreate', 'embedpreview',
    'embedreset', 'embeds', 'sendembed', 'embedlist', 'embeddelete', 'embededit'
  ],

  async execute(message, args) {
    // Permission: Manage Messages minimum
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply(`<a:wrong_animated:1537179702928875631> You need **Manage Messages** permission to use the embed builder.`);
    }

    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();

    let sub = args[0]?.toLowerCase();

    // Alias-based subcommand overrides
    if (invoked === 'embedsend' || invoked === 'sendembed') sub = 'send';
    if (invoked === 'embedbuild' || invoked === 'embedcreate') sub = 'builder';
    if (invoked === 'embedpreview') sub = 'preview';
    if (invoked === 'embedreset') sub = 'reset';
    if (invoked === 'embedlist' || invoked === 'embeds') sub = 'list';
    if (invoked === 'embeddelete') sub = 'delete';
    if (invoked === 'embededit') sub = 'edit';

    const guild = message.guild;
    const author = message.author;
    const draft = getDraft(guild.id, author.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ─────────────────────────────────────────
    // .embed send <#channel> — Quick send to channel
    // Usage: .embed send #general
    // ─────────────────────────────────────────
    if (sub === 'send' || invoked === 'embedsend' || invoked === 'sendembed') {
      // Determine target channel
      const mentionedChan = message.mentions.channels.first();
      if (mentionedChan) draft.targetChannelId = mentionedChan.id;

      const targetChan = draft.targetChannelId
        ? guild.channels.cache.get(draft.targetChannelId)
        : message.channel;

      if (!targetChan) {
        return message.reply(`<a:wrong_animated:1537179702928875631> No target channel set. Use \`.embed channel <#channel>\` first, or mention a channel with \`.embed send <#channel>\`.`);
      }

      if (!draft.title && !draft.description) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Your embed has no **title** or **description**. Add some content first!\n> Use \`.embed title <text>\` or \`.embed desc <text>\``);
      }

      const previewEmbed = buildPreviewEmbed(draft, guild);

      try {
        await targetChan.send({ embeds: [previewEmbed] });
      } catch (err) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Failed to send embed to <#${targetChan.id}>. Make sure I have **Send Messages** permission there.`);
      }

      const confirmBox = createDynamicBox('EMBED SENT', [
        { key: 'Channel', value: '#' + targetChan.name.slice(0, 12) },
        { key: 'Title  ', value: (draft.title || '(no title)').slice(0, 14) },
        { key: 'Fields ', value: draft.fields.length + ' field(s)' }
      ], 20, 22);

      const confirmEmbed = createStyledEmbed({
        title: `${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Embed Sent Successfully!`,
        description: '```\n' + confirmBox + '\n```\n\n> Draft has been kept. Use `.embed reset` to clear it.',
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [confirmEmbed] });
    }

    // ─────────────────────────────────────────
    // .embed title <text>
    // ─────────────────────────────────────────
    if (sub === 'title') {
      const text = args.slice(1).join(' ');
      if (!text) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed title <your embed title>\``);
      draft.title = text.slice(0, 256);
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed title set to:** ${draft.title}`);
    }

    // ─────────────────────────────────────────
    // .embed description <text> / .embed desc <text>
    // ─────────────────────────────────────────
    if (sub === 'description' || sub === 'desc' || sub === 'body') {
      const text = args.slice(1).join(' ');
      if (!text) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed desc <description text>\`\n> Supports markdown: **bold**, *italic*, \`code\`, newlines with \\n`);
      draft.description = text.replace(/\\n/g, '\n').slice(0, 4096);
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed description updated** (${draft.description.length} chars)`);
    }

    // ─────────────────────────────────────────
    // .embed color <#hex>
    // ─────────────────────────────────────────
    if (sub === 'color' || sub === 'colour' || sub === 'hex') {
      const hex = args[1];
      if (!hex || !isValidHex(hex)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed color #FF7A00\`\n> Must be a valid hex code like \`#FF7A00\`, \`#7289DA\`, \`#FFFFFF\``);
      }
      draft.color = hex.startsWith('#') ? hex : '#' + hex;
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed color set to:** \`${draft.color}\``);
    }

    // ─────────────────────────────────────────
    // .embed image <url>
    // ─────────────────────────────────────────
    if (sub === 'image' || sub === 'img' || sub === 'banner') {
      // Support both URL in args and image attachment
      const urlArg = args[1];
      const attachment = message.attachments.first();
      const url = urlArg || attachment?.url;

      if (!url || !isValidUrl(url)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed image <https://image-url.jpg>\`\n> Or attach an image to the message!`);
      }
      draft.imageUrl = url;
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed image set!** The image will appear at the bottom of the embed.`);
    }

    // ─────────────────────────────────────────
    // .embed thumbnail <url>
    // ─────────────────────────────────────────
    if (sub === 'thumbnail' || sub === 'thumb' || sub === 'icon') {
      const urlArg = args[1];
      const attachment = message.attachments.first();
      const url = urlArg || attachment?.url;

      if (!url || !isValidUrl(url)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed thumbnail <https://image-url.jpg>\`\n> Or attach an image to the message!`);
      }
      draft.thumbnailUrl = url;
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed thumbnail set!** The thumbnail will appear in the top-right corner.`);
    }

    // ─────────────────────────────────────────
    // .embed footer <text>
    // ─────────────────────────────────────────
    if (sub === 'footer') {
      const text = args.slice(1).join(' ');
      if (!text) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed footer <footer text>\``);
      draft.footer = text.slice(0, 2048);
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed footer set to:** ${draft.footer}`);
    }

    // ─────────────────────────────────────────
    // .embed author <name> [icon-url]
    // ─────────────────────────────────────────
    if (sub === 'author') {
      const rest = args.slice(1).join(' ');
      if (!rest) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed author <name> [icon-url]\`\n> Example: \`.embed author Naruto Uzumaki https://...\``);
      
      // Check if last part is a URL
      const parts = rest.split(' ');
      const lastPart = parts[parts.length - 1];
      if (parts.length > 1 && isValidUrl(lastPart)) {
        draft.authorIcon = lastPart;
        draft.authorName = parts.slice(0, -1).join(' ').slice(0, 256);
      } else {
        draft.authorName = rest.slice(0, 256);
        draft.authorIcon = '';
      }
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed author set to:** ${draft.authorName}${draft.authorIcon ? ` (with icon)` : ''}`);
    }

    // ─────────────────────────────────────────
    // .embed field <name> | <value> [inline]
    // ─────────────────────────────────────────
    if (sub === 'field' || sub === 'addfield') {
      if (draft.fields.length >= 25) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Maximum of **25 fields** per embed reached. Use \`.embed clearfields\` to remove all fields.`);
      }

      const rest = args.slice(1).join(' ');
      if (!rest || !rest.includes('|')) {
        return message.reply(
          `<a:wrong_animated:1537179702928875631> Usage: \`.embed field <Field Name> | <Field Value> [inline]\`\n` +
          `> Example: \`.embed field Rank | Hokage inline\`\n` +
          `> Add \`inline\` at the end to place fields side-by-side.`
        );
      }

      const pipeIdx = rest.indexOf('|');
      let fieldName = rest.slice(0, pipeIdx).trim().slice(0, 256);
      let fieldValueRaw = rest.slice(pipeIdx + 1).trim();
      const isInline = fieldValueRaw.toLowerCase().endsWith(' inline');
      const fieldValue = isInline
        ? fieldValueRaw.slice(0, fieldValueRaw.lastIndexOf(' inline')).trim().slice(0, 1024)
        : fieldValueRaw.trim().slice(0, 1024);

      if (!fieldName) fieldName = '\u200b';
      if (!fieldValue) return message.reply(`<a:wrong_animated:1537179702928875631> Field value cannot be empty.`);

      draft.fields.push({ name: fieldName, value: fieldValue.replace(/\\n/g, '\n'), inline: isInline });
      return message.reply(
        `${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Field #${draft.fields.length} added:** \`${fieldName}\`${isInline ? ' *(inline)*' : ''}\n` +
        `> Total: **${draft.fields.length}/25** fields`
      );
    }

    // ─────────────────────────────────────────
    // .embed clearfields — Remove all embed fields
    // ─────────────────────────────────────────
    if (sub === 'clearfields' || sub === 'removefields') {
      const count = draft.fields.length;
      draft.fields = [];
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **All ${count} field(s) cleared** from your draft.`);
    }

    // ─────────────────────────────────────────
    // .embed removefield <index>
    // ─────────────────────────────────────────
    if (sub === 'removefield' || sub === 'deletefield') {
      const idx = parseInt(args[1], 10);
      if (isNaN(idx) || idx < 1 || idx > draft.fields.length) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed removefield <1–${draft.fields.length}>\``);
      }
      const removed = draft.fields.splice(idx - 1, 1);
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Field #${idx} removed:** \`${removed[0]?.name}\``);
    }

    // ─────────────────────────────────────────
    // .embed channel <#channel>
    // ─────────────────────────────────────────
    if (sub === 'channel' || sub === 'target') {
      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
      if (!chan || chan.type !== ChannelType.GuildText) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed channel <#text-channel>\``);
      }
      draft.targetChannelId = chan.id;
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Target channel set to:** <#${chan.id}>`);
    }

    // ─────────────────────────────────────────
    // .embed preview — Show the current embed draft
    // ─────────────────────────────────────────
    if (sub === 'preview' || sub === 'test' || sub === 'view') {
      if (!draft.title && !draft.description && draft.fields.length === 0) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Your draft is empty! Add a title or description first.\n> Use \`.embed title <text>\` or \`.embed desc <text>\``);
      }

      const previewEmbed = buildPreviewEmbed(draft, guild);
      const chanName = draft.targetChannelId
        ? `<#${draft.targetChannelId}>`
        : '*(current channel)*';

      return message.channel.send({
        content: `📋 **Embed Preview** — Target: ${chanName}\n*Use \`.embed send\` to send this embed!*`,
        embeds: [previewEmbed]
      });
    }

    // ─────────────────────────────────────────
    // .embed reset / .embed clear — Wipe the draft
    // ─────────────────────────────────────────
    if (sub === 'reset' || sub === 'clear' || sub === 'wipe') {
      clearDraft(guild.id, author.id);
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed draft cleared.** Start fresh with \`.embed\``);
    }

    // ─────────────────────────────────────────
    // .embed save <name> — Save embed draft by name
    // ─────────────────────────────────────────
    if (sub === 'save') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Only **Administrators** can save embed templates.`);
      }

      const saveName = args.slice(1).join('-').toLowerCase().replace(/[^a-z0-9\-_]/g, '').slice(0, 32);
      if (!saveName) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed save <name>\`\n> Example: \`.embed save welcome-rules\``);

      if (!savedEmbeds.has(guild.id)) savedEmbeds.set(guild.id, new Map());
      savedEmbeds.get(guild.id).set(saveName, JSON.parse(JSON.stringify(draft)));

      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Embed saved as:** \`${saveName}\`\n> Use \`.embed post ${saveName} <#channel>\` to send it anytime!`);
    }

    // ─────────────────────────────────────────
    // .embed post <name> [#channel] — Post a saved embed
    // ─────────────────────────────────────────
    if (sub === 'post' || sub === 'load') {
      const saveName = args[1]?.toLowerCase();
      if (!saveName) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed post <name> [#channel]\``);

      const guildSaved = savedEmbeds.get(guild.id);
      if (!guildSaved || !guildSaved.has(saveName)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> No saved embed named \`${saveName}\`. Use \`.embed list\` to see saved embeds.`);
      }

      const savedDraft = guildSaved.get(saveName);
      const chan = message.mentions.channels.first()
        || (savedDraft.targetChannelId && guild.channels.cache.get(savedDraft.targetChannelId))
        || message.channel;

      const postEmbed = buildPreviewEmbed(savedDraft, guild);
      try {
        await chan.send({ embeds: [postEmbed] });
      } catch {
        return message.reply(`<a:wrong_animated:1537179702928875631> Failed to send embed to <#${chan.id}>. Check bot permissions.`);
      }

      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Saved embed \`${saveName}\` posted to** <#${chan.id}>!`);
    }

    // ─────────────────────────────────────────
    // .embed list — Show saved embeds for this guild
    // ─────────────────────────────────────────
    if (sub === 'list' || invoked === 'embedlist' || invoked === 'embeds') {
      const guildSaved = savedEmbeds.get(guild.id);
      const names = guildSaved ? [...guildSaved.keys()] : [];

      if (names.length === 0) {
        return message.reply(`📭 **No saved embeds** for this server yet.\n> Create one with \`.embed save <name>\` after building your embed!`);
      }

      const listBox = createDynamicBox('SAVED EMBEDS', names.map((n, i) => ({
        key: `#${i + 1}    `,
        value: n.slice(0, 14)
      })), 20, 22);

      const embed = createStyledEmbed({
        title: `📋 Saved Embed Templates — ${guild.name}`,
        description:
          '```\n' + listBox + '\n```\n\n' +
          `> Use \`.embed post <name>\` to send a saved embed\n` +
          `> Use \`.embed delete <name>\` to remove a template`,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // .embed delete <name> — Delete a saved embed
    // ─────────────────────────────────────────
    if (sub === 'delete' || sub === 'remove' || invoked === 'embeddelete') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Only **Administrators** can delete saved embed templates.`);
      }

      const saveName = args[1]?.toLowerCase();
      if (!saveName) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed delete <name>\``);

      const guildSaved = savedEmbeds.get(guild.id);
      if (!guildSaved || !guildSaved.has(saveName)) {
        return message.reply(`<a:wrong_animated:1537179702928875631> No saved embed named \`${saveName}\`.`);
      }

      guildSaved.delete(saveName);
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Saved embed \`${saveName}\` deleted.**`);
    }

    // ─────────────────────────────────────────
    // .embed quicksend <#channel> <text> — One-liner text embed
    // No builder needed — instant embed with plain text
    // ─────────────────────────────────────────
    if (sub === 'quicksend' || sub === 'quick' || sub === 'qs') {
      const chan = message.mentions.channels.first();
      const text = args.slice(chan ? 2 : 1).join(' ');

      if (!text) {
        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.embed quicksend [#channel] <your message text>\``);
      }

      const targetChan = chan || message.channel;
      const qEmbed = new EmbedBuilder()
        .setColor(0xFF7A00)
        .setDescription(text.replace(/\\n/g, '\n').slice(0, 4096))
        .setTimestamp();

      try {
        await targetChan.send({ embeds: [qEmbed] });
        await message.react('<a:accept_animated:1537177319603703969>').catch(() => {});
      } catch {
        return message.reply(`<a:wrong_animated:1537179702928875631> Failed to send embed to <#${targetChan.id}>.`);
      }

      return;
    }

    // ─────────────────────────────────────────
    // DEFAULT: Show Control Panel Dashboard
    // ─────────────────────────────────────────
    const panelEmbed = buildControlPanel(draft, guild, author, clientUser);
    return message.channel.send({ embeds: [panelEmbed] });
  }
};
