const Discord = require("discord.js");

const intents = new Discord.Intents(Discord.Intents.ALL);
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  ws: { intents },
});

const config = require("./config.json");

// Regex der Uhrzeit
const pattern = new RegExp(/\d{2}:\d{2}/);

// Funktion um zu checken ob String eine Zahl ist
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Funktion für die Kalendarwoche
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
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

// Rollen Check
function isLeaderschaft(message) {
  if (
    message.member.roles.cache.some((role) => role.id === config.leaderschaft)
  ) {
    return true;
  }
  return false;
}

// Rollen Check
function isFamilienrat(message) {
  if (
    message.member.roles.cache.some((role) => role.id === config.familienrat)
  ) {
    return true;
  }
  return false;
}

// Rollen Check
function isLeaderschaft2(user) {
  if (user.roles.cache.some((role) => role.id === config.leaderschaft)) {
    return true;
  }
  return false;
}

// Rollen Check
function isFamilienrat2(user) {
  if (user.roles.cache.some((role) => role.id === config.familienrat)) {
    return true;
  }
  return false;
}

// Funktion für den Log Channel
function logEmbed(member, title, description) {
  const embed = new Discord.MessageEmbed()
    .setColor(config.colorhex)
    .setDescription(title)
    .setAuthor(
      `${member.user.username}#${member.user.discriminator}`,
      member.user.displayAvatarURL()
    )
    .addFields({ name: "Auswirkung", value: description })
    .setThumbnail(client.user.displayAvatarURL())
    .setTimestamp()
    .setFooter(member.guild.name);

  let channel = member.guild.channels.cache.get(config.logchannel);
  channel.send({ embed: embed });
}

// Clean Abgabenliste Funktion
function cleanAbgaben(message, kw) {
  let channel = message.guild.channels.cache.get(config.abgabenchannel);
  let done = false;
  channel.messages.fetch({ limit: 20 }).then((messages) => {
    messages.each((smessage) => {
      if (smessage.content.includes(`**${kw}**`)) {
        done = true;
        let teile = smessage.content.split("\n");
        let teileneu = [];
        teileneu.push(teile[0]);
        teile.shift();
        teile.forEach((teil) => {
          var memberID = teil
            .split(" ")[2]
            .replace("<", "")
            .replace("@", "")
            .replace("!", "")
            .replace(">", "");
          let guildMember = message.guild.members.cache.get(memberID);
          if (guildMember) {
            if (
              guildMember.roles.cache.some((role) => role.id === config.famile)
            ) {
              if (
                !guildMember.roles.cache.some(
                  (role) => role.id === config.leaderschaft
                )
              ) {
                teileneu.push(teil);
              }
            }
          }
        });
        smessage.edit(teileneu.join("\n"));
      }
    });
    if (!done) {
      message
        .reply(
          "Fehler: Die Nachricht für diese Kalenderwoche fehlt noch, oder liegt zu weit in der Vergangenheit!"
        )
        .then((msg) => {
          msg.delete({ timeout: config.timeout }).catch((error) => {});
        })
        .catch((error) => {
          console.error(error);
        });
    }
    message.delete({ timeout: config.timeout }).catch((error) => {});
  });
}

