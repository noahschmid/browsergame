const http = require ('http');
const express = require ('express');
const socketio = require ('socket.io');
const UUID = require('node-uuid');
const app = express ();

const clientPath = __dirname + '/../client/';
console.log (clientPath + " new");
app.get ('/', (req, res) => {
	res.sendFile (__dirname + '/index.html');
});
app.use (express.static ('public'));

const server = http.createServer (app);
const io = socketio(server);

let numClients = 0;

let CLIENTS = {};
let PLAYERS = {};

let MAP_W = 1000;
let MAP_H = 600;
let TILE_SIZE = 0;
const MAX_LAYERS = 5;

const WINDOW_W = 800;
const WINDOW_H = 600;

let gravity = 500;
let maxJumpForce = 650;
let jumpLength = 6;
let canJump = true;
let maxSpeed = 340;

let animStates = { "idle":1, "walking":2, "jumping":3 };
let tileSets = new Array ();

let map = new Array ();
map[0] = new Array ();
map[0][0] = new Array ();

let startPos = { x:0, y:0 };

let targetFPS = 60;
let tickLength = 1000/targetFPS;
let previousTick = Date.now ();
let actualTicks = 0;

let freeIds = new Array ();

function Point (x, y) {
	this.x = x;
	this.y = y;
};

function orientation (p1, p2, p3) {
	let val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
	
	if (val == 0)
		return 0;
	
	return (val > 0) ? 1 : 2;
}

function onSegment (p1, p2, p3) {
	if (p2.x <= Math.max(p1.x, p3.x) && p2.x >= Math.min (p1.x, p3.x) &&
		p2.y <= Math.max(p1.y, p3.y) && p2.y >= Math.min (p1.y, p3.y))
		return true;
	
	return false;
}

function linesIntersect (p1, q1, p2, q2) {
	let orientation1 = orientation(p1, q1, p2);
	let orientation2 = orientation(p1, q1, q2);
	let orientation3 = orientation(p2, q2, p1);
	let orientation4 = orientation(p2, q2, q1);
	
	if (orientation1 != orientation2 && orientation3 != orientation4)
		return true;
	
	if (orientation1 == 0 && onSegment (p1, p2, q1)) return true;
	
	if (orientation2 == 0 && onSegment (p1, q2, q1)) return true;
	
	if (orientation3 == 0 && onSegment (p2, p1, q2)) return true;
	
	if (orientation4 == 0 && onSegment (p2, q1, q2)) return true;
	
	return false;
}

function loadMap(file)
{
	let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    let rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function ()
    {
        if (rawFile.readyState === 4)
        {
            if (rawFile.status === 200 || rawFile.status == 0)
            {
                let allText = rawFile.responseText;
				
				let lines = allText.split ('\n');
				
				let pos = -1;
				let x = 0;
				for (let i = 0; i < lines.length; i ++) {
					if (pos == -1) {
						MAP_W = parseInt(lines[i].substring (0, lines[i].indexOf ("x")));
						MAP_H = parseInt(lines[i].substring (lines[i].indexOf ("x") + 1, lines[i].length));
						pos = -2;
						
					} else if (pos == -2) {
						TILE_SIZE = parseInt (lines[i]);
						pos = -3;
					} else if (pos == -3) {
						if (lines[i].substring (0,2).localeCompare ("f:") == 0) {
							tileSets.push(lines[i].substring(2));
						} else
							pos = 0;
					} else {
						let step = 1, x = 0;
						let temp = new Array ();
						
						for (let n = 0; n < lines[i].length - 1; n += (step + 1)) {
							if (lines[i].substring(n).includes (' '))
								step = lines[i].substring(n).indexOf (' ');
							else
								step = lines[i].substring(n).length;
							
							let field = lines[i].substring (n, n+step);
							let fieldStep = 0, c = 0;
							
							let temp2 = new Array ();
							for (let l = 0; l < MAX_LAYERS; l++) {
								if (field.substring(c).includes ('.'))
									fieldStep = field.substring(c).indexOf ('.');
								else
									fieldStep = field.substring(c).length;
								
								temp2.push (parseInt (field.substring (c, c + fieldStep)));
								
								c+= fieldStep + 1;
							}
							
							temp.push(temp2);
						}
						map.push (temp);
					}
				}
            }
        }
    }
	
    rawFile.send(null);
	console.log ("map loaded.");
	
	for (let y = 1; y < MAP_H; y++) {
		for (let x = 0; x < MAP_W; x++) {
			if (map [y][x][0] == 2) {
				startPos.x = x * TILE_SIZE;
				startPos.y = (y-1) * TILE_SIZE;
			}
		}
	}
}


