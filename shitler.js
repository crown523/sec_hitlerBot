var auth = require('./auth.json');

const Discord = require('discord.js');
const bot = new Discord.Client();

//set true for debug/test mode
const DEBUG = true;

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
let prevPres;
let chancCand;
let presCand;
let chanc;
let investigated;
let bluesPlayed = 0;
let redsPlayed = 0;
let failedElections = 0;
let fascists = [];
let libs = [];
let hitler;
let pickingChanc = false;
let appointingPres = false;
let investigating = false;
let elecNum;
let yesVotes = [];
let noVotes = [];
let killingPlayer = false;

//TODO: make the board with tracks
//TODO: veto power
//TODO: increase verbosity
//TODO: make it pretty


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
    console.log("done");
}

function startElection(gameChannel) {
    prevPres = pres;
    pres = players[elecNum % players.length];
    gameChannel.send(`${pres}, choose your chancellor by typing ~chancellor and @ing them.`).then(() => {
        pickingChanc = true;
    });
    elecNum++;
}

//why is this async? idea i came up with to avoid nesting a million unresolved function calls. who knows if it will work
//the idea is that every action in a game turn starts here, so all function calls will be inside this one.
//then by making this async we can wait for it to finish executing before starting the next game turn
//in theory
async function callVote(gameChannel) {
    yesVotes.length = 0;
    noVotes.length = 0;
    voteInProgress = true;
    pickingChanc = false;
    gameChannel.send(`Voting for president: ${pres} and chancellor: ${chancCand} has begun. DM ja or nein to shitler to vote.`);
    const filter = m => (m.content == ('ja') || m.content == ('nein'));
    promises = [];
    for (const player of players) {
        promises.push(player.dmChannel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] })
        .then(collected => {
            console.log(collected);
            let msg = collected.first();
            if (msg.content == "ja") {
                yesVotes.push(msg.author);
            } else {
                noVotes.push(msg.author);
            }
        })
        .catch(err => console.log(err)));
    }
    Promise.all(promises).then(() => {
        resolveVote(gameChannel);
    })
}

function checkForPowers(gameChannel) {
    //SPECIAL POWERS ACTIVATE!!!!!!!
    switch(Math.floor((numPlayers - 1) / 2)) {
        case 2:
            switch(redsPlayed) {
                case 3:
                    //peek
                    gameChannel.send("President is peeking at tiles.").then(() => {
                        pres.send(`You look at the top 3 tiles and see: ${policyTiles[0]}, ${policyTiles[1]}, ${policyTiles[2]}`);
                    });
                    break;
                case 4:
                    //kill
                    gameChannel.send(`${pres}, kill a player by typing ~kill and @ing them.`).then(() => {
                        killingPlayer = true;
                    });
                    break;
                case 5:
                    //kill
                    gameChannel.send(`${pres}, kill a player by typing ~kill and @ing them.`).then(() => {
                        killingPlayer = true;
                    });
                    break;
            }
            break;
        case 3:
            switch(redsPlayed) {
                case 2:
                    //investigate
                    gameChannel.send(`${pres}, investigate a player by typing ~investigate and @ing them.`).then(() => {
                        investigating = true;
                    });
                    break;
                case 3:
                    //appoint
                    prevPres = pres;
                    gameChannel.send(`${pres}, choose the next president by typing ~appoint and @ing them.`).then(() => {
                        appointingPres = true;
                    });
                    break;
                case 4:
                    //kill
                    gameChannel.send(`${pres}, kill a player by typing ~kill and @ing them.`).then(() => {
                        killingPlayer = true;
                    });
                    break;
                case 5:
                    //kill
                    gameChannel.send(`${pres}, kill a player by typing ~kill and @ing them.`).then(() => {
                        killingPlayer = true;
                    });
                    break;
            }
            break;
        case 4:
            switch(redsPlayed) {
                case 1:
                    //investigate
                    gameChannel.send(`${pres}, investigate a player by typing ~investigate and @ing them.`).then(() => {
                        investigating = true;
                    });
                    break;
                case 2:
                    //investigate
                    gameChannel.send(`${pres}, investigate a player by typing ~investigate and @ing them.`).then(() => {
                        investigating = true;
                    });
                    break;
                case 3:
                    //appoint
                    prevPres = pres;
                    gameChannel.send(`${pres}, choose the next president by typing ~appoint and @ing them.`).then(() => {
                        appointingPres = true;
                    });
                    break;
                case 4:
                    //kill
                    gameChannel.send(`${pres}, kill a player by typing ~kill and @ing them.`).then(() => {
                        killingPlayer = true;
                    });
                    break;
                case 5:
                    //kill
                    gameChannel.send(`${pres}, kill a player by typing ~kill and @ing them.`).then(() => {
                        killingPlayer = true;
                    });
                    break;
            }
            break;
    }
}

