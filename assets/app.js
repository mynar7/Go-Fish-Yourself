// Initialize Firebase
var config = {
    apiKey: "AIzaSyBBflwDizYQNO2MpD9EpXzrgWUo1fmctCQ",
    authDomain: "go-fish-yourself.firebaseapp.com",
    databaseURL: "https://go-fish-yourself.firebaseio.com",
    projectId: "go-fish-yourself",
    storageBucket: "",
    messagingSenderId: "219349623457"
  };
firebase.initializeApp(config);
//make a database variable
let db = firebase.database();
//declare variables
let userName;
let oppName;
let userId;
let dataRef;
let userRef;
let opponentId;
let lobbyRef;
let winCount;
let lossCount;
let drawCount;
let myTurn = false;
let cpuGame = false;

let deckId;
let myHand;
let oppHand;
let deckEmpty;
let myPoints;
let oppPoints;
let insult = false;
let myGuesses = [];

let nameColor = "blue";
let opNameColor = "purple";
let sysNameColor = "rgb(221, 18, 18)";
let chatTxtColor = "black";
let bgColor = "rgb(223, 188, 136)";


//grab the firebase connections reference
let userCons = db.ref('.info/connected');
//make a reference for my lobbies folder on the database
let lobbies = db.ref('/lobbies');

$(document).ready(function () {

userCons.on("value", function(userList){
    if(userList.val()) {
        //see how many lobbies there are or if there's any
        lobbies.once("value").then(function(lobbiesSnap){
            //if no lobbies, make the first lobby
            if(lobbiesSnap.numChildren() === 0) {
                makeLobby();
            } else {
                let lobbied = false;
                //if there's a lobby already with an empty slot, join it!
                lobbiesSnap.forEach(function(lobbyUsers){
                    if (lobbyUsers.numChildren() === 1) {
                        //add to here, then return true to break forEach
                        let con = lobbyUsers.ref.push(true);
                        lobbyRef = db.ref('/lobbies/' + con.path.n[1]);
                        //assign reference for this user's data
                        userRef = db.ref('/lobbies/' + con.path.n[1] + '/' + con.path.n[2]);
                        //assign a username based off key generated by firebase for userdata folder in lobby
                        userName = con.path.n[2].slice(14)
                        userId = userName;
                        //add default player name
                        changeName(userName);
                        assignNameListen();
                        //assign ref for data for this lobby
                        dataRef = db.ref('/lobbyData/dataFor' + con.path.n[1]);
                        let dataCon = dataRef.child('players').push(true);  
                        dataCon.onDisconnect().remove();
                        let playerData = dataRef.child('players').child(dataCon.path.n[3]);
                        playerData.update({
                            Id: userId,
                        });
                        //remove this user from lobby when disconnect
                        con.onDisconnect().remove();
                        //clear all lobby data when this user disconnects
                        dataRef.child('chat').onDisconnect().remove();
                        // dataRef.child('players/' + userName).onDisconnect().remove();                        
                        assignChat();
                        lobbied = true;
                        chatPrint(userName, "Joined Lobby");
                        chatUpdate("System", "<span id=sysMsg>Type /help for a list of commands</span>");                        
                        //go fish stuff
                        assignDeckListen();
                        makeDeck();
                        assignMyHandListen();
                        assignOppHandListen();
                        assignPointListen();
                        assignGameOver();

                        changeTurn();
                        //grab opponent reference
                        dataRef.child('players').once("value", function(playerSnap){
                            playerSnap.forEach(function(refSnap){
                                opponentId = refSnap.val().Id;
                                return true;
                            });
                        });
                        assignTurn();
                        return true;
                    }
                });
                //create new lobby
                if(!lobbied) {
                    makeLobby();                             
                }//end if lobbied
            }//end else
        }); //end lobbies.once
    
    } //end if userList.val
}); //end userCons call

});//doc ready


