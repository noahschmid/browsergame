"use strict";

const MAX_SPEED = 400;
const MAX_GRAVITY = 600;
const GRAVITY = 2300;
const PLAYER_HEIGHT = 64;
const PLAYER_WIDTH = 64;
const LEFT_MARGIN = 16;
const RIGHT_MARGIN = 16;
const TOP_MARGIN = 5;
const BOTTOM_MARGIN = 0;
const BRAKE_SPEED = 2000;
const JUMP_SPEED = 800;
const DRAG_FACTOR = 1/6000;

let animStates = { "idle":1, "walking":2, "jumping":3 };

let Vec2d = function (x,y) {
	this.x = x;
	this.y = y;
		
	return this;
};
	
Vec2d.prototype.set = function(x, y) {
		this.x = x;
		this.y = y;
};

let Player = function (id, map){
		this.size = new Vec2d (PLAYER_WIDTH, PLAYER_HEIGHT);
		this.playerId = id;
		this.velocity = new Vec2d (0, 0);
		if (map)
			this.position = new Vec2d (map.getStartPosition(0).x, map.getStartPosition(0).y);
		else
			this.position = new Vec2d (0,0);
		
		this.lastPosition = this.position;
		this.maxSpeed = MAX_SPEED;
		this.acceleration = new Vec2d (1500, 0);
		this.deceleration = new Vec2d (600, 0);
		this.animState = animStates.idle;
		this.animPhase = 10;
		this.position.x -= LEFT_MARGIN;
		this.map = map;
		this.grounded = false;
		this.keyPresses = { left:false, right:false, up:false, down:false, fire:false, jump:false };
		this.collisionBlocksX = {};
		this.collisionBlocksY = {};
		this.facingLeft = false;
		this.direction = 0;
		this.distance = 0;
		this.jumpsLeft = 0;
		this.health = 100;
		this.points = 0;
		
		this.jumpCoolOff = false;
		
        this.old_state = { position:this.lastPosition, velocity:this.velocity };
        this.cur_state = { position:this.position, velocity:this.velocity };
        this.state_time = new Date().getTime();

            //Our local history of inputs
        this.inputs = [];
		this.name = "Player[" + id + "]";
		this.stateTime = new Date().getTime();
};

