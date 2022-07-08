const config = require("../config.json");
const functions = require("../functions/functions");

module.exports = {
  data: { name: "abgabenc", type: 2 },
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
        functions.toggleAbgaben2(
          interaction,
          interaction.targetId,
          functions.getWeekNumber(new Date())
        );
        console.log(interaction.targetId);
      } else {
        interaction.reply({
          content: "Fehler: Du hast nicht genug Rechte!",
          ephemeral: true,
        });
      }
    }
  },
};
