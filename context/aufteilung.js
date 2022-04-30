const config = require("../config.json");
const Discord = require("discord.js");
const functions = require("../functions/functions");

// Aktivität Help Funktion

async function lots_of_messages_getter2(channel, id, limit = 200) {
  const sum_messages = [];
  let last_id;

  while (true) {
    const options = { limit: 100 };
    if (last_id) {
      options.before = last_id;
    }

    const messages = await channel.messages.fetch(options);
    let breakb = false;
    messages.forEach((message, k) => {
      if (!breakb) {
        if (k == id) {
          sum_messages.push(message);
          breakb = true;
        } else {
          sum_messages.push(message);
        }
      }
    });
    last_id = messages.last().id;

    if (messages.size != 100 || sum_messages.length >= limit || breakb) {
      break;
    }
  }
  return sum_messages;
}

module.exports = {
  data: { name: "aufteilung", type: 3 },
  async execute(interaction) {
    const msg = await interaction.channel.messages.fetch(interaction.targetId);

    if (config.waffenchannel != "0") {
      if (msg.author.bot) {
        if (msg.channel.id === config.logchannel) {
          const map = new Map();
          (await lots_of_messages_getter2(interaction.channel, msg.id)).forEach(
            async (smessage) => {
              if (smessage.partial) await smessage.fetch();
              if (smessage.author.bot) {
                if (smessage.embeds.length == 1) {
                  let embed = smessage.embeds[0];
                  if (
                    embed.description.includes("Waffenbestellung") &&
                    embed.description.includes("entgegengenommen")
                  ) {
                    let id = embed.author.name.split(" ")[2];
                    if (map.has(id)) {
                      let newpreis =
                        parseInt(map.get(id)) +
                        parseInt(
                          embed.fields[0].value
                            .substring(2)
                            .slice(0, -1)
                            .replaceAll(".", "")
                        );
                      map.set(id, newpreis);
                    } else {
                      map.set(
                        id,
                        parseInt(
                          embed.fields[0].value
                            .substring(2)
                            .slice(0, -1)
                            .replaceAll(".", "")
                        )
                      );
                    }
                  }
                }
              }
            }
          );
          let replystring = "Liste:";
          map.forEach((v, k) => {
            replystring =
              replystring + "\n<@" + k + "> → " + functions.addDots(v) + "$";
          });
          interaction.reply({
            content: replystring,
            ephemeral: false,
          });
        } else {
          interaction.reply({
            content: "Fehler: Das geht nur im Log Channel!",
            ephemeral: true,
          });
        }
      } else {
        interaction.reply({
          content: "Fehler: Das ist keine gültige Startnachricht!",
          ephemeral: true,
        });
      }
    } else {
      interaction.reply({
        content: "Das Waffenfeature ist nicht aktiviert!",
        ephemeral: true,
      });
    }
  },
};
