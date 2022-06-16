const config = require("../config.json");
const Discord = require("discord.js");
const functions = require("../functions/functions");

// Aktivität Help Funktion

async function lots_of_messages_getter(channel, limit = 500) {
  const sum_messages = [];
  let last_id;

  while (true) {
    const options = { limit: 100 };
    if (last_id) {
      options.before = last_id;
    }

    const messages = await channel.messages.fetch(options);
    sum_messages.push(...messages);
    last_id = messages.last().id;

    if (messages.size != 100 || sum_messages.length >= limit) {
      break;
    }
  }
  const final_messages = [];

  sum_messages.forEach((summessage) => {
    final_messages.push(summessage[1]);
  });

  return final_messages;
}

module.exports = {
  data: { name: "summe", type: 2 },
  async execute(interaction) {
    if (config.routechannel != "0") {
      if (
        functions.isLeaderschaft(interaction.member) ||
        functions.isFamilienrat(interaction.member)
      ) {
        let routechannel = interaction.channel.guild.channels.cache.get(
          config.routechannel
        );
        let amountall = 0;
        (await lots_of_messages_getter(routechannel)).forEach(
          async (smessage) => {
            if (smessage.partial) await smessage.fetch();
            if (smessage.author.bot) {
              if (
                smessage.content.includes("hat") &&
                smessage.content.includes("abgegeben")
              ) {
                if (smessage.content.includes(interaction.targetId)) {
                  let amount = parseInt(
                    smessage.content.split(" ")[2].replaceAll(".", "")
                  );
                  amountall = amountall + amount;
                }
              }
            }
          }
        );
        if (config.preisg == "0") {
          interaction.reply({
            content: `<@${interaction.targetId}> → ${functions.addDots(
              amountall
            )} ${config.droge}`,
            ephemeral: false,
          });
        } else {
          interaction.reply({
            content: `<@${interaction.targetId}> → ${functions.addDots(
              amountall
            )} ${config.droge} → ${functions.addDots(
              amountall * config.preisavv
            )}$`,
            ephemeral: false,
          });
        }
      } else {
        interaction.reply({
          content: "Fehler: Du hast nicht genug Rechte!",
          ephemeral: true,
        });
      }
    } else {
      interaction.reply({
        content: "Das Routenfeature ist nicht aktiviert!",
        ephemeral: true,
      });
    }
  },
};
