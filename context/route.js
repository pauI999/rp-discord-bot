const config = require("../config.json");
const functions = require("../functions/functions");

module.exports = {
  data: { name: "route", type: 2 },
  async execute(interaction) {
    if (config.routechannel !== "0") {
      if (
        functions.isLeaderschaft(interaction.member) ||
        functions.isFamilienrat(interaction.member)
      ) {
        interaction.reply({
          content: `Du hast jetzt 15 Sekunden Zeit, um in <#${config.routechannel}> die Anzahl reinzusenden! Wenn du nichts schreibst, passiert auch nichts. Wenn keine Zahl geschrieben wird, passiert auch nichts!`,
          ephemeral: true,
        });

        let routechannel = interaction.channel.guild.channels.cache.get(
          config.routechannel
        );

        const filter = (m) => {
          return m.author.id === interaction.user.id;
        };
        const collector = routechannel.createMessageCollector({
          filter,
          max: 1,
          time: 1000 * 15,
        });
        collector.on("collect", (message) => {
          if (functions.isNumeric(message.content)) {
            if (config.preisg !== "0") {
              routechannel
                .send(
                  `<@${interaction.targetId}> hat ${functions.addDots(
                    message.content
                  )} ${config.droge} abgegeben → ${functions.addDots(
                    message.content * config.preisavv
                  )}$`
                )
                .then(() => {
                  message.delete().catch((error) => {});
                });
            } else {
              routechannel
                .send(
                  `<@${interaction.targetId}> hat ${functions.addDots(
                    message.content
                  )} ${config.droge} abgegeben`
                )
                .then(() => {
                  message.delete().catch((error) => {});
                });
            }
          }
        });
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
