// index.js
const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');
const client = new Client({ 
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] 
});
const prefix = '!';

// Wirtschaftsdaten – falls keine existieren, bekommt jeder User Startwerte.
let economy = {};
const dataFile = './economy.json';

// Wirtschaftsdaten aus Datei laden, falls vorhanden
if (fs.existsSync(dataFile)) {
    economy = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// Funktion zum Speichern der Wirtschaftsdaten
function saveEconomy() {
    fs.writeFileSync(dataFile, JSON.stringify(economy, null, 2));
}

client.once('ready', () => {
    console.log(`Bot is online as ${client.user.tag}`);
});

// Alle Befehle werden hier verarbeitet.
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    
    // Zerlege den Befehl in Command und Argumente.
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    // Stelle sicher, dass der User in der Wirtschaftsdatenbank existiert.
    if (!economy[message.author.id]) {
        economy[message.author.id] = { cash: 1000, bank: 0, lastCollected: 0 };
    }

    // --------------------
    // !bal – Zeigt den aktuellen Kontostand an.
    if (command === 'bal') {
        const userData = economy[message.author.id];
        const embed = new MessageEmbed()
            .setTitle(`${message.author.username}'s erbärmlicher Kontostand`)
            .addField('Bargeld', `$${userData.cash}`, true)
            .addField('Bank', `$${userData.bank}`, true)
            .setColor('#00FF00')
            .setFooter('Vielleicht hast du ja mal was drauf – falls nicht, bist du halt ein Versager.');
        return message.channel.send({ embeds: [embed] });
    }

    // --------------------
    // !collect-income – Erlaubt einmal täglich das Einsammeln von Einkommen.
    if (command === 'collect-income') {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - economy[message.author.id].lastCollected < oneDay) {
            const embed = new MessageEmbed()
                .setDescription('Du bist zu faul, du faule Socke – du hast dein Einkommen heute schon eingesammelt.')
                .setColor('#FF0000');
            return message.channel.send({ embeds: [embed] });
        }
        const income = 500;
        economy[message.author.id].cash += income;
        economy[message.author.id].lastCollected = now;
        saveEconomy();
        const embed = new MessageEmbed()
            .setDescription(`Glückwunsch, du armseliges Wrack – du hast ${income}$ eingesammelt. Vielleicht reicht dir das ja für 'nen lauen Snack.`)
            .setColor('#00FF00');
        return message.channel.send({ embeds: [embed] });
    }

    // --------------------
    // !add-money – Fügt einem User (per Admin) einen Betrag hinzu.
    if (command === 'add-money') {
        // Nur Admins dürfen diesen Befehl nutzen.
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            const embed = new MessageEmbed()
                .setDescription('Du hast nicht einmal annähernd die Intelligenz, um Geld hinzuzufügen, du kleiner Nichtsnutz.')
                .setColor('#FF0000');
            return message.channel.send({ embeds: [embed] });
        }
        const target = message.mentions.users.first();
        if (!target) {
            return message.channel.send('Nenne mir einen User, du unfähiger Zwergenpenner!');
        }
        const amount = parseInt(args[1]);
        if (isNaN(amount)) {
            return message.channel.send('Gib mir eine echte Zahl, du inkompetenter Hurensohn.');
        }
        if (!economy[target.id]) {
            economy[target.id] = { cash: 1000, bank: 0, lastCollected: 0 };
        }
        economy[target.id].cash += amount;
        saveEconomy();
        const embed = new MessageEmbed()
            .setDescription(`Okay, du Narr – ich habe ${amount}$ zu ${target.username}'s Konto hinzugefügt.`)
            .setColor('#00FF00');
        return message.channel.send({ embeds: [embed] });
    }

    // --------------------
    // !remove-money – Entfernt einem User (per Admin) einen Betrag.
    if (command === 'remove-money') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            const embed = new MessageEmbed()
                .setDescription('Nur Admins dürfen Geld entfernen – du bist doch nichts weiter als ein armseliger Wichser!')
                .setColor('#FF0000');
            return message.channel.send({ embeds: [embed] });
        }
        const target = message.mentions.users.first();
        if (!target) {
            return message.channel.send('Du musst jemanden angeben, du unfähiger Wichser!');
        }
        const amount = parseInt(args[1]);
        if (isNaN(amount)) {
            return message.channel.send('Gib mir bitte eine richtige Zahl, du Hirnloser.');
        }
        if (!economy[target.id]) {
            economy[target.id] = { cash: 1000, bank: 0, lastCollected: 0 };
        }
        economy[target.id].cash = Math.max(0, economy[target.id].cash - amount);
        saveEconomy();
        const embed = new MessageEmbed()
            .setDescription(`Okay, du Verlierer – ich habe ${amount}$ von ${target.username}'s Konto entfernt.`)
            .setColor('#FF0000');
        return message.channel.send({ embeds: [embed] });
    }

    // --------------------
    // !pay – Überweist einem anderen User Geld.
    if (command === 'pay') {
        const target = message.mentions.users.first();
        if (!target) {
            return message.channel.send('Du musst jemandem Geld schicken, du idiotischer Bastard.');
        }
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Gib einen gültigen Betrag ein, du armselige Missgeburt.');
        }
        if (economy[message.author.id].cash < amount) {
            return message.channel.send('Du bist pleite, du armseliger Wichser – halt doch mal dein erbärmliches Geld zusammen.');
        }
        // Falls das Opfer noch nicht in den Daten ist.
        if (!economy[target.id]) {
            economy[target.id] = { cash: 1000, bank: 0, lastCollected: 0 };
        }
        economy[message.author.id].cash -= amount;
        economy[target.id].cash += amount;
        saveEconomy();
        const embed = new MessageEmbed()
            .setDescription(`Du hast ${amount}$ an ${target.username} überwiesen – du feiger Hurensohn, zahl mal brav!`)
            .setColor('#00FF00');
        return message.channel.send({ embeds: [embed] });
    }
});

client.login('MTM2NDYxMjQ0ODI1MzkwMjg0OA.GgRZJd.2zo8TL9l8JDEzLIp37V9_SJTTThJfXox6JrdMQ');
