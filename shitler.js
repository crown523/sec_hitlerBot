var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

// Declaring variables for game setup
let playerIDs = []; // empty list to be filled with player IDs
let numPlayers;
let policyTiles = []; //policy tile deck
let initiated = false;
let gameInProgress = false;


function init() {
    policyTiles = ['B','B','B','B','B','B','R','R','R','R','R','R','R','R','R','R','R'];
    shuffle();
    playerIDs.length = 0;
    initiated = true;
}

function endGame() {
    initiated = false;
    gameInProgress = false;
}

//shuffle tiles
function shuffle() {
    console.log("hi");
    let count = policyTiles.length;
    while (count) {
        //remove a random card and put it at the top
        policyTiles.push(policyTiles.splice(Math.floor(Math.random() * count), 1)[0]); 
        count--;
    }

}

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `~`
    if (message.substring(0, 1) == '~') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            // !ping
            case 'test':
                bot.sendMessage({
                    to: channelID,
                    message: 'austin is a stupidhead'
                });
            break;
            case 'init':
                if (initiated) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}>, a game already exists! Type ~join to join it.`
                    })
                } else if (gameInProgress) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}>, a game is already in progress, please wait for it to end!`
                    })
                } else {
                    init();
                    bot.sendMessage({
                        to: channelID,
                        message: 'Welcome to Secret Hitler! Type ~join if you want to play!'
                    });
                    bot.sendMessage({
                        to: channelID,
                        message: "(DEBUG) " + policyTiles
                    });
                }
            break;
            case 'join':
                if (!initiated) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}>, no game currently exists. Type ~init to create one!`
                    })
                } else if (gameInProgress) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}>, a game is already in progress, please wait for it to end!`
                    })
                } else if (playerIDs.length < 11) {
                    playerIDs.push(userID);
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}> has joined the game! There are ${playerIDs.length} player(s) currently. If all players have joined, type ~start to start the game.`
                    });
                } else {
                    bot.sendMessage({
                        to: channelID,
                        message: `Sorry <@${userID}>, the game is full. Please wait for the next one!`
                    });
                }
                break;
            case 'abort':
                endGame();
                bot.sendMessage({
                    to: channelID,
                    message: `Game Aborted`
                });
                break;
            // Just add any case commands if you want to..
         }
     }
});