function resolveVote(gameChannel) {
    voteInProgress = false;
    gameChannel.send(`Yes votes: ${yesVotes}\nNo votes: ${noVotes}`);
    if (yesVotes.length > noVotes.length) {
        failedElections = 0;
        chanc = chancCand;
        if (redsPlayed >= 3 && chanc == hitler) {
            gameChannel.send(`Game over! Hitler has been elected chancellor.`).then(winMessage(false, gameChannel));
        }
        gameChannel.send(`The vote has passed.`).then(() => {
            playPolicy(gameChannel);
        });
        
    } else {
        gameChannel.send(`The vote did not pass.`).then(() => {
            failedElections++;
            if(failedElections == 3) {
                //playTopPolicy();
            }
            startElection(gameChannel);
        });
    }
}

//ah yes, callback hell
function playPolicy(gameChannel) {
    //remove top 3 tiles from deck
    let tiles = [];
    tiles = policyTiles.splice(0, 3);
    console.log(tiles);
    //dm tiles to president
    pres.send("DM me the tile you wish to discard from the following: " + tiles).then(() => {
        //pres discards
        let filter;
        if (tiles.indexOf('B') == -1) {
            filter = m => (m.content == ('R'));
        } else if (tiles.indexOf('R') == -1) {
            filter = m => (m.content == ('B'));
        } else {
            filter = m => (m.content == ('B') || m.content == ('R'));
        }
        pres.dmChannel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] }).then(collected => {
            let msg = collected.first();
            temp = tiles.splice(tiles.indexOf(msg.content), 1);
            discard.push(temp[0]);
            console.log(discard);
            //dm remaining to chancellor
            chanc.send("DM me the tile you wish to play from the following: " + tiles).then(() => {
                //chancellor selects one to play
                let filter;
                if (tiles.indexOf('B') == -1) {
                    filter = m => (m.content == ('R'));
                } else if (tiles.indexOf('R') == -1) {
                    filter = m => (m.content == ('B'));
                } else {
                    filter = m => (m.content == ('B') || m.content == ('R'));
                }
                chanc.dmChannel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] }).then(collected => {
                    let msg = collected.first();
                    if (msg.content == 'B') {
                        temp = tiles.splice(tiles.indexOf(msg.content), 1);
                        discard.push(temp[0]);
                        gameChannel.send("Liberal policy played.");
                        bluesPlayed++;
                    } else {
                        temp = tiles.splice(tiles.indexOf(msg.content), 1);
                        discard.push(temp[0]);
                        gameChannel.send("Fascist policy played.");
                        redsPlayed++;
                        if (redsPlayed > 2) {
                            checkForPowers(gameChannel);
                        }

                        //check for win
                        if (bluesPlayed == 5) {
                            winMessage(true, gameChannel);
                        }
                        if (redsPlayed == 6) {
                            winMessage(false, gameChannel);
                        }

                        //check for empty deck
                        if (policyTiles.length < 3) {
                            policyTiles = policyTiles.concat(discard);
                            shuffle();
                        }
                    }
                    startElection(gameChannel);
                }).catch(err => console.log(err));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

function winMessage(libsWin, gameChannel) {
    if(libsWin) {
        gameChannel.send(`Liberals win! Congratulations ${liberals}`);
    }
    else {
        gameChannel.send(`Fascists win! Congratulations ${fascists}`);
    }
    endGame();
}

function showBoard(gameChannel) {
    //ascii art i guess?
    line1 = "------------------------------------------------------------"; //60 hyphens
    line2 = "|";
    line3 = "|";
    line4 = "------------------------------------------------------------";
    line5 = "|";
    line6 = "|";
    line7 = "------------------------------------------------------------";
    line8 = `Players still alive: ${players}`;
    line9 = `Current failed elections: ${failedElections} out of 3`;
    board = `${line1}\n${line2}\n${line3}\n${line4}\n${line5}\n${line6}\n${line7}\n${line8}\n${line9}`;
    gameChannel.send(board);
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

bot.on('message', message => {

    //this is literally bullying
    // if (message.author.id == '230535346188713984') {
    //     message.reply("god sees you, and he is disappointed").catch(err => {
    //         console.log(err);
    //     });
    // }

    // listen for messages that will start with `~`
    if (message.content.substring(0, 1) == '~') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            // DO NOT ABUSE THIS IS TOO POWERFUL
            //could probably do crazier shit tbh
            // case 'shutup':
            //     if (message.author == '266133712997974017') {
            //         //console.log(message.mentions.users.array()[0]);
            //         let target = message.mentions.users.array()[0];
            //         let userVoiceChannel = message.member.voice.channel;
            //         userVoiceChannel.members.each(member => {
            //             if (member.user == target) {
            //                 member.voice.setMute(true);
            //             }
            //         });
            //     }
            //     break;
            
            // case 'spam':
            //     //console.log(bot.users);
            //     bot.users.fetch('230535346188713984').then(user => {
            //         console.log(user);
            //         for (let i = 0; i < 10; i++) {
            //             user.send("ur stupid lol get fricked");
            //         }
            //     }).catch(err => {
            //         console.log("error: ")
            //         console.log(err);
            //     });
                
            //     message.channel.send('austin is a stupidhead');
            // break;

            case 'init':
                if (initiated) {
                    message.channel.send(`${message.author}, a game already exists! Type ~join to join it.`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else {
                    init();
                    message.channel.send('Welcome to Secret Hitler! Type ~join if you want to play!');
                    if (DEBUG) {
                        message.channel.send(policyTiles);
                    }
                }
                break;
            case 'join':
                if (!initiated) {
                    message.channel.send(`${message.author}, no game currently exists. Type ~init to create one!`);
                } else if (gameInProgress) {
                    message.channel.send(`${message.author}, a game is already in progress, please wait for it to end!`);
                } else if (players.length < 11) {
                    if (DEBUG) {
                        players.push(message.author);
                        message.channel.send(`${message.author} has joined the game! There are ${players.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`);
                    } else {
                        if (!players.includes(message.author)) {
                            players.push(message.author);
                            message.channel.send(`<@${message.author}> has joined the game! There are ${players.length} player(s) currently. You can type ~leave to leave. If all players have joined, type ~start to start the game.`);
                        } else {
                            message.channel.send(`<@${message.author}>, you have already joined stfu lmao nerd`);
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
                    if (message.author == pres) {
                        chancCand = message.mentions.users.array()[0];
                        if (DEBUG) {
                            callVote(message.channel);
                        } else {
                            if (players.indexOf(chancCand) == -1) {
                                message.channel.send(`Invalid choice, try again.`)
                            }
                            if (chancCand == chanc || chancCand == prevPres) {
                                message.channel.send(`You cannot pick ${chancCand} as they were the previous president or chancellor. Please pick again.`);
                            } else {
                                //will this work? i have no idea. i hope so

                                //it does not work! what now lol
                                // callVote(message.channel).then(() => {
                                //     startElection(message.channel);
                                // });
                                callVote(message.channel);
                            }
                        }
                    }
                }
                break;
            case 'kill':
                if (killingPlayer) {
                    if (message.author == pres) {
                        target = message.mentions.users.array()[0];
                        if (players.indexOf(target) == -1) {
                            message.channel.send(`You can't kill ${target}.`)
                        }
                        players.splice(players.indexOf(target), 1);
                        //TODO: server mute dead player?
                        message.channel.send(`${target} has been eliminated!`).then(() => {
                            if(target == hitler) {
                                message.channel.send(`Hitler has been eliminated!`).then(() => {
                                    winMessage(true, gameChannel);
                                })
                            }
                            killingPlayer = false;
                        });  
                    }
                }
                break;
            case 'appoint':
                if(appointingPres) {
                    if (message.author == pres) {
                        presCand = message.mentions.users.array()[0];
                        if (presCand == pres) {
                            message.channel.send(`You cannot pick yourself. Please pick again.`);
                        } else {
                            pres = presCand;
                            appointingPres = false;
                            gameChannel.send(`${pres}, choose your chancellor by typing ~appoint and @ing them.`).then(() => {
                                pickingChanc = true;
                            });
                            elecNum++;
                        }
                    }
                }
            break;
            case 'investigate':
                if(investigating) {
                    if (message.author == pres) {
                        investigated = message.mentions.users.array()[0];
                        if(fascists.indexOf(investigated) != -1) {
                            pres.send(`${investigated} is fascist`).catch(err => {
                                console.log("error: ")
                                console.log(err);
                            });
                        }
                        else {
                            pres.send(`${investigated} is liberal`).catch(err => {
                                console.log("error: ")
                                console.log(err);
                            });
                        }
                        investigating = false;
                    }
                }
                break;
            case 'board':
                //TODO: code to visuallize board
                showBoard(message.channel);
                break;
            case 'abort':
                if (DEBUG) {
                    endGame();
                    message.channel.send(`Game Aborted`);
                }
                break;
            case 'help':
                //TODO: finish this
                message.channel.send('To create a game, use ~init. To join the game, use ~join. \
                Before the game starts, you can leave using ~leave. Once everyone has joined, use ~start to begin the game.');
                break;
            default:
                message.channel.send('Command not recognized. Type ~help for a list of commands.')
                break;
         }
     }
});

