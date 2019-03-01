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

class Vec2d {
	constructor (x, y) {
		this.x = x;
		this.y = y;
		
		return this;
	}
	
	set (x, y) {
		this.x = x;
		this.y = y;
	}
}

class Player {
	constructor(id, map) {
		this.size = new Vec2d (PLAYER_WIDTH, PLAYER_HEIGHT);
		this.playerId = id;
		this.velocity = new Vec2d (0, 0);
		this.position = new Vec2d (map.getStartPosition(0).x, map.getStartPosition(0).y);
		this.maxSpeed = MAX_SPEED;
		this.acceleration = new Vec2d (1500, 0);
		this.deceleration = new Vec2d (600, 0);
		this.animState = animStates.idle;
		this.animPhase = 10;
		this.position.x -= LEFT_MARGIN;
		this.pressingAttack = false;
		this.map = map;
		this.grounded = false;
		this.pressingLeft = false;
		this.pressingRight = false;
		this.collisionBlocksX = {};
		this.collisionBlocksY = {};
		this.facingLeft = false;
		this.direction = 0;
		this.distance = 0;
		this.jumpsLeft = 0;
		this.health = 100;
		this.margins = {left:LEFT_MARGIN, right:RIGHT_MARGIN, top:TOP_MARGIN, bottom:BOTTOM_MARGIN};
	}
	
	respawn(startPos) {
		this.position.set (startPos.x-LEFT_MARGIN, startPos.y);
		this.velocity.set (0, 0);
	}
	
	
	updatePosition(delta) {
		if (this.currentAnimState != animStates.jumping)
			this.currentAnimState = animStates.idle;
		
		if (this.pressingLeft) {
			this.facingLeft = true;
			this.direction = -1;
		} else if (this.pressingRight) {
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
		
		if (this.pressingSpace) {
			if ((this.jumpsLeft == 0 && this.grounded) || this.jumpsLeft == 1) {
				this.pressingSpace = false;
				this.velocity.y = -JUMP_SPEED;
				this.jumpsLeft = this.jumpsLeft == 0 ? 1 : 0;
			}
		}
		
		this.velocity.y = this.velocity.y < MAX_GRAVITY ? this.velocity.y + GRAVITY * delta : this.velocity.y;
		this.position.y += Math.floor(this.velocity.y * delta);
		
		this.testY ();
		
		if (this.distance > 0)
			this.currentAnimState = animStates.walking;
		
		this.updateAnimations (delta);
	}
	
	
	testX() {
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
	}
	
	testY() {
        let y;
        if (this.velocity.y > 0) {
            y = this.position.y + this.size.y - BOTTOM_MARGIN + TOP_MARGIN;
        } else if (this.velocity.y < 0) {
            y = this.position.y + TOP_MARGIN;
        } else {
            return;
        }
		
		let tiles = this.map.getTileMetaByRange (this.position.x + LEFT_MARGIN, this.position.x + this.size.x - RIGHT_MARGIN,
												 y, y);
		
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
			if (tiles[i].type == this.map.tileTypes.collider)
				this.grounded = true;
		}
	}
	
	updateAnimations (delta) {
		if (this.currentAnimState == animStates.walking && this.grounded) 
			this.animPhase = (this.distance / 20) % 6;
		
		else if (this.currentAnimState == animStates.idle && this.grounded)
			this.animPhase = 10;
		
		else if (!this.grounded)
			this.animPhase = 7;
	}
	
}

module.exports = Player;