function makeLobby() {
    //make a lobby and push to it to create a user
    let con = db.ref('/lobbies/lobby' + Date.now()).push(true);
    //assign reference for this lobby
    lobbyRef = db.ref('/lobbies/' + con.path.n[1]);
    //assign reference for this user's data
    userRef = db.ref('/lobbies/' + con.path.n[1] + '/' + con.path.n[2]);
    //assign a username based off key generated by firebase for userdata folder in lobby
    userName = con.path.n[2].slice(14)
    userId = userName;
    //add default player name
    changeName(userName);
    assignNameListen();
    //assign ref for data for this lobby
    dataRef = db.ref('/lobbyData/dataFor' + con.path.n[1]);
    let dataCon = dataRef.child('players').push(true);  
    dataCon.onDisconnect().remove();
    let playerData = dataRef.child('players').child(dataCon.path.n[3]);
    playerData.update({
        Id: userId,
    });
    //remove this user from lobby when disconnect
    con.onDisconnect().remove();
    //clear all lobby data when this user disconnects
    dataRef.child('chat').onDisconnect().remove();
    assignChat();
    chatPrint(userName, "Started Lobby");
    chatUpdate("System", "<span id=sysMsg>Type /help for a list of commands</span>");    
    assignTurn();
    //go fish fxs
    assignDeckListen();
    assignMyHandListen();
    assignOppHandListen();    
    assignPointListen();
    assignGameOver();
}

//name listener
function assignNameListen() {
    lobbyRef.on("value", function(snap){
        snap.forEach(function(snap2){
            if(snap2.val().name !== userName){
                oppName = snap2.val().name;
            }
        });
    });
}

//turn listener assignment
function assignTurn() {
    dataRef.child('data/turns/turn').on("value", function(snap){
        //when move made, take snap data to get turn data,
        //compare to this client's userRef
        let x = snap.val();
        if(x === userId) {
            //if this client's userId, set var myTurn true, else false
            myTurn = true;
            $('#status').empty();
            turnNotice();
        } else {
            myTurn = false;
            opponentId = x;
            $('#status').empty();
            turnNotice();
        }
    });
    dataRef.child('data/turns').onDisconnect().remove();
}

//change turn fx
function changeTurn () {
    if(!cpuGame) {
        let x;
        if (opponentId) {
            x = opponentId;
        } else {
            x = userId;
        }
        dataRef.child('data/turns').update({
            turn: x,
        });
    }
}

//chat submit button event listener function
$('#enter').on("click", function(event){
    event.preventDefault();
    let str = $('#textInput').val().trim();
    chatPrint(userName, str);
    $('#textInput').val("");
});

//fx to change username
function changeName(str) {
    userName = str;
    if(!cpuGame) {
        userRef.update({
            name: userName
        });
    }
}

//clear chat fx
$('#clear').on("click", function(event){
    event.preventDefault();
    $('#chat').empty();
});

function turnNotice() {
    if(cpuGame) {
        $('#status').empty();


    }
    if(myTurn) {
        $('<li>').html("It's your turn.").appendTo("#status");                    
    } else {
        $('<li>').html("Waiting for Opponent.").appendTo("#status");                    
    }
}

//assign a listener to DB chat message, then pass the most recent data to fx that prints to each user's window
function assignChat() {
    dataRef.child('chat').on("value", function(snap){
        //if statement removes opponent DC console error
        if(snap.val()) {
            chatUpdate(snap.val().msgBy, snap.val().lastMsg);
            if(snap.val().insults != insult) {
                insult = snap.val().insults;
                insultBanner();
            }
        } else {
            //use that null error to print a disconnect
            chatUpdate("System", "<span id='sysMsg'>player disconnected</span>");
        }
    });
}

function insultBanner() {
    if(insult) {
        $('header h1').html("GO FISH YOURSELF");                                        
    } else {
        $('header h1').html("GO FISH");                    
    }
}

//parse for commands, if not command, send to database to be read
function chatPrint(name, str, bool) {
    str = parseInput(str);
    if(!cpuGame) {
        if(str !== false && arguments.length === 2) {
            dataRef.child('chat').update({
                lastMsg: str,
                msgBy: name
            });
        }
        if(str !== false && arguments.length === 3) {
            dataRef.child('chat').update({
                lastMsg: str,
                msgBy: name,
                insults: bool
            });
        }//end if
    } else if (str !== false) {
        chatUpdate(name, str);
    }
}