function printMap () {
	for (let y = 1; y < MAP_H; y++) {
		let s = "";
		for (let x = 0; x < MAP_W; x++) {
			s = s + map [y][x][1];
		}
		console.log (s);
	}
}


function tileCollider (x, y) {
	if (map[y+1][x][0] == 1)
		return true;
	return false;
}

loadMap ("file://" + __dirname + "/map.txt");

let BulletList = {};

let Bullet = function (x, y, direction) {
	let self = {
		x:x,
		y:y,
		width:32,
		height:32,
		direction:direction
	};
	
	self.collisions = () => {
		for (let i in PLAYERS) {
			if (i.x + 48 > self.x && i.x < self.x + self.width &&
				i.y + 64 > self.y && i.y < self.x + self.height) {
					i.x = startPos.x;
					i.y = startPos.y;
					return true;
				}
				
		}
		return false;
	}
};

let Player = function (id) {
	let self = {
		x:startPos.x,
		y:startPos.y,
		oldX:0,
		oldY:0,
		id:id,
		number:"" + Math.floor (10 * Math.random ()),
		pressingLeft:false,
		pressingRight:false,
		pressingUp:false,
		pressingDown:false,
		pressingAttack:false,
		maxSpeed:maxSpeed,
		currentAnimState:animStates.idle,
		animPhase:0,
		jumpForce:0,
		grounded:false,
		facingLeft:false,
		jumpCounter:0,
		canJump:false,
		scrollX:false,
		scrollY:false,
		yVel:0,
		doubleJump:false
	};
	
	self.updatePosition = (delta) => {
		self.oldX = self.x;
		self.oldY = self.y;
		
		if (self.currentAnimState != animStates.jumping)
			self.currentAnimState = animStates.idle;
		
		if (self.pressingLeft){
			self.facingLeft = true;
			self.x-=Math.floor(self.maxSpeed * delta);
			
			if (self.currentAnimState != animStates.jumping) 
				self.currentAnimState = animStates.walking;
		}
		if (self.pressingRight) {
			self.facingLeft = false;
			self.x+=Math.floor(self.maxSpeed * delta);
			
			if (self.currentAnimState != animStates.jumping) 
				self.currentAnimState = animStates.walking;
		}
		if (self.pressingSpace && self.canJump && (self.grounded || self.doubleJump)){
			self.currentAnimState = animStates.jumping;
			self.jumpForce = maxJumpForce;
			self.jumpCounter = jumpLength;
			self.canJump = false;
			self.doubleJump = !self.doubleJump;
		}
		
		if (self.currentAnimState == animStates.jumping) {
			self.yVel = self.jumpForce * -1;
			self.jumpForce -= 30;
			self.jumpCounter--;
			if (self.jumpForce <= 1 || !self.pressingSpace && self.jumpCounter > 50)
				self.currentAnimState = animStates.idle;
		} else {
			if (self.yVel < gravity && !self.grounded)
				self.yVel += gravity;
			if (self.yVel > gravity)
				self.yVel = gravity;
			if (self.yVel < 0 && self.grounded)
				self.yVel = 0;
		}
		
		self.y += Math.floor(self.yVel * delta);
		
		if (self.currentAnimState == animStates.walking && !self.facingLeft) 
			self.animPhase = (self.animPhase + 10 * delta) % 6;
		
		if (self.currentAnimState == animStates.walking && self.facingLeft) {
			self.animPhase += 10 * delta;
			if (self.animPhase < 20)
				self.animPhase = 20;
			if (self.animPhase > 25)
				self.animPhase = 20;
		}
		
		if (self.currentAnimState == animStates.idle && !self.facingLeft && self.grounded)
			self.animPhase = 10;
		
		if (self.currentAnimState == animStates.idle && self.facingLeft && self.grounded)
			self.animPhase = 26;
		
		if ((self.currentAnimState == animStates.jumping || !self.grounded) && !self.facingLeft)
			self.animPhase = 7;
		
		if ((self.currentAnimState == animStates.jumping || !self.grounded) && self.facingLeft)
			self.animPhase = 7;
		
		if (!self.grounded)
			self.animPhase = 7;
	};
	
	self.processAttacks = (delta) => {
		
	};
	
	self.checkCollisions = () => {
			let bbox = { x:self.x+16, y:self.y, width:32, height:64 };
			
			let relX = 0, relY = 0;
			
			self.grounded = false;

			for (let sy = 1; sy < MAP_H; sy++) {
				for (let sx = 0; sx < MAP_W; sx++) {
					if (tileCollider (sx, sy-1)) {
						relX = sx * TILE_SIZE; // + self.offsetX;
						relY = (sy) * TILE_SIZE; // + self.offsetY;
					
						if ((sy + 1) == Math.floor ((self.y + 64) / TILE_SIZE) + 1 && sx == Math.floor ((self.x + 16) / TILE_SIZE) && tileCollider (sx,sy - 1))
							self.grounded = true;
					
						if ((sy + 1) == Math.floor ((self.y + 64) / TILE_SIZE) + 1 && sx == Math.floor ((self.x + 48) / TILE_SIZE) && tileCollider (sx,sy - 1))
							self.grounded = true;
					
						let topLeft = new Point (relX, relY);
						let topRight = new Point (relX + TILE_SIZE, relY);
						let bottomLeft = new Point (relX, relY + TILE_SIZE);
						let bottomRight =  new Point (relX + TILE_SIZE, relY + TILE_SIZE);
					
						let lastPointTL = new Point (self.oldX + 16, self.oldY);
						let lastPointTR = new Point (self.oldX + 48, self.oldY);
						let lastPointML = new Point (self.oldX + 16, self.oldY + 32);
						let lastPointMR = new Point (self.oldX + 48, self.oldY + 32);
						let lastPointBL = new Point (self.oldX + 16, self.oldY + 64);
						let lastPointBR = new Point (self.oldX + 48, self.oldY + 64);
						
						let newPointTL = new Point (self.x + 16, self.y);
						let newPointTR = new Point (self.x + 48, self.y);
						let newPointML = new Point (self.x + 16, self.y + 32);
						let newPointMR = new Point (self.x + 48, self.y + 32);
						let newPointBL = new Point (self.x + 16, self.y + 64);
						let newPointBR = new Point (self.x + 48, self.y + 64);
						
						if (bbox.x < relX + TILE_SIZE && bbox.x + bbox.width > relX &&
							bbox.y < relY + TILE_SIZE && bbox.y + bbox.height > relY) {
								if ((linesIntersect (topLeft, topRight, lastPointBL, newPointBL) ||  //bottom
									linesIntersect (topLeft, topRight, lastPointBR, newPointBR)) && self.grounded) {
									self.y = (sy - 1) * TILE_SIZE - 32; // + self.offsetY;
								} else if ( linesIntersect (topRight, bottomRight, lastPointTL, newPointTL) ||  //left
											linesIntersect (topRight, bottomRight, lastPointBL, newPointBL) || 
											linesIntersect (topRight, bottomRight, lastPointML, newPointML)) {
										self.x = (sx + 1) * TILE_SIZE - 16; //+ self.offsetX - 16;
								} else if ( linesIntersect (topLeft, bottomLeft, lastPointTR, newPointTR) ||  //right
										 	linesIntersect (topLeft, bottomLeft, lastPointBR, newPointBR) || 
											linesIntersect (topLeft, bottomLeft, lastPointMR, newPointMR)) {
										self.x = (sx) * TILE_SIZE - 48;// + self.offsetX - 48;
								} else if ( linesIntersect (bottomLeft, bottomRight, lastPointTL, newPointTL) || //top
											linesIntersect (bottomLeft, bottomRight, lastPointTR, newPointTR)) {
									self.y = (sy + 1) * TILE_SIZE; // + self.offsetY;
									if (self.currentAnimState == animStates.jumping)
										self.currentAnimState = animStates.idle;
								}
								
						}
					}
				}
			}
	};
	
	return self;
};

