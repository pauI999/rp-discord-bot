const { SlashCommandBuilder } = require("@discordjs/builders");
const config = require("../config.json");
const functions = require("../functions/functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Füge eine Routenabgabe hinzu!")
    .addUserOption((option) =>
      option
        .setName("familienmitglied")
        .setDescription("Familienmitglied")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("menge")
        .setDescription("Die Menge, die abgegeben wurde")
        .setRequired(true)
    ),
  async execute(interaction) {
    if (config.routechannel == "0") {
      interaction.reply({
        content: "Das Routenfeature ist nicht aktiviert!",
        ephemeral: true,
      });
    } else {
      if (
        functions.isLeaderschaft(interaction.member) ||
        functions.isFamilienrat(interaction.member)
      ) {
        interaction.reply({
          content: `✅ <#${config.routechannel}>`,
          ephemeral: true,
        });
        let routechannel = interaction.guild.channels.cache.get(
          config.routechannel
        );
        if (config.preisg !== "0") {
          routechannel.send(
            `${interaction.options.getUser(
              "familienmitglied"
            )} hat ${functions.addDots(
              interaction.options.getNumber("menge")
            )} ${config.droge} abgegeben → ${functions.addDots(
              functions.addDots(interaction.options.getNumber("menge")) *
                config.preisavv
            )}$`
          );
        } else {
          routechannel.send(
            `${interaction.options.getUser(
              "familienmitglied"
            )} hat ${functions.addDots(
              functions.addDots(interaction.options.getNumber("menge"))
            )} ${config.droge} abgegeben`
          );
        }
      } else {
        interaction.reply({
          content: "Fehler: Du hast nicht genug Rechte!",
          ephemeral: true,
        });
      }
    }
  },
};
