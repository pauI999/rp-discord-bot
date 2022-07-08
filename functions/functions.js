const config = require("../config.json");
const Discord = require("discord.js");

// Regex der Uhrzeit
const pattern = new RegExp(/\d{2}:\d{2}/);

// Funktion um zu checken ob String eine Zahl ist
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Abgaben Message Funktion
function sendAbgabenMessage(message, channel) {
  var string = [];
  string.push(
    `Abgaben (${config.abgabenstring}) - KW **${getWeekNumber(new Date())}**`
  );
  message.guild.members.cache
    .sort(function (a, b) {
      if (a.displayName < b.displayName) {
        return 1;
      }
      if (a.displayName > b.displayName) {
        return -1;
      }
      return 0;
    })
    .each((member) => {
      if (member.roles.cache.some((role) => role.id === config.familie)) {
        if (
          !member.roles.cache.some((role) => role.id === config.leaderschaft)
        ) {
          string.push(`\n - ${member} - :x:`);
        }
      }
    });
  channel.send(string.join(""));
}

// Funktion für die Kalendarwoche
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// Rollen Check Leaderschafts
function isLeaderschaft(member) {
  if (member.roles.cache.some((role) => role.id === config.leaderschaft)) {
    return true;
  }
  return false;
}

// Rollen Check
function isFamilienrat(member) {
  if (member.roles.cache.some((role) => role.id === config.familienrat)) {
    return true;
  }
  return false;
}

// Funktion um Punkte bei Zahlen hinzuzufügen
function addDots(nStr) {
  nStr += "";
  x = nStr.split(".");
  x1 = x[0];
  x2 = x.length > 1 ? "." + x[1] : "";
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, "$1" + "." + "$2");
  }
  return x1 + x2;
}

// Funktion für den Log Channel
function logEmbed(member, title, description) {
  const embed = new Discord.MessageEmbed()
    .setColor(config.colorhex)
    .setDescription(title)
    .setAuthor({
      name: `${member.user.username}#${member.user.discriminator} | ${member.id}`,
      iconURL: member.user.displayAvatarURL(),
    })
    .addFields({ name: "Auswirkung", value: description })
    .setThumbnail(member.guild.iconURL())
    .setTimestamp()
    .setFooter({ text: member.guild.name });

  let channel = member.guild.channels.cache.get(config.logchannel);
  channel.send({ embeds: [embed] });
}

// Aktivität Help Funktion
async function lots_of_messages_getter(channel, limit = 500) {
  const sum_messages = [];
  let last_id;

  while (true) {
    const options = { limit: 100 };
    if (last_id) {
      options.before = last_id;
    }

    const messages = await channel.messages.fetch(options);
    sum_messages.push(...messages);
    last_id = messages.last().id;

    if (messages.size != 100 || sum_messages.length >= limit) {
      break;
    }
  }
  const final_messages = [];

  sum_messages.forEach((summessage) => {
    final_messages.push(summessage[1]);
  });

  return final_messages;
}

// Abgabenstatus ändern Funktion Interaction
function toggleAbgaben2(interaction, user, kw) {
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
                            } Abgaben ${kw} - <@${user}> \n\n> Frakkasse: ${addDots(
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
                logEmbed(
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
                            } Abgaben ${kw} - <@${user}> \n\n> Frakkasse: ${addDots(
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
        content: `Der Abgabenstatus von <@${user}> in der ${kw}. Woche wurde geändert!`,
        ephemeral: true,
      });
    }
  });
}

module.exports = {
  isNumeric,
  sendAbgabenMessage,
  isLeaderschaft,
  pattern,
  getWeekNumber,
  isFamilienrat,
  addDots,
  logEmbed,
  lots_of_messages_getter,
  toggleAbgaben2,
};
