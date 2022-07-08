const { SlashCommandBuilder } = require("@discordjs/builders");
const config = require("../config.json");
const functions = require("../functions/functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("abgaben")
    .setDescription("Ändere den Abgabenstatus eines Familienmitgliedes!")
    .addUserOption((option) =>
      option
        .setName("familienmitglied")
        .setDescription("Familienmitglied")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("kalenderwoche")
        .setDescription("Falls leer, wird die aktuelle genommen")
    ),
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
        console.log(await interaction);
        if (interaction.options.getNumber("kalenderwoche") !== null) {
          if (interaction.options.getNumber("kalenderwoche") == 0) {
            interaction.reply({
              content: "Die Kaldenderwoche darf nicht 0 sein!",
              ephemeral: true,
            });
          } else {
            functions.toggleAbgaben2(
              interaction,
              interaction.options.getUser("familienmitglied").id,
              interaction.options.getNumber("kalenderwoche")
            );
          }
        } else {
          functions.toggleAbgaben2(
            interaction,
            interaction.options.getUser("familienmitglied").id,
            functions.getWeekNumber(new Date())
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
