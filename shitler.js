var auth = require('./auth.json');

const Discord = require('discord.js');
const { ConsoleTransportOptions } = require('winston/lib/winston/transports');
const bot = new Discord.Client();

//set true for debug/test mode
const DEBUG = true;

bot.once('ready', () => {
    console.log('here we go bois');
    bot.user.setPresence({
        activity: {
            name: 'Type ~help for usage'
        }
    })
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
let prevPres;
let chancCand;
let chanc;
let bluesPlayed = 0;
let redsPlayed = 0;
let failedElections = 0;
let fascists = [];
let libs = [];
let hitler;
let pickingChanc = false;
let elecNum;
let yesVotes = [];
let noVotes = [];

//TODO: veto power
//TODO: increase verbosity (every action that can be narrated, should be)
//TODO: more information on the board (powers?)
//TODO: move to using reactions (just startgame)


//game setup functions

function init() {
    policyTiles = ['Liberal','Liberal','Liberal','Liberal', 'Liberal','Liberal','Fascist','Fascist','Fascist','Fascist','Fascist','Fascist','Fascist','Fascist','Fascist','Fascist','Fascist'];
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

function startGame(gameChannel) {
    gameInProgress = true;
    elecNum = 0;
    numPlayers = players.length;
    assignRoles(numPlayers).then(() => {
        startElection(gameChannel);
    });
}

async function assignRoles(numPlayers) {
    let numFascists = Math.floor((numPlayers - 1) / 2);
    while (fascists.length < numFascists) {
        index = Math.floor(Math.random() * numPlayers);
        if (!fascists.includes(players[index])) {
            fascists.push(players[index]);
        }
    }
    for (const player of players) {
        if (!fascists.includes(player)) {
            libs.push(player);
        }
    }
    let index = Math.floor(Math.random() * fascists.length);
    hitler = fascists[index];
    
    for (const lib of libs) {
        await lib.send("You are a liberal for this game.").catch(err => {
            console.log("error: ")
            console.log(err);
        });
    }

    for (const fasc of fascists) {
        if (fasc != hitler) {
                await fasc.send(`The fascists this game are: ${fascists}. ${hitler} is the secret hitler.`).catch(err => {
                    console.log("error: ")
                    console.log(err);
                });
        } else {
            if (numPlayers > 6) {
                await fasc.send(`You are the secret hitler. You do not know who your fellow fascists are.`).catch(err => {
                    console.log("error: ")
                    console.log(err);
                });
            } else {
                await fasc.send(`You are the secret hitler. The fascists this game are: ${fascists}.`).catch(err => {
                    console.log("error: ")
                    console.log(err);
                });
            }
        }
    }
}

//main game loop

function startElection(gameChannel) {
    prevPres = pres;
    pres = players[elecNum % players.length];
    gameChannel.send(`${pres}, choose your chancellor by typing ~chancellor and @ing them.`).then(() => {
        pickingChanc = true;
    });
    elecNum++;
}

async function callVote(gameChannel) {
    yesVotes.length = 0;
    noVotes.length = 0;
    pickingChanc = false;
    gameChannel.send(`Voting for president: ${pres} and chancellor: ${chancCand} has begun. Check your DMs to vote!`);
    const filter = (reaction, user) => {
        return ['👍', '👎'].includes(reaction.emoji.name) && (user.id != bot.user.id);
    };
    promises = [];

    for (const player of players) {
        const message = await player.dmChannel.send("Please react to this message with (ja emoji) for Yes and (nein emoji) for No).");
        await message.react('👍');
        await message.react('👎');
        promises.push(message.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] }).then(collected => {
            const reaction = collected.first();
            if (reaction.emoji.name === '👍') {
                yesVotes.push(player);
            } else {
                noVotes.push(player);
            }
        }).catch(collected => {
            message.reply('bad user bad');
        }));
    }
    Promise.all(promises).then(() => {
        resolveVote(gameChannel);
    })
}

async function resolveVote(gameChannel) {
    await gameChannel.send(`Yes votes: ${yesVotes}\nNo votes: ${noVotes}`);
    if (yesVotes.length > noVotes.length) {
        failedElections = 0;
        chanc = chancCand;
        if (redsPlayed >= 3 && chanc == hitler) {
            gameChannel.send(`Game over! Hitler has been elected chancellor.`).then(winMessage(false, gameChannel));
        } else {
            gameChannel.send(`The vote has passed.`).then(() => {
                playPolicy(gameChannel);
            });
        }
        
    } else {
        failedElections++;
        await gameChannel.send(`The vote did not pass. The election tracker moves up by one and is now at ${failedElections}.`);
        if(failedElections == 3) {
            await playTopPolicy();
        }
        startElection(gameChannel);
    }
}