// Abgabenstatus ändern Funktion
function toggleAbgaben(message, user, kw) {
  let channel = message.guild.channels.cache.get(config.abgabenchannel);
  let kassechannel = message.guild.channels.cache.get(config.kassechannel);
  let done = false;
  channel.messages.fetch({ limit: 6 }).then((messages) => {
    messages.each((smessage) => {
      if (smessage.content.includes(`**${kw}**`)) {
        if (smessage.content.includes(user.id)) {
          done = true;
          let teile = smessage.content.split("\n");
          let teileneu = [];
          teile.forEach((teil) => {
            if (teil.includes(user.id)) {
              if (teil.includes(":x:")) {
                teil = ` - <@${user.id}> - :white_check_mark:`;
                kassechannel.send(
                  `> + ${config.abgabenstring} Abgaben ${kw} - <@${user.id}>`
                );
                logEmbed(
                  message.member,
                  `Abgaben ${kw} von <@${user.id}> entgegengenommen`,
                  `+ ${config.abgabenstring}`
                );
              } else {
                teil = ` - <@${user.id}> - :x:`;
                kassechannel.send(
                  `> - ${config.abgabenstring} Abgaben ${kw} - <@${user.id}>`
                );
                logEmbed(
                  message.member,
                  `Abgaben ${kw} an <@${user.id}> zurückgegeben`,
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
          message
            .reply(
              "Fehler: Das Mitglied muss diese Woche noch keine Abgaben zahlen!"
            )
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      }
    });
    if (!done) {
      message
        .reply(
          "Fehler: Die Nachricht für diese Kalenderwoche fehlt noch, oder liegt zu weit in der Vergangenheit!"
        )
        .then((msg) => {
          msg.delete({ timeout: config.timeout }).catch((error) => {});
        });
    }
    message.delete({ timeout: config.timeout }).catch((error) => {});
  });
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

// Delete Last Command
async function deletelast(message) {
  let channel = message.member.guild.channels.cache.get(config.waffenchannel);
  let cut = false;
  channel.messages
    .fetch({ limit: 50 })
    .then((messages) => {
      messages.each(async (smessage) => {
        if (cut === false) {
          if (smessage.partial) await smessage.fetch();
          if (smessage.content.includes(message.author)) {
            cut = true;
            if (smessage.reactions.cache.size == 0) {
              smessage.delete().catch((error) => {});
              message
                .reply("Du hast deine letzte Waffenbestellung gelöscht!")
                .then((msg) => {
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                });
            } else {
              message
                .reply(
                  "Fehler: Deine Waffenbestellung ist schon bezahlt, melde dich bei der Leaderschaft um sie zu löschen!"
                )
                .then((msg) => {
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                });
            }
          }
        }
      });
    })
    .then(() => {
      if (!cut) {
        message
          .reply(
            "Fehler: Es konnte keine Waffenbestellung von dir gefunden werden!"
          )
          .then((msg) => {
            message.delete({ timeout: config.timeout }).catch((error) => {});
            msg.delete({ timeout: config.timeout }).catch((error) => {});
          });
      }
    });
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
    sum_messages.push(...messages.array());
    last_id = messages.last().id;

    if (messages.size != 100 || sum_messages.length >= limit) {
      break;
    }
  }

  return sum_messages;
}

// Aktivität Check Funktion
async function getActivity(message, user, days) {
  let channel = message.member.guild.channels.cache.get(
    config.anwesenheitchannel
  );
  message.react("⏳");
  let itmessages = [];
  let cut = false;
  let timeminutes = 0;
  days = typeof days === "undefined" ? config.activitycheckdaysdefault : days;

  (await lots_of_messages_getter(channel, 700)).forEach(async (smessage) => {
    if (cut === false) {
      if (smessage.partial) await smessage.fetch();
      if (smessage.content.includes(user)) {
        if (
          Date.now() - smessage.createdTimestamp >
          1000 * 60 * 60 * 24 * days
        ) {
          cut = true;
        } else {
          if (
            smessage.content.includes("Offline:") &&
            smessage.content.includes("Online:")
          )
            itmessages.push(smessage);
        }
      }
    }
  });
  itmessages.forEach((smessage) => {
    var ontime = smessage.content.split(" ")[2].split("\n")[0];
    var offtime = smessage.content.split(" ").pop();
    var onminutes =
      parseInt(ontime.split(":")[0] * 60) + parseInt(ontime.split(":")[1]);
    var offminutes =
      parseInt(offtime.split(":")[0] * 60) + parseInt(offtime.split(":")[1]);
    var diffminutes = offminutes - onminutes;
    if (diffminutes < 0) {
      timeminutes = timeminutes + (24 * 60 + diffminutes);
    } else {
      timeminutes = timeminutes + diffminutes;
    }
  });
  timestring =
    Math.floor(timeminutes / 60) +
    " Stunden " +
    Math.floor(timeminutes % 60) +
    " Minuten";
  timestringday =
    Math.floor(timeminutes / days / 60) +
    " Stunden " +
    Math.floor((timeminutes / days) % 60) +
    " Minuten";
  message.channel
    .send(
      `Aktivität von ${user} in den letzten ${days} Tag(en):\n` +
        `> Zeit insgesamt: **${timestring}**\n> Zeit im Durchschnitt pro Tag: **${timestringday}**`
    )
    .then(() => {
      message.delete({ timeout: config.timeout }).catch((error) => {});
    })
    .catch((error) => {
      console.error(error);
    });
}

// Aktivität Online Funktion
function activityOn(message, user, type, time) {
  let cut = false;
  let check = true;
  message.channel.messages
    .fetch()
    .then((messages) => {
      messages.each(async (smessage) => {
        if (cut === false) {
          if (smessage.partial) await smessage.fetch();
          if (smessage.content.includes(user)) {
            cut = true;
            if (!smessage.content.includes("Offline:")) {
              check = false;
              if (type === 1) {
                message
                  .reply(
                    "Fehler: Du musst dich zuerst offline stellen, um dich online zu stellen!"
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                message
                  .reply(
                    "Fehler: Du musst " +
                      user +
                      " zuerst offline stellen, um ihn online zu stellen!"
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              }
            }
          }
        }
      });
      message.delete({ timeout: config.timeout }).catch((error) => {});
    })
    .then(() => {
      if (check === true) {
        var today = new Date();
        time =
          typeof time === "undefined"
            ? ("0" + today.getHours()).slice(-2) +
              ":" +
              ("0" + today.getMinutes()).slice(-2)
            : time;
        message.channel.send(`Name: ${user}\n` + `Online: ${time}`);
      }
    });
}

// Aktivität Offline Funktion
function activityOff(message, user, type, time) {
  let cut = false;
  message.channel.messages
    .fetch()
    .then((messages) => {
      messages.each(async (smessage) => {
        if (cut === false) {
          if (smessage.partial) await smessage.fetch();
          if (smessage.content.includes(user)) {
            cut = true;
            if (!smessage.content.includes("Offline:")) {
              var today = new Date();
              time =
                typeof time === "undefined"
                  ? ("0" + today.getHours()).slice(-2) +
                    ":" +
                    ("0" + today.getMinutes()).slice(-2)
                  : time;
              smessage.edit(smessage.content + "\nOffline: " + time);
            } else {
              if (type === 1) {
                message
                  .reply(
                    "Fehler: Du musst zuerst online gewesen sein, um dich offline zu stellen!"
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                message
                  .reply(
                    "Fehler: Du musst " +
                      user +
                      " zuerst online stellen, um ihn offline zu stellen!"
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              }
            }
          }
        }
      });
      message.delete({ timeout: config.timeout }).catch((error) => {});
    })
    .then(() => {
      if (cut === false) {
        message
          .reply(
            "Fehler: Du musst zuerst online gewesen sein, um dich offline zu stellen!"
          )
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
          });
      }
    });
}

client.on("ready", async () => {
  console.log(config.startmessage);
  console.log("----");

  client.user.setActivity(config.prefix + "help");
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  // Bilder-Channel Delete
  if (config.bildchannel !== "0") {
    if (message.channel.id === config.bildchannel) {
      if (message.attachments.size === 0) {
        if (!message.content.toLowerCase().includes("https://")) {
          message.delete().catch((error) => {});
        }
      }
    }
  }
  // !a ic Command
  if (message.content.startsWith("!a")) {
    const args = message.content.slice(3).split(/ +/);
    const command = args[0].toLowerCase();
    if (command === "ic") {
      message.channel.send("Find‘s ic heraus! :slight_smile:");
    }
  }
  if (!message.content.startsWith(config.prefix)) return;
  const args = message.content.slice(config.prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  // Waffenbestellung
  if (config.waffenchannel !== "0") {
    // Waffenbestellung hinzufügen Command
    if (command === "waffen") {
      if (message.channel.id == config.waffenchannel) {
        if (args.length >= 2) {
          if (args.length % 2 === 0) {
            let weapons = new Map();
            let waffen = new Map(Object.entries(config.waffen));
            let error = false;
            for (let i = 0; i < args.length; i = i + 2) {
              if (waffen.has(args[i].toLocaleLowerCase())) {
                if (isNumeric(args[i + 1])) {
                  weapons.set(args[i].toLocaleLowerCase(), args[i + 1]);
                } else {
                  error = true;
                  message
                    .reply(
                      'Syntax: "' +
                        config.prefix +
                        'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                  break;
                }
              } else {
                error = true;
                message
                  .reply(
                    'Syntax: "' +
                      config.prefix +
                      'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!\nEs gibt nur folgende Waffen: ' +
                      config.waffenstring
                  )
                  .then((msg) => {
                    msg.delete({ timeout: 10000 }).catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
                break;
              }
            }
            if (!error) {
              let string = `Name: ${message.author}\nWaffen:\n`;
              weapons.forEach((element, index) => {
                string = `${string}${element}x ${index}\n`;
              });
              message.channel
                .send(string)
                .then((msg) => {
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply(
                'Syntax: "' +
                  config.prefix +
                  'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!'
              )
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(
              'Syntax: "' +
                config.prefix +
                'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!'
            )
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Nur im <#${config.waffenchannel}> Channel möglich!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Waffenverkauf Zusammenfassen Command
    else if (command === "wsum") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (message.channel.id == config.waffenchannel) {
          if (args.length === 0) {
            let cut = false;
            let weapons = new Map();
            message.channel.messages.fetch().then((messages) => {
              messages.each(async (message) => {
                if (cut === false) {
                  if (message.partial) await message.fetch();
                  if (message.content.includes("**Insgesamt:**")) {
                    cut = true;
                  } else if (
                    message.author.bot &&
                    message.content.includes("Waffen:")
                  ) {
                    let messagestring = message.content.split("\n");
                    messagestring.shift();
                    messagestring.shift();
                    let weaponsmessage = new Map();
                    messagestring.forEach((part) => {
                      let parts = part.split(" ");
                      weaponsmessage.set(parts[1], parts[0].slice(0, -1));
                    });
                    weaponsmessage.forEach((element, index) => {
                      if (weapons.has(index)) {
                        weapons.set(
                          index,
                          parseInt(weapons.get(index)) + parseInt(element)
                        );
                      } else {
                        weapons.set(index, parseInt(element));
                      }
                    });
                  }
                }
              });
              let preis = 0;
              let langwaffen = 0;
              let waffen = new Map(Object.entries(config.waffen));
              let messagestring = `**Insgesamt:**\n\n`;
              weapons.forEach((element, index) => {
                if (
                  index == "adw" ||
                  index == "spezi" ||
                  index == "kompakt" ||
                  index == "gusenberg" ||
                  index == "ak"
                ) {
                  langwaffen = langwaffen + element;
                }
                messagestring = `${messagestring}> ${index}: ${element}\n`;
                preis = preis + element * waffen.get(index);
              });

              messagestring = `${messagestring}\nPreis: **${addDots(preis)}$**`;
              messagestring = `${messagestring}\nLangwaffen: **${addDots(
                langwaffen
              )}**`;
              message.channel
                .send(messagestring)
                .then(() => {
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            });
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'wsum"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(`Fehler: Nur im <#${config.waffenchannel}> Channel möglich!`)
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Delete Last Waffen Command
    else if (command === "wdelete") {
      if (args.length === 0) {
        deletelast(message);
      } else {
        message
          .reply('Syntax: "' + config.prefix + 'wdelete"!')
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }
  // Anwesenheit
  if (config.anwesenheitchannel !== "0") {
    // Online stellen Command
    if (command === "on") {
      if (message.channel.id == config.anwesenheitchannel) {
        if (args.length === 0) {
          activityOn(message, message.author, 1);
        } else if (args.length === 1) {
          if (args[0].match(pattern)) {
            activityOn(message, message.author, 1, args[0]);
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'on <Zeit>"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'on <Zeit>"!')
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(
            `Fehler: Nur im <#${config.anwesenheitchannel}> Channel möglich!`
          )
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Offline stellen Command
    else if (command === "off") {
      if (message.channel.id == config.anwesenheitchannel) {
        if (args.length === 0) {
          activityOff(message, message.author, 1);
        } else if (args.length === 1) {
          if (args[0].match(pattern)) {
            activityOff(message, message.author, 1, args[0]);
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'off <Zeit>"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'off <Zeit>"!')
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(
            `Fehler: Nur im <#${config.anwesenheitchannel}> Channel möglich!`
          )
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Andere User Online stellen Command
    else if (command === "aon") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (message.channel.id == config.anwesenheitchannel) {
          if (args.length === 1) {
            if (isNumeric(args[0])) {
              await client.users
                .fetch(args[0])
                .then((user) => {
                  activityOn(message, user, 2);
                })
                .catch(() => {
                  message.channel
                    .send(
                      'Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                });
            } else {
              const user = message.mentions.users.first();
              if (user === undefined) {
                message
                  .reply(
                    'Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!'
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                activityOn(message, user, 2);
              }
            }
          } else if (args.length === 2) {
            if (args[1].match(pattern)) {
              if (isNumeric(args[0])) {
                await client.users
                  .fetch(args[0])
                  .then((user) => {
                    activityOn(message, user, 2, args[1]);
                  })
                  .catch(() => {
                    message.channel
                      .send(
                        'Syntax: "' +
                          config.prefix +
                          'aon (ID | @User) <Zeit>"!'
                      )
                      .then((msg) => {
                        msg
                          .delete({ timeout: config.timeout })
                          .catch((error) => {});
                        message
                          .delete({ timeout: config.timeout })
                          .catch((error) => {});
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                  });
              } else {
                const user = message.mentions.users.first();
                if (user === undefined) {
                  message
                    .reply(
                      'Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                } else {
                  activityOn(message, user, 2, args[1]);
                }
              }
            } else {
              message
                .reply(
                  'Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!'
                )
                .then((msg) => {
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(
              `Fehler: Nur im <#${config.anwesenheitchannel}> Channel möglich!`
            )
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Andere User Offline stellen Command
    else if (command === "aoff") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (message.channel.id == config.anwesenheitchannel) {
          if (args.length === 1) {
            if (isNumeric(args[0])) {
              await client.users
                .fetch(args[0])
                .then((user) => {
                  activityOff(message, user, 2);
                })
                .catch(() => {
                  message.channel
                    .send(
                      'Syntax: "' + config.prefix + 'aoff (ID | @User) <Zeit>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                });
            } else {
              const user = message.mentions.users.first();
              if (user === undefined) {
                message
                  .reply(
                    'Syntax: "' + config.prefix + 'aoff (ID | @User) <Zeit>"!'
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                activityOff(message, user, 2);
              }
            }
          } else if (args.length === 2) {
            if (args[1].match(pattern)) {
              if (isNumeric(args[0])) {
                await client.users
                  .fetch(args[0])
                  .then((user) => {
                    activityOff(message, user, 2, args[1]);
                  })
                  .catch(() => {
                    message.channel
                      .send(
                        'Syntax: "' +
                          config.prefix +
                          'aoff (ID | @User) <Zeit>"!'
                      )
                      .then((msg) => {
                        msg
                          .delete({ timeout: config.timeout })
                          .catch((error) => {});
                        message
                          .delete({ timeout: config.timeout })
                          .catch((error) => {});
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                  });
              } else {
                const user = message.mentions.users.first();
                if (user === undefined) {
                  message
                    .reply(
                      'Syntax: "' + config.prefix + 'aoff (ID | @User) <Zeit>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                } else {
                  activityOff(message, user, 2, args[1]);
                }
              }
            } else {
              message
                .reply(
                  'Syntax: "' + config.prefix + 'aoff (ID | @User) <Zeit>"!'
                )
                .then((msg) => {
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(
              `Fehler: Nur im <#${config.anwesenheitchannel}> Channel möglich!`
            )
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Aktivität Zusammenfassen Command
    else if (command === "acheck") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (args.length === 1) {
          if (isNumeric(args[0])) {
            await client.users
              .fetch(args[0])
              .then((user) => {
                getActivity(message, user);
              })
              .catch(() => {
                message.channel
                  .send(
                    'Syntax: "' + config.prefix + 'acheck (ID | @User) <Tage>"!'
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              });
          } else {
            const user = message.mentions.users.first();
            if (user === undefined) {
              message
                .send(
                  'Syntax: "' + config.prefix + 'acheck (ID | @User) <Tage>"!'
                )
                .then((msg) => {
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            } else {
              getActivity(message, user);
            }
          }
        } else if (args.length === 2) {
          if (isNumeric(args[1])) {
            if (isNumeric(args[0])) {
              await client.users
                .fetch(args[0])
                .then((user) => {
                  getActivity(message, user, parseInt(args[1]));
                })
                .catch(() => {
                  message.channel
                    .send(
                      'Syntax: "' +
                        config.prefix +
                        'acheck (ID | @User) <Tage>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                });
            } else {
              const user = message.mentions.users.first();
              if (user === undefined) {
                message
                  .reply(
                    'Syntax: "' + config.prefix + 'acheck (ID | @User) <Tage>"!'
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                getActivity(message, user, parseInt(args[1]));
              }
            }
          } else {
            message
              .reply(
                'Syntax: "' + config.prefix + 'acheck (ID | @User) <Tage>"!'
              )
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'acheck (ID | @User) <Tage>"!')
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }

  // Abgaben
  if (config.abgabenchannel !== "0") {
    // Abgaben Nachricht erzeugen Command
    if (command === "abgabenmessage") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (args.length === 0) {
          let check = false;
          let channel = message.guild.channels.cache.get(config.abgabenchannel);
          channel.messages
            .fetch({ limit: 5 })
            .then((messages) => {
              messages.each((smessage) => {
                if (
                  smessage.content.includes(`**${getWeekNumber(new Date())}**`)
                ) {
                  check = true;
                }
              });
            })
            .then(() => {
              if (check === false) {
                sendAbgabenMessage(message, channel);
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              } else {
                message
                  .reply(
                    "Fehler: Die Abgabennachricht wurde in dieser Woche bereits gesendet!"
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              }
            });
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'abgabenmessage"!')
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Abgabenstatus ändern Command
    else if (command === "abgaben") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (args.length == 2) {
          if (isNumeric(args[1])) {
            if (isNumeric(args[0])) {
              await client.users
                .fetch(args[0])
                .then((user) => {
                  toggleAbgaben(message, user, args[1]);
                })
                .catch(() => {
                  message
                    .reply(
                      'Syntax: "' +
                        config.prefix +
                        'abgaben (ID | @User) <KW>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                });
            } else {
              const user = message.mentions.users.first();
              if (user === undefined) {
                message
                  .reply(
                    'Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!'
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                toggleAbgaben(message, user, args[1]);
              }
            }
          } else {
            message
              .reply(
                'Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!'
              )
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else if (args.length == 1) {
          if (isNumeric(args[0])) {
            await client.users
              .fetch(args[0])
              .then((user) => {
                toggleAbgaben(message, user, getWeekNumber(new Date()));
              })
              .catch(() => {
                message
                  .reply(
                    'Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!'
                  )
                  .then((msg) => {
                    msg
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              });
          } else {
            const user = message.mentions.users.first();
            if (user === undefined) {
              message
                .reply(
                  'Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!'
                )
                .then((msg) => {
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            } else {
              toggleAbgaben(message, user, getWeekNumber(new Date()));
            }
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!')
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Clean Abgaben Command
    else if (command === "cleanabgaben") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (args.length === 1) {
          if (isNumeric(args[0])) {
            cleanAbgaben(message, args[0]);
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'cleanabgaben (KW)"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'cleanabgaben (KW)"!')
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }
  // Routen-Verkauf
  if (config.routechannel !== "0") {
    // Verkauf Hinzufügen Command
    if (command === "add") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (message.channel.id == config.routechannel) {
          if (args.length == 2) {
            if (isNumeric(args[1])) {
              if (isNumeric(args[0])) {
                const user = await client.users
                  .fetch(args[0])
                  .catch(console.error);
                message.channel
                  .send(
                    `${user} hat ${addDots(args[1])} ${
                      config.droge
                    } abgegeben → ${addDots(args[1] * config.preisavv)}$`
                  )
                  .then(() => {
                    message
                      .delete({ timeout: config.timeout })
                      .catch((error) => {});
                  });
              } else {
                const user = message.mentions.users.first();
                if (user === undefined) {
                  message
                    .reply(
                      'Syntax: "' + config.prefix + 'add <ID | @User> <Menge>"!'
                    )
                    .then((msg) => {
                      msg
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                } else {
                  message.channel
                    .send(
                      `${user} hat ${addDots(args[1])} ${
                        config.droge
                      } abgegeben → ${addDots(args[1] * config.preisavv)}$`
                    )
                    .then(() => {
                      message
                        .delete({ timeout: config.timeout })
                        .catch((error) => {});
                    });
                }
              }
            } else {
              message
                .reply("Syntax: Das ist keine gültige Menge!")
                .then((msg) => {
                  msg.delete({ timeout: config.timeout }).catch((error) => {});
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'add <ID | @User> <Menge>"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(`Fehler: Nur im <#${config.routechannel}> Channel möglich!`)
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Verkauf Zusammenfassen Command
    else if (command === "sum") {
      if (isLeaderschaft(message) || isFamilienrat(message)) {
        if (message.channel.id == config.routechannel) {
          if (args.length === 0) {
            let cut = false;
            let amount = 0;
            message.channel.messages.fetch().then((messages) => {
              messages.each((message) => {
                if (cut === false) {
                  if (message.content.includes("Insgesamt:")) {
                    cut = true;
                  } else if (message.content.includes("abgegeben")) {
                    amount =
                      amount +
                      parseInt(
                        message.content.split(" ")[2].split(".").join("")
                      );
                  }
                }
              });
              timestring =
                Math.floor((amount * 2) / 3600) +
                " Stunden " +
                Math.floor(((amount * 2) % 3600) / 60) +
                " Minuten";
              message.channel
                /*.send(
                `Insgesamt: ${addDots(amount)} ${
                  config.droge
                } → Schwarz: **${addDots(amount * config.preiss)}$**,
                Grün: **${addDots(
                  amount * config.preisg
                )}$**, davon Geld an Verkäufer: **${addDots(
                  amount * config.preisg - amount * config.preisavv
                )}$**``, Zeit: **${timestring}**`
              )*/
                .send(
                  `Insgesamt: ${addDots(amount)} ${
                    config.droge
                  } → Grün: **${addDots(
                    amount * config.preisg
                  )}$**, davon Geld an Leaderschaft: **${addDots(
                    amount * config.preisg - amount * config.preisavv
                  )}$** ➜ Anteil pro Leaderschafter: **${addDots(
                    (amount * config.preisg - amount * config.preisavv) /
                      config.leaderschafter
                  )}$**`
                )
                .then(() => {
                  message
                    .delete({ timeout: config.timeout })
                    .catch((error) => {});
                })
                .catch((error) => {
                  console.error(error);
                });
            });
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'sum"!')
              .then((msg) => {
                msg.delete({ timeout: config.timeout }).catch((error) => {});
                message
                  .delete({ timeout: config.timeout })
                  .catch((error) => {});
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(`Fehler: Nur im <#${config.routechannel}> Channel möglich!`)
            .then((msg) => {
              msg.delete({ timeout: config.timeout }).catch((error) => {});
              message.delete({ timeout: config.timeout }).catch((error) => {});
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            msg.delete({ timeout: config.timeout }).catch((error) => {});
            message.delete({ timeout: config.timeout }).catch((error) => {});
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }
  // Help Command
  else if (command === "help") {
    if (isLeaderschaft(message) || isFamilienrat(message)) {
      message
        .reply(
          `Hilfe [**() → Notwendige Angabe, <> → Optionale Angabe**]:` +
            config.anwesenheitchannel !==
            "0"
            ? '\n - "' +
                config.prefix +
                'on <Zeit>" um dich online zu stellen' +
                '\n - "' +
                config.prefix +
                'off <Zeit>" um dich offline zu stellen' +
                '\n - "' +
                config.prefix +
                'aon (ID | @User) <Zeit>" um einen anderen User online zu stellen' +
                '\n - "' +
                config.prefix +
                'aoff (ID | @User) <Zeit>" um einen anderen User offline zu stellen' +
                '\n - "' +
                config.prefix +
                'acheck (ID | @User) <Tage>" um die Aktivität der letzten ' +
                config.activitycheckdaysdefault +
                " Tage bzw. angegeben Tage zu bekommen"
            : "" + config.routechannel !== "0"
            ? '\n - "' +
              config.prefix +
              'add (ID | @User) (Menge)" um eine Abgabe hinzuzufügen' +
              '\n - "' +
              config.prefix +
              'sum" um die letzten Abgaben zusammenzufassen'
            : "" + config.abgabenchannel !== "0"
            ? '\n - "' +
              config.prefix +
              'abgaben (ID | @User) <KW>" um die Abgaben für ein Mitglied für eine Woche zu ändern' +
              '\n - "' +
              config.prefix +
              'abgabenmessage" um die Abgabennachricht für die Woche zu schicken' +
              '\n - "' +
              config.prefix +
              'cleanabgaben (KW)" um die Abgabennachricht für angegebene Woche zu "bereinigen"'
            : "" + config.waffenchannel !== "0"
            ? '\n - "' +
              config.prefix +
              'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!' +
              "\nEs gibt nur folgende Waffen: " +
              config.waffenstring +
              '\n - "' +
              config.prefix +
              'wdelete" um die letzte Waffenbestellung zu löschen' +
              '\n - "' +
              config.prefix +
              'wsum" um die Waffenbestellung zusammenzufassen'
            : "" +
              '\n - "' +
              config.prefix +
              'help" um diese Nachricht zu bekommen'
        )
        .then((msg) => {
          msg.react("🗑️");
          message.delete({ timeout: config.timeout }).catch((error) => {});
        });
    } else {
      message
        .reply(
          `Hilfe [**<> → Optionale Angabe**]:` + config.anwesenheitchannel !==
            "0"
            ? '\n - "' +
                config.prefix +
                'on <Zeit>" um dich online zu stellen' +
                '\n - "' +
                config.prefix +
                'off <Zeit>" um dich offline zu stellen'
            : "" + config.waffenchannel !== "0"
            ? '\n - "' +
              config.prefix +
              'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!' +
              "\nEs gibt nur folgende Waffen: " +
              config.waffenstring +
              '\n - "' +
              config.prefix +
              'wdelete" um die letzte Waffenbestellung zu löschen'
            : "" +
              '\n - "' +
              config.prefix +
              'help" um diese Nachricht zu bekommen'
        )
        .then((msg) => {
          msg.react("🗑️");
          message.delete({ timeout: config.timeout }).catch((error) => {});
        });
    }
  }
});

// Help Nachricht Löschen mit Reaktion
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.author != client.user) return;
  if (reaction.emoji.name === "🗑️") {
    if (reaction.message.partial) await reaction.message.fetch();
    const member = reaction.message.guild.members.cache.get(user.id);
    if (isLeaderschaft2(member)) {
      reaction.message.delete().catch((error) => {});
    } else if (isFamilienrat2(member)) {
      reaction.message.delete().catch((error) => {});
    } else if (reaction.message.content.includes(member)) {
      reaction.message.delete().catch((error) => {});
    }
  }
});

// Verkauf Rückzahlung Frakkasse Eintrag
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name === "✅") {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.message.channel.id === config.routechannel) {
      const member = reaction.message.mentions.users.first();
      if (member !== undefined) {
        const member2 = reaction.message.guild.members.cache.get(user.id);
        if (isLeaderschaft2(member2) || isFamilienrat2(member2)) {
          let kassechannel = reaction.message.guild.channels.cache.get(
            config.kassechannel
          );
          let amount =
            parseInt(
              reaction.message.content.split(/ +/)[2].split(".").join("")
            ) * config.preisavv;
          kassechannel.send(
            `> - ${addDots(amount)}$ ${
              config.droge
            } Verkauf Rückzahlung - ${member}`
          );
          logEmbed(
            member2,
            `${config.droge} Verkauf an ${member} ausgezahlt`,
            ` - ${addDots(amount)}$`
          );
        }
      }
    }
  }
});

// Verkauf Frakkasse Eintrag
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name === "✅") {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.message.channel.id === config.routechannel) {
      if (reaction.message.content.includes("Insgesamt:")) {
        const member2 = reaction.message.guild.members.cache.get(user.id);
        if (isLeaderschaft2(member2) || isFamilienrat2(member2)) {
          let amount = reaction.message.content
            .split(" ")[1]
            .split(".")
            .join("");
          let kassechannel = reaction.message.guild.channels.cache.get(
            config.kassechannel
          );
          kassechannel.send(
            `> + ${addDots(parseInt(amount) * config.preisavv)}$ ${
              config.droge
            } Verkauf`
          );
          logEmbed(
            member2,
            `${config.droge} Verkauf Einzahlung`,
            `+ ${addDots(parseInt(amount) * config.preisavv)}$`
          );
        }
      }
    }
  }
});

// Waffenbestellung Minus Frakkasse Eintrag
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name === "✅") {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.message.channel.id === config.waffenchannel) {
      if (reaction.message.content.includes("**Insgesamt:**")) {
        const member2 = reaction.message.guild.members.cache.get(user.id);
        if (isLeaderschaft2(member2) || isFamilienrat2(member2)) {
          let messagestring = reaction.message.content.split("\n");
          let preis = messagestring[messagestring.length - 2]
            .split(" ")[1]
            .slice(0, -3)
            .substring(2)
            .split(".")
            .join("");
          let kassechannel = reaction.message.guild.channels.cache.get(
            config.kassechannel
          );
          kassechannel.send(
            `> - ${addDots(parseInt(preis))}$ Waffenbestellung`
          );
          logEmbed(
            member2,
            `Waffenbestellung bezahlt`,
            `- ${addDots(parseInt(preis))}$`
          );
        }
      }
    }
  }
});

// Waffenbestellung Bezahlung Frakkasse Eintrag
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name === "💵") {
    if (reaction.message.partial) await reaction.message.fetch();
    if (!reaction.message.author.bot) return;
    if (reaction.message.channel.id === config.waffenchannel) {
      const member = reaction.message.mentions.users.first();
      if (member !== undefined) {
        const member2 = reaction.message.guild.members.cache.get(user.id);
        if (isLeaderschaft2(member2) || isFamilienrat2(member2)) {
          let messagestring = reaction.message.content.split("\n");
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
          let kassechannel = reaction.message.guild.channels.cache.get(
            config.kassechannel
          );
          kassechannel.send(
            `> + ${addDots(amount)}$ Waffenbestellung - ${member}`
          );
          logEmbed(
            member2,
            `Waffenbestellung von ${member} entgegengenommen`,
            `+ ${addDots(amount)}$`
          );
        }
      }
    }
  }
});

client.login(config.token);
