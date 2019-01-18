"use strict";

let MapController = require ("./public/map");
let Player = require ("./public/player");
let GameCore = require("./public/game.core");

let Server = function () {
	GameCore.prototype.constructor.call(this);
	this.players = {};
	this.clients = {};
	this.lastState = {};
	
	this.freeIds = [];
	this.numClients = 0;
	
	this.map = new MapController();
	
	this.inputList = [];
};

Server.prototype = new GameCore();
Server.prototype.constructor = Server;

if( 'undefined' != typeof global ) {
    module.exports = global.Server = Server;
}

Server.prototype.startup = function() {
	
	if (this.map.loadFile("file://" + __dirname + "/map.txt", this.startListening, this) == -1)
		console.log ("error loading map!");
};

Server.prototype.startListening = function(binder) {
	const http = require ('http');
	const express = require ('express');
	const socketio = require ('socket.io');
	const app = express ();
	
	app.use (express.static ('public'));

	app.get ('/', (req, res) => {
		res.sendFile (clientPath + '/index.html');
	});
	
	const server = http.createServer (app);
	const io = socketio(server);
	
	console.log("server started.");
	
	io.on ('connection', function (client) { 

		if (this.freeIds.length == 0)
			client.userid = this.numClients;
		else {
			let pos = this.freeIds.indexOf (Math.min.apply (Math, this.freeIds));
			client.userid = this.freeIds[pos];
			this.freeIds.splice (pos, 1);
		}
	
		console.log ('client[' + client.userid + '] connected.');
		this.clients[client.userid] = client;
	
		let player = new Player (client.userid, this.map);
		this.players[client.userid] = player;
		this.numClients++;
		client.emit ('message', 'connected to master server.'); 
		client.emit ('onconnected', { id:client.userid, map:this.map.map, tileSetNames:this.map.tileSetNames, tileSize:this.map.tileSize, mapWidth:this.map.mapWidth, mapHeight:this.map.mapHeight, players:this.players, serverTime:this.localTime } ); 
		
		for (let i in this.clients) {
			if (this.clients[i].userid != client.userid)
				this.clients[i].emit ('onplayerjoined', player);
		}
		
		client.on("keyPress", function(event) {
			this.inputList.push ({ id:client.userid, input:event.inputId, state:event.state, time:inputTime, sec:inputSec });
			if (event.inputId == 'right') 
				this.players[client.userid].pressingRight = event.state;
			if (event.inputId == 'left')
				this.players[client.userid].pressingLeft = event.state;
			if (event.inputId == 'up')
				this.players[client.userid].pressingUp = event.state;
			if (event.inputId =='down')
				this.players[client.userid].pressingDown = event.state;
			if (event.inputId == 'space') {
				this.players[client.userid].pressingSpace = event.state;
				if (!event.state) {
					this.players[client.userid].canJump = true;
				}
			}
			if (event.inputId == 'fire') {
				this.players[client.userid].pressingAttack = event.state;
				if (event.state)
					this.players[client.userid].respawn(mainMap.getStartPosition(0));
			}
		}.bind(binder));
		
		client.on('ping', function(data) {
			client.emit ('ping', { time:data.time });
		});
	
		client.on('disconnect', function () { 
			console.log ("client[" + client.userid +"] disconnected."); 
			for (let i in this.clients) {
				if (this.clients[i].userid != client.userid)
					this.clients[i].emit ('onplayerleft', client.userid);
			}
				
			delete this.clients[client.userid];
			delete this.players[client.userid];
			
			this.numClients--;
			this.freeIds.push (client.userid);
		}.bind(binder));
	}.bind(binder));

	server.on("error", (err)=>{console.log ("Server error: ", err);})
	server.listen (process.env.PORT || 8080, ()=> {console.log ("Server started on Port " + (process.env.PORT || 8080));});
};

Server.prototype.handleInput = function() {
	
};

Server.prototype.mainUpdate = function(){
	GameCore.prototype.mainUpdate.apply(this);
	
	let pack = [];
	for (let i in this.players) {
		let player = this.players[i];
		pack.push ( { id:player.playerId, x:player.position.x, y:player.position.y, animPhase:player.animPhase, 
		collisionBlocksX:player.collisionBlocksX, collisionBlocksY:player.collisionBlocksY, facingLeft:player.facingLeft, health:player.health, points:0 } );
	}
	
	/*for (let b in BULLETS) {
		let bullet = BULLETS[b];
		bullet.update (delta);
		
		if (bullet.isColliding ()) {
			console.log ("bullet collision");
			BULLETS.splice (BULLETS.indexOf(bullet), 1);
		}
	}*/
	
	for (let e in this.clients) {
		let client = this.clients[e];
		client.emit ('serverupdate', pack);
		//client.emit ('bulletList', BULLETS);
	}
};

Server.prototype.updatePhysics = function() {
	GameCore.prototype.updatePhysics.apply(this);
	
	for (let i in this.players) {
		let player = this.players[i];
		player.updatePosition (this.deltaTime);
	}
};