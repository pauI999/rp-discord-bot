const Discord = require("discord.js");
const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const config = require("./config.json");
const functions = require("./functions/functions");

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_PRESENCES,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

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
          setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
        })
        .catch((error) => {
          console.error(error);
        });
    }
    setTimeout(() => message.delete().catch((error) => {}), config.timeout);
  });
}

// Abgabenstatus ändern Funktion
function toggleAbgaben(message, user, kw) {
  let channel = message.guild.channels.cache.get(config.abgabenchannel);
  let kassechannel;
  if (config.kassechannel !== "0") {
    kassechannel = message.guild.channels.cache.get(config.kassechannel);
  }
  let done = false;
  channel.messages.fetch().then((messages) => {
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
                if (config.kassechannel !== "0") {
                  kassechannel.send(
                    `> + ${config.abgabenstring} Abgaben ${kw} - <@${user.id}>`
                  );
                }
                functions.logEmbed(
                  message.member,
                  `Abgaben ${kw} von <@${user.id}> entgegengenommen`,
                  `+ ${config.abgabenstring}`
                );
              } else {
                teil = ` - <@${user.id}> - :x:`;
                if (config.kassechannel !== "0") {
                  kassechannel.send(
                    `> - ${config.abgabenstring} Abgaben ${kw} - <@${user.id}>`
                  );
                }
                functions.logEmbed(
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
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
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
          setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
        });
    }
    setTimeout(() => message.delete().catch((error) => {}), config.timeout);
  });
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
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch();
            } else {
              message
                .reply(
                  "Fehler: Deine Waffenbestellung ist schon bezahlt, melde dich bei der Leaderschaft um sie zu löschen!"
                )
                .then((msg) => {
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch();
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
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
          })
          .catch();
      }
    });
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

  (await functions.lots_of_messages_getter(channel, 700)).forEach(
    async (smessage) => {
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
    }
  );
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
      setTimeout(() => message.delete().catch((error) => {}), config.timeout);
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              } else {
                message
                  .reply(
                    "Fehler: Du musst " +
                      user +
                      " zuerst offline stellen, um ihn online zu stellen!"
                  )
                  .then((msg) => {
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              }
            }
          }
        }
      });
      setTimeout(() => message.delete().catch((error) => {}), config.timeout);
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              } else {
                message
                  .reply(
                    "Fehler: Du musst " +
                      user +
                      " zuerst online stellen, um ihn offline zu stellen!"
                  )
                  .then((msg) => {
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              }
            }
          }
        }
      });
      setTimeout(() => message.delete().catch((error) => {}), config.timeout);
    })
    .then(() => {
      if (cut === false) {
        message
          .reply(
            "Fehler: Du musst zuerst online gewesen sein, um dich offline zu stellen!"
          )
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
          });
      }
    });
}

const commandsFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

const commands = [];

client.commands = new Discord.Collection();

for (const file of commandsFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

const contextFiles = fs
  .readdirSync("./context")
  .filter((file) => file.endsWith(".js"));

for (const file of contextFiles) {
  const command = require(`./context/${file}`);
  commands.push(command.data);
  client.commands.set(command.data.name, command);
}

client.once("ready", async () => {
  console.log(config.startmessage);
  console.log("----");

  client.user.setActivity(config.prefix + "help");
  client.user.setStatus("dnd");

  const CLIENT_ID = client.user.id;

  const rest = new REST({
    version: "9",
  }).setToken(config.token);

  (async () => {
    try {
      if (config.status == true) {
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
          body: commands,
        });
        console.log("Commands wurde global registriert!");
      } else {
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, config.guildID),
          {
            body: commands,
          }
        );
        console.log("Commands wurde lokal registriert!");
      }
    } catch (err) {
      if (err) console.error(err);
    }
  })();
});

