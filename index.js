const { Client, GatewayIntentBits, Partials, AttachmentBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const sharp = require('sharp');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
});

client.once('ready', () => {
  console.log(`bot ${client.user.tag}`);
  console.log(`${client.guilds.cache.size}`);
  console.log(`${client.users.cache.size}`);
  
  client.user.setPresence({
    activities: [{
      name: config.botStatus.activity,
      type: ActivityType[config.botStatus.type]
    }],
    status: config.botStatus.status
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== config.quoteChannelId) return; 
  if (message.attachments.size > 0) return; 
  if (!message.content || message.content.trim().length === 0) return;

  const loadingMsg = await message.channel.send({
    content: `> **شكرا لك ${message.author}**`,
  });

  try {
    const avatarUrl = message.author.displayAvatarURL({ format: 'png', size: 512 });
    const avatarResponse = await fetch(avatarUrl);
    const avatarArrayBuffer = await avatarResponse.arrayBuffer();
    const avatarBuffer = Buffer.from(avatarArrayBuffer);
    const userMessage = message.content.trim();
    const displayName = message.member?.displayName || message.author.username;
    const WIDTH = config.imageSettings.width;
    const HEIGHT = config.imageSettings.height;
    const wrapText = (text, maxWidth) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const messageLines = wrapText(userMessage, config.imageSettings.maxCharsPerLine);
    const maxLines = config.imageSettings.maxLines;
    const displayLines = messageLines.slice(0, maxLines);
    const hasMoreText = messageLines.length > maxLines;

    const colors = config.colors;
    
    const backgroundSvg = `
      <svg width="${WIDTH}" height="${HEIGHT}">
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="50%">
            <stop offset="0%" stop-color="${colors.backgroundGradient.start}" />
            <stop offset="60%" stop-color="${colors.backgroundGradient.middle}" />
            <stop offset="100%" stop-color="${colors.backgroundGradient.end}" />
          </radialGradient>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" />
            <feColorMatrix type="saturate" values="0"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGrad)"/>
        <rect width="100%" height="100%" fill="#000" opacity="0.1" filter="url(#noise)"/>
        
        <!-- دوائر زينة -->
        <circle cx="100" cy="80" r="150" fill="${colors.accentPrimary}" opacity="0.04"/>
        <circle cx="${WIDTH-120}" cy="${HEIGHT-60}" r="120" fill="${colors.accentSecondary}" opacity="0.05"/>
      </svg>
    `;

    const boxWidth = 1000;
    const boxHeight = 280;
    const quoteBoxSvg = `
      <svg width="${boxWidth}" height="${boxHeight}">
        <defs>
          <linearGradient id="boxBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.boxGradient.start}" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="${colors.boxGradient.middle}" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="${colors.boxGradient.end}" stop-opacity="0.6"/>
          </linearGradient>
          <linearGradient id="borderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.borderGlow.start}"/>
            <stop offset="50%" stop-color="${colors.borderGlow.middle}"/>
            <stop offset="100%" stop-color="${colors.borderGlow.end}"/>
          </linearGradient>
          <filter id="boxShadow">
            <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.7"/>
          </filter>
        </defs>
        
        <rect x="5" y="5" width="${boxWidth-10}" height="${boxHeight-10}" 
              fill="url(#boxBg)" rx="16" filter="url(#boxShadow)"/>
        
        <rect x="3" y="3" width="${boxWidth-6}" height="${boxHeight-6}" 
              fill="none" stroke="url(#borderGlow)" stroke-width="2.5" rx="16" opacity="0.85"/>
        
        <rect x="25" y="30" width="5" height="${boxHeight-60}" 
              fill="url(#borderGlow)" rx="2.5" opacity="0.9"/>
      </svg>
    `;

    const textStartY = 75;
    const lineHeight = 38;
    
    let textElements = '';
    displayLines.forEach((line, index) => {
      textElements += `<text x="55" y="${textStartY + (index * lineHeight)}" class="quote">${escapeXml(line)}</text>\n`;
    });
    
    if (hasMoreText) {
      textElements += `<text x="55" y="${textStartY + (displayLines.length * lineHeight)}" class="quote" opacity="0.5">...</text>`;
    }

    const textSvg = `
      <svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="textShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <style>
          .quote { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            font-size: 28px; 
            font-weight: 600; 
            fill: ${colors.textPrimary}; 
            filter: url(#textShadow);
            letter-spacing: 0.3px;
          }
        </style>
        ${textElements}
      </svg>
    `;

    const avatarSize = 95;
    const avatarProcessed = await sharp(avatarBuffer)
      .resize(avatarSize, avatarSize)
      .composite([{
        input: Buffer.from(`<svg><circle cx="${avatarSize/2}" cy="${avatarSize/2}" r="${avatarSize/2}"/></svg>`),
        blend: 'dest-in'
      }])
      .toBuffer();

    const avatarRingSvg = `
      <svg width="${avatarSize + 16}" height="${avatarSize + 16}">
        <defs>
          <linearGradient id="avatarRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.avatarRing.start}"/>
            <stop offset="50%" stop-color="${colors.avatarRing.middle}"/>
            <stop offset="100%" stop-color="${colors.avatarRing.end}"/>
          </linearGradient>
          <filter id="avShadow">
            <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <circle cx="${(avatarSize + 16)/2}" cy="${(avatarSize + 16)/2}" r="${avatarSize/2 + 5}" 
                fill="none" stroke="url(#avatarRing)" stroke-width="5" opacity="0.95" filter="url(#avShadow)"/>
      </svg>
    `;

    const userInfoSvg = `
      <svg width="700" height="90" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="textGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.8"/>
          </filter>
          <linearGradient id="nameColor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${colors.nameGradient.start}"/>
            <stop offset="100%" stop-color="${colors.nameGradient.end}"/>
          </linearGradient>
        </defs>
        <style>
          text { font-family: 'Arial Black', 'Arial', sans-serif; filter: url(#textGlow); }
          .name { fill: url(#nameColor); font-size: 36px; font-weight: 900; letter-spacing: 1px; }
          .tag { fill: ${colors.textSecondary}; font-size: 22px; font-weight: 700; }
        </style>
        <text x="0" y="38" class="name">${escapeXml(displayName)}</text>
        <text x="2" y="70" class="tag">@${escapeXml(message.author.tag)}</text>
      </svg>
    `;

    const now = new Date();
    const middleEastTime = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }));
    const year = middleEastTime.getFullYear();
    const month = middleEastTime.getMonth() + 1;
    const day = middleEastTime.getDate();
    let hours = middleEastTime.getHours();
    const minutes = middleEastTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const dateTimeStr = `${year}/${month}/${day} | ${hours}:${minutes} ${ampm}`;

    const timestampSvg = `
      <svg width="320" height="80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="cardShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.7"/>
          </filter>
          <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.timestampCard.start}" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="${colors.timestampCard.end}" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        
        <rect x="5" y="5" width="310" height="70" fill="url(#cardBg)" rx="12" filter="url(#cardShadow)"/>
        <rect x="4" y="4" width="312" height="72" fill="none" stroke="${colors.accentPrimary}" stroke-width="2" rx="12" opacity="0.6"/>
        
        <text x="160" y="48" font-family="Arial, sans-serif" font-size="24" font-weight="700" 
              fill="${colors.textSecondary}" text-anchor="middle" style="filter: url(#cardShadow);">${dateTimeStr}</text>
      </svg>
    `;

    function escapeXml(unsafe) {
      return unsafe.replace(/[<>&'"]/g, c => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
      }[c] || c));
    }

    const boxTop = 80;
    const boxLeft = 50;
    const avatarTop = boxTop + boxHeight + 25;
    const avatarLeft = boxLeft + 30;

    let banner = sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: { r: 2, g: 13, b: 10, alpha: 1 }
      }
    });

    banner = await banner
      .composite([
        { input: Buffer.from(backgroundSvg), top: 0, left: 0, blend: 'over' },
        { input: Buffer.from(quoteBoxSvg), top: boxTop, left: boxLeft, blend: 'over' },
        { input: Buffer.from(textSvg), top: boxTop, left: boxLeft, blend: 'over' },
        { input: avatarProcessed, top: avatarTop, left: avatarLeft, blend: 'over' },
        { input: Buffer.from(avatarRingSvg), top: avatarTop - 8, left: avatarLeft - 8, blend: 'over' },
        { input: Buffer.from(userInfoSvg), top: avatarTop + 5, left: avatarLeft + avatarSize + 25, blend: 'over' },
        { input: Buffer.from(timestampSvg), top: avatarTop + 10, left: WIDTH - 360, blend: 'over' }
      ])
      .png({ quality: 95 })
      .toBuffer();

    const imageAttachment = new AttachmentBuilder(banner, { name: 'quote_card.png' });

    await loadingMsg.edit({
      content: `${message.author}`,
      files: [imageAttachment]
    });

  } catch (err) {
    console.error('خطأ في تصميم الاقتباس:', err);
    await loadingMsg.edit({
      content: `error\n${err.message ? `\`\`\`${err.message}\`\`\`` : ''}`
    }).catch(() => {});
  }
});
client.on('error', error => {
  console.error('error', error);
});

process.on('unhandledRejection', error => {
  console.error('error', error);
});

client.login(config.token).catch(err => {
  console.error('error', err);
  process.exit(1);
});