//take input and add it to the chat window
function chatUpdate(name, str) {
    let chatBox = $('#chat');
    // chatBox.append('<p>' + name + ': ' + str + '</p>');
    if(name === userName) {
        $('<li>').html('<span class="chatName" style="color:' + nameColor + ';">' + name + ': </span>' + '<span class="chatText" style="color:' + chatTxtColor + ';">' + str + '</span>').prependTo(chatBox);
    } else if (name === oppName) {
        $('<li>').html('<span class="opChatName" style="color:' + opNameColor + ';">' + name + ': </span>' + '<span class="chatText" style="color:' + chatTxtColor + ';">' + str + '</span>').prependTo(chatBox);        
    } else {
        $('<li>').html('<span class="sysChatName" style="color:' + sysNameColor + ';">' + name + ': </span>' + '<span class="chatText" style="color:' + chatTxtColor + ';">' + str + '</span>').prependTo(chatBox);        
    }
}

//this fx returns a random number from 1 - sides, if no arg, sides = 20
function roll(num) {
    let sides = 20;
    if(arguments.length == 1) {
        sides = num;
    }
    return Math.floor(Math.random() * sides) + 1;
}

//this function handles user chat input by calling fx based on if the user entered a string that starts with /
function parseInput(str) {
    if(str.startsWith('/')) {
        let index = str.indexOf(" ");
        let command;
        if(index == -1) {
            command = str.slice(1);
        } else {
            command = str.slice(1, index)
        }
        command = command.trim().toLowerCase();
        let helpText = "<span id='sysMsg'><br>Commands:<br>/help : get list of commands<br>/name : change user name<br>/insult : toggle insults on/off<br>/roll # : rolls a # sided die (if # omitted, # is 20)<br>/color : change chat menu colors<br>/rules : view game rules</span>";
        switch(command) {
            case "name":
                let newName = str.slice(index + 1);
                if(index == -1) {
                    chatUpdate("System", "<span id='sysMsg'>Usage: /name -new name- : change user name</span>");
                    return false;
                } else {
                    changeName(newName);
                    return "<span id='sysMsg'>name changed to " + newName + "</span>";
                }
            break;
            case "roll":
                if(index == -1) {
                    return "<span id='sysMsg'>Rolled a 20 sided die! Result: " + roll() + "</span>";
                } else {
                    let int = parseInt(str.slice(index + 1));
                    if(isNaN(int)) {
                        chatUpdate("System", "<span id='sysMsg'>Usage: /roll # : rolls a # sided die</span>");
                        return false;
                    } else {
                        return "<span id='sysMsg'>Rolled a " + int + " sided die! Result: " + roll(int) + "</span>";                        
                    }
                }
            break;
            case "help":
                chatUpdate("System", helpText);
                return false;
            break;
            case "insult":
                if(insult){
                    chatPrint("System", "<span id='sysMsg'>" + userName + " turned insults off.</span>", false);
                    if(cpuGame) {
                        insult = false;
                        insultBanner();
                    }
                } else {
                    chatPrint("System", "<span id='sysMsg'>" + userName + " turned insults on.</span>", true);
                    if(cpuGame) {
                        insult = true;
                        insultBanner();
                    }
                }
            return false;
            break;
            case "color":
                let str2 = str.slice(index + 1)
                str2 = str2.trim();
                if(str2 !== '/color') {
                    let space = str2.indexOf(' ');
                    if(space !== -1) {
                        let colorTarget = str2.slice(0, space);
                        let color = str2.slice(space);
                        switch(colorTarget.toLowerCase()){
                            case 'name':
                                nameColor = color;
                                $('.chatName').css("color", color);
                            break;
                            case 'opname':
                                opNameColor = color;
                                $('.opChatName').css("color", color);                                
                            break;
                            case 'sysname':
                                sysNameColor = color;
                                $('.sysChatName').css("color", color);                                
                            break;
                            case 'text':
                                chatTxtColor = color;
                                $('.chatText').css("color", color);
                            break;
                            case 'bg':
                                $('#chat').css("backgroundColor", color);
                            break;
                        }
                    } else {
                        if(str2 == "default") {
                            nameColor = "blue";
                            opNameColor = "purple";
                            sysNameColor = "red";
                            chatTxtColor = "black";
                            $('.chatName').css("color", nameColor);
                            $('.sysChatName').css("color", sysNameColor);
                            $('.opChatName').css("color", opNameColor);                            
                            $('.chatText').css("color", chatTxtColor);
                            $('#chat').css("backgroundColor", bgColor);
                        } else {
                            let color = str2
                            nameColor = color;
                            $('.chatName').css("color", color);
                            chatTxtColor = color;
                            $('.chatText').css("color", color);
                        }
                    }

                } else {
                    chatUpdate("System", "<span id='sysMsg'>Usage: /color 'color' : changes font color<br>/color bg 'color' : changes chat bg color<br>/color name 'color' : changes name color only<br>/color opName 'color' : change opponent's name color<br>/color sysName 'color' : change system name color<br>/color text 'color' : changes text color only<br>/color default : restores original colors</span>");
                }
                return false;
            break;
            case 'rules':
                chatUpdate("System", "<span id=sysMsg>To play: Click on one of your cards to search your opponent's hand for a match!<br>The game ends when one of you empties your hand.<br>The player with the most pairs wins!</span>");                
            return false;
            break;
            default:
                chatUpdate("System", "<span id='sysMsg'>try /help for commands</span>");
                return false;
            break;
        }
    } else {
        return str;
    }
}

