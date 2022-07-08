const { SlashCommandBuilder } = require("@discordjs/builders");
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
  channel.messages.fetch().then((messages) => {
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
                  if (config.abgabenstring.includes("$")) {
                    kassechannel.messages.fetch({ limit: 1 }).then((ms) => {
                      ms.forEach(async (m) => {
                        if (m.partial) await m.fetch();
                        let msplit = m.content.split(" ");
                        let currentamount = msplit[msplit.length - 1];
                        if (currentamount.includes("$")) {
                          currentamount = currentamount
                            .replaceAll(".", "")
                            .replace("$", "");
                          currentamount = parseInt(currentamount);
                          kassechannel.send(
                            `+ ${
                              config.abgabenstring
                            } Abgaben ${kw} - <@${user}> \n\n> Frakkasse: ${functions.addDots(
                              currentamount +
                                parseInt(
                                  config.abgabenstring
                                    .replaceAll(".", "")
                                    .replace("$", "")
                                )
                            )}$`
                          );
                        } else {
                          kassechannel.send(
                            `+ ${config.abgabenstring} Abgaben ${kw} - <@${user}>`
                          );
                        }
                      });
                    });
                  }
                }
                functions.logEmbed(
                  interaction.member,
                  `Abgaben ${kw} von <@${user}> entgegengenommen`,
                  `+ ${config.abgabenstring}`
                );
              } else {
                teil = ` - <@${user}> - :x:`;
                if (config.kassechannel !== "0") {
                  if (config.abgabenstring.includes("$")) {
                    kassechannel.messages.fetch({ limit: 1 }).then((ms) => {
                      ms.forEach(async (m) => {
                        if (m.partial) await m.fetch();
                        let msplit = m.content.split(" ");
                        let currentamount = msplit[msplit.length - 1];
                        if (currentamount.includes("$")) {
                          currentamount = currentamount
                            .replaceAll(".", "")
                            .replace("$", "");
                          currentamount = parseInt(currentamount);
                          kassechannel.send(
                            `- ${
                              config.abgabenstring
                            } Abgaben ${kw} - <@${user}> \n\n> Frakkasse: ${functions.addDots(
                              currentamount -
                                parseInt(
                                  config.abgabenstring
                                    .replaceAll(".", "")
                                    .replace("$", "")
                                )
                            )}$`
                          );
                        } else {
                          kassechannel.send(
                            `- ${config.abgabenstring} Abgaben ${kw} - <@${user}>`
                          );
                        }
                      });
                    });
                  }
                }
                logEmbed(
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
          return;
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
        content: `Der Abgabenstatus von ${user} in der ${kw}. Woche wurde geändert!`,
        ephemeral: true,
      });
    }
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("abgaben")
    .setDescription("Ändere den Abgabenstatus eines Familienmitgliedes!")
    .addUserOption((option) =>
      option
        .setName("target")
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
        if (interaction.options.getNumber("kalenderwoche") !== null) {
          if (interaction.options.getNumber("kalenderwoche") == 0) {
            interaction.reply({
              content: "Die Kaldenderwoche darf nicht 0 sein!",
              ephemeral: true,
            });
          } else {
            functions.toggleAbgaben2(
              interaction,
              interaction.options.getUser("target").id,
              interaction.options.getNumber("kalenderwoche")
            );
          }
        } else {
          console.log(interaction.options.getUser("target"));
          functions.toggleAbgaben2(
            interaction,
            interaction.options.getUser("target").id,
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
