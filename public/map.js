"use strict";

const MAX_LAYERS = 5;
const COLLIDER = 1;
const GENERAL_SPAWN = 2;
const TEAM_ONE_SPAWN = 3;
const TEAM_TWO_SPAWN = 4;

let MapController = function (canvasWidth, canvasHeight) {
	this.map = [];
	this.tileSize = 0;
	this.mapWidth = 0;
	this.mapHeight = 0;
	
	this.tileSetNames = [];

	this.spawnPoints = new Array (3);
	this.spawnPoints[GENERAL_SPAWN - 2] = [];
	this.spawnPoints[TEAM_ONE_SPAWN - 2] = [];
	this.spawnPoints[TEAM_TWO_SPAWN - 2] = [];
	this.test = 5;
	
	this.tileTypes = { "collider":1, "generalSpawn":2, "teamOneSpawn":3, "teamTwoSpawn":4, "ballSpawn":5, "teamOneGoal":6, "teamTwoGoal":7 };
	//Object.freeze (this.tileTypes);
	
	this.tileSet = [];
	this.tileSetsLoaded = 0;
	this.numTilesInSet = {};
	this.totalTiles = 0;
	
	this.offsetX = 0;
	this.offsetY = 0;
	
	this.anchor = {};
	this.canvasWidth = (typeof canvasWidth == 'undefined') ? 1200 : canvasWidth;
	this.canvasHeight = (typeof canvasWidth == 'undefined') ? 600 : canvasHeight;
};