if ( 'undefined' != typeof global ) {
    module.exports = global.Player = Player;
}
	
	Player.prototype.respawn = function(startPos) {
		this.position.set (startPos.x-LEFT_MARGIN, startPos.y);
		this.velocity.set (0, 0);
	};
	
	Player.prototype.handleInputs = function(inputId) {
		this.keyPresses = this.inputs[inputId].keyPresses;
	};
	
	Player.prototype.updatePosition = function(delta) {
		this.lastPosition = this.position;
		if (this.currentAnimState != animStates.jumping)
			this.currentAnimState = animStates.idle;
		
		if (this.keyPresses.left) {
			this.facingLeft = true;
			this.direction = -1;
		} else if (this.keyPresses.right) {
			this.facingLeft = false;
			this.direction = 1;
		} else {
			this.direction = 0;
		}
		
		let absX = Math.abs (this.velocity.x);
		
		if (this.direction != 0) {
			this.velocity.x += this.acceleration.x * delta * this.direction;
		} else if (this.velocity.x != 0) {
			const decel = Math.min (absX, this.deceleration.x * delta);
			this.velocity.x += this.velocity.x > 0 ? -decel : decel;
		} else {
			this.distance = 0;
		}
		
		const drag = DRAG_FACTOR * this.velocity.x * absX;
		this.velocity.x -= drag;
		this.position.x += Math.floor(this.velocity.x * delta);
		this.distance += absX * delta;
		
		this.testX ();
		
		if (this.keyPresses.jump && this.jumpCoolOff) {
			if ((this.jumpsLeft == 0 && this.grounded) || this.jumpsLeft == 1) {
				this.velocity.y = -JUMP_SPEED;
				this.jumpsLeft = this.jumpsLeft == 0 ? 1 : 0;
				this.jumpCoolOff = false;
			}
		} else if (!this.keyPresses.jump)
			this.jumpCoolOff = true;
		
		this.velocity.y = this.velocity.y < MAX_GRAVITY ? this.velocity.y + GRAVITY * delta : this.velocity.y;
		
		if (Math.floor(this.velocity.y * delta) > this.map.tileSize - 1)
			this.velocity.y = Math.floor((this.map.tileSize - 1) / delta);
		
		this.position.y += Math.floor(this.velocity.y * delta);
		
		this.testY ();
		
		if (this.distance > 0)
			this.currentAnimState = animStates.walking;
		
		this.updateAnimations (delta);
	};
	
	
	Player.prototype.testX = function() {
        let x;
        if (this.velocity.x > 0) {
            x = this.position.x + this.size.x + LEFT_MARGIN - RIGHT_MARGIN;
        } else if (this.velocity.x < 0) {
            x = this.position.x + LEFT_MARGIN;
        } else {
            return;
        }
		
		let tiles = this.map.getTileMetaByRange (x, x, this.position.y + TOP_MARGIN, this.position.y+this.size.y - TOP_MARGIN);
												 
		this.collisionBlocksX = tiles;
		
		for (let i = 0; i < tiles.length; i++) {
			let tile = tiles[i];	
			if (!tile)
				continue;
			
			if (tile.type != this.map.tileTypes.collider)
				continue;
			
			if (this.velocity.x > 0) {
				if (this.position.x + this.size.x - RIGHT_MARGIN > tile.left) {
					this.position.x = tile.left - this.size.x + RIGHT_MARGIN;
					this.velocity.x = 0;
					this.collisionBlocksX[i].type = 55;
				} 
			} else if (this.velocity.x < 0) {
				if (this.position.x < tile.right) {
					this.position.x = tile.right - LEFT_MARGIN;
					this.velocity.x = 0;
					this.collisionBlocksX[i].type = 55;
				}
			}				 	
		}
	};
	
	Player.prototype.testY = function() {
        let y1, y2;
        if (this.velocity.y > 0) {
			y1 = this.lastPosition.y + this.size.y / 2 - BOTTOM_MARGIN + TOP_MARGIN;
            y2 = this.position.y + this.size.y - BOTTOM_MARGIN + TOP_MARGIN;
        } else if (this.velocity.y < 0) {
			y1 = this.lastPosition.y + TOP_MARGIN
            y2 = this.position.y + TOP_MARGIN;
        } else {
            return;
        }
		
		let tiles = this.map.getTileMetaByRange (this.position.x + LEFT_MARGIN, this.position.x + this.size.x - RIGHT_MARGIN,
												 y1, y2);
		
		this.collisionBlocksY = tiles;
												 
		for (let i = 0; i < tiles.length; i++) {
			let tile = tiles[i];	
			if (!tile)
				continue;
			
			if (tile.type != this.map.tileTypes.collider)
				continue;
			
			if (this.velocity.y > 0) {
				if (this.position.y + this.size.y - BOTTOM_MARGIN > tile.top) {
					this.collisionBlocksY[i].type = 55;
					this.position.y = tile.top - this.size.y + BOTTOM_MARGIN;
					this.velocity.y = 0;
					this.jumpsLeft = 0;
				} 
			} else if (this.velocity.y < 0) {
				if (this.position.y < tile.bottom) {
					this.position.y = tile.bottom - TOP_MARGIN;
					this.velocity.y = 0;
					this.collisionBlocksY[i].type = 55;
				}
			}				 	
		}
		
		tiles = this.map.getTileMetaByRange (this.position.x + LEFT_MARGIN, this.position.x + this.size.x - RIGHT_MARGIN,
			this.position.y + this.size.y + 1, this.position.y + this.size.y + 1);
												 
		this.grounded = false;
		for (let i in tiles) {
			if (tiles[i].type == this.map.tileTypes.collider) {
				this.grounded = true;
			}
		}
	};
	
	Player.prototype.updateAnimations = function(delta) {
		if (this.currentAnimState == animStates.walking && this.grounded) 
			this.animPhase = (this.distance / 20) % 6;
		
		else if (this.currentAnimState == animStates.idle && this.grounded)
			this.animPhase = 10;
		
		else if (!this.grounded)
			this.animPhase = 7;
	};
	
	Player.prototype.setDirection = function (dir) {
		if (dir == 'left')
			this.direction = -1;
		if (dir == 'right')
			this.direction = 1;
		else
			this.direction = 0;
	};