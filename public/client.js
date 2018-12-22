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
	
	let targetFPS = 60;
	let now, dt,last = timestamp();
	let step = 1/targetFPS;
	
	let PLAYERS = {};
	
	let velX = 0;
	let velY = 0;
	
	let localPlayer = {};
	let BULLETS = [];
	
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
	
	function tileCollider (x, y) {
		if (map[y+1][x][0] == 1)
			return true;
		return false;
	}
	
	checkCollisions = () => {
			let bbox = { x:localPlayer.x+16, y:localPlayer.y, width:32, height:64 };
			
			let relX = 0, relY = 0;
			
			localPlayer.grounded = false;

			for (let sy = 1; sy < mapHeight; sy++) {
				for (let sx = 0; sx < mapWidth; sx++) {
					if (tileCollider (sx, sy-1)) {
						relX = sx * TILE_SIZE; // + self.offsetX;
						relY = (sy) * TILE_SIZE; // + self.offsetY;
					
						if ((sy + 1) == Math.floor ((localPlayer.y + 64) / TILE_SIZE) + 1 && sx == Math.floor ((localPlayer.x + 16) / TILE_SIZE) && tileCollider (sx,sy - 1))
							localPlayer.grounded = true;
					
						if ((sy + 1) == Math.floor ((localPlayer.y + 64) / TILE_SIZE) + 1 && sx == Math.floor ((localPlayer.x + 48) / TILE_SIZE) && tileCollider (sx,sy - 1))
							localPlayer.grounded = true;
					
						let topLeft = new Point (relX, relY);
						let topRight = new Point (relX + TILE_SIZE, relY);
						let bottomLeft = new Point (relX, relY + TILE_SIZE);
						let bottomRight =  new Point (relX + TILE_SIZE, relY + TILE_SIZE);
					
						let lastPointTL = new Point (localPlayer.oldX + 16, localPlayer.oldY);
						let lastPointTR = new Point (localPlayer.oldX + 48, localPlayer.oldY);
						let lastPointML = new Point (localPlayer.oldX + 16, localPlayer.oldY + 32);
						let lastPointMR = new Point (localPlayer.oldX + 48, localPlayer.oldY + 32);
						let lastPointBL = new Point (localPlayer.oldX + 16, localPlayer.oldY + 64);
						let lastPointBR = new Point (localPlayer.oldX + 48, localPlayer.oldY + 64);
						
						let newPointTL = new Point (localPlayer.x + 16, localPlayer.y);
						let newPointTR = new Point (localPlayer.x + 48, localPlayer.y);
						let newPointML = new Point (localPlayer.x + 16, localPlayer.y + 32);
						let newPointMR = new Point (localPlayer.x + 48, localPlayer.y + 32);
						let newPointBL = new Point (localPlayer.x + 16, localPlayer.y + 64);
						let newPointBR = new Point (localPlayer.x + 48, localPlayer.y + 64);
						
						if (bbox.x < relX + TILE_SIZE && bbox.x + bbox.width > relX &&
							bbox.y < relY + TILE_SIZE && bbox.y + bbox.height > relY) {
								if ((linesIntersect (topLeft, topRight, lastPointBL, newPointBL) ||  //bottom
									linesIntersect (topLeft, topRight, lastPointBR, newPointBR)) && self.grounded) {
									localPlayer.y = (sy - 1) * TILE_SIZE - 32; // + self.offsetY;
								} else if ( linesIntersect (topRight, bottomRight, lastPointTL, newPointTL) ||  //left
											linesIntersect (topRight, bottomRight, lastPointBL, newPointBL) || 
											linesIntersect (topRight, bottomRight, lastPointML, newPointML)) {
										localPlayer.x = (sx + 1) * TILE_SIZE - 16; //+ self.offsetX - 16;
								} else if ( linesIntersect (topLeft, bottomLeft, lastPointTR, newPointTR) ||  //right
										 	linesIntersect (topLeft, bottomLeft, lastPointBR, newPointBR) || 
											linesIntersect (topLeft, bottomLeft, lastPointMR, newPointMR)) {
										localPlayer.x = (sx) * TILE_SIZE - 48;// + self.offsetX - 48;
								} else if ( linesIntersect (bottomLeft, bottomRight, lastPointTL, newPointTL) || //top
											linesIntersect (bottomLeft, bottomRight, lastPointTR, newPointTR)) {
									localPlayer.y = (sy + 1) * TILE_SIZE; // + self.offsetY;
									if (localPlayer.currentAnimState == animStates.jumping)
										localPlayer.currentAnimState = animStates.idle;
								}
						}
					}
				}
			}
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
	});
	
	sock.on ('position', function (data) {
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
		localPlayer.x += Math.floor (velX * delta);
		localPlayer.y += Math.floor (velY * delta);
		
		//checkCollisions ();
		
		offsetX = localPlayer.x - (WINDOW_WIDTH / 2 - 32);
		offsetY = localPlayer.y - (WINDOW_HEIGHT / 2 - 32);
		
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
			
			if (PLAYERS[i].id == id) {
				canvas.textAlign = "center";
				canvas.fillStyle = "blue";
				canvas.fillText ("client[" +PLAYERS[i].id + "]", WINDOW_WIDTH / 2 - 32 + 32, WINDOW_HEIGHT / 2 - 32 - 10);
				canvas.drawImage (playerImage, 64 * (Math.floor(localPlayer.animPhase) % 10), 64 * Math.floor (Math.floor(localPlayer.animPhase) / 10), 64, 64, WINDOW_WIDTH / 2 - 32, WINDOW_HEIGHT / 2 - 32, 64, 64);
			} else {
				canvas.drawImage (playerImage, 64 * (Math.floor(PLAYERS[i].animPhase) % 10), 64 * Math.floor (Math.floor(PLAYERS[i].animPhase) / 10), 64, 64, PLAYERS[i].x - offsetX, PLAYERS[i].y - offsetY, 64, 64);
				canvas.textAlign = "center";
				canvas.fillStyle = "red";
				canvas.fillText ("client[" +PLAYERS[i].id + "] ", PLAYERS[i].x  - offsetX + 32, PLAYERS[i].y - offsetY - 12);
			}
			
			if (debugMode == true) {
				canvas.strokeStyle = "black";
				canvas.beginPath ();
				canvas.rect (bbox.x, bbox.y, bbox.width, bbox.height);
				canvas.stroke ();
			}
		}
		
		for (let i = 0; i < BULLETS.length; i++) {
			canvas.strokeStyle = "black";
			canvas.beginPath ();
			canvas.fillRect (BULLETS[i].x - offsetX, BULLETS[i].y - offsetY, BULLETS[i].width, BULLETS[i].height);
			canvas.stroke ();
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