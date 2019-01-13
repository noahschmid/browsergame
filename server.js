"use strict";

const http = require ('http');
const express = require ('express');
const socketio = require ('socket.io');
const UUID = require('node-uuid');
const app = express ();
app.use (express.static ('public'));

app.get ('/', (req, res) => {
	res.sendFile (clientPath + '/index.html');
});

const server = http.createServer (app);
const io = socketio(server);

let numClients = 0;

let CLIENTS = {};
let PLAYERS = {};

const WINDOW_W = 800;
const WINDOW_H = 600;

let gravity = 500;
let maxJumpForce = 650;
let jumpLength = 6;
let canJump = true;
let maxSpeed = 340;
let bulletSpeed = 600;

let map = new Array (5);

let startPos = { x:0, y:0 };

let targetFPS = 60;
let tickLength = 1000/targetFPS;
let previousTick = Date.now ();
let actualTicks = 0;

let freeIds = new Array ();

let BULLETS = [];

let snapshots = [];

let playerEvents = [];

let Map = require ("./public/Map");

let mainMap = new Map ();

if (mainMap.loadFile("file://" + __dirname + "/map.txt") == -1)
	console.log ("error loading map!");

let Player = require ("./player.js");

let Bullet = function (x, y, direction, playerId) {
	let self = {
		x:x,
		y:y,
		width:32,
		height:10,
		direction:direction,
		ownerId:playerId
	};
	
	self.isColliding = () => {
		for (let i in PLAYERS) {
			if (PLAYERS[i].x + 48 > self.x && PLAYERS[i].x + 16 < self.x + self.width &&
				PLAYERS[i].y + 64 > self.y && PLAYERS[i].y < self.y + self.height && PLAYERS[i].id != self.ownerId) {
					PLAYERS[i].health -= 20;
					if (PLAYERS[i].health <= 0)
						PLAYERS[self.ownerId].points++;
					return true;
				}
		}
		
		if (self.x > mainMap.mapWidth * mainMap.tileSize || self.x < 0 || self.y > mainMap.mapHeight * mainMap.tileSize || self.y < 0)
			return true;
		
		return false;
	};
	
	self.update = (delta) => {
		if (direction=="left") {
			self.x -= bulletSpeed * delta;
		} else {
			self.x += bulletSpeed * delta;
		}
	};
	
	return self;
};



io.on ('connection', (client) => { 

	if (freeIds.length == 0)
		client.userid = numClients;
	else {
		let pos = freeIds.indexOf (Math.min.apply (Math, freeIds));
		client.userid = freeIds[pos];
		freeIds.splice (pos, 1);
	}
	
	console.log ('client[' + client.userid + '] connected.');
	CLIENTS[client.userid] = client;
	
	let player = new Player (client.userid, mainMap);
	PLAYERS[client.userid] = player;
	numClients++;
	client.emit ('message', 'connected to master server.'); 
	client.emit ('id', client.userid); 
	client.emit ('dimensions', { width:WINDOW_W, height:WINDOW_H }); 
	
	client.emit ('map', mainMap);
	
	client.on ("keyPress", (event) => {
		playerEvents.push (event);
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
		if (event.inputId == 'fire') {
			PLAYERS[client.userid].pressingAttack = event.state;
			if (event.state)
				PLAYERS[client.userid].respawn(mainMap.getStartPosition(0));
		}
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
server.listen (process.env.PORT || 8080, ()=> {console.log ("Server started on Port " + (process.env.PORT || 8080));});

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
		/*player.checkCollisions ();
		player.processAttacks ();
		player.manageHealth ();*/
		pack.push ( { id:player.playerId, x:player.position.x, y:player.position.y, animPhase:player.animPhase, 
		collisionBlocksX:player.collisionBlocksX, collisionBlocksY:player.collisionBlocksY, facingLeft:player.facingLeft, health:player.health, points:0 } );
	}
	
	for (let b in BULLETS) {
		let bullet = BULLETS[b];
		bullet.update (delta);
		
		if (bullet.isColliding ()) {
			console.log ("bullet collision");
			BULLETS.splice (BULLETS.indexOf(bullet), 1);
		}
	}
	
	for (let e in CLIENTS) {
		let client = CLIENTS[e];
		client.emit ('update', pack);
		//client.emit ('bulletList', BULLETS);
	}
	
	snapshots.push (pack);
	if (snapshots.length > 60) {
		snapshots.splice (0, 1);
	}
};

serverLoop ();