io.on ('connection', (client)=> { 
	client.userid = Math.random ();

	if (freeIds.length == 0)
		client.userid = numClients;
	else {
		let pos = freeIds.indexOf (Math.min.apply (Math, freeIds));
		client.userid = freeIds[pos];
		freeIds.splice (pos, 1);
	}
	
	client.userid = Math.random ();
	
	console.log ('client[' + client.userid + '] connected.');
	CLIENTS[client.userid] = client;
	
	var player = Player (client.userid);
	PLAYERS[client.userid] = player;
	numClients++;
	client.emit ('message', 'connected to master server.'); 
	client.emit ('id', client.userid); 
	client.emit ('dimensions', {width:WINDOW_W, height:WINDOW_H}); 
	
	PLAYERS[client.userid].offsetX = 0;
	
	if (MAP_H * TILE_SIZE > WINDOW_H)
		PLAYERS[client.userid].offsetY = ((MAP_H - 1) * TILE_SIZE - WINDOW_H) * -1;
	else
		PLAYERS[client.userid].offsetY = 0;
	
	client.emit ('map', { map:map, tileSize:TILE_SIZE, mapWidth:MAP_W, mapHeight:MAP_H, tileSets:tileSets });
	client.x = 0;
	client.y = 0;
	client.number = "" + Math.floor (10 * Math.random ());
	
	client.on ("message", (text) => {
		console.log ("client wrote: " + text)
		io.emit ("message", text);
	});
	
	client.on ("keyPress", (event) => {
		if (event.inputId == 'right') 
			PLAYERS[client.userid].pressingRight = event.state;
		if (event.inputId == 'left')
			PLAYERS[client.userid].pressingLeft = event.state;
		if (event.inputId == 'up')
			PLAYERS[client.userid].pressingUp = event.state;
		if (event.inputId =='down')
			PLAYERS[client.userid].pressingDown = event.state;
		if (event.inputId == 'space') {
			PLAYERS[client.userid].pressingSpace = event.state;
			if (!event.state) {
				PLAYERS[client.userid].canJump = true;
			}
		}
		if (event.inputId == 'fire')
			PLAYERS[client.userid].pressingAttack = event.state;
	});
	
	client.on ('disconnect', () => { 
		console.log ("client [" + client.userid +"] disconnected."); 
		freeIds.push (client.userid);
		delete CLIENTS[client.userid];
		delete PLAYERS[client.userid];
		numClients--;
	});
});

