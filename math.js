"use strict";

module.exports = class Vec2d {
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
