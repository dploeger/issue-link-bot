import Keyv = require("keyv")
import { Client, Intents } from "discord.js"
import { SlashCommandBuilder } from "@discordjs/builders"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"

if (!("DISCORD_TOKEN" in process.env)) {
  console.error("Please configure the DISCORD_TOKEN environment variable")
  process.exit(1)
}

if (!("DISCORD_CLIENTID" in process.env)) {
  console.error("Please configure the DISCORD_CLIENTID environment variable")
  process.exit(1)
}

if (!("DATABASE_URL" in process.env)) {
  console.error("Please configure the DATABASE_URL environment variable")
  process.exit(1)
}

const token = process.env.DISCORD_TOKEN
const clientId = process.env.DISCORD_CLIENTID
const keyvUrl = process.env.DATABASE_URL

const issueIdRegExp = new RegExp("(^| )#(?<issueId>[0-9]+)", "g")
const URLRegExp =
  /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’]))/i

const keyv = new Keyv(keyvUrl)

// Bag of commands of this bot
const commands = [
  new SlashCommandBuilder().setName('setissueurl').setDescription('Sets the issue URL')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('The issue URL. Use %id as a placeholder for the issue id')
        .setRequired(true)
    ),
]
  .map(command => command.toJSON());

// Create a new client instance
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  partials: ["CHANNEL"],
})

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Connected to Discord")
})

// Register commands when the bot joins a guild
client.on('guildCreate', async guild => {
  const rest = new REST({ version: '9' }).setToken(token);
  const name = guild.name
  const id = guild.id

  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, id),
      { body: commands }
    )
  } catch (e) {
    console.error(
      `Bot joined guild ${name} (${id}), but couldn't register its commands`
    )
    console.error(e.message)
    return
  }

  console.log(
    `Bot successfully joined guild ${guild.name}`
  )
})

// React to commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) {
    return
  }

  if (interaction.commandName === "setissueurl") {
    const url = interaction.options.getString("url")
    if (URLRegExp.test(url)) {
      await keyv.set(`${interaction.channelId}:url`, url)
      await interaction.reply(`Issue URL set to ${url}`)
    } else {
      await interaction.reply(`${url} is not a valid url`)
    }
  }
  return
})

// React to messages
client.on("messageCreate", async (message) => {
  const channel = client.channels.cache.get(message.channelId)

  // Only react to issue mentions in text channels
  if (channel.isText() && issueIdRegExp.test(message.content)) {
    issueIdRegExp.lastIndex = 0

    const url = await keyv.get(`${message.channelId}:url`)

    if (!url) {
      channel.send(
        `Please set up an issues URL first by using /setissueurl <URL>, e.g. /setissueurl https://github.com/user/repo/issues/%id`
      )
    } else {
      const matches = message.content.matchAll(issueIdRegExp)
      if (matches) {
        for (const match of matches) {
          channel.send(url.replace('%id', match.groups["issueId"]))
        }
      }
    }
  }
})

// Login to Discord
client.login(token).catch(e => {
  console.error('Could not log into Discord. Please check the token')
  console.error(e.message)
  process.exit()
})