//ah yes, callback hell
//edit: no more callback hell!!!
async function playPolicy(gameChannel) {
    //remove top 3 tiles from deck
    let tiles = [];
    tiles = policyTiles.splice(0, 3);

    //dm tiles to president
    const message = await pres.send("React with the number of the tile you with to discard from the following: " + tiles);
    await message.react('1️⃣');
    await message.react('2️⃣');
    await message.react('3️⃣');

    //pres discards
    const filter = (reaction, user) => {
        return ['1️⃣', '2️⃣', '3️⃣'].includes(reaction.emoji.name) && (user.id != bot.user.id);
    };
    await message.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] }).then(collected => {
        const reaction = collected.first();
        if (reaction.emoji.name === '1️⃣') {
            //discard first
            discard.push(tiles.splice(0, 1));
        } else if (reaction.emoji.name === '2️⃣') {
            //discard second
            discard.push(tiles.splice(1, 1));
        } else {
            //discard third
            discard.push(tiles.splice(2, 1));
        }
    }).catch(collected => {
        message.reply('bad user bad');
    });

    //dm remaining to chanc
    const message2 = await chanc.send("React with the number of the tile you with to play from the following: " + tiles);
    await message2.react('1️⃣');
    await message2.react('2️⃣');

    //chanc selects
    const filter2 = (reaction, user) => {
        return ['1️⃣', '2️⃣'].includes(reaction.emoji.name) && (user.id != bot.user.id);
    };
    await message2.awaitReactions(filter2, { max: 1, time: 120000, errors: ['time'] }).then(async collected => {
        const reaction = collected.first();
        if (reaction.emoji.name === '1️⃣') {
            //play first (discard second)
            discard.push(tiles.splice(1, 1));
        } else {
            //play second (discard first)
            discard.push(tiles.splice(0, 1));
        }
        
        //check for veto
        if (redsPlayed > 5) {
            const filter = (reaction, user) => {
                return ['👍', '👎'].includes(reaction.emoji.name) && (user.id != bot.user.id);
            };
            const pMsg = await pres.send(`The chancellor decided to play a ${tiles[0]} policy. Would you like to veto the results? React with yes or no appropriately.`);
            await pMsg.react('👍');
            await pMsg.react('👎');
            const cMsg = await chanc.send(`You are about to play a ${tiles[0]} policy. Would you like to veto the results? React with yes or no appropriately.`)
            await cMsg.react('👍');
            await cMsg.react('👎');
            promises = [];
            vetoed = true;
            await pMsg.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] }).then(collected => {
                const reaction = collected.first();
                if (reaction.emoji.name === '👎') {
                    vetoed = false;
                }
            }).catch(collected => {
                message.reply('bad user bad');
            });
            await cMsg.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] }).then(collected => {
                const reaction = collected.first();
                if (reaction.emoji.name === '👎') {
                    vetoed = false;
                }
            }).catch(collected => {
                message.reply('bad user bad');
            });
            if (vetoed) {
                discard.push(tiles[0]);
                failedElections++;
                await gameChannel.send(`${pres} and ${chanc} have decided to veto the results. The election tracker moves up by one and is now ${failedElections}.`);
            }
        } else {
            //play the tile
            if (tiles[0] == 'Liberal') {
                await gameChannel.send("Liberal policy played.");
                bluesPlayed++;
                await showBoard(gameChannel);
            } else {
                await gameChannel.send("Fascist policy played.");
                redsPlayed++;
                await showBoard(gameChannel);
                if (redsPlayed > 2) {
                    await checkForPowers(gameChannel);
                }
            }

            //check for win
            if (bluesPlayed == 5) {
                winMessage(true, gameChannel);
            } else if (redsPlayed == 6) {
                winMessage(false, gameChannel);
            } else { //game not over, start next cycle
                //check for empty deck
                if (policyTiles.length < 3) {
                    policyTiles = policyTiles.concat(discard);
                    shuffle();
                }
                //check if hitler was killed
                if (players.includes(hitler)) {
                    console.log("next cycle starting");
                    startElection(gameChannel);
                }
            }
        }
    }).catch(err => console.log(err));
}

//powers related functions

