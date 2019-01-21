let Client = function(context, w, h) {
	GameCore.prototype.constructor.call(this);
	
	this.id = 0;
		
		this.offsetX = 0;
		this.offsetY = 0;
		this.localPlayer = {};
		this.players = [];
		this.bullets = {};
		
		this.collisionBoxes = false;
		this.playerGhost = false;
		this.reconciliation = false;
		
		this.map = new MapController(w, h);
		this.canvas = canvas;
		this.context = canvas.getContext("2d");
		
		this.canvasWidth = w;
		this.canvasHeight = h;
		
		this.state = 'not-connected';
		this.gameCore = new GameCore ();
		this.socket = {};
		
		this.tileSet = [];
		this.numTilesInSet = [];
		this.tileSetsLoaded = 0;
		this.totalTiles = 0;
		
		this.playerImage = new Image ();
		this.playerImage.src = "hero.png";
		
		this.lastPingTime = new Date().getTime();
		this.netPing = 2;
		this.netLatency = 1;
		
		this.collisionButton = { x:10, y:10, w:150, h:20, text:"collision boxes OFF" };
		this.ghostButton = { x:170, y:10, w:150, h:20, text:"player ghost OFF" };
		this.serverRecButton = { x:330, y:10, w:150, h:20, text:"server rec OFF" };
		
		this.inputSeq = 0;
		
		this.messages = [];
		this.keyEvent = false;
		
		this.lastProcessedSequence = -1;
		
		this.keyPresses = { left:false, right:false, up:false, down:false, fire:false, jump:false };
		
		this.canvas.addEventListener('click', function(evt) {
		    let mousePos = this.getMousePos(evt);

		    if (this.isInside(mousePos,this.collisionButton)) {
				this.collisionBoxes = !this.collisionBoxes;
		        this.collisionButton.text = this.collisionBoxes ? "collision boxes ON" : "collision boxes OFF";
		    }
			
		    if (this.isInside(mousePos,this.ghostButton)) {
				this.playerGhost = !this.playerGhost;
		        this.ghostButton.text = this.playerGhost ? "player ghost ON" : "player ghost OFF";
		    }
			
		    if (this.isInside(mousePos,this.serverRecButton)) {
				this.reconciliation = !this.reconciliation;
		        this.serverRecButton.text = this.reconciliation ? "server rec ON" : "server rec OFF";
		    }
		}.bind(this));
		
		this.serverUpdates = [];
		this.unprocessedUpdates = [];
		
		document.onkeydown = function (event) { this.onKeyDown(event) }.bind(this);
		document.onkeyup = function (event) { this.onKeyUp(event) }.bind(this);
	};
	
	Client.prototype = new GameCore();
	Client.prototype.constructor = Client;
	
	Client.prototype.loadTileSet = function(filename, tileSetBuffer) {
		this.map.tileSet[this.map.tileSetsLoaded] = new Image ();
		this.map.tileSet[this.map.tileSetsLoaded].onload = function () {
			if (this.tileSet[this.tileSetsLoaded].naturalWidth % this.tileSize == 0 && this.tileSet[this.tileSetsLoaded].naturalWidth % this.tileSize == 0){
				console.log ("correct dimensions");
				this.numTilesInSet[this.tileSetsLoaded] = parseInt ((this.tileSet[this.tileSetsLoaded].naturalWidth / this.tileSize)) * parseInt ((this.tileSet[this.tileSetsLoaded].naturalHeight / this.tileSize));
				this.totalTiles += this.numTilesInSet[this.tileSetsLoaded];
				console.log ("tiles in set: " + this.numTilesInSet [this.tileSetsLoaded]);
				this.tileSetsLoaded ++;
			} else {
				console.log ("tileset has wrong dimensions!");
			}
		}.bind(this.map);
		
		this.map.tileSet[this.map.tileSetsLoaded].src = filename;
	};
	
	Client.prototype.resize = function(width, height) {
		this.canvasWidth = width;
		this.canvasHeight = height;
		this.map.resize (width, height);
	};
	
	Client.prototype.onDisconnected = function(data) {
		this.state = "not-connected";
	};
	
	Client.prototype.onServerUpdateReceived = function(data) {
		for (let i in this.players) {
			let player = data.players[this.players[i].playerId];
			
			this.players[i].position = player.position;
			this.players[i].velocity = player.velocity;
			this.players[i].animPhase = player.animPhase;
			this.players[i].facingLeft = player.facingLeft;
			
			if (player.id == this.id && this.reconciliation) {
				this.localPlayer.position = player.position;
				this.localPlayer.velocity = player.velocity;
				this.localPlayer.facingLeft = player.facingLeft;
				this.localPlayer.animPhase = player.animPhase;
				
				let j = 0;
				while (j < this.unprocessedUpdates.length) {
					let update = this.unprocessedUpdates[j];
					
					if (update.seq = player.seq) {
						this.unprocessedUpdates.splice(j, 1);
					} else {
						this.applyUpdate(j);
						j++;
					}
				}
			}
		}
	};
	
	Client.prototype.applyUpdate = function (j) {
		let delta = 0;
		let update = this.unprocessedUpdates[j];
		
		if (j+1 < this.unprocessedUpdates.length)
			delta = (this.unprocessedUpdates[j+1].time - update.time) / 1000;
		else
			delta = this.physicsDelta;
		
		this.localPlayer.keyPresses = update.keyPresses;
		this.localPlayer.updatePosition(delta);
	};
	
	Client.prototype.addMessage = function(msg) {
		this.messages.push ({msg:msg, time:new Date().getTime()});
	};
	
	Client.prototype.renderMessages = function() {
		this.context.textAlign = "left";
		this.context.font = "13px Arial";
		this.context.textBaseLine = "middle";
		this.context.fillText("ping: " + this.netPing + "ms", this.collisionButton.x, this.collisionButton.y + this.collisionButton.h + 15);
		
		for (let i in this.messages) {
			this.context.fillText(this.messages[i].msg, this.collisionButton.x, this.collisionButton.y + this.collisionButton.h + 30 + 15 * i);
			if (new Date().getTime() - this.messages[i].time > 5000)
				this.messages.splice(i, 1);
		}
	};
	
	Client.prototype.onConnected = function(data) {
		this.map.map = data.map;
		this.map.tileSize = data.tileSize;
		this.map.tileSetNames = data.tileSetNames;
		this.map.mapWidth = data.mapWidth;
		this.map.mapHeight = data.mapHeight;
		
		this.players = [];
		this.id = data.id;
		
		for (let i in data.players) {
			if (typeof data.players[i] == 'undefined')
				continue;
			else {
				let player = data.players[i];
				Object.setPrototypeOf(player, Player.prototype);
				player.map = this.map.map;
			
				if (player.playerId == data.id) {
					this.localPlayer = new Player(data.id);
					this.localPlayer.position = player.position;
					this.localPlayer.map = this.map;
					player.name = "[GHOST]";
				}
			
				this.players.push(player);
			}
		}
		
		let tileSetBuffer = new Image();
		
		for (let i = 0; i < this.map.tileSetNames.length; i++)
			this.loadTileSet(this.map.tileSetNames[i], tileSetBuffer);
		
		console.log("--initialization packet received--");
		console.log("your id: " + this.localPlayer.playerId);
		console.log("received map with size " + (this.map.map[0].length) + "x" + this.map.map[0][0].length);
		
		this.localTime = data.serverTime + this.netLatency;
		
		this.state = "connected";
		
		this.addMessage("you joined the room");
		this.addMessage((this.players.length) + " players online");
	};
	
	Client.prototype.onNetMessage = function(msg) {
		console.log (msg);
	};
	
	Client.prototype.onPing = function(data) {
		this.netPing = (new Date().getTime() - data);
		this.netLatency = this.netPing/2;
	};
	
	Client.prototype.onPlayerJoined = function(data) {
		this.players.push(data);
		this.addMessage ("player[" + data.playerId + "] joined the room.");
		console.log ("player[" + data.playerId + "] joined the room.");
	};
	
	Client.prototype.onPlayerLeft = function(id) {
		for (let i in this.players)
			if (this.players[i].playerId == id)
		 	   this.players.splice(i, 1);
		
		this.addMessage("player[" + id + "] has left the room.");
		console.log ("player[" + id + "] has left the room.");
	};
	
	Client.prototype.connectToServer = function() {
	        this.socket = io.connect();

	        this.socket.on('connect', function(){
	            this.state = 'connecting';
	        }.bind(this));

	        this.socket.on('disconnect', this.onDisconnected.bind(this));

	        this.socket.on('serverupdate', this.onServerUpdateReceived.bind(this));

	        this.socket.on('onconnected', this.onConnected.bind(this));

	        this.socket.on('error', this.onDisconnected.bind(this));

	        this.socket.on('message', this.onNetMessage.bind(this));
			
			this.socket.on('p', this.onPing.bind(this));
			
			this.socket.on('onplayerjoined', this.onPlayerJoined.bind(this));
			
			this.socket.on('onplayerleft', this.onPlayerLeft.bind(this));
			
			this.startPingTimer();

	};	
	
	Client.prototype.mainUpdate = function(delta) {
		GameCore.prototype.mainUpdate.apply(this);
		if (this.state == 'connected') {
			this.context.fillStyle = "black";
			this.context.fillRect (0,0,this.canvasWidth,this.canvasHeight);
			this.map.update(this.localPlayer.position);
			this.map.drawMap(this.context);
			this.render(this.context);
		}	
	};
	
	Client.prototype.updatePhysics = function() {
		GameCore.prototype.updatePhysics.apply(this);
		if (this.state == 'connected') {
			this.handleInputs();
			this.localPlayer.updatePosition(this.physicsDelta);
		}
	};
	
	Client.prototype.render = function() {
		for (let i in this.players) {
			if (this.players[i].playerId != this.id || this.playerGhost)
				this.drawPlayer(this.players[i]);
		}
		
		this.drawPlayer(this.localPlayer);
		
		this.drawButton(this.ghostButton);
		this.drawButton(this.collisionButton);
		this.drawButton(this.serverRecButton);
		
		if (this.collisionBoxes)
			this.drawDebugGUI();
		
		this.context.font = "14px Arial";
		this.context.textAlign = 'center';
		this.context.textBaseline = 'middle'
		this.context.fillText ("points: " + this.localPlayer.points, this.canvasWidth - 50, 15);
		
		this.renderMessages();
	};
	
	Client.prototype.drawPlayer = function(player) {
		if (typeof player == 'undefined') {
			console.log(player);
			return;
		}
		
		let bbox = { x:player.position.x+16, y:player.position.y, width:32, height:64 };
			
		this.context.strokeStyle = "red";
		this.context.fillStyle = "white";
		this.context.beginPath ();
		this.context.rect (player.position.x - this.map.offsetX, player.position.y - this.map.offsetY - 5, player.size.x, 5);
		this.context.fillRect (player.position.x - this.map.offsetX, player.position.y - this.map.offsetY - 5, player.size.x, 5);
		this.context.stroke ();
			
		this.context.fillStyle = "red";
		this.context.beginPath ();
		this.context.fillRect (player.position.x - this.map.offsetX, player.position.y - this.map.offsetY - 5, (player.health / 100) * player.size.x, 5);
		this.context.stroke ();
			
		const buffer = document.createElement('canvas');
		buffer.width = player.size.x;
		buffer.height = player.size.y;
		const bufferContext = buffer.getContext('2d');
			
		if (player.facingLeft) {
			bufferContext.scale (-1, 1);
			bufferContext.translate (-64, 0);
		}
		
		bufferContext.drawImage (this.playerImage, 64 * (Math.floor(player.animPhase) % 10), 64 * Math.floor (Math.floor(player.animPhase) / 10), player.size.x, player.size.y, 0, 0, player.size.x, player.size.y);
		this.context.drawImage (buffer, player.position.x - this.map.offsetX, player.position.y - this.map.offsetY, player.size.x, player.size.y);
		this.context.font = "18px Georgia";
		
		if (player.id == this.localPlayer.id) {
			this.context.textAlign = "center";
			this.context.fillStyle = "blue";	
		} else {
			this.context.textAlign = "center";
			this.context.fillStyle = "red";
		}
		
		this.context.fillText (player.name, player.position.x - this.map.offsetX + 32, player.position.y - this.map.offsetY - 15);
	};
	
	Client.prototype.drawDebugGUI = function() {
		for (let i in this.localPlayer.collisionBlocksX) {
			let block1 = this.localPlayer.collisionBlocksX[i];
		
			if (block1.type == 55)
				this.context.strokeStyle = "red";
			else
				this.context.strokeStyle = "blue";
			this.context.beginPath ();
			this.context.rect (block1.left - this.map.offsetX, block1.top - this.map.offsetY, 32, 32);
			this.context.stroke ();
		}
	
		for (let a in this.localPlayer.collisionBlocksY) {
			let block2 = this.localPlayer.collisionBlocksY[a];
		
			if (block2.type == 55)
				this.context.strokeStyle = "red";
			else
				this.context.strokeStyle = "blue";
			this.context.beginPath ();
			this.context.rect (block2.left - this.map.offsetX, block2.top - this.map.offsetY, 32, 32);
			this.context.stroke ();
		}
	};
		
		//Function to get the mouse position
		Client.prototype.getMousePos = function(event) {
		    let rect = this.canvas.getBoundingClientRect();

		    return {
		        x: event.clientX - rect.left,
		        y: event.clientY - rect.top
		    };
		};
		
		//Function to check whether a point is inside a rectangle
		Client.prototype.isInside = function(pos, rect){
		    return pos.x > rect.x && pos.x < rect.x+rect.w && pos.y < rect.y+rect.h && pos.y > rect.y
		};
		
		Client.prototype.startPingTimer = function() {
			setInterval(function() {
				this.lastPingTime = new Date().getTime();
				this.socket.emit('p', this.lastPingTime);
			}.bind(this), 1000);
		};
	
	
	Client.prototype.drawButton = function(button) {
	    this.context.beginPath();
	    this.context.rect(button.x, button.y, button.w, button.h);
	    this.context.fillStyle = 'gray'; 
	    this.context.fillRect(button.x, button.y, button.w, button.h);
	    this.context.fill(); 
	    this.context.lineWidth = 2;
	    this.context.strokeStyle = 'white'; 
	    this.context.stroke();
	    this.context.closePath();
	    this.context.fillStyle = 'white';
		this.context.font = "11px Arial";
		this.context.textAlign = 'center';
		this.context.textBaseline = 'middle';
	    this.context.fillText(button.text, button.x + button.w/2, button.y + button.h/2);
	  };
	  
	Client.prototype.handleInputs = function() {
		//if (this.keyEvent == false)
		//	return;
		
  		this.inputSeq += 1;
		this.localPlayer.keyPresses = this.keyPresses;
  		//this.localPlayer.inputs.push ({keyPresses:this.keyPresses, time:this.localTime.fixed(3), seq:this.inputSeq});
		this.unprocessedUpdates.push ({ keyPresses:this.keyPresses, time:new Date().getTime(), seq:this.inputSeq });
			
		this.socket.emit ("keyPress", { keyPresses:this.keyPresses, time:new Date().getTime(), seq:this.inputSeq });
		this.keyEvent = false;
	};
	  
	  Client.prototype.onKeyDown = function (event) {
		  this.keyEvent = true;
  		if (event.keyCode === 68 || event.keyCode == 39) {// d
			this.keyPresses.right = true;
			
  			//this.socket.emit ("keyPress", { inputId :'right', state : true });
  		}
  		if (event.keyCode === 83){ // s
			this.keyPresses.down = true;
  			//this.socket.emit ("keyPress", { inputId :'down', state : true });
  		}
  		if (event.keyCode === 65 || event.keyCode == 37) {// a
			this.keyPresses.left = true;
  			//this.socket.emit ("keyPress", { inputId :'left', state : true });
  		}
  		if (event.keyCode === 87 || event.keyCode == 38) { // w
			this.keyPresses.up = true;
  			//this.socket.emit ("keyPress", { inputId : 'up', state : true });
  		}
  		if (event.keyCode == 32) {
			this.keyPresses.jump = true;
  			//this.socket.emit ("keyPress", { inputId : 'jump', state : true });
  		}
		
  		if (event.keyCode == 18) {
			this.keyPresses.fire = true;
  			//this.socket.emit ("keyPress", { inputId : 'fire', state : true });
		}
	  };
	  
  	Client.prototype.onKeyUp = function (event) {
		this.keyEvent = true;
  		if (event.keyCode === 68 || event.keyCode == 39) // d
			this.keyPresses.right = false;
  			//this.socket.emit ("keyPress", { inputId :'right', state : false, time:Date.now () });
  		if (event.keyCode === 83) // s
			this.keyPresses.down = false;
  			//this.socket.emit ("keyPress", { inputId :'down', state : false, time:Date.now () });
  		if (event.keyCode === 65 || event.keyCode == 37) // a
			this.keyPresses.left = false;
  			//this.socket.emit ("keyPress", { inputId :'left', state : false, time:Date.now ()  });
  		if (event.keyCode === 87) // w
			this.keyPresses.up = false;
  			//this.socket.emit ("keyPress", { inputId : 'up', state : false, time:Date.now ()  });
  		if (event.keyCode == 32 || event.keyCode == 38) 
			this.keyPresses.jump = false;
  			//this.socket.emit ("keyPress", { inputId : 'jump', state : false, time:Date.now ()  });
  		if (event.keyCode == 18) 
			this.keyPresses.fire = false;
  			//this.socket.emit ("keyPress", { inputId : 'fire', state : false, time:Date.now ()  });
  	};
	