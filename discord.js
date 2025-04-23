const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const prefix = '!';

// Lade die Benutzerdaten (Geld, Bankkonto) aus der Datei
let usersData = require('./users.json');

// Hilfsfunktion zum Speichern von Benutzerdaten
function saveUserData() {
  fs.writeFileSync('./users.json', JSON.stringify(usersData, null, 2));
}

// Funktion, um Geld hinzuzufügen oder zu entfernen
function getUserData(userId) {
  if (!usersData[userId]) {
    usersData[userId] = {
      cash: 0,
      bank: 0,
    };
  }
  return usersData[userId];
}

// Login des Bots
client.login('DEIN_DISCORD_TOKEN');

// Der Bot wird bereit sein
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Nachricht auf Befehle prüfen
client.on('messageCreate', (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // !bal - Zeigt den Kontostand eines Nutzers
  if (command === 'bal') {
    const user = getUserData(message.author.id);
    const embed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle(`${message.author.username}'s Kontostand`)
      .addFields(
        { name: 'Bargeld', value: `${user.cash} $`, inline: true },
        { name: 'Bankkonto', value: `${user.bank} $`, inline: true }
      )
      .setFooter('Danke, dass du unseren Bot verwendest!');
    message.channel.send({ embeds: [embed] });

  // !collect-income - Sammle Einkommen
  } else if (command === 'collect-income') {
    const user = getUserData(message.author.id);
    const income = Math.floor(Math.random() * 100) + 50; // Zufälliges Einkommen zwischen 50 und 150
    user.cash += income;
    saveUserData();
    
    const embed = new MessageEmbed()
      .setColor('#00ff00')
      .setTitle('Einkommen gesammelt!')
      .setDescription(`${message.author.username}, du hast ${income} $ verdient! Dein neues Bargeld: ${user.cash} $`)
      .setFooter('Weiter so!');
    message.channel.send({ embeds: [embed] });

  // !add-money - Geld zu einem User hinzufügen (Admin)
  } else if (command === 'add-money') {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('Du hast keine Berechtigung, diesen Befehl auszuführen!');
    }

    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!targetUser || isNaN(amount) || amount <= 0) {
      return message.reply('Bitte gib einen gültigen User und Betrag an!');
    }

    const user = getUserData(targetUser.id);
    user.cash += amount;
    saveUserData();

    const embed = new MessageEmbed()
      .setColor('#00ff00')
      .setTitle('Geld hinzugefügt')
      .setDescription(`${amount} $ wurden zu ${targetUser.username}'s Bargeld hinzugefügt. Neuer Kontostand: ${user.cash} $`)
      .setFooter('Admin hat Geld hinzugefügt!');
    message.channel.send({ embeds: [embed] });

  // !pay - Geld an einen anderen User senden
  } else if (command === 'pay') {
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!targetUser || isNaN(amount) || amount <= 0) {
      return message.reply('Bitte gib einen gültigen User und Betrag an!');
    }

    const user = getUserData(message.author.id);
    if (user.cash < amount) {
      return message.reply('Du hast nicht genug Bargeld!');
    }

    user.cash -= amount;
    const target = getUserData(targetUser.id);
    target.cash += amount;
    saveUserData();

    const embed = new MessageEmbed()
      .setColor('#ff9900')
      .setTitle('Bezahlung abgeschlossen!')
      .setDescription(`${message.author.username} hat ${amount} $ an ${targetUser.username} geschickt.`)
      .setFooter('Viel Spaß mit dem Geld!');
    message.channel.send({ embeds: [embed] });

  // !remove-money - Geld von einem User entfernen (Admin)
  } else if (command === 'remove-money') {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('Du hast keine Berechtigung, diesen Befehl auszuführen!');
    }

    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!targetUser || isNaN(amount) || amount <= 0) {
      return message.reply('Bitte gib einen gültigen User und Betrag an!');
    }

    const user = getUserData(targetUser.id);
    if (user.cash < amount) {
      return message.reply('Der User hat nicht genug Bargeld!');
    }

    user.cash -= amount;
    saveUserData();

    const embed = new MessageEmbed()
      .setColor('#ff0000')
      .setTitle('Geld entfernt')
      .setDescription(`${amount} $ wurden von ${targetUser.username}'s Bargeld entfernt. Neuer Kontostand: ${user.cash} $`)
      .setFooter('Admin hat Geld entfernt!');
    message.channel.send({ embeds: [embed] });
  }
});
