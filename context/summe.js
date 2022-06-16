const config = require("../config.json");
const functions = require("../functions/functions");

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
        (await functions.lots_of_messages_getter(routechannel)).forEach(
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
