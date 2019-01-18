var frame_time = 60/1000; // run the local game at 16ms/ 60hz
if('undefined' != typeof(global)) {
	frame_time = 45; //on server we run at 45ms, 22hz
	global.window = global.document = global;
}
( function () {

    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {
        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if ( !window.requestAnimationFrame ) {
        window.requestAnimationFrame = function ( callback, element ) {
            var currTime = Date.now(), timeToCall = Math.max( 0, frame_time - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = function ( id ) { clearTimeout( id ); };
    }

}() );

if('undefined' != typeof(global)) {
	let Server = require("../game.server.js")
}

let GameCore = function(room) {
	this.physicsDelta = 0.0001;
	this.physicsLastDelta = new Date().getTime();
	this.localTime = 0.016;
	this.localDeltaTime = new Date().getTime();
	this.localLastFrameTime = new Date().getTime();
	
	this.startPhysicsLoop();
	this.startTimer();
};

    // (4.22208334636).fixed(n) will return fixed point value to n places, default n = 3
Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
    //copies a 2d vector like object from one to another
GameCore.prototype.pos = function(a) { return {x:a.x,y:a.y}; };
    //Add a 2d vector with another one and return the resulting vector
GameCore.prototype.v_add = function(a,b) { return { x:(a.x+b.x).fixed(), y:(a.y+b.y).fixed() }; };
    //Subtract a 2d vector with another one and return the resulting vector
GameCore.prototype.v_sub = function(a,b) { return { x:(a.x-b.x).fixed(),y:(a.y-b.y).fixed() }; };
    //Multiply a 2d vector with a scalar value and return the resulting vector
GameCore.prototype.v_mul_scalar = function(a,b) { return {x: (a.x*b).fixed() , y:(a.y*b).fixed() }; };
    //For the server, we need to cancel the setTimeout that the polyfill creates
GameCore.prototype.stop_update = function() {  window.cancelAnimationFrame( this.updateid );  };
    //Simple linear interpolation
GameCore.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p + _t * (n - p)).fixed(); };
    //Simple linear interpolation between 2 vectors
GameCore.prototype.v_lerp = function(v,tv,t) { return { x: this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t) }; };

GameCore.prototype.update = function(t) {
        //Work out the delta time
    this.deltaTime = this.lastFrameTime ? ( (t - this.lastFrameTime)/1000.0).fixed() : 0.016;

        //Store the last frame time
    this.lastFrameTime = t;

    this.mainUpdate();

        //schedule the next update
    this.updateid = window.requestAnimationFrame( this.update.bind(this), this.viewport );
};

GameCore.prototype.mainUpdate = function() {
	
};

GameCore.prototype.updatePhysics = function() {
	
};

GameCore.prototype.startPhysicsLoop = function() {
	setInterval (function() {
		this.physicsDelta = (new Date().getTime() - this.physicsLastDelta) / 1000;
		this.lastPhysicsDelta = new Date().getTime();
		this.updatePhysics();
	}.bind(this), 15)
};

GameCore.prototype.startTimer = function() {
	setInterval (function() {
		this.localDeltaTime = (new Date().getTime() - this.localLastFrameTime);
		this.localLastFrameTime = new Date().getTime();
		this.localTime += this.localDeltaTime / 1000;
	}.bind(this), 4)
};

GameCore.prototype.processInput = function(player) {
	
};

if ( 'undefined' != typeof global ) {
    module.exports = global.GameCore = GameCore;
}