	var canvas = document.getElementById ("canvas").getContext ("2d");
	canvas.font = '30px Arial';
	//let io = require ('socket.io');
	let sock = io ();
	
	var playerImage = new Image ();
	playerImage.src = "hero.png";
	
	var animPhase = 0;
	var animStates = { "idle":1, "walking":2, "jumping":3 };
	Object.freeze (animStates);
	var currentAnimState = animStates.idle;
	
	var facingLeft = false;
	
	var mapWidth = 0;
	var mapHeight = 0;
	
	var TILE_SIZE = 0;
	let tileSet = [];
	var tileSetsLoaded = 0;
	var numTilesInSet = {};
	
	var offsetX = 0, offsetY = 0;
	var map = {};
	
	var WINDOW_WIDTH = 800;
	var WINDOW_HEIGHT = 600;
	
	var totalTiles = 0;
	
	let debugMode = false;
	
	let id = 0;
	
	document.getElementById ("debugMode").onclick = function () {
		debugMode = !debugMode;
		if (debugMode)
			document.getElementById ("debugMode").innerHTML = "Debug ON";
		else
			document.getElementById ("debugMode").innerHTML = "Debug OFF";
	};

	function loadTileSet (filename) {
			tileSet[tileSetsLoaded] = new Image ();
			tileSet[tileSetsLoaded].onload = function () {
				if (tileSet[tileSetsLoaded].naturalWidth % TILE_SIZE == 0 && tileSet[tileSetsLoaded].naturalWidth % TILE_SIZE == 0){
					console.log ("correct dimensions");
					numTilesInSet[tileSetsLoaded] = parseInt ((tileSet[tileSetsLoaded].naturalWidth / TILE_SIZE)) * parseInt ((tileSet[tileSetsLoaded].naturalHeight / TILE_SIZE));
					totalTiles += numTilesInSet[tileSetsLoaded];
					console.log ("tiles in set: " + numTilesInSet [tileSetsLoaded]);
					tileSetsLoaded ++;
				} else {
					console.log ("tileset has wrong dimensions!");
				}
			};
			tileSet[tileSetsLoaded].src = filename;
	}
	
	function drawTile (tileIndex, x, y, useOffset) {
		if (tileSetsLoaded == 0)
			return;
		if (tileIndex == 0 || tileIndex > totalTiles)
			return;
		
		var tileSetId = 0, tileInSet = 0;
		for (var i = 1; i <= tileIndex; i ++) {
			if (tileInSet > numTilesInSet[tileSetId] - 1) {
				tileSetId++;
				tileInSet = 1;
			} else
				tileInSet++;
		}

		var tilesX = parseInt(tileSet[tileSetId].naturalWidth / TILE_SIZE);
		var inX = tileInSet % tilesX;
		var inY = parseInt(tileInSet / tilesX);
		inY++;
		
		if (inX == 0) {
			inX = tilesX;
			inY --;
		}
		
		// sx sy swidth sheight x y width height
		
		if (useOffset)
			canvas.drawImage (tileSet[tileSetId], TILE_SIZE * (inX - 1), TILE_SIZE * (inY - 1), TILE_SIZE, TILE_SIZE, x - offsetX, y - offsetY, TILE_SIZE, TILE_SIZE);
		else
			canvas.drawImage (tileSet[tileSetId], TILE_SIZE * (inX - 1), TILE_SIZE * (inY - 1), TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
	}
	sock.on ('dimensions', function (dim) {
		document.getElementById ('canvas').width = dim.width;
		document.getElementById ('canvas').height = dim.height;
		
		WINDOW_WIDTH = dim.width;
		WINDOW_HEIGHT = dim.height;
	});
	
	function drawMap () {
		for (var l = 1; l < 5; l++) {
			for (var y = 1; y < parseInt (mapWidth); y ++){
				for (var x = 0; x < parseInt (mapHeight); x++) {
					if (map[y][x][l] != 0 && x * TILE_SIZE - offsetX < WINDOW_WIDTH && y * TILE_SIZE - offsetY < WINDOW_HEIGHT) {
						drawTile (map[y][x][l], x * TILE_SIZE, y * TILE_SIZE, true);
					}
				}
			}
		}
	}
	
	sock.on ('id', function (_id) {
		id = _id;
		console.log ("your id is: " + id);
	});
	
	sock.on ('map', function (data) {

		map = data.map;
		console.log ("received map with size " + (data.map.length - 1) + "x" + data.map[1].length);
		mapWidth = data.mapWidth;
		mapHeight = data.mapHeight;
		TILE_SIZE = data.tileSize;
		
		for (let i = 0; i < data.tileSets.length; i++)
			loadTileSet (data.tileSets[i]);
		
		for (let i = 0; i < tileSet.length; i++)
			console.log ("tileset: " + tileSet[i]);
			
		offsetX = 0;
		
		/*
		if (mapHeight * TILE_SIZE > WINDOW_HEIGHT)
			offsetY = ((mapHeight - 1) * TILE_SIZE - WINDOW_HEIGHT) * -1;
		else
			offsetY = 0;*/
	});
	
	sock.on ('position', function (data) {
		canvas.clearRect (0,0,WINDOW_WIDTH,WINDOW_HEIGHT);
		
		drawMap ();
		
		for (var i = 0; i < data.length; i++) {
			let bbox = { x:data[i].x+16, y:data[i].y, width:32, height:64 };
			
			if (data[i].id == id) {
				offsetX = data[i].x - (WINDOW_WIDTH / 2 - 32);
				offsetY = data[i].y - (WINDOW_HEIGHT / 2 - 32);
				
				canvas.drawImage (playerImage, 64 * (Math.floor(data[i].animPhase) % 10), 64 * Math.floor (Math.floor(data[i].animPhase) / 10), 64, 64, WINDOW_WIDTH / 2 - 32, WINDOW_HEIGHT / 2 - 32, 64, 64);
			} else
				canvas.drawImage (playerImage, 64 * (Math.floor(data[i].animPhase) % 10), 64 * Math.floor (Math.floor(data[i].animPhase) / 10), 64, 64, data[i].x - offsetX, data[i].y - offsetY, 64, 64);
			
			
			
			canvas.strokeStyle = "red";
			
			if (debugMode == true) {
				canvas.beginPath ();
				canvas.rect (bbox.x, bbox.y, bbox.width, bbox.height);
				canvas.rect(Math.floor((self.x + 16 - data[i].offsetX) / TILE_SIZE) * TILE_SIZE, Math.floor((self.y + 64 - data[i].offsetY) / TILE_SIZE) * TILE_SIZE, 32, 32);
				canvas.stroke ();
			}
		}
	});
	
	document.onkeydown = function (event) {
		if (event.keyCode === 68 || event.keyCode == 39) {// d
			sock.emit ("keyPress", { inputId :'right', state : true });
			facingLeft = false;
		}
		if (event.keyCode === 83){ // s
			sock.emit ("keyPress", { inputId :'down', state : true });
		}
		if (event.keyCode === 65 || event.keyCode == 37) {// a
			sock.emit ("keyPress", { inputId :'left', state : true });
			facingLeft = true;
		}
		if (event.keyCode === 87) { // w
			sock.emit ("keyPress", { inputId : 'up', state : true });
		}
		if (event.keyCode == 32 || event.keyCode == 38) {
			sock.emit ("keyPress", { inputId : 'space', state : true });
		}
	};
	
	document.onkeyup = function (event) {
		if (event.keyCode === 68 || event.keyCode == 39) // d
			sock.emit ("keyPress", { inputId :'right', state : false });
		if (event.keyCode === 83) // s
			sock.emit ("keyPress", { inputId :'down', state : false });
		if (event.keyCode === 65 || event.keyCode == 37) // a
			sock.emit ("keyPress", { inputId :'left', state : false });
		if (event.keyCode === 87) // w
			sock.emit ("keyPress", { inputId : 'up', state : false });
		if (event.keyCode == 32 || event.keyCode == 38) {
			sock.emit ("keyPress", { inputId : 'space', state : false });
		}
	};