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
	
	var WINDOW_WIDTH = 800;
	var WINDOW_HEIGHT = 600;
	
	var totalTiles = 0;
	
	let debugMode = false;
	
	let id = 0;
	
	let targetFPS = 60;
	let now, dt,last = timestamp();
	let step = 1/targetFPS;
	
	let PLAYERS = {};
	
	let velX = 0;
	let velY = 0;
	
	let localPlayer = {};
	let BULLETS = [];
	let snapshots = [];
	
	function timestamp() {
	  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
	}
	
	document.getElementById ("debugMode").onclick = function () {
		debugMode = !debugMode;
		if (debugMode)
			document.getElementById ("debugMode").innerHTML = "Debug ON";
		else
			document.getElementById ("debugMode").innerHTML = "Debug OFF";
	};
	
	let mainMap = new Map ();
	
	function loadTileSet (filename) {
			tileSet[tileSetsLoaded] = new Image ();
			tileSet[tileSetsLoaded].onload = function () {
				if (tileSet[tileSetsLoaded].naturalWidth % mainMap.tileSize == 0 && tileSet[tileSetsLoaded].naturalWidth % mainMap.tileSize == 0){
					console.log ("correct dimensions");
					numTilesInSet[tileSetsLoaded] = parseInt ((tileSet[tileSetsLoaded].naturalWidth / mainMap.tileSize)) * parseInt ((tileSet[tileSetsLoaded].naturalHeight / mainMap.tileSize));
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

		var tilesX = parseInt(tileSet[tileSetId].naturalWidth / mainMap.tileSize);
		var inX = tileInSet % tilesX;
		var inY = parseInt(tileInSet / tilesX);
		inY++;
		
		if (inX == 0) {
			inX = tilesX;
			inY --;
		}
		
		// sx sy swidth sheight x y width height
		
		if (useOffset)
			canvas.drawImage (tileSet[tileSetId], mainMap.tileSize * (inX - 1), mainMap.tileSize * (inY - 1), mainMap.tileSize, mainMap.tileSize, x - offsetX, y - offsetY, mainMap.tileSize, mainMap.tileSize);
		else
			canvas.drawImage (tileSet[tileSetId], mainMap.tileSize * (inX - 1), mainMap.tileSize * (inY - 1), mainMap.tileSize, mainMap.tileSize, x, y, mainMap.tileSize, mainMap.tileSize);
	}
	sock.on ('dimensions', function (dim) {
		document.getElementById ('canvas').width = dim.width;
		document.getElementById ('canvas').height = dim.height;
		
		WINDOW_WIDTH = dim.width;
		WINDOW_HEIGHT = dim.height;
	});
	
	function drawMap () {
		for (var l = 1; l < 5; l++) {
			for (var y = 0; y < mainMap.mapWidth; y ++){
				for (var x = 0; x < mainMap.mapHeight; x++) {
					if (mainMap.map[l][x][y] != 0 && x * mainMap.tileSize - offsetX < WINDOW_WIDTH && y * mainMap.tileSize - offsetY < WINDOW_HEIGHT) {
						drawTile (mainMap.map[l][x][y], x * mainMap.tileSize, y * mainMap.tileSize, true);
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

		mainMap = data
		console.log ("received map with size " + (mainMap.map[0].length) + "x" + mainMap.map[0][0].length);
		
		for (let i = 0; i < mainMap.tileSets.length; i++)
			loadTileSet (mainMap.tileSets[i]);
			
		offsetX = 0;
	});
	
	sock.on ('update', function (data) {
		PLAYERS = data;
		for (var i = 0; i < data.length; i++) 
			if (data[i].id == id)
				localPlayer = data[i];
	});
	
	sock.on ('bulletList', function (bullets) {
		BULLETS = bullets;
	});
	
	document.onkeydown = function (event) {
		if (event.keyCode === 68 || event.keyCode == 39) {// d
			sock.emit ("keyPress", { inputId :'right', state : true });
			facingLeft = false;
			velX = 340;
		}
		if (event.keyCode === 83){ // s
			sock.emit ("keyPress", { inputId :'down', state : true });
		}
		if (event.keyCode === 65 || event.keyCode == 37) {// a
			sock.emit ("keyPress", { inputId :'left', state : true });
			facingLeft = true;
			velX = -340;
		}
		if (event.keyCode === 87) { // w
			sock.emit ("keyPress", { inputId : 'up', state : true });
		}
		if (event.keyCode == 32 || event.keyCode == 38) {
			sock.emit ("keyPress", { inputId : 'space', state : true });
		}
		
		if (event.keyCode == 18) 
			sock.emit ("keyPress", { inputId : 'fire', state : true });
	};
	
	document.onkeyup = function (event) {
		if (event.keyCode === 68 || event.keyCode == 39) // d
			sock.emit ("keyPress", { inputId :'right', state : false, time:Date.now () });
		if (event.keyCode === 83) // s
			sock.emit ("keyPress", { inputId :'down', state : false, time:Date.now () });
		if (event.keyCode === 65 || event.keyCode == 37) // a
			sock.emit ("keyPress", { inputId :'left', state : false, time:Date.now ()  });
		if (event.keyCode === 87) // w
			sock.emit ("keyPress", { inputId : 'up', state : false, time:Date.now ()  });
		if (event.keyCode == 32 || event.keyCode == 38) 
			sock.emit ("keyPress", { inputId : 'space', state : false, time:Date.now ()  });
		if (event.keyCode == 18) 
			sock.emit ("keyPress", { inputId : 'fire', state : false, time:Date.now ()  });
	};
	
	
	function clientLoop () {
		if (localPlayer != null) {
			now = timestamp ();
			dt = (now - last) / 1000;
		
			while (dt > step) {
				dt = dt - step;
				update (step);
			}
		
			render (dt);
		}
		requestAnimationFrame (clientLoop);
	}
	
	let update = function (delta) {
		//localPlayer.x += Math.floor (velX * delta);
		//localPlayer.y += Math.floor (velY * delta);
		
		//checkCollisions ();
		
		if (localPlayer.y < mainMap.mapHeight * mainMap.tileSize) {
			offsetX = localPlayer.x - (WINDOW_WIDTH / 2 - 32);
			offsetY = localPlayer.y - (WINDOW_HEIGHT / 2 - 32);
		}
		
		velX = 0;
		velY = 0;
	};
	
	let render = function (delta) {
		canvas.clearRect (0,0,WINDOW_WIDTH,WINDOW_HEIGHT);
		drawMap ();
		canvas.font = "18px Georgia";
		for (var i = 0; i < PLAYERS.length; i++) {
			let bbox = { x:PLAYERS[i].x+16, y:PLAYERS[i].y, width:32, height:64 };
			
			canvas.strokeStyle = "red";
			canvas.fillStyle = "white";
			canvas.beginPath ();
			canvas.rect (PLAYERS[i].x - offsetX, PLAYERS[i].y - offsetY - 5, 64, 5);
			canvas.fillRect (PLAYERS[i].x - offsetX, PLAYERS[i].y - offsetY - 5, 64, 5);
			canvas.stroke ();
			
			canvas.fillStyle = "red";
			canvas.beginPath ();
			canvas.fillRect (PLAYERS[i].x - offsetX, PLAYERS[i].y - offsetY - 5, (PLAYERS[i].health / 100) * 64, 5);
			canvas.stroke ();
			
			const buffer = document.createElement('canvas');
			buffer.width = 64;
			buffer.height = 64;
			const context = buffer.getContext('2d');
			
			if (PLAYERS[i].facingLeft) {
				context.scale (-1, 1);
				context.translate (-64, 0);
			}
			context.drawImage (playerImage, 64 * (Math.floor(PLAYERS[i].animPhase) % 10), 64 * Math.floor (Math.floor(PLAYERS[i].animPhase) / 10), 64, 64, 0, 0, 64, 64);
			canvas.drawImage (buffer, PLAYERS[i].x - offsetX, PLAYERS[i].y - offsetY, 64, 64);
			
			if (PLAYERS[i].id == id) {
				canvas.textAlign = "center";
				canvas.fillStyle = "blue";
				canvas.fillText ("client[" +PLAYERS[i].id + "]", localPlayer.x - offsetX + 32, localPlayer.y - offsetY - 10);
				
				canvas.fillText ("points: " + localPlayer.points, WINDOW_WIDTH - 50, 15);
				canvas.fillText ("points: " + localPlayer.points, WINDOW_WIDTH - 50, 15);
			} else {
				canvas.textAlign = "center";
				canvas.fillStyle = "red";
				canvas.fillText ("client[" +PLAYERS[i].id + "] ", PLAYERS[i].x  - offsetX + 32, PLAYERS[i].y - offsetY - 12);
			}
		}
		
		for (let i = 0; i < BULLETS.length; i++) {
			canvas.strokeStyle = "black";
			canvas.fillStyle = "black";
			canvas.beginPath ();
			canvas.fillRect (BULLETS[i].x - offsetX, BULLETS[i].y - offsetY, BULLETS[i].width, BULLETS[i].height);
			canvas.stroke ();
		}
		
		if (debugMode) {
			for (let i in localPlayer.collisionBlocksX) {
				let block1 = localPlayer.collisionBlocksX[i];
				
				if (block1.type == 55)
					canvas.strokeStyle = "red";
				else
					canvas.strokeStyle = "blue";
				canvas.beginPath ();
				canvas.rect (block1.left - offsetX, block1.top - offsetY, 32, 32);
				canvas.stroke ();
			}
			
			for (let a in localPlayer.collisionBlocksY) {
				let block2 = localPlayer.collisionBlocksY[a];
				
				if (block2.type == 55)
					canvas.strokeStyle = "red";
				else
					canvas.strokeStyle = "blue";
				canvas.beginPath ();
				canvas.rect (block2.left - offsetX, block2.top - offsetY, 32, 32);
				canvas.stroke ();
			}
		}
	};
	
	requestAnimationFrame (clientLoop);
	clientLoop ();
	
	function recolorEnemy(colorshift) {

	    var imgData = ctx.getImageData(150, 0, canvas.width, canvas.height);
	    var data = imgData.data;

	    for (var i = 0; i < data.length; i += 4) {
	        red = data[i + 0];
	        green = data[i + 1];
	        blue = data[i + 2];
	        alpha = data[i + 3];

	        // skip transparent/semiTransparent pixels
	        if (alpha < 200) {
	            continue;
	        }

	        var hsl = rgbToHsl(red, green, blue);
	        var hue = hsl.h * 360;

	        // change blueish pixels to the new color
	        if (hue > 200 && hue < 300) {
	            var newRgb = hslToRgb(hsl.h + colorshift, hsl.s, hsl.l);
	            data[i + 0] = newRgb.r;
	            data[i + 1] = newRgb.g;
	            data[i + 2] = newRgb.b;
	            data[i + 3] = 255;
	        }
	    }
	    ctx.putImageData(imgData, 150, 0);
	}


	function rgbToHsl(r, g, b) {
	    r /= 255, g /= 255, b /= 255;
	    var max = Math.max(r, g, b),
	        min = Math.min(r, g, b);
	    var h, s, l = (max + min) / 2;

	    if (max == min) {
	        h = s = 0; // achromatic
	    } else {
	        var d = max - min;
	        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	        switch (max) {
	            case r:
	                h = (g - b) / d + (g < b ? 6 : 0);
	                break;
	            case g:
	                h = (b - r) / d + 2;
	                break;
	            case b:
	                h = (r - g) / d + 4;
	                break;
	        }
	        h /= 6;
	    }

	    return ({
	        h: h,
	        s: s,
	        l: l,
	    });
	}


	function hslToRgb(h, s, l) {
	    var r, g, b;

	    if (s == 0) {
	        r = g = b = l; // achromatic
	    } else {
	        function hue2rgb(p, q, t) {
	            if (t < 0) t += 1;
	            if (t > 1) t -= 1;
	            if (t < 1 / 6) return p + (q - p) * 6 * t;
	            if (t < 1 / 2) return q;
	            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	            return p;
	        }

	        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	        var p = 2 * l - q;
	        r = hue2rgb(p, q, h + 1 / 3);
	        g = hue2rgb(p, q, h);
	        b = hue2rgb(p, q, h - 1 / 3);
	    }

	    return ({
	        r: Math.round(r * 255),
	        g: Math.round(g * 255),
	        b: Math.round(b * 255),
	    });
	}