//begin Go Fish stuff

//initialize and get a new deck of cards
function makeDeck() {
    //debug query for a quick game
    //let query = "https://deckofcardsapi.com/api/deck/new/shuffle/?cards=AS,2S,KS,AD,2D,KD,AC,2C,KC,AH,2H,KH"
    let query = "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1";
    $.ajax({
        url: query,
        method: 'GET'
    }).then(function(resp){
        deckId = resp.deck_id;
        if(!cpuGame) {
            dataRef.child('data/goFish').update({
                deck_id: deckId
            });
        } else {
            drawCard(5, "initial");
        }
    });//end then
}

//draw cards and update firebase
function drawCard(num, cpu) {
    let query = "https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=" + num;
    $.ajax({
        url: query,
        method: 'GET'
    }).then(function(resp){
        if(cpu == "cpu") {
            cpuCards(resp);
        } else if (cpu == "initial") {
            cpuCards(resp);
            drawCard(5);
        } else {
            playerCards(resp);
        }
    }); //end ajax
}

function cpuCards(resp) {
    if(resp.success) {
        if(resp.cards.length === 1){
            //chatUpdate("System", "<span id='sysMsg'>You drew the " + resp.cards[0].value.toLowerCase() + " of " + resp.cards[0].suit.toLowerCase() + "</span>");
        }
        addToOppHand(resp.cards);
    } else {
        if(resp.cards.length > 0){
            addToOppHand(resp.cards);
        } else {
            oppHand = null;
        }
    }//end else
    
    setTimeout(()=>{
        checkOppPairs();
        //opponentHandCards();
    }, 1000);
}

function playerCards(resp) {
    if(resp.success) {
        if(resp.cards.length === 1){
            //chatUpdate("System", "<span id='sysMsg'>You drew the " + resp.cards[0].value.toLowerCase() + " of " + resp.cards[0].suit.toLowerCase() + "</span>");
        }
        addToHand(resp.cards);
    } else {
        if(resp.cards.length > 0){
            addToHand(resp.cards);
        } else {
            myHand = null;
            dataRef.child('data/goFish/hands').child(userId).remove();
        }
    }//end else
    //displayCards()               
    setTimeout(()=>{
        checkPairs();
        /*
        if(myHand.length === 0) {
            console.log("empty");
        }
        */
        updateMyHand();
        if(cpuGame) {
            displayCards();
        }
    }, 1000);
}

//takes an array of objects, adds array to user's hand of cards
function addToHand (arr) {
   if(!myHand){
       myHand = arr;
   } else {
        myHand = myHand.concat(arr);
   }
   displayCards();
}

function addToOppHand(arr) {
    if(!oppHand){
        oppHand = arr;
    } else {
        oppHand = oppHand.concat(arr);
    }
    opponentHandCards();
}
let aiMove;

