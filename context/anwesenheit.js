const config = require("../config.json");
const Discord = require("discord.js");
const functions = require("../functions/functions");

module.exports = {
  data: { name: "anwesenheit", type: 3 },
  async execute(interaction) {
    const msg = await interaction.channel.messages.fetch(interaction.targetId);
    if (
      functions.isLeaderschaft(interaction.member) ||
      functions.isFamilienrat(interaction.member)
    ) {
      const namesmsg = [];

      const msgsplit = msg.content
        .replaceAll(":", "")
        .replaceAll(/[0-9]/g, "")
        .split("\n");

      for (let i = 0; i < msgsplit.length; i++) {
        namesmsg.push(msgsplit[i]);
      }

      const namesrole = [];

      interaction.guild.members.cache.each((member) => {
        if (member.roles.cache.some((role) => role.id === config.familie)) {
          namesrole
            .push(member.displayName.replace(/ *\"[^)]*\" */g, ""))
            .replaceAll("  ", " ");
        }
      });

      const namesabwesend = [];

      namesrole.forEach((namerole) => {
        let check = false;
        namesmsg.forEach((namemsg) => {
          if (namerole.includes(namemsg)) {
            check = true;
          }
        });
        if (!check) {
          namesabwesend.push(namerole);
        }
      });

      if (namesabwesend.length == 0) {
        namesabwesend.push("-");
      }

      const memberCount = interaction.guild.roles.cache.get(config.familie)
        .members.size;

      const embed = new Discord.MessageEmbed()
        .setColor(config.colorhex)
        .setTitle("Anwesenheitsliste")
        .addFields({
          name: "Anzahl",
          value: namesmsg.length + "/" + memberCount,
        })
        .addFields({
          name: "Anwesend",
          value: namesmsg.join("\n"),
        })
        .addFields({
          name: "Abwesend",
          value: namesabwesend.join("\n"),
        })
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp()
        .setFooter({ text: interaction.guild.name });

      interaction.reply({
        embeds: [embed],
      });
    } else {
      interaction.reply({
        content: "Fehler: Du hast nicht genug Rechte!",
        ephemeral: true,
      });
    }
  },
};
