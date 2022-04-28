"use strict";

module.exports = class Vec2d {
	constructor (x, y) {
		this.x = x;
		this.y = y;
		
		return this;
	}

	constructor() {
		this.x = 0;
		this.y = 0;
	}
	
	set (x, y) {
		this.x = x;
		this.y = y;
	}

	norm() {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	}
}