function goFish (card) {
    let cardName =  "Got any " + card.value.toLowerCase() + "s?";
    chatPrint(userName, cardName);
    let index;
    index = oppHand.findIndex(x => {return x.value === card.value});
    if(index === -1) {
        /*
        if(cpuGame) {
            myGuesses.push(card.value);
        }
        */
        myTurn = false;
        if(cpuGame) {
            turnNotice();
        }
        if(insult){
            getInsult();
        } else {
            setTimeout(()=>{chatPrint(oppName, "Go Fish.")}, 1000);
        }
        setTimeout(()=>{
            drawCard(1)
            if(cpuGame) {
                aiMove = setTimeout(aiFish, 3000);
            } else {
                changeTurn();     
            }
        }, 1500);
    } else {
        let foundCard = oppHand.splice(index, 1);
        let myCardIndex = myHand.findIndex(x => {return x.code === card.code});
        myHand.splice(myCardIndex, 1);
        addPoint(1);
        chatPrint("System","<span id='sysMsg'>" + userName + " received the " + foundCard[0].value.toLowerCase() + " of " + foundCard[0].suit.toLowerCase() + " from " + oppName + "</span>");
        updateHands();
        if(cpuGame) {
            turnNotice();
            displayCards();
            opponentHandCards();
            if(myHand.length == 0 || oppHand.length == 0) {
                endGame();
            }
        }
    }
}

function aiFish() {
    let guess = Math.floor(Math.random() * oppHand.length);
    let card = oppHand[guess];

    let cardName =  "Got any " + card.value.toLowerCase() + "s?";
    chatPrint("System", cardName);
    let index;
    index = myHand.findIndex(x => {return x.value === card.value});
    if(index === -1) {
        /*
        if(cpuGame) {
            myGuesses.push(card.value);
        }
        */
        
        if(insult){
            getInsult("cpu");
        } else {
            setTimeout(()=>{chatPrint(userName, "Go Fish.")}, 1000);
        }
        setTimeout(()=>{
            drawCard(1, "cpu");
            myTurn = true;
            turnNotice();        
        }, 1500);
    } else {
        setTimeout(function(){
            let foundCard = myHand.splice(index, 1);
            let myCardIndex = oppHand.findIndex(x => {return x.code === card.code});
            oppHand.splice(myCardIndex, 1);
            chatPrint("System","<span id='sysMsg'>" + oppName + " received the " + foundCard[0].value.toLowerCase() + " of " + foundCard[0].suit.toLowerCase() + " from " + userName + "</span>");
            oppPoints++;
            displayPoints();
            displayCards();
            opponentHandCards();
            if(oppHand.length == 0 || myHand.length == 0) {
                endGame();
            } else {
                setTimeout(aiFish, 4000);
            }
        }, 2000);
    }

}

//update both hands
function updateHands () {
    if(!cpuGame) {
        dataRef.child('data/goFish/hands').update({
            [userId]: myHand,
            [opponentId]: oppHand
        });
    }
}
//update only my hand
function updateMyHand() {
    if(!cpuGame) {
        dataRef.child('data/goFish/hands').update({
            [userId]: myHand,
        });
    }
}

function emptyHand() {
    dataRef.child('data/goFish/hands').child(userId).remove();
}

//captures deck ID to share between users
function assignDeckListen() {
    dataRef.child('data/goFish').child('deck_id').on("value", function(snap){
        if(snap.val()) {
            deckId = snap.val();
            drawCard(5);
            deckEmpty = false;
        }
        //console.log(deckId);
    });
    dataRef.child('data/goFish').onDisconnect().remove();    
}

function assignMyHandListen() {
    dataRef.child('data/goFish/hands').child(userId).on('value', function(snap){
            myHand = snap.val();
            displayCards();
    });
}

function assignOppHandListen() {
    dataRef.child('data/goFish/hands').on('value', function(snap){
        oppHand = snap.child(opponentId).val();
        opponentHandCards();
    });
}

function opponentHandCards(){
    if(oppHand) {
        let screenCards = $('.opponentHand').children().length;
        //console.log("screenCards: ", screenCards);
        let actualCards = oppHand.length;
        //console.log("actualCards: ", actualCards);        
        if(screenCards > actualCards) {
            let difference = screenCards - actualCards;
            for(let i = 0; i < difference; i++) {
                let displayedCards = $('.opponentHand').children();
                let cardNum = screenCards - 1 - i;
                $(displayedCards[cardNum]).fadeOut(500, function(){
                    $(this).remove();
                });
                
            }
        } else if (screenCards < actualCards) {
            let difference = actualCards - screenCards;
            for(let i = 0; i < difference; i++) {
                let newCard = $("<img>").attr("src", "./assets/images/cardBack.svg").hide().appendTo(".opponentHand");
                $(newCard).fadeIn(500);
            }
        }
    } else {
        $('.opponentHand').empty();
    }
    /*
    $(".opponentHand").empty();
    if(oppHand){
        for(var t = 0;t<oppHand.length;t++){
            var eachCard = $("<img>").attr("src", "./assets/images/cardBack.svg");
            $(".opponentHand").append(eachCard);
        }//for stop
    }//if stop
    */
}