client.on("guildMemberRemove", async (member) => {
  if (config.leavechannel !== "0") {
    const embed = new Discord.MessageEmbed()
      .setColor(config.colorhex)
      .setTitle(`Tschüss ${member.displayName}, fick dein Vater!`)
      .setImage("https://i.ibb.co/Q6WH8ZM/f-rdiebrigada.png")
      .setTimestamp()
      .setFooter({ text: member.guild.name });
    let channel = member.guild.channels.cache.get(config.leavechannel);
    channel.send({ embeds: [embed] });
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (!config.categories || config.categories == "") return;
  let categories = config.categories;
  if (config.categories == "brigadapfeil") {
    categories = "»";
  }
  let guildClient = oldMember.guild.members.cache.get(client.user.id);
  if (guildClient.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
    let rolesnew = newMember.roles.cache;
    if (oldMember.roles.cache.size != rolesnew.size) {
      let rolesguild = oldMember.guild.roles.cache;
      rolesguild.sort((a, b) => (a.rawPosition < b.rawPosition ? 1 : -1));
      let maproles = new Map();
      rolesguild.forEach((role) => {
        if (role.name.includes(categories)) {
          maproles.set(role.id, []);
        }
      });
      let i = -1;
      rolesguild.forEach((role) => {
        if (maproles.has(role.id)) {
          i++;
        } else {
          let temp = maproles.get(Array.from(maproles.keys())[i]);
          temp.push(role.id);
          maproles.set(Array.from(maproles.keys())[i], temp);
        }
      });

      maproles.forEach((catroles, catrole) => {
        needscat = false;
        catroles.forEach((role) => {
          if (rolesnew.some((r) => r.id === role)) {
            if (role !== oldMember.guild.roles.everyone.id) {
              needscat = true;
            }
          }
        });
        if (needscat) {
          if (!rolesnew.some((r) => r.id === catrole))
            newMember.roles
              .add(catrole, "Kategorie hat gefehlt!")
              .catch((error) => {});
        } else {
          if (rolesnew.some((r) => r.id === catrole))
            newMember.roles
              .remove(catrole, "Kategorie wird nicht benötigt!")
              .catch((error) => {});
        }
      });
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      if (err) console.error(err);
      await interaction.reply({
        content: "Fehler bei der Interaction",
        ephemeral: true,
      });
    }
  }

  if (interaction.isContextMenu()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      if (err) console.error(err);
      await interaction.reply({
        content: "Fehler bei der Interaction",
        ephemeral: true,
      });
    }
  }
});

