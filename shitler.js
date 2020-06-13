var auth = require('./auth.json');

const Discord = require('discord.js');
const bot = new Discord.Client();

bot.once('ready', () => {
	console.log('Ready to fuck shit up');
});

bot.login(auth.token);

// Declaring variables for game setup
let players = []; // empty list to be filled with player IDs
let numPlayers;
let policyTiles = []; //policy tile deck
let discard = [];
let initiated = false;
let gameInProgress = false;
let pres;
let chancCand;
let chanc;
let bluesPlayed = 0;
let redsPlayed = 0;
let failedElections = 0;
let fascists = [];
let libs = [];
let hitler;
let pickingChanc = false;
let turnNum;
let yesVotes = [];
let noVotes = [];


function init() {
    policyTiles = ['B','B','B','B','B','B','R','R','R','R','R','R','R','R','R','R','R'];
    shuffle();
    initiated = true;
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

async function startGame(gameChannel) {
    gameInProgress = true;
    turnNum = 0;
    numPlayers = players.length;

    //await assignRoles(numPlayers);

    assignRoles(numPlayers).then(() => {
        console.log("reached after await");
        pres = players[turnNum % players.length];
        turn(gameChannel);
    });

    
}

async function assignRoles(numPlayers) {
    let numFascists = Math.floor((numPlayers - 1) / 2);

    //change this to better method
    //gen numFascists unique random numbers between 0 and numPlayers inc
    //those indices in player array become fascist
    //everyone else is lib
    for (const user of players) {
        if (fascists.length == numFascists) {
            libs.push(user);
        } else if (libs.length == numPlayers -  numFascists) {
            fascists.push(user);
        } else {
            let flip = Math.floor(Math.random() * 2);
            switch (flip) {
                case 0:
                    fascists.push(user);
                    break;
                case 1:
                    libs.push(user);
                    break;
            }
        }
    }
    let index = Math.floor(Math.random() * fascists.length);
    hitler = fascists[index];
    
    for (const lib of libs) {
        await lib.send("You are a liberal for this game.");
    }

    for (const fasc of fascists) {
        if (fasc != hitler) {
                await fasc.send(`The fascists this game are: ${fascists}. ${hitler} is the secret hitler.`);
        } else {
            if (numPlayers > 6) {
                await fasc.send(`You are the secret hitler. You do not know who your fellow fascists are.`);
            } else {
                await fasc.send(`You are the secret hitler. The fascists this game are: ${fascists}.`);
            }
            
        }
    }

    console.log("done");
}

function turn(gameChannel) {
    gameChannel.send(`${pres}, choose your chancellor by typing ~chancellor and @ing them.` ).then(() => {
        pickingChanc = true;
    });
    turnNum++;
}

function callVote(gameChannel) {
    yesVotes.length = 0;
    noVotes.length = 0;
    voteInProgress = true;
    gameChannel.send(`Voting for president: ${pres} and chancellor: ${chancCand} has begun. DM ja or nein to shitler to vote.`);
}

function resolveVote() {
    if (yesVotes.length > noVotes.length){
        // send message that vote has passed
        return true;
    }
}

function playPolicy() {
    return null;
}

function peekTiles() {
    return `${policyTiles[0]}, ${policyTiles[1]}, ${policyTiles[2]}`;
}

function appointPres() {
    return null;
}

function investigatePlayer(investigator, investigated) {
    if(fascists.indexOf(investigated) != -1) {
        investigator.send(`${investigated} is fascist`);
    }
    else {
        investigator.send(`${investigated} is liberal`);
    }
}

function killPlayer(target, gameChannel) {
    players.splice(players.indexOf(target), 1);
    gameChannel.send(`${target} has been eliminated!`);
    if(target==hitler) {
        gameChannel.send(`Hitler has been eliminated!`);
        winMessage(true);
    }
}

function winMessage(libsWin) {
    if(libsWin) {
        gameChannel.send(`Liberals win! Congratulations ${liberals}`);
    }
    else {
        gameChannel.send(`Fascists win! Congratulations ${fascists}`);
    }
}

function endGame() {
    initiated = false;
    gameInProgress = false;
    policyTiles.length = 0;
    players.length = 0;
    discard.length = 0;
    bluesPlayed = 0;
    redsPlayed = 0;
    failedElections = 0;
    libs.length = 0;
    fasc.length = 0;
}

bot.on('message', message => {

    //this is literally bullying
    if (message.author.id == '230535346188713984') {
        message.reply("shut up drason").catch(err => {
            console.log(err);
        });
    }

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `~`

    if (message.content.substring(0, 1) == '~') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            // DO NOT ABUSE THIS IS TOO POWERFUL
            // case 'shutup':
            //     let target = message.mentions.users.array()[0];
            //     let userVoiceChannel = message.member.voice.channel;
            //     userVoiceChannel.members.each(member => {
            //         if (member.user == target) {
            //             console.log(member.voice.serverMute);
            //             member.voice.setMute(true);
            //             console.log(member.voice.serverMute);
            //         }
            //     });
            //     break;
            case 'spam':
                //console.log(bot.users);
                bot.users.fetch('230535346188713984').then(user => {
                    console.log(user);
                    for (let i = 0; i < 10; i++) {
                        user.send("ur stupid lol get fricked");
                    }
                }).catch(err => {
                    console.log("error: ")
                    console.log(err);
                });
                
                message.channel.send('austin is a stupidhead');
            break;
            case 'init':
                if (initiated) {
                    message.channel.send(`${message.author}, a game already exists! Type ~join to join it.`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else {
                    init();
                    message.channel.send('Welcome to Secret Hitler! Type ~join if you want to play!');
                    message.channel.send("(DEBUG) " + policyTiles);
                }
            break;
            case 'join':
                if (!initiated) {
                    message.channel.send(`${message.author}, no game currently exists. Type ~init to create one!`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else if (players.length < 11) {
                    // if (!players.includes(message.author)) {
                    //     players.push(message.author);
                    //     message.channel.send(`<@${message.author}> has joined the game! There are ${players.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`);
                    // } else {
                    //     message.channel.send(`<@${message.author}>, you have already joined stfu lmao nerd`);
                    // }
                    players.push(message.author);
                    message.channel.send(`${message.author} has joined the game! There are ${players.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`);
                } else {
                    message.channel.send(`Sorry ${message.author}, the game is full. Please wait for the next one!`);
                }
                break;
            case 'leave' :
                if (players.includes(message.author)) {
                    if (gameInProgress) {
                        message.channel.send(`${message.author}, the game is already in progress. No escape.`);
                    } else {
                        players.splice(players.indexOf(message.author), 1);
                        message.channel.send(`${message.author}, you've successfully left the game.`);
                    }
                }
                break;
            case 'start':
                if (!initiated) {
                    message.channel.send(`${message.author}, no game currently exists. Type ~init to create one!`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else if (players.length < 5) {
                    message.channel.send(`${message.author}, there are not enough players to start the game. You need ${5 - players.length} more.`);
                } else {
                    message.channel.send(`Game has begun! Number of players: ${players.length}`).then(() => {
                        startGame(message.channel);
                    });
                }
                break;
            case 'chancellor':
                if (pickingChanc) {
                    chancCand = message.mentions.users.array()[0];
                    callVote(message.channel);
                }
                break;
            case 'abort':
                endGame();
                message.channel.send(`Game Aborted`);
                break;
            case 'help':
                message.channel.send('this message is a placeholder');
                break;
            default:
                message.channel.send('Command not recognized. Type ~help for a list of commands.')
                break;
         }
     }
});