function assignGameOver() {
    dataRef.child('data/goFish/hands').on('child_removed', function(snap){
        myHand = snap.child(userId).val();
        oppHand = snap.child(opponentId).val();
        
        if(!myHand || !oppHand){
            $('#btnGrp img').fadeOut(500,()=>{
                $('#btnGrp').empty();
            });
            //console.log("Game Over");
            dataRef.child('data/goFish/points').once('value', function(snap) {
                myPoints = snap.child(userId).val();
                oppPoints = snap.child(opponentId).val();
                displayWinLose();
            });//end dataref
        }
    });
}

function displayWinLose() {
    if(myPoints > oppPoints) {
        $('#status li').html("<span style='color:rgb(0, 159, 56)'>You win</span");
    } else if (myPoints < oppPoints){
        $('#status li').html("<span style='color:rgb(255, 4, 4)'>You lose</span>");
    } else {
        $('#status li').html("<span style='color:rgb(3, 155, 229)'>You tied</span>");                            
    }
}

function assignPointListen() {
    dataRef.child('data/goFish/points').on('value', function(snap){
        myPoints = snap.child(userId).val();
        oppPoints = snap.child(opponentId).val();
        displayPoints();
    });
}

function displayPoints() {
    if(myPoints) {
        $('#points').html("My pairs:" + myPoints);
    } else {
        $('#points').html('');            
    }

    if(oppPoints) {
        $('#oppPoints').html(oppName + "'s pairs: " + oppPoints);
    } else {
        $('#oppPoints').html('');            
    }
}

function addPoint (num) {
    if(!cpuGame) {
        dataRef.child('data/goFish/points').once("value", function(snap){
            if(!snap.hasChild(userId)) {
                dataRef.child('data/goFish/points').update({
                    [userId]: num
                });
            } else {
                // console.log("add: ", snap.val().hand);
                dataRef.child('data/goFish/points').update({
                    [userId]: snap.child(userId).val() + num
                });
            }
        });
    } else { //if cpuGame
        if(!myPoints) {
            myPoints = num;
        } else {
            myPoints += num;
        }
        displayPoints();
    }
} //end addPoint

function displayCards() {
    let inHand;
    let onPage;
    /*
    if(myHand) {
        console.log("In hand: ", myHand.length);
    }
    console.log("On page: ", $('#btnGrp').children().length);
    */
    if(myHand && $('#btnGrp').children().length > 0) {
        $('#btnGrp').children().each(function(index){
            inHand = false;
            for(let i = 0; i < myHand.length; i++){
                if($(this).attr("data-code") == myHand[i].code){
                    inHand = true;
                    break;
                }//end if
            }//end for
            if(!inHand) {
                $(this).fadeOut(500, function(){
                    $(this).remove();
                });
            }//end if
        });//end each
        for(let i = 0; i < myHand.length; i++) {
            onPage = false;
            $('#btnGrp').children().each(function(index){
                if(myHand[i].code == $(this).attr("data-code")) {
                    onPage = true;
                }
            });//end .each
            if(!onPage){
                let img = $('<img>').attr("src", urlHelp(myHand[i].images.png)).hide().attr("data-code", myHand[i].code).appendTo('#btnGrp');
                img.fadeIn();
            }
        }//end for
    }//end outer if
    
    if(myHand && $('#btnGrp').children().length == 0) {
        for(let i = 0; i < myHand.length; i++) {
            let img = $('<img>').attr("src", urlHelp(myHand[i].images.png)).hide().attr("data-code", myHand[i].code).appendTo('#btnGrp');
            img.fadeIn();
        }//end for
    }//end if
}//end fx

function urlHelp(str){
    //let str = "https://deckofcardsapi.com/static/img/KH.png";
    let str2 = "https://" + str.slice(7);
    return str2;
}

//assign click listener to card images to perform goFish
$('#btnGrp').on("click", "img", function(){
    if(myTurn) {
        let code = $(this).attr("data-code");
        let index = myHand.findIndex(x => {return code == x.code});
        if(index > -1 && oppHand) {
            goFish(myHand[index]);
        }
    }
});

