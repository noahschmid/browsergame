"use strict";

const MAX_LAYERS = 5;
const COLLIDER = 1;
const GENERAL_SPAWN = 2;
const TEAM_ONE_SPAWN = 3;
const TEAM_TWO_SPAWN = 4;

var Map = function () {
	this.map = [];
	this.tileSize = 0;
	this.mapWidth = 0;
	this.mapHeight = 0;
	this.tileSets = [];
	this.spawnPoints = new Array (3);
	this.spawnPoints[GENERAL_SPAWN - 2] = [];
	this.spawnPoints[TEAM_ONE_SPAWN - 2] = [];
	this.spawnPoints[TEAM_TWO_SPAWN - 2] = [];
	this.test = 5;
	this.tileTypes = { "collider":1, "generalSpawn":2, "teamOneSpawn":3, "teamTwoSpawn":4, "ballSpawn":5, "teamOneGoal":6, "teamTwoGoal":7 };
	Object.freeze (this.tileTypes);
};

if( 'undefined' != typeof global ) {
    module.exports = global.Map = Map;
}

	Map.prototype.loadFile = function(file) {
		console.log ("loading file " + file);
		let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	    let rawFile = new XMLHttpRequest();
		let tileSets = [];
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
								tileSets.push(lines[i].substring(2));
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
		this.tileSets = tileSets;
		
		if (this.spawnPoints[GENERAL_SPAWN - 2].length < 1) {
			console.log ("no spawnpoint found");
			return -1;
		}
		
		console.log ("map loaded.");
	};
	
	Map.prototype.getTypeByPos = function(pos) {
		return map[0][toIndex(pos.x)][toIndex(pos.y)];
	};
	
	Map.prototype.getTypeByIndex = function(x, y, layer) {
		return map[0][x][y];
	};
	
	Map.prototype.toIndex = function(pos){
		return Math.floor (pos / this.tileSize);
	};
	
	Map.prototype.setMap = function (map) {
		this.map = map;
	}
	
	Map.prototype.toIndexRange = function(pos1, pos2){
		let max = Math.ceil (pos2/this.tileSize) * this.tileSize;
		let range = [];
		let pos = pos1;
		do {
			range.push (this.toIndex(pos));
			pos += this.tileSize;
		} while (pos < max)
		
		return range;
	}
	
	Map.prototype.dimToPx = function () {
		return { w:this.mapWidth*this.tileSize, h:this.mapHeight*this.tileSize };
	}
	
	Map.prototype.getTileMetaByPos = function(x, y) {
		if (x < 0 || y < 0 || x >= this.dimToPx().w || y >= this.dimToPx().h)
			return null;

		return { type:this.map[0][this.toIndex(x)][this.toIndex(y)], top:this.toIndex(y)*this.tileSize, bottom:(this.toIndex(y)+1)*this.tileSize, 
				 left:this.toIndex(x)*this.tileSize, right:(this.toIndex(x)+1)*this.tileSize };
	};
	
	Map.prototype.getTileMetaByVec = function(pos) {
		if (pos.x < 0 || pos.y < 0 || pos.x >= this.dimToPx().w || pos.y >= this.dimToPx().h)
			return null;

		return { type:this.map[0][this.toIndex(pos.x)][this.toIndex(pos.y)], top:this.toIndex(pos.y)*this.tileSize, bottom:(this.toIndex(pos.y)+1)*this.tileSize, 
				 left:this.toIndex(pos.x)*this.tileSize, right:(this.toIndex(pos.x)+1)*this.tileSize };
	};
	
	Map.prototype.getTileMetaByIndex = function(x,y) {
		if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight)
			return null;

		return { type:this.map[0][x][y], top:y*this.tileSize, bottom:(y+1)*this.tileSize, 
				 left:x*this.tileSize, right:(x+1)*this.tileSize };
	};
	
	Map.prototype.getTileMetaByRange = function (x1, x2, y1, y2) {
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
	
	Map.prototype.getStartPosition = function(type) {
		return this.spawnPoints[type][Math.floor(Math.random() * this.spawnPoints[type].length)];
	};

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}