if ( 'undefined' != typeof global ) {
    module.exports = global.MapController = MapController;
}

	MapController.prototype.loadFile = function(file, callback, binder) {
		console.log ("loading file " + file);
		let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	    let rawFile = new XMLHttpRequest();
		let tileSetNames = [];
		let map = [];
		let spawnPoints = new Array (3);
		spawnPoints[0] = [];
		spawnPoints[1] = [];
		spawnPoints[2] = [];
		let mapWidth, mapHeight, tileSize = 0;
		
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
					let x = 0, y = 0;

					for (let i = 0; i < lines.length; i ++) {
						if (pos == -1) {
							mapWidth = parseInt(lines[i].substring (0, lines[i].indexOf ("x")));
							mapHeight = parseInt(lines[i].substring (lines[i].indexOf ("x") + 1, lines[i].length));
							pos = -2;
							
							if (mapWidth <= 0 || mapHeight <= 0)
								return -1;
							
							map = createArray (MAX_LAYERS, mapWidth, mapHeight);
						
						} else if (pos == -2) {
							console.log (lines[i]);
							tileSize = parseInt (lines[i]);
							pos = -3;
						} else if (pos == -3) {
							if (lines[i].substring (0,2).localeCompare ("f:") == 0) {
								tileSetNames.push(lines[i].substring(2));
							} else
								pos = 0;	
						} else {
							let step = 1, x = 0;
							for (let n = 0; n < lines[i].length - 1; n += (step + 1)) {
								if (lines[i].substring(n).includes (' '))
									step = lines[i].substring(n).indexOf (' ');
								else
									step = lines[i].substring(n).length;
							
								let field = lines[i].substring (n, n+step);
								let fieldStep = 0, c = 0;
							
								for (let l = 0; l < MAX_LAYERS; l++) {
									if (field.substring(c).includes ('.'))
										fieldStep = field.substring(c).indexOf ('.');
									else
										fieldStep = field.substring(c).length;
								
									map[l][x][y] = parseInt (field.substring (c, c + fieldStep));
								
									if (l == 0 && map[l][x][y] == GENERAL_SPAWN) {
										spawnPoints[GENERAL_SPAWN - 2].push ({ x: x * tileSize, y: (y-1) * tileSize});
									} else if (l == 0 && map[l][x][y] == TEAM_ONE_SPAWN) {
										spawnPoints[TEAM_ONE_SPAWN - 2].push ({ x: x * tileSize, y: (y-1) * tileSize});
									} else if (l == 0 && map[l][x][y] == TEAM_TWO_SPAWN)
										spawnPoints[TEAM_TWO_SPAWN - 2].push ({ x: x * tileSize, y: (y-1) * tileSize});
									
									c+= fieldStep + 1;
								}
							
								x++;
							}
							y++;
						}
					}
	            }
	        }
	    }
	
	    rawFile.send(null);
		
		this.mapWidth = mapWidth;
		this.mapHeight = mapHeight;
		this.tileSize = tileSize;
		this.spawnPoints = spawnPoints;
		this.map = map;
		this.tileSetNames = tileSetNames;
		
		if (this.spawnPoints[GENERAL_SPAWN - 2].length < 1) {
			console.log ("no spawnpoint found");
			return -1;
		}
		
		console.log ("map loaded.");
		
		if (typeof callback != 'undefined')
			callback(binder);
	};
	
	MapController.prototype.getTypeByPos = function(pos) {
		return map[0][toIndex(pos.x)][toIndex(pos.y)];
	};
	
	MapController.prototype.getTypeByIndex = function(x, y, layer) {
		return map[0][x][y];
	};
	
	MapController.prototype.toIndex = function(pos){
		return Math.floor (pos / this.tileSize);
	};
	
	MapController.prototype.setMap = function (map) {
		this.map = map;
	}
	
	MapController.prototype.toIndexRange = function(pos1, pos2){
		let max = Math.ceil (pos2/this.tileSize) * this.tileSize;
		let range = [];
		let pos = pos1;
		do {
			range.push (this.toIndex(pos));
			pos += this.tileSize;
		} while (pos < max)
		
		return range;
	}
	
	MapController.prototype.dimToPx = function () {
		return { w:this.mapWidth*this.tileSize, h:this.mapHeight*this.tileSize };
	}
	
	MapController.prototype.getTileMetaByPos = function(x, y) {
		if (x < 0 || y < 0 || x >= this.dimToPx().w || y >= this.dimToPx().h)
			return null;

		return { type:this.map[0][this.toIndex(x)][this.toIndex(y)], top:this.toIndex(y)*this.tileSize, bottom:(this.toIndex(y)+1)*this.tileSize, 
				 left:this.toIndex(x)*this.tileSize, right:(this.toIndex(x)+1)*this.tileSize };
	};
	
	MapController.prototype.getTileMetaByVec = function(pos) {
		if (pos.x < 0 || pos.y < 0 || pos.x >= this.dimToPx().w || pos.y >= this.dimToPx().h)
			return null;

		return { type:this.map[0][this.toIndex(pos.x)][this.toIndex(pos.y)], top:this.toIndex(pos.y)*this.tileSize, bottom:(this.toIndex(pos.y)+1)*this.tileSize, 
				 left:this.toIndex(pos.x)*this.tileSize, right:(this.toIndex(pos.x)+1)*this.tileSize };
	};
	
	MapController.prototype.getTileMetaByIndex = function(x,y) {
		if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight)
			return null;

		return { type:this.map[0][x][y], top:y*this.tileSize, bottom:(y+1)*this.tileSize, 
				 left:x*this.tileSize, right:(x+1)*this.tileSize };
	};
	
	MapController.prototype.getTileMetaByRange = function (x1, x2, y1, y2) {
		let matches = [];
		
		let rangeX = this.toIndexRange (x1, x2);
		let rangeY = this.toIndexRange (y1, y2);
		
		for (let x in rangeX) {
			let indexX = rangeX[x];
			for (let y in rangeY) {
				let indexY = rangeY[y];
				let match = this.getTileMetaByIndex (indexX, indexY);
				if (match)
					matches.push (match);
			}
		}
		
		return matches;
	};
	
	MapController.prototype.getStartPosition = function(type) {
		return this.spawnPoints[type][Math.floor(Math.random() * this.spawnPoints[type].length)];
	};
	
	MapController.prototype.drawTile = function(tileIndex, x, y, useOffset, canvas) {
		if (this.tileSetsLoaded == 0)
			return;
		if (tileIndex == 0 || tileIndex > this.totalTiles)
			return;
		
		let tileSetId = 0, tileInSet = 0;
		for (let i = 1; i <= tileIndex; i ++) {
			if (tileInSet > this.numTilesInSet[tileSetId] - 1) {
				tileSetId++;
				tileInSet = 1;
			} else
				tileInSet++;
		}

		var tilesX = parseInt(this.tileSet[tileSetId].naturalWidth / this.tileSize);
		var inX = tileInSet % tilesX;
		var inY = parseInt(tileInSet / tilesX);
		inY++;
		
		if (inX == 0) {
			inX = tilesX;
			inY --;
		}
		
		if (useOffset)
			canvas.drawImage(this.tileSet[tileSetId], this.tileSize * (inX - 1), this.tileSize * (inY - 1), 
				this.tileSize, this.tileSize, x - this.offsetX, y - this.offsetY, this.tileSize, this.tileSize);
		else
			canvas.drawImage(this.tileSet[tileSetId], this.tileSize * (inX - 1), this.tileSize * (inY - 1), 
				this.tileSize, this.tileSize, x, y, this.tileSize, this.tileSize);
	}
	
	MapController.prototype.drawMap = function(canvas) {
		if (typeof this.anchor.x != 'undefined' && typeof this.anchor.y != 'undefined') {
			let startX = Math.floor((this.anchor.x - this.canvasWidth/2 - 32)/this.tileSize);
			startX = startX >= this.map[0][0].length ? this.map[0][0].length - 1 : startX;
			startX = startX < 0 ? 0 : startX;
		
			let startY = Math.floor((this.anchor.y - this.canvasHeight/2 - 32)/this.tileSize);
			startY = startY >= this.map[0].length ? this.map[0].length - 1 : startY;
			startY = startY < 0 ? 0 : startY;
			
			for (var l = 1; l < 5; l++) {
				for (var y = startY; y < this.mapWidth; y ++){
					for (var x = startX; x < this.mapHeight; x++) {
						if (this.map[l][x][y] != 0 && x * this.tileSize - this.offsetX < this.canvasWidth && y * this.tileSize - this.offsetY < this.canvasHeight) {
							this.drawTile (this.map[l][x][y], x * this.tileSize, y * this.tileSize, true, canvas);
						}
					}
				}
			}
		}
	}
	
	MapController.prototype.update = function(anchor) {
		this.anchor = anchor;
		if (this.anchor.y < this.mapHeight * this.tileSize) {
			this.offsetX = this.anchor.x - (this.canvasWidth / 2 - 32);
			this.offsetY = this.anchor.y - (this.canvasHeight / 2 - 32);
		}
	}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}