//function to compare cards in player's own hand and remove duplicates, then add points
function checkPairs() {
    let points = 0;
    if(myHand) {
        for (let index = 0; index < myHand.length; index++) {
            let arr = myHand.slice();
            let searchCard = arr.splice(index, 1);
            //console.log("card: ", JSON.stringify(searchCard));
            //console.log("value: ", searchCard[0].value);
            //console.log("hand: ", JSON.stringify(arr));
            let match = arr.findIndex(x => {return x.value === searchCard[0].value});
            
            if(match > -1) {
                //console.log("match!!");
                let matchingCard = arr.splice(match, 1);
                myHand = arr;
                points++;
                chatUpdate("System", "<span id='sysMsg'>You paired the " + matchingCard[0].value.toLowerCase() + " of " + matchingCard[0].suit.toLowerCase() + " and the " + searchCard[0].value.toLowerCase() + " of " + searchCard[0].suit.toLowerCase() + " in your hand</span>");
            }
        }//end for
        addPoint(points);
        if(myHand.length == 0) {
            endGame();
        }
    } //end if myHand
}

function checkOppPairs() {
    let points = 0;
    if(oppHand) {
        for (let index = 0; index < oppHand.length; index++) {
            let arr = oppHand.slice();
            let searchCard = arr.splice(index, 1);
            //console.log("card: ", JSON.stringify(searchCard));
            //console.log("value: ", searchCard[0].value);
            //console.log("hand: ", JSON.stringify(arr));
            let match = arr.findIndex(x => {return x.value === searchCard[0].value});
            
            if(match > -1) {
                //console.log("match!!");
                let matchingCard = arr.splice(match, 1);
                oppHand = arr;
                points++;
                chatUpdate("System", "<span id='sysMsg'>CPU paired the " + matchingCard[0].value.toLowerCase() + " of " + matchingCard[0].suit.toLowerCase() + " and the " + searchCard[0].value.toLowerCase() + " of " + searchCard[0].suit.toLowerCase() + " in their hand</span>");
                opponentHandCards();
            }
        }//end for
        oppPoints += points;
        displayPoints();
        if(oppHand.length == 0) {
            endGame();
        }
    } //end if oppHand
}

function getInsult(cpu) {
   var cors = 'https://cors-anywhere.herokuapp.com/'
   var queryURL = "https://insult.mattbas.org/api/insult.json?template=Go Fish, you <adjective min=1 max=1 id=adj1> <amount> of <adjective min=1 max=1> <animal> <animal_part>";
   $.ajax({
      url: cors + queryURL,
      method: "GET"
   })
   .then(function(response) {
       if(response && !cpu) {
           chatPrint(oppName, response.insult);
       } else if(response && cpu) {
           chatPrint(userName, response.insult);
       }
   });//end then 
}
//ai opponent stuff

function aiOppSetup() {
    /*
    lobbyRef.once(function(snap){
        if(snap.numChildren() == '1') {
            
        }
    });
    */
   if(!cpuGame) {
        myHand = null;
        oppHand = null;
        oppName = "System";
        myPoints = 0;
        oppPoints = 0;
        $('#btnGrp').empty();
        $('.opponentHand').empty();

        //set state cpuGame       
        cpuGame = true;
        //nuke everything from firebase
        lobbyRef.remove();
        dataRef.remove();

        //unassign listeners
       
        //assignNameListen();
        lobbyRef.off();
        //assignChat();
        dataRef.child('chat').off();
        //assignDeckListen();
        dataRef.child('data/goFish').child('deck_id').off()
        //assignMyHandListen();
        dataRef.child('data/goFish/hands').child(userId).off();
        //assignOppHandListen();
        dataRef.child('data/goFish/hands').off();
        //assignPointListen();
        //assignGameOver();
        dataRef.child('data/goFish/points').off();
        dataRef.child('data/goFish/points').off();        
        //assignTurn();
        dataRef.child('data/turns/turn').off();
       
        //undo update fxs
        //chatUpdate
        //addpoint

        //write new functions if necessary for cpu player

        makeDeck();
        myTurn = true;
        turnNotice();
    }
}

function endGame() {
    clearInterval(aiMove);
    displayWinLose();
}

$('#aiGame').on("click", function(event){
    event.preventDefault();
    $(this).fadeOut(500, function(){
        $(this).remove();
    });
    aiOppSetup();
});