server.on("error", (err)=>{console.log ("Server error: ", err);})
server.listen (process.env.PORT || 8080, ()=> {console.log ("Server started on Port 8080");});


let serverLoop = () => {
	let now = Date.now ();
	actualTicks++;
	
	if (previousTick + tickLength <= now) {
		let delta = (now - previousTick) / 1000;
		previousTick = now;
		
		update (delta);
		actualTicks = 0;
	}
	
	if (Date.now() - previousTick < tickLength - 16) {
	    setTimeout(serverLoop);
	} else {
		setImmediate(serverLoop);
	}
}

let update = (delta) => {
	let pack = [];
	for (let i in PLAYERS) {
		let player = PLAYERS[i];
		player.updatePosition (delta);
		player.checkCollisions ();
		player.processAttacks (delta);
		pack.push ( { x:player.x, y:player.y, animPhase:player.animPhase, id:player.id, grounded:player.grounded, oldX:player.oldX, oldY:player.oldY } );
	}
	
	for (let e in CLIENTS) {
		let client = CLIENTS[e];
		client.emit ('position', pack);
	}
};

serverLoop ();
/*
setInterval (() => {
	let pack = [];
	for (let i in PLAYERS) {
		let player = PLAYERS[i];
		player.updatePosition ();
		player.checkCollisions ();
		player.processAttacks ();
		pack.push ( { x:player.x, y:player.y, number:player.number, animPhase:player.animPhase, id:player.id } );
	}
	
	for (let e in CLIENTS) {
		let client = CLIENTS[e];
		client.emit ('position', pack);
	}
}, 1000/60);*/