async function checkForPowers(gameChannel) {
    //SPECIAL POWERS ACTIVATE!!!!!!!
    console.log("entering checkforpowers")
    switch(Math.floor((numPlayers - 1) / 2)) {
        case 2:
            switch(redsPlayed) {
                case 3:
                    //peek
                    await gameChannel.send(`President ${pres} is peeking at tiles.`)
                    await pres.send(`You look at the top 3 tiles and see: ${policyTiles[0]}, ${policyTiles[1]}, ${policyTiles[2]}`);
                    break;
                case 4:
                    //kill
                    await killPlayer(gameChannel);
                    break;
                case 5:
                    //kill
                    await killPlayer(gameChannel);
                    break;
            }
            break;
        case 3:
            switch(redsPlayed) {
                case 2:
                    //investigate
                    await investigatePlayer(gameChannel);
                    break;
                case 3:
                    //appoint
                    prevPres = pres;
                    await appointPres(gameChannel);
                    break;
                case 4:
                    //kill
                    await killPlayer(gameChannel);
                    break;
                case 5:
                    //kill
                    await killPlayer(gameChannel);
                    break;
            }
            break;
        case 4:
            switch(redsPlayed) {
                case 1:
                    //investigate
                    await investigatePlayer(gameChannel);
                    break;
                case 2:
                    //investigate
                    await investigatePlayer(gameChannel);
                    break;
                case 3:
                    //appoint
                    prevPres = pres;
                    await appointPres(gameChannel);
                    break;
                case 4:
                    //kill
                    await killPlayer(gameChannel);
                    break;
                case 5:
                    //kill
                    await killPlayer(gameChannel);
                    break;
            }
            break;
    }
    console.log("exiting checkForPowers");
}

async function killPlayer(gameChannel) {
    console.log("entering killplayer")
    await gameChannel.send(`${pres}, please @ the player you wish to kill.`);
    const filter = (message) => {
        return message.author == pres;
    };
    console.log("here");
    //theres probably a cleaner way here, maybe collected = await ... and then remove the then???
    await gameChannel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] }).then(async collected => {
        console.log("collected")
        let msg = collected.first();
        target = msg.mentions.users.array()[0];

        if (!players.includes(target) || target == pres) {
            gameChannel.send(`You can't kill ${target}.`)
            await killPlayer(gameChannel);
        } else {
            players.splice(players.indexOf(target), 1);
            //TODO: server mute dead player?
            await gameChannel.send(`${target} has been eliminated!`);
            if (target == hitler) {
                await gameChannel.send(`Hitler has been eliminated!`);
                await winMessage(true, gameChannel);
            }
        }
    }).catch(err => console.log(err));
    console.log("exiting killPlayer");
}

async function investigatePlayer(gameChannel) {
    await gameChannel.send(`${pres}, please @ the player you wish to investigate.`);
    const filter = (message) => {
        return message.author == pres;
    };
    await gameChannel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] }).then(async collected => {
        let msg = collected.first();
        let investigated = msg.mentions.users.array()[0];
        if (!players.includes(investigated) || investigated == pres) {
            gameChannel.send(`You can't investigate ${target}.`)
            await investigatePlayer(gameChannel);
        } else {
            if(!fascists.includes(investigated)) {
                await pres.send(`${investigated} is fascist`).catch(err => {
                    console.log("error: ")
                    console.log(err);
                });
            }
            else {
                await pres.send(`${investigated} is liberal`).catch(err => {
                    console.log("error: ")
                    console.log(err);
                });
            }
        }
    }).catch(err => console.log(err));
}

async function appointPres(gameChannel) {
    await gameChannel.send(`${pres}, please @ the player you wish to appoint as the next president.`);
    const filter = (message) => {
        return message.author == pres;
    };
    await gameChannel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] }).then(async collected => {
        let msg = collected.first();
        let presCand = msg.mentions.users.array()[0];
        if (!players.includes(presCand) || presCand == pres) {
            await gameChannel.send(`You can't appoint ${target}.`)
            await appointPres(gameChannel);
        } else {
            pres = presCand;
            await gameChannel.send(`${presCand} will be the next president.`);
            gameChannel.send(`${pres}, choose your chancellor by typing ~appoint and @ing them.`).then(() => {
                pickingChanc = true;
            });
            //elecNum++;
        }
    }).catch(err => console.log(err));
}

// other helpers

async function playTopPolicy(gameChannel) {
    //Upon the election counter reaching 3, play the top policy tile
    await gameChannel.send(`The election tracker has reached 3. The top policy will now be played automatically.`)
    if (policyTiles.splice(0,1) == 'B') {
        await gameChannel.send(`Liberal policy played.`);
        bluesPlayed++;

    } else {
        await gameChannel.send(`Fascist policy played.`);
        redsPlayed++;
    }

    await showBoard(gameChannel);

    //check for win
    if (bluesPlayed == 5) {
        winMessage(true, gameChannel);
    } else if (redsPlayed == 6) {
        winMessage(false, gameChannel);
    }

    //check powers
    if (redsPlayed > 2) {
        await checkForPowers(gameChannel);
    }
}

