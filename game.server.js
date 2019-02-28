"use strict";

let MapController = require ("./public/map");
let Player = require ("./public/player");
let GameCore = require("./public/game.core");


let Server = function () {
	GameCore.prototype.constructor.call(this);
	this.players = [];
	this.clients = [];
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
			if (typeof this.players[client.userid] == 'undefined')
				return;
			
			//let delta = (event.time - this.players[client.userid].stateTime) / 1000;
			
			//if (typeof this.players[client.userid].inputs.keyPresses != 'undefined')
			this.players[client.userid].keyPresses = event.keyPresses;
			
			/*for (let i = 0; i < Math.floor(delta/this.physicsDelta); i++)
				this.players[client.userid].updatePosition(this.physicsDelta);*/
			
			this.players[client.userid].updatePosition(event.physicsDelta);
			
			this.players[client.userid].inputs = event;
			this.players[client.userid].stateTime = event.time;
			
		}.bind(binder));
		
		client.on('p', function(data) {
			client.emit ('p', data);
		});
	
		client.on('disconnect', function () { 
			console.log ("client[" + client.userid +"] disconnected."); 
			
			delete this.clients[client.userid];
			delete this.players[client.userid];
			
			for (let i in this.clients) {
				this.clients[i].emit ('onplayerleft', client.userid);
			}
				
			this.numClients--;
			this.freeIds.push (client.userid);
		}.bind(binder));
	}.bind(binder));

	server.on("error", (err)=>{console.log ("Server error: ", err);})
	server.listen (process.env.PORT || 8080, ()=> {console.log ("Server started on Port " + (process.env.PORT || 8080));});
};

Server.prototype.handleInputs = function(keys, time, seq, id) {
	//this.players[id].inputs.push({keyPresses:keys, time:time, seq:seq});
};

Server.prototype.mainUpdate = function(){
	GameCore.prototype.mainUpdate.apply(this);
	
	this.lastState = {players:this.players};
	
	
	let pack = [];
	for (let i in this.players) {
		if (typeof this.players[i] == 'undefined')
			continue;
		let player = this.players[i];
		pack.push ( { id: player.playerId, position:player.position, lastPosition:player.lastPosition, velocity: player.velocity, animPhase: player.animPhase, facingLeft: player.facingLeft, seq: player.inputs.seq} );
	}

	this.lastState = { players:pack, time:this.localTime };
	
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
		client.emit ('serverupdate', this.lastState);
		//client.emit ('bulletList', BULLETS);
	}
	
	
};

Server.prototype.updatePhysics = function() {
	GameCore.prototype.updatePhysics.apply(this);

	for (let i in this.players) {
		let player = this.players[i];
		
		/*while (player.inputs.length > 1) {
			player.handleInputs(a);
			player.updatePosition(this.physicsDelta);
		}
		
		player.updatePosition(this.physicsDelta);*/
		//player.inputs = [];
	}
};