client.on("messageCreate", async (message) => {
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
  // !a Commands
  if (message.content.startsWith("!a")) {
    const args = message.content.slice(3).split(/ +/);
    const command = args[0].toLowerCase();
    if (command === "ic") {
      message.channel.send("Find‘s ic heraus! :slight_smile:");
    } else if (command === "waffe") {
      message.channel.send(
        "Bitte an <#969787601294864384> halten! <:marceloThumbsUp:969784438596718632>"
      );
    } else if (command === "schwein") {
      message.channel.send("Du Schwein! :pig:");
    } else if (command === "chat") {
      message.channel.send(
        "Chattet woanders ihr ... <:marceloThumbsDown:969785051325812796>"
      );
    } else if (command === "perry") {
      message.channel.send(
        "https://medal.tv/games/gta-v/clips/oZ8g0JmIq8bqb/d1337vgz7jTB?invite=cr-MSxGU3EsNTI3NDU0MTAs"
      );
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
                if (functions.isNumeric(args[i + 1])) {
                  if (config.waffenleaderschaft) {
                    if (
                      args[i].toLocaleLowerCase() == "adw" ||
                      args[i].toLocaleLowerCase() == "gusenberg" ||
                      args[i].toLocaleLowerCase() == "spezi" ||
                      args[i].toLocaleLowerCase() == "ak" ||
                      args[i].toLocaleLowerCase() == "kompakt"
                    ) {
                      if (
                        functions.isLeaderschaft(message.member) ||
                        functions.isFamilienrat(message.member)
                      ) {
                        weapons.set(args[i].toLocaleLowerCase(), args[i + 1]);
                      } else {
                        error = true;
                        message
                          .reply(
                            "Fehler: Momentan kann nur die Leaderschaft oder der Familienrat Langwaffen bestellen!"
                          )
                          .then((msg) => {
                            setTimeout(
                              () => msg.delete().catch((error) => {}),
                              config.timeout
                            );
                            setTimeout(
                              () => message.delete().catch((error) => {}),
                              config.timeout
                            );
                          });
                        break;
                      }
                    } else {
                      weapons.set(args[i].toLocaleLowerCase(), args[i + 1]);
                    }
                  } else {
                    weapons.set(args[i].toLocaleLowerCase(), args[i + 1]);
                  }
                } else {
                  error = true;
                  message
                    .reply(
                      'Syntax: "' +
                        config.prefix +
                        'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!'
                    )
                    .then((msg) => {
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                    setTimeout(() => msg.delete().catch((error) => {}), 10000);
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
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
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
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
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
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
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Nur im <#${config.waffenchannel}> Channel möglich!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Waffenverkauf Zusammenfassen Command
    else if (command === "wsum") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
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

              messagestring = `${messagestring}\nPreis: **${functions.addDots(
                preis
              )}$**`;
              messagestring = `${messagestring}\nLangwaffen: **${functions.addDots(
                langwaffen
              )}**`;
              message.channel
                .send(messagestring)
                .then(() => {
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            });
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'wsum"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(`Fehler: Nur im <#${config.waffenchannel}> Channel möglich!`)
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
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
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
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
          if (args[0].match(functions.pattern)) {
            activityOn(message, message.author, 1, args[0]);
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'on <Zeit>"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'on <Zeit>"!')
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(
            `Fehler: Nur im <#${config.anwesenheitchannel}> Channel möglich!`
          )
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
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
          if (args[0].match(functions.pattern)) {
            activityOff(message, message.author, 1, args[0]);
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'off <Zeit>"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'off <Zeit>"!')
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(
            `Fehler: Nur im <#${config.anwesenheitchannel}> Channel möglich!`
          )
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Andere User Online stellen Command
    else if (command === "aon") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (message.channel.id == config.anwesenheitchannel) {
          if (args.length === 1) {
            if (functions.isNumeric(args[0])) {
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
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              } else {
                activityOn(message, user, 2);
              }
            }
          } else if (args.length === 2) {
            if (args[1].match(functions.pattern)) {
              if (functions.isNumeric(args[0])) {
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
                        setTimeout(
                          () => msg.delete().catch((error) => {}),
                          config.timeout
                        );
                        setTimeout(
                          () => message.delete().catch((error) => {}),
                          config.timeout
                        );
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
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
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
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Andere User Offline stellen Command
    else if (command === "aoff") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (message.channel.id == config.anwesenheitchannel) {
          if (args.length === 1) {
            if (functions.isNumeric(args[0])) {
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
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              } else {
                activityOff(message, user, 2);
              }
            }
          } else if (args.length === 2) {
            if (args[1].match(functions.pattern)) {
              if (functions.isNumeric(args[0])) {
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
                        setTimeout(
                          () => msg.delete().catch((error) => {}),
                          config.timeout
                        );
                        setTimeout(
                          () => message.delete().catch((error) => {}),
                          config.timeout
                        );
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
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'aon (ID | @User) <Zeit>"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
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
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Aktivität Zusammenfassen Command
    else if (command === "acheck") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (args.length === 1) {
          if (functions.isNumeric(args[0])) {
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
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
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            } else {
              getActivity(message, user);
            }
          }
        } else if (args.length === 2) {
          if (functions.isNumeric(args[1])) {
            if (functions.isNumeric(args[0])) {
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
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
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
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'acheck (ID | @User) <Tage>"!')
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
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
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (args.length === 0) {
          let check = false;
          let channel = message.guild.channels.cache.get(config.abgabenchannel);
          channel.messages
            .fetch({ limit: 5 })
            .then((messages) => {
              messages.each((smessage) => {
                if (
                  smessage.content.includes(
                    `**${functions.getWeekNumber(new Date())}**`
                  )
                ) {
                  check = true;
                }
              });
            })
            .then(() => {
              if (check === false) {
                functions.sendAbgabenMessage(message, channel);
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              } else {
                message
                  .reply(
                    "Fehler: Die Abgabennachricht wurde in dieser Woche bereits gesendet!"
                  )
                  .then((msg) => {
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
                  });
              }
            });
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'abgabenmessage"!')
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Abgabenstatus ändern Command
    else if (command === "abgaben") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (args.length == 2) {
          if (functions.isNumeric(args[1])) {
            if (functions.isNumeric(args[0])) {
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
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
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
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
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
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else if (args.length == 1) {
          if (functions.isNumeric(args[0])) {
            await client.users
              .fetch(args[0])
              .then((user) => {
                toggleAbgaben(
                  message,
                  user,
                  functions.getWeekNumber(new Date())
                );
              })
              .catch(() => {
                message
                  .reply(
                    'Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!'
                  )
                  .then((msg) => {
                    setTimeout(
                      () => msg.delete().catch((error) => {}),
                      config.timeout
                    );
                    setTimeout(
                      () => message.delete().catch((error) => {}),
                      config.timeout
                    );
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
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            } else {
              toggleAbgaben(message, user, functions.getWeekNumber(new Date()));
            }
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'abgaben (ID | @User) <KW>"!')
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Clean Abgaben Command
    else if (command === "cleanabgaben") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (args.length === 1) {
          if (functions.isNumeric(args[0])) {
            cleanAbgaben(message, args[0]);
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'cleanabgaben (KW)"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply('Syntax: "' + config.prefix + 'cleanabgaben (KW)"!')
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }
  // Aussetzen
  if (command === "aussetzen") {
    if (
      functions.isLeaderschaft(message.member) ||
      functions.isFamilienrat(message.member)
    ) {
      const pool = [];
      message.guild.members.cache.each((member) => {
        if (member.roles.cache.some((role) => role.id === config.familie)) {
          if (
            !member.roles.cache.some((role) => role.id === config.leaderschaft)
          ) {
            if (
              !member.roles.cache.some((role) => role.id === config.familienrat)
            ) {
              if (
                !member.roles.cache.some((role) => role.id === config.backstep)
              ) {
                pool.push(member);
              }
            }
          }
        }
      });
      var picked = pool[Math.floor(Math.random() * pool.length)];
      message
        .reply(`Aussetzen: ${picked} :headstone:`)
        .then((msg) => {
          setTimeout(
            () => message.delete().catch((error) => {}),
            config.timeout
          );
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      message
        .reply(`Fehler: Du hast nicht genug Rechte!`)
        .then((msg) => {
          setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
          setTimeout(
            () => message.delete().catch((error) => {}),
            config.timeout
          );
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  // Routen-Verkauf
  if (config.routechannel !== "0") {
    // Verkauf Hinzufügen Command
    if (command === "add") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
        if (message.channel.id == config.routechannel) {
          if (args.length == 2) {
            if (functions.isNumeric(args[1])) {
              if (functions.isNumeric(args[0])) {
                const user = await client.users
                  .fetch(args[0])
                  .catch(console.error);
                if (config.preisg !== "0") {
                  message.channel
                    .send(
                      `${user} hat ${functions.addDots(args[1])} ${
                        config.droge
                      } abgegeben → ${functions.addDots(
                        args[1] * config.preisavv
                      )}$`
                    )
                    .then(() => {
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
                    });
                } else {
                  message.channel
                    .send(
                      `${user} hat ${functions.addDots(args[1])} ${
                        config.droge
                      } abgegeben`
                    )
                    .then(() => {
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
                    });
                }
              } else {
                const user = message.mentions.users.first();
                if (user === undefined) {
                  message
                    .reply(
                      'Syntax: "' + config.prefix + 'add <ID | @User> <Menge>"!'
                    )
                    .then((msg) => {
                      setTimeout(
                        () => msg.delete().catch((error) => {}),
                        config.timeout
                      );
                      setTimeout(
                        () => message.delete().catch((error) => {}),
                        config.timeout
                      );
                    });
                } else {
                  if (config.preisg !== "0") {
                    message.channel
                      .send(
                        `${user} hat ${functions.addDots(args[1])} ${
                          config.droge
                        } abgegeben → ${functions.addDots(
                          args[1] * config.preisavv
                        )}$`
                      )
                      .then(() => {
                        setTimeout(
                          () => message.delete().catch((error) => {}),
                          config.timeout
                        );
                      });
                  } else {
                    message.channel
                      .send(
                        `${user} hat ${functions.addDots(args[1])} ${
                          config.droge
                        } abgegeben`
                      )
                      .then(() => {
                        setTimeout(
                          () => message.delete().catch((error) => {}),
                          config.timeout
                        );
                      });
                  }
                }
              }
            } else {
              message
                .reply("Syntax: Das ist keine gültige Menge!")
                .then((msg) => {
                  setTimeout(
                    () => msg.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'add <ID | @User> <Menge>"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(`Fehler: Nur im <#${config.routechannel}> Channel möglich!`)
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
    // Verkauf Zusammenfassen Command
    else if (command === "sum") {
      if (
        functions.isLeaderschaft(message.member) ||
        functions.isFamilienrat(message.member)
      ) {
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
                `Insgesamt: ${functions.addDots(amount)} ${
                  config.droge
                } → Schwarz: **${functions.addDots(amount * config.preiss)}$**,
                Grün: **${functions.addDots(
                  amount * config.preisg
                )}$**, davon Geld an Verkäufer: **${functions.addDots(
                  amount * config.preisg - amount * config.preisavv
                )}$**``, Zeit: **${timestring}**`
              )*/
                .send(
                  `Insgesamt: ${functions.addDots(amount)} ${
                    config.droge
                  } → Grün: **${functions.addDots(amount * config.preisg)}$**`
                  /*, davon Geld an Leaderschaft: **${functions.addDots(
                    amount * config.preisg - amount * config.preisavv
                  )}$** ➜ Anteil pro Leaderschafter: **${functions.addDots(
                    (amount * config.preisg - amount * config.preisavv) /
                      config.leaderschafter
                  )}$**`*/
                )
                .then(() => {
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                  setTimeout(
                    () => message.delete().catch((error) => {}),
                    config.timeout
                  );
                })
                .catch((error) => {
                  console.error(error);
                });
            });
          } else {
            message
              .reply('Syntax: "' + config.prefix + 'sum"!')
              .then((msg) => {
                setTimeout(
                  () => msg.delete().catch((error) => {}),
                  config.timeout
                );
                setTimeout(
                  () => message.delete().catch((error) => {}),
                  config.timeout
                );
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } else {
          message
            .reply(`Fehler: Nur im <#${config.routechannel}> Channel möglich!`)
            .then((msg) => {
              setTimeout(
                () => msg.delete().catch((error) => {}),
                config.timeout
              );
              setTimeout(
                () => message.delete().catch((error) => {}),
                config.timeout
              );
            });
        }
      } else {
        message
          .reply(`Fehler: Du hast nicht genug Rechte!`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
            setTimeout(
              () => message.delete().catch((error) => {}),
              config.timeout
            );
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }
  if (command === "categories") {
    if (
      functions.isLeaderschaft(message.member) ||
      functions.isFamilienrat(message.member)
    ) {
      if (!config.categories || config.categories == "") {
        message.react("❌");
      } else {
        let categories = config.categories;
        if (config.categories == "brigadapfeil") {
          categories = "»";
        }
        message.react("✅");
        let rolesguild = message.guild.roles.cache;
        rolesguild.sort((a, b) => (a.rawPosition < b.rawPosition ? 1 : -1));
        let maproles = new Map();
        rolesguild.forEach((role) => {
          if (role.name.includes(categories)) {
            maproles.set(role.id, []);
          }
        });
        let i = -1;
        rolesguild.forEach((role) => {
          if (maproles.has(role.id)) {
            i++;
          } else {
            let temp = maproles.get(Array.from(maproles.keys())[i]);
            temp.push(role.id);
            maproles.set(Array.from(maproles.keys())[i], temp);
          }
        });
        message.guild.members.cache.forEach((member) => {
          maproles.forEach((catroles, catrole) => {
            needscat = false;
            catroles.forEach((role) => {
              if (member.roles.cache.some((r) => r.id === role)) {
                if (role !== member.guild.roles.everyone.id) {
                  needscat = true;
                }
              }
            });
            if (needscat) {
              if (!member.roles.cache.some((r) => r.id === catrole))
                member.roles
                  .add(catrole, "Kategorie hat gefehlt!")
                  .catch((error) => {});
            } else {
              if (member.roles.cache.some((r) => r.id === catrole))
                member.roles
                  .remove(catrole, "Kategorie wird nicht benötigt!")
                  .catch((error) => {});
            }
          });
        });
      }
      setTimeout(() => message.delete().catch((error) => {}), config.timeout);
    } else {
      message
        .reply(`Fehler: Du hast nicht genug Rechte!`)
        .then((msg) => {
          setTimeout(() => msg.delete().catch((error) => {}), config.timeout);
          setTimeout(
            () => message.delete().catch((error) => {}),
            config.timeout
          );
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
  // Help Command
  if (command === "help") {
    if (
      functions.isLeaderschaft(message.member) ||
      functions.isFamilienrat(message.member)
    ) {
      msg =
        "<@" +
        message.member +
        ">, Hilfe [**() → Notwendige Angabe, <> → Optionale Angabe**]:";
      if (config.anwesenheitchannel !== "0") {
        msg =
          msg +
          '\n - "' +
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
          " Tage bzw. angegeben Tage zu bekommen";
      }
      if (config.routechannel !== "0") {
        msg =
          msg +
          '\n - "' +
          config.prefix +
          'add (ID | @User) (Menge)" um eine Abgabe hinzuzufügen' +
          '\n - "' +
          config.prefix +
          'sum" um die letzten Abgaben zusammenzufassen';
      }
      if (config.abgabenchannel !== "0") {
        msg =
          msg +
          '\n - "' +
          config.prefix +
          'abgaben (ID | @User) <KW>" um die Abgaben für ein Mitglied für eine Woche zu ändern' +
          '\n - "' +
          config.prefix +
          'abgabenmessage" um die Abgabennachricht für die Woche zu schicken' +
          '\n - "' +
          config.prefix +
          'cleanabgaben (KW)" um die Abgabennachricht für angegebene Woche zu "bereinigen"';
      }
      if (config.waffenchannel !== "0") {
        msg =
          msg +
          '\n - "' +
          config.prefix +
          'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!' +
          "\nEs gibt nur folgende Waffen: " +
          config.waffenstring +
          '\n - "' +
          config.prefix +
          'wdelete" um die letzte Waffenbestellung zu löschen' +
          '\n - "' +
          config.prefix +
          'wsum" um die Waffenbestellung zusammenzufassen';
      }
      if (config.categories !== "") {
        msg =
          msg +
          '\n - "' +
          config.prefix +
          'categories" um die Rollen-Kategorien aller Member zu aktualisiern';
      }
      msg =
        msg +
        '\n - "' +
        config.prefix +
        'aussetzen" um einen random Familienmitlgied zu bekommen';
      msg =
        msg + '\n - "' + config.prefix + 'help" um diese Nachricht zu bekommen';
      message.reply(msg).then((msg) => {
        msg.react("🗑️");
        setTimeout(() => message.delete().catch((error) => {}), config.timeout);
      });
    } else {
      msg =
        "<@" +
        message.member +
        ">, Hilfe [**() → Notwendige Angabe, <> → Optionale Angabe**]:";
      if (config.anwesenheitchannel !== "0") {
        msg =
          msg +
          '\n - "' +
          config.prefix +
          'on <Zeit>" um dich online zu stellen' +
          '\n - "' +
          config.prefix +
          'off <Zeit>" um dich offline zu stellen';
      }
      if (config.waffenchannel !== "0") {
        msg =
          msg +
          '\n - "' +
          config.prefix +
          'waffen <Waffennamen> <Anzahl> <Waffennamen2> <Anzahl2> <...>"!' +
          "\nEs gibt nur folgende Waffen: " +
          config.waffenstring +
          '\n - "' +
          config.prefix +
          'wdelete" um die letzte Waffenbestellung zu löschen';
      }
      msg =
        msg + '\n - "' + config.prefix + 'help" um diese Nachricht zu bekommen';
      message.reply(msg).then((msg) => {
        msg.react("🗑️");
        setTimeout(() => message.delete().catch((error) => {}), config.timeout);
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
    if (functions.isLeaderschaft(member)) {
      reaction.message.delete().catch((error) => {});
    } else if (functions.isFamilienrat(member)) {
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
        if (
          functions.isLeaderschaft(member2) ||
          functions.isFamilienrat(member2)
        ) {
          let amount =
            parseInt(
              reaction.message.content.split(/ +/)[2].split(".").join("")
            ) * config.preisavv;
          if (config.kassechannel !== "0") {
            let kassechannel = reaction.message.guild.channels.cache.get(
              config.kassechannel
            );
            kassechannel.send(
              `> - ${functions.addDots(amount)}$ ${
                config.droge
              } Verkauf Rückzahlung - ${member}`
            );
          }
          functions.logEmbed(
            member2,
            `${config.droge} Verkauf an ${member} ausgezahlt`,
            ` - ${functions.addDots(amount)}$`
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
        if (
          functions.isLeaderschaft(member2) ||
          functions.isFamilienrat(member2)
        ) {
          let amount = reaction.message.content
            .split(" ")[1]
            .split(".")
            .join("");
          if (config.kassechannel !== "0") {
            let kassechannel = reaction.message.guild.channels.cache.get(
              config.kassechannel
            );
            kassechannel.send(
              `> + ${functions.addDots(parseInt(amount) * config.preisavv)}$ ${
                config.droge
              } Verkauf`
            );
          }
          functions.logEmbed(
            member2,
            `${config.droge} Verkauf Einzahlung`,
            `+ ${functions.addDots(parseInt(amount) * config.preisavv)}$`
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
        if (
          functions.isLeaderschaft(member2) ||
          functions.isFamilienrat(member2)
        ) {
          let messagestring = reaction.message.content.split("\n");
          let preis = messagestring[messagestring.length - 2]
            .split(" ")[1]
            .slice(0, -3)
            .substring(2)
            .split(".")
            .join("");
          if (config.kassechannel !== "0") {
            let kassechannel = reaction.message.guild.channels.cache.get(
              config.kassechannel
            );
            kassechannel.send(
              `> - ${functions.addDots(parseInt(preis))}$ Waffenbestellung`
            );
          }
          functions.logEmbed(
            member2,
            `Waffenbestellung bezahlt`,
            `- ${functions.addDots(parseInt(preis))}$`
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
        if (
          functions.isLeaderschaft(member2) ||
          functions.isFamilienrat(member2)
        ) {
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
          if (config.kassechannel !== "0") {
            let kassechannel = reaction.message.guild.channels.cache.get(
              config.kassechannel
            );
            kassechannel.send(
              `> + ${functions.addDots(amount)}$ Waffenbestellung - ${member}`
            );
          }
          functions.logEmbed(
            member2,
            `Waffenbestellung von ${member} entgegengenommen`,
            `+ ${functions.addDots(amount)}$`
          );
        }
      }
    }
  }
});

client.login(config.token);