async function showBoard(gameChannel) {
    //no longer atrocious but still needs beautification
    let line1 = "`-------------------------------------------------------------`"; //60 hyphens
    let line2 = "`|";
    let line3 = "`|";
    for (var i = 0; i < 5; i++) {
        if (i < bluesPlayed) {
            line2 += "           |"
            line3 += "     L     |"
        } else {
            line2 += "           |"
            line3 += "           |"
        }
    }
    line2 += "`";
    line3 += "`";
    let line4 = "`-------------------------------------------------------------`";
    let line5 = "`|";
    let line6 = "`|";
    for (var i = 0; i < 6; i++) {
        if (i < redsPlayed) {
            line5 += "         |"
            line6 += "    F    |"
        } else {
            line5 += "         |"
            line6 += "         |"
        }
    }
    line5 += "`";
    line6 += "`";
    let line7 = "`-------------------------------------------------------------`";
    let line8 = `Players still alive: ${players}`;
    let line9 = `Current failed elections: ${failedElections} out of 3`;
    let board = `${line1}\n${line2}\n${line3}\n${line4}\n${line5}\n${line6}\n${line7}\n${line8}\n${line9}`;
    await gameChannel.send(board);
}

// end game functions

async function winMessage(libsWin, gameChannel) {
    if (libsWin) {
        await gameChannel.send(`Liberals win! Congratulations ${libs}`);
    }
    else {
        await gameChannel.send(`Fascists win! Congratulations ${fascists}`);
    }
    endGame();
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
    fascists.length = 0;
    chanc = null;
    chancCand = null;
    pres = null;
    prevPres = null;
}

// event listeners

// bot.on('messageReactionAdd', (reaction, user) => {
//     let message = reaction.message, emoji = reaction.emoji;

//     console.log(emoji.name);

// });

bot.on('message', message => {
    // listen for messages that will start with `~`
    if (message.content.substring(0, 1) == '~') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            case 'shitler':
                if (initiated) {
                    message.channel.send(`${message.author}, a game already exists! Type ~join to join it.`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else {
                    init();
                    message.channel.send('Welcome to Secret Hitler! Type ~join if you want to play!');
                }
                break;
            case 'join': //move to reaction based maybe
                if (!initiated) {
                    message.channel.send(`${message.author}, no game currently exists. Type ~shitler to create one!`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else if (players.length < 11) {
                    if (DEBUG) {
                        players.push(message.author);
                        message.channel.send(`${message.author} has joined the game! There are ${players.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`);
                    } else {
                        if (!players.includes(message.author)) {
                            players.push(message.author);
                            message.channel.send(`${message.author} has joined the game! There are ${players.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`);
                        } else {
                            message.channel.send(`${message.author}, you have already joined stfu lmao nerd`);
                        }
                    }
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
                    message.channel.send(`${message.author}, no game currently exists. Type ~shitler to create one!`);
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
                    if (message.author == pres) {
                        chancCand = message.mentions.users.array()[0];
                        if (DEBUG) {
                            callVote(message.channel);
                        } else {
                            if (!players.includes(chancCand)) {
                                message.channel.send(`Invalid choice, try again.`);
                            } else if (chancCand == pres) {
                                message.channel.send("You can't pick yourself.");
                            } else if ((players > 5 && chancCand == prevPres) || chancCand == chanc) {
                                message.channel.send(`You cannot pick ${chancCand} as they were the previous president or chancellor. Please pick again.`);
                            } else {
                                callVote(message.channel);
                            }
                        }
                    }
                }
                break;
            case 'board':
                //TODO: code to visuallize board
                showBoard(message.channel);
                break;
            case 'rules':
                message.channel.send({embed : {
                    color: 3447003,
                    author: {
                      name: bot.user.username,
                      icon_url: bot.user.avatarURL
                    },
                    title: "Official Secret Hitler Rules",
                    url: "https://secrethitler.com/assets/Secret_Hitler_Rules.pdf",
                    }
                });
                break;
            case 'abort':
                if (DEBUG) {
                    endGame();
                    message.channel.send(`Game Aborted`);
                }
                break;
            case 'help':
                //TODO: finish this
                message.channel.send('Commands to know:\n~shitler: Creates a new game.\n~rules: Links to official rules sheet\n~board: Shows the current game board.');
                break;
            default:
                message.channel.send('Command not recognized. Type ~help for a list of commands.')
                break;
         }
     }
});

