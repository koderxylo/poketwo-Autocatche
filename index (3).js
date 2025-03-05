const { Client } = require("discord.js-selfbot-v13");
const { EmbedBuilder, WebhookClient } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const { captchaHook } = require("../config");
const { checkRarity, getImage, solveHint } = require("pokehint");
const { log, formatPokemon, logHook, colors } = require("../utils/utils");
const { getName } = require("../utils/api");

const poketwo = "716390085896962058";
const p2ass = "854233015475109888";
const p2Filter = (p2) => p2.author.id === poketwo;

class AutoCatcher {
  constructor(token) {
    this.token = token;
    this.client = new Client();
    this.captcha = false;
    this.catch = true;
    this.aiCatch = false;
    this.stats = {
      tcoins: 0,
      coins: 0,
      shards: 0,
      catches: 0,
      shinies: 0,
      legs: 0,
      myths: 0,
      ubs: 0,
      ivs: 0,
      forms: 0,
      events: 0,
      rares: 0,
      lastCatch: new Date(),
    };
  }

  login() {
    this.client.login(this.token).catch((err) => {
      if (err.code === `TOKEN_INVALID`) {
        console.log(`Failed to Login Invalid Token`.red);
      }
      if (err) return false;
    });
  }

  start(res) {
    this.client.on("ready", async () => {
      log(`Logged in as ${this.client.user.tag}`.green);
      res(`Logged in as ${this.client.user.tag}`.green);
    });
  }
  catcher() {
    this.client.on("messageCreate", async (message) => {
      // disabling only p2 assistant catch, adding hint catcher
      // if (
      //   message.author.id === p2ass &&
      //   message.content.includes(":") &&
      //   message.content.includes("%")
      // ) {
      //   if (this.captcha || this.aiCatch || !this.catch) return;
      //   const msgs = [`c`, `catch`];
      //   const name = message.content.substring(0, message.content.indexOf(":"));
      //   await message.channel.send(
      //     `<@${poketwo}> ${msgs[Math.round(Math.random())]} ${name}`
      //   );
      // } 
      if (
        message.author.id === poketwo ||
        message.author.id === this.client.user.id
      ) {
        // hint solver code start
        if (message.content.includes("The pokémon is")) {
          if (this.captcha) return;
          if (!this.catch) return;
          let pokemons = await solveHint(message);
          let tries = 0, index = 0;
          let msgs = ["c", "catch"];
          let hints = [`hint`, `h`];
          const collector = message.channel.createMessageCollector({
            filter: p2Filter,
            time: 18_000,
          });
          collector.on("collect", async (msg) => {
            if (msg.content.includes("That is the wrong")) {
              if (tries == 3) {
                collector.stop();
              } else {
                await wait(4000);
                if (++index == pokemons.length) {
                  await msg.channel.send(
                    `<@${poketwo}> ${hints[Math.round(Math.random())]}`
                  );
                  index = -1;
                } else {
                  let msgs = ["c", "catch"];
                  await msg.channel.send(
                    `<@${poketwo}> ${msgs[Math.round(Math.random())]} ${pokemons[index]
                    }`
                  );
                }
              }
            } else if (msg.content.includes("The pokémon is")) {
              let pokemons = await solveHint(msg);
              let msgs = ["c", "catch"];
              await msg.channel.send(
                `<@${poketwo}> ${msgs[Math.round(Math.random())]} ${pokemons[0]
                }`
              );
              tries++;
            } else if (msg.content.includes(`Congratulations`)) {
              collector.stop();
            }
          });
          await message.channel.send(
            `<@${poketwo}> ${msgs[Math.round(Math.random())]} ${pokemons[0]}`
          );
          tries++;
        }
        // hint solver end
        if (message.embeds.length > 0) {
          const embed = message.embeds[0];
          if (embed.title.includes("has appeared")) {
            // ai catch api is not working, adding hint/p2ass catcher.
            // if (!this.aiCatch || this.captcha || !this.catch) return;
            // const imageUrl = embed.image?.url;
            // if (imageUrl) {
            //   const [name, confidence] = await getName(imageUrl, false);
            //   if (name) {
            //     message.channel.send(`<@${poketwo}> c ${name}`);
            //   } else {
            //     await message.channel.send("Identification failed.");
            //   }
            // }
            // const helperFilter = (msg) => ["854233015475109888", "874910942490677270"].includes(msg.author.id);
            const helperFilter = (msg) => msg.author.id === p2ass;
            let msg;
            try {
              msg = await (
                await message.channel.awaitMessages({
                  max: 1,
                  time: 4000,
                  filter: helperFilter,
                  errors: ["time"],
                })
              ).first();
            } catch (e) { }
            if (!msg) {
              let msgs = [`hint`, `h`];
              await message.channel.send(
                `<@${poketwo}> ${msgs[Math.round(Math.random())]}`
              );
              return;
            }
            if (msg.author.id == p2ass) {
              if (msg.content.includes(":") && msg.content.includes("%")) {
                let msgs = [`c`, `catch`];
                let confidence = parseInt(msg.content.substring(msg.content.indexOf(":") + 1).replace("%", ""));
                let x = true
                if (!isNaN(confidence)) {
                  if (confidence < 60) {
                    x = false
                    let msgs = [`hint`, `h`];
                    await msg.channel.send(
                      `<@${poketwo}> ${msgs[Math.round(Math.random())]}`
                    );
                  }
                }
                if (x)
                  await msg.channel.send(
                    `<@${poketwo}> ${msgs[Math.round(Math.random())]
                    } ${msg.content.substring(0, msg.content.indexOf(":"))}`
                  );
              }
            }
          } else if (
            embed.footer?.text.includes("Terms") &&
            message?.components[0]?.components[0]
          ) {
            message.clickButton();
          } else if (embed.title.includes("fled")) {
            this.fled++;
          }
        } else if (message.content.includes("Please pick a")) {
          await message.channel.send(`<@${poketwo}> pick froakie`);
        } else if (message.content.startsWith("Congratulations")) {
          if (message.content.includes(this.client.user.id)) {
            this.stats.lastCatch = new Date();
            if (this.stats.catches === 0 && this.stats.coins === 0) {
              await message.channel.send(`<@${poketwo}> bal`);
              const p2filter = (f) =>
                f.embeds?.length > 0 && f.author.id === poketwo;
              const msg = (
                await message.channel.awaitMessages({
                  filter: p2filter,
                  time: 2000,
                  max: 1,
                })
              ).first();
              if (msg && msg.embeds.length > 0) {
                const embed = msg.embeds[0];
                if (embed.title.includes("balance")) {
                  const balField = embed.fields[0]?.value;
                  if (balField) {
                    let bal = parseInt(balField.replace(/,/g, ""));
                    if (!isNaN(bal)) this.stats.tcoins = bal;
                  }
                }
                if (embed.title.includes("balance")) {
                  const ShardField = embed.fields[1]?.value;
                  if (ShardField) {
                    let shards = parseInt(ShardField.replace(/,/g, ""));
                    if (!isNaN(shards)) this.stats.shards = shards;
                  }
                }
              }
            }
            this.stats.catches++;
            const caught = formatPokemon(message.content);
            const rarity = await checkRarity(caught.name);
            switch (rarity) {
              case "Legendary":
                this.stats.legs++;
                break;
              case "Mythical":
                this.stats.myths++;
                break;
              case "Ultra Beast":
                this.stats.ubs++;
                break;
              case "Event":
                this.stats.events++;
                break;
              case "Regional":
                this.stats.forms++;
                break;
              default:
                break;
            }
            if (caught.shiny) this.stats.shinies++;
            const loggable = [];
            if (
              rarity &&
              rarity !== "Event" &&
              rarity !== "Regional" &&
              rarity !== "Regular"
            ) {
              loggable.push(rarity);
            }
            if (caught.iv <= 10 || caught.iv > 90) {
              loggable.push("Rare IV");
              this.stats.ivs++;
            }
            this.stats.rares =
              this.stats.legs + this.stats.myths + this.stats.ubs;
            if (caught.shiny) loggable.push("Shiny");
            if (loggable.length > 0 && loggable[0] !== "Regular") {
              let statStr = "";
              statStr += `• Total: `.cyan + `${this.stats.catches}\n`.blue;
              statStr += `• Rares: `.cyan + `${this.stats.rares}\n`.green;
              statStr += `• Shinies: `.cyan + `${this.stats.shinies}\n`.green;
              const boxColor =
                rarity === "Legendary" ||
                  rarity === "Mythical" ||
                  rarity === "Ultra Beast"
                  ? "🟥"
                  : rarity === "Event"
                    ? "🟢"
                    : rarity === "Shiny"
                      ? "🟨"
                      : "⬜";

              const embed = new EmbedBuilder()
                .setURL(message.url)
                .setTitle(`Pokémon Caught`)
                .setDescription(
                  `\n\n- **User**       ★  ${this.client.user.username
                  }\n- **Name**     ★  \`${caught.name
                  }\`\n- **Level**      ★  \`${caught.level
                  }\`\n- **Shiny**      ★  \`${caught.shiny ? " ✅ ✨" : "❌"
                  }\`\n-  **IV**             ★   \`${caught.iv.toFixed(
                    2
                  )}%\`\n\n\`\`\`${boxColor.repeat(9)}\`\`\``
                )
                .setColor(colors[loggable[0]] ?? "DarkButNotBlack")
                .setFooter({
                  text: `${loggable.join(" | ") || `Unknown?`}`,
                });

              const image = await getImage(caught.name, caught.shiny);
              if (image) embed.setThumbnail(image);

              logHook([embed]);
            }

            log(
              `${loggable.join(",")} Caught`.cyan +
              ` ${caught.shiny ? `✨ ` : ``}${caught.name}`.green +
              " in ".cyan +
              message.channel.name.cyan +
              ` | IV: `.cyan +
              `${caught.iv.toFixed(2) + `%`.green}` +
              ` | Level: `.cyan +
              `${caught.level} `.green +
              `| Gender:`.cyan +
              ` ${caught.gender.green}`.cyan
            );
          }
        } else if (
          message.content.includes("You have completed the quest") &&
          !message.content.includes("badge!")
        ) {
          const x = message.content.split(" ");
          const recIndex = x.findIndex((y) => y === `received`);
          if (recIndex === -1) return;
          const coins = parseInt(
            x[recIndex + 1].replace(/,/g, "").replace(/\*/g, "")
          );
          if (!isNaN(coins)) this.stats.coins += coins;
        } else if (
          message.content.includes("Whoa") &&
          message.content.includes(this.client.user.id)
        ) {
          if (this.captcha) return;
          this.captcha = true;
          await message.react(`💦`);
          const embed = new EmbedBuilder()
            .setTitle("Captcha Encountered")
            .setURL(message.url)
            .setAuthor({
              name: `💤 Asta catcher v-1.0.0`,
              url: `https://verify.poketwo.net/captcha/${this.client.user.id}`,
            })
            //.setThumbnail(this.client.user.displayAvatarURL())
            .setDescription(
              `- 🟦 **User** : ${this.client.user.username}\n` +
              `- 🟦 **Time** : <t:${Math.floor(new Date() / 1000)}:R>\n` +
              `- 🟦 **Server** : [${message.guild.name}](${message.url})\n` +
              `- 🟦 **Link** : [Captcha](https://verify.poketwo.net/captcha/${this.client.user.id})\n`
            )
            .setColor("00FFFF")
            .setFooter({
              text: "Stopped Catching Solve as Soon as Possible...",
            });

          const hook = new WebhookClient({ url: captchaHook });
          await hook.send({
            content: message.content || `@everyone`,
            username: `Asta Captchas`,
            avatarURL: `https://cdn.discordapp.com/avatars/1231471729004646451/a_dd8d0d8528b1820f3e1d7e8298a4fd71.gif`,
            embeds: [embed],
          });
        }
      }
    });

    const prefix = `.`;
    this.client.on("messageCreate", async (message) => {
      if (message.author.bot || !message.content.startsWith(prefix)) return;

      let [command, ...args] = message.content
        .slice(prefix.length)
        .trim()
        .split(/\s+/);
      command = command.toLowerCase();
      args = args.join(" ");
      if (command === `say`) {
        await message.channel.send(args.replace(/p2/g, `<@${poketwo}>`));
      } else if (command === `bal`) {
        await message.channel.send(`<@${poketwo}> bal`);
      } else if (command === "incense") {
        await message.channel.send(`<@${poketwo}> incense buy 1d 10s`);
        const msg = (
          await message.channel.awaitMessages({
            filter: p2Filter,
            time: 4000,
            max: 1,
          })
        ).first();
        if (
          msg &&
          msg.content.includes("incense will instantly be activated")
        ) {
          await msg.clickButton({ Y: 2, X: 0 });
        }
      } else if (command === `mbuy`) {
        const id = message.content.split(" ")[1];
        if (!id) {
          return message.reply(`Provide a **id**`);
        }
        await message.channel.send(`<@${poketwo}> m b ${id}`);
        const msg = (
          await message.channel.awaitMessages({
            filter: p2Filter,
            time: 4000,
            max: 1,
          })
        ).first();
        if (msg && msg.content.includes("Are you sure")) {
          await msg.clickButton();
        }
      }
    });
  }
}

module.exports = { AutoCatcher };
