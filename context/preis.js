const config = require("../config.json");
const Discord = require("discord.js");
const functions = require("../functions/functions");

module.exports = {
  data: { name: "preis", type: 3 },
  async execute(interaction) {
    const msg = await interaction.channel.messages.fetch(interaction.targetId);
    if (
      functions.isLeaderschaft(interaction.member) ||
      functions.isFamilienrat(interaction.member)
    ) {
      if (config.waffenchannel != "0") {
        if (msg.author.bot) {
          if (msg.channel.id === config.waffenchannel) {
            const member = msg.mentions.users.first();
            if (member !== undefined) {
              let messagestring = msg.content.split("\n");
              messagestring.shift();
              messagestring.shift();
              let weapons = new Map();
              messagestring.forEach((part) => {
                let parts = part.split(" ");
                weapons.set(parts[1], parts[0].slice(0, -1));
              });
              let amount = 0;
              let waffen = new Map(Object.entries(config.waffen));
              weapons.forEach((element, index) => {
                amount = amount + element * waffen.get(index);
              });

              interaction.reply({
                content: "Preis: " + functions.addDots(amount) + "$",
                ephemeral: true,
              });
            }
          } else {
            interaction.reply({
              content: "Fehler: Das ist keine Waffenbestellung!",
              ephemeral: true,
            });
          }
        } else {
          interaction.reply({
            content: "Fehler: Das ist keine Waffenbestellung!",
            ephemeral: true,
          });
        }
      } else {
        interaction.reply({
          content: "Das Waffenfeature ist nicht aktiviert!",
          ephemeral: true,
        });
      }
    } else {
      interaction.reply({
        content: "Fehler: Du hast nicht genug Rechte!",
        ephemeral: true,
      });
    }
  },
};
