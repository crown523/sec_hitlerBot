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
let discard = [];
let initiated = false;
let gameInProgress = false;
let pres = "";
let chanc = "";
let bluesPlayed = 0;
let redsPlayed = 0;
let failedElections = 0;


function init() {
    policyTiles = ['B','B','B','B','B','B','R','R','R','R','R','R','R','R','R','R','R'];
    shuffle();
    initiated = true;
}

function startGame() {
    gameInProgress = true;
    numPlayers = playerIDs.length;
    assignRoles(numPlayers);
    turn();
}

function turn() {
    console.log("temp");
    elect();
}

function assignRoles(numPlayers) {
    return null;
}

function elect() {
    return null;
}

function playPolicy() {
    return null;
}

function peekTiles() {
    return null;
}

function appointPres() {
    return null;
}

function investigatePlayer() {
    return null;
}

function killPlayer() {
    return null;
}

function checkForWin() {
    return false;
}

function endGame() {
    initiated = false;
    gameInProgress = false;
    policyTiles.length = 0;
    playerIDs.length = 0;
    discard.length = 0;
    bluesPlayed = 0;
    redsPlayed = 0;
    failedElections = 0;
}

//shuffle tiles
function shuffle() {
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
                    if (!playerIDs.includes(userID)) {
                        playerIDs.push(userID);
                        bot.sendMessage({
                            to: channelID,
                            message: `<@${userID}> has joined the game! There are ${playerIDs.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`
                        });
                    } else {
                        bot.sendMessage({
                            to: channelID,
                            message: `<@${userID}>, you have already joined stfu lmao nerd`
                        });
                    }
                } else {
                    bot.sendMessage({
                        to: channelID,
                        message: `Sorry <@${userID}>, the game is full. Please wait for the next one!`
                    });
                }
                break;
            case 'leave' :
                if (playerIDs.includes(userID)) {
                    if (gameInProgress) {
                        bot.sendMessage({
                            to: channelID,
                            message: `<@${userID}>, the game is already in progress. No escape.`
                        })
                    } else {
                        playerIDs.splice(playerIDs.indexOf(userID), 1);
                        bot.sendMessage({
                            to: channelID,
                            message: `<@${userID}>, you've successfully left the game.`
                        })
                    }
                }
                break;
            case 'start':
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
                } else if (playerIDs.length < 5) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}>, there are not enough players to start the game. You need ${5 - playerIDs.length} more.` 
                    });
                } else {
                    startGame();
                    bot.sendMessage({
                        to: channelID,
                        message: `Game has begun! Number of players: ${numPlayers}`
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

