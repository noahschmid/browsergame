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

let gravity = 8;
let maxJumpForce = 16;
let jumpLength = 7;
let canJump = true;

let animStates = { "idle":1, "walking":2, "jumping":3 };
let tileSets = new Array ();

let map = new Array ();
map[0] = new Array ();
map[0][0] = new Array ();

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
				console.log (2);
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
}


function printMap () {
	for (let y = 1; y < MAP_H; y++) {
		let s = "";
		for (let x = 0; x < MAP_W; x++) {
			s = s + map [y][x][0];
		}
		console.log (s);
	}
}


function tileCollider (x, y) {
	//console.log (map[y+1][x][0]);
	if (map[y+1][x][0] < 0)
		return true;
	return false;
}


loadMap ("file://" + __dirname + "/map.txt");

let Player = function (id) {
	let self = {
		x:250,
		y:0,
		oldX:0,
		oldY:0,
		id:id,
		number:"" + Math.floor (10 * Math.random ()),
		pressingLeft:false,
		pressingRight:false,
		pressingUp:false,
		pressingDown:false,
		maxSpeed:5,
		currentAnimState:animStates.idle,
		animPhase:0,
		jumpForce:0,
		grounded:false,
		facingLeft:false,
		jumpCounter:0,
		canJump:false,
		offsetX:0,
		offsetY:0,
		yVel:0,
		doubleJump:false
	};
	
	self.updatePosition = () => {
		self.oldX = self.x;
		self.oldY = self.y;
		
		if (self.currentAnimState != animStates.jumping)
			self.currentAnimState = animStates.idle;
		
		
		if (self.pressingLeft){
			self.facingLeft = true;
			self.x-=self.maxSpeed;
			if (self.currentAnimState != animStates.jumping) 
				self.currentAnimState = animStates.walking;
		}
		if (self.pressingRight) {
			self.facingLeft = false;
			self.x+=self.maxSpeed;
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
			self.jumpForce -= 1;
			self.jumpCounter--;
			if (self.jumpForce <= 1 || !self.pressingSpace && self.jumpCounter > 50)
				self.currentAnimState = animStates.idle;
		} else {
			if (self.yVel < gravity && !self.grounded)
				self.yVel += gravity;
			if (self.yVel < 0 && self.grounded)
				self.yVel = 0;
		}
		
		self.y += self.yVel;
		
		/*
		if (self.x < 0) 
			self.x = 0;
			
		if (self.y < 0) 
			self.y = 0;
		
		if (self.y > WINDOW_H - 64) {
			self.y = WINDOW_H - 64;
			self.grounded = true;
		}
		
		if (self.x > WINDOW_W  - 64)
			self.x = WINDOW_W - 64;*/
		
		if (self.currentAnimState == animStates.walking && !self.facingLeft) 
			self.animPhase = (self.animPhase + 0.3) % 6;
		
		if (self.currentAnimState == animStates.walking && self.facingLeft) {
			self.animPhase += 0.3;
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
	
	self.checkCollisions = () => {
			
			let bbox = { x:self.x+16, y:self.y, width:32, height:64 };
			
			let relX = 0, relY = 0;
			
			self.grounded = false;

			for (let sy = 1; sy < MAP_H; sy++) {
				for (let sx = 0; sx < MAP_W; sx++) {
					if (tileCollider (sx, sy-1)) {
						relX = sx * TILE_SIZE + self.offsetX;
						relY = (sy) * TILE_SIZE + self.offsetY;
					
						if ((sy + 1) == Math.floor ((self.y + 64 - self.offsetY) / TILE_SIZE) + 1 && sx == Math.floor ((self.x + 16 - self.offsetX) / TILE_SIZE) && tileCollider (sx,sy - 1))
							self.grounded = true;
					
						if ((sy + 1) == Math.floor ((self.y + 64 - self.offsetY) / TILE_SIZE) + 1 && sx == Math.floor ((self.x + 48 - self.offsetX) / TILE_SIZE) && tileCollider (sx,sy - 1))
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
								if ((linesIntersect (topLeft, topRight, lastPointBL, newPointBL) || 
									linesIntersect (topLeft, topRight, lastPointBR, newPointBR)) && self.grounded) {
									self.y = (sy - 1) * TILE_SIZE - 32 + self.offsetY;
								} else if ( linesIntersect (topRight, bottomRight, lastPointTL, newPointTL) || 
										 	linesIntersect (topRight, bottomRight, lastPointBL, newPointBL) || 
											linesIntersect (topRight, bottomRight, lastPointML, newPointML)) {
									self.x = (sx + 1) * TILE_SIZE + self.offsetX - 16;
								} else if ( linesIntersect (topLeft, bottomLeft, lastPointTR, newPointTR) || 
										 	linesIntersect (topLeft, bottomLeft, lastPointBR, newPointBR) || 
											linesIntersect (topLeft, bottomLeft, lastPointMR, newPointMR)) {
									self.x = (sx) * TILE_SIZE + self.offsetX - 48;
								} else if ( linesIntersect (bottomLeft, bottomRight, lastPointTL, newPointTL) ||
											linesIntersect (bottomLeft, bottomRight, lastPointTR, newPointTR)) {
									self.y = (sy + 1) * TILE_SIZE + self.offsetY;
									if (self.currentAnimState == animStates.jumping)
										self.currentAnimState = animStates.idle;
									console.log ("top collision");
								}
								
						}
					}
				}
			}
	};
	
	return self;
};

io.on ('connection', (client)=> { 
	console.log (map);
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
	});
	
	client.on ('disconnect', () => { 
		console.log ("client [" + client.userid +"] disconnected."); 
		delete CLIENTS[client.userid];
		delete PLAYERS[client.userid];
		numClients--;
	});
});

server.on("error", (err)=>{console.log ("Server error: ", err);})
server.listen (process.env.PORT || 8080, ()=> {console.log ("Server started on Port 8080");});

setInterval (() => {
	let pack = [];
	for (let i in PLAYERS) {
		let player = PLAYERS[i];
		player.updatePosition ();
		player.checkCollisions ();
		pack.push ( { x:player.x, y:player.y, number:player.number, animPhase:player.animPhase, offsetY:player.offsetY } );
	}
	
	for (let e in CLIENTS) {
		let client = CLIENTS[e];
		client.emit ('position', pack);
	}
}, 1000/60);
