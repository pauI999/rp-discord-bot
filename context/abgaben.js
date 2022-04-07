const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const config = require("../config.json");

// Rollen Check
function isLeaderschaft(interaction) {
  if (
    interaction.member.roles.cache.some(
      (role) => role.id === config.leaderschaft
    )
  ) {
    return true;
  }
  return false;
}

// Rollen Check
function isFamilienrat(interaction) {
  if (
    interaction.member.roles.cache.some(
      (role) => role.id === config.familienrat
    )
  ) {
    return true;
  }
  return false;
}

// Abgabenstatus ändern Funktion Interaction
function toggleAbgaben(interaction, user, kw) {
  let channel = interaction.guild.channels.cache.get(config.abgabenchannel);
  let kassechannel = interaction.guild.channels.cache.get(config.kassechannel);
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
                kassechannel.send(
                  `> + ${config.abgabenstring} Abgaben ${kw} - <@${user}>`
                );
                logEmbed(
                  interaction.member,
                  `Abgaben ${kw} von <@${user}> entgegengenommen`,
                  `+ ${config.abgabenstring}`
                );
              } else {
                teil = ` - <@${user}> - :x:`;
                kassechannel.send(
                  `> - ${config.abgabenstring} Abgaben ${kw} - <@${user}>`
                );
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

// Funktion für die Kalendarwoche
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// Funktion für den Log Channel
function logEmbed(interaction, title, description) {
  const embed = new MessageEmbed()
    .setColor(config.colorhex)
    .setDescription(title)
    .setAuthor({
      name: `${interaction.user.username}#${interaction.user.discriminator}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .addFields({ name: "Auswirkung", value: description })
    .setThumbnail(interaction.guild.iconURL())
    .setTimestamp()
    .setFooter({ text: interaction.guild.name });

  let channel = interaction.guild.channels.cache.get(config.logchannel);
  channel.send({ embeds: [embed] });
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
      if (isLeaderschaft(interaction) || isFamilienrat(interaction)) {
        toggleAbgaben(
          interaction,
          interaction.targetId,
          getWeekNumber(new Date())
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
