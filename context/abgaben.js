const config = require("../config.json");
const functions = require("../functions/functions");

// Abgabenstatus ändern Funktion Interaction
function toggleAbgaben(interaction, user, kw) {
  let channel = interaction.guild.channels.cache.get(config.abgabenchannel);
  let kassechannel;
  if (config.kassechannel !== "0") {
    kassechannel = interaction.guild.channels.cache.get(config.kassechannel);
  }
  let done = false;
  channel.messages.fetch({ limit: 6 }).then((messages) => {
    messages.each((smessage) => {
      if (smessage.content.includes(`**${kw}**`)) {
        if (smessage.content.includes(user)) {
          done = true;
          let teile = smessage.content.split("\n");
          let teileneu = [];
          teile.forEach((teil) => {
            if (teil.includes(user)) {
              if (teil.includes(":x:")) {
                teil = ` - <@${user}> - :white_check_mark:`;
                if (config.kassechannel !== "0") {
                  kassechannel.send(
                    `> + ${config.abgabenstring} Abgaben ${kw} - <@${user}>`
                  );
                }
                functions.logEmbed(
                  interaction.member,
                  `Abgaben ${kw} von <@${user}> entgegengenommen`,
                  `+ ${config.abgabenstring}`
                );
              } else {
                teil = ` - <@${user}> - :x:`;
                if (config.kassechannel !== "0") {
                  kassechannel.send(
                    `> - ${config.abgabenstring} Abgaben ${kw} - <@${user}>`
                  );
                }
                functions.logEmbed(
                  interaction.member,
                  `Abgaben ${kw} an <@${user}> zurückgegeben`,
                  `- ${config.abgabenstring}`
                );
              }
              teileneu.push(teil);
            } else {
              teileneu.push(teil);
            }
          });
          smessage.edit(teileneu.join("\n"));
        } else {
          interaction.reply({
            content:
              "Fehler: Das Mitglied muss diese Woche noch keine Abgaben zahlen!",
            ephemeral: true,
          });
        }
      }
    });
    if (!done) {
      interaction.reply({
        content:
          "Fehler: Die Nachricht für diese Kalenderwoche fehlt noch, oder liegt zu weit in der Vergangenheit!",
        ephemeral: true,
      });
    } else {
      interaction.reply({
        content: `Der Abgabenstatus von <@${user}> in der ${kw}. Woche wurde geändert!`,
        ephemeral: true,
      });
    }
  });
}

module.exports = {
  data: { name: "abgaben", type: 2 },
  async execute(interaction) {
    if (config.abgabenchannel == "0") {
      interaction.reply({
        content: "Das Abgabenfeature ist nicht aktiviert!",
        ephemeral: true,
      });
    } else {
      if (
        functions.isLeaderschaft(interaction.member) ||
        functions.isFamilienrat(interaction.member)
      ) {
        toggleAbgaben(
          interaction,
          interaction.targetId,
          functions.getWeekNumber(new Date())
        );
      } else {
        interaction.reply({
          content: "Fehler: Du hast nicht genug Rechte!",
          ephemeral: true,
        });
      }
    }
  },
};
