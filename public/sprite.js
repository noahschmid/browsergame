const Vec2d = require("../math");

let Sprite = new function(filename, numFrames, framesPerRow) {
    this.bitmap = new Image();
    this.bitmap.src = filename;
    this.sourceWidth = this.bitmap.width;
    this.sourceHeight = this.bitmap.height;
    this.position = new Vec2d();
    this.animFrame = 1;
}

Sprite.prototype.setPos = function(pos) {
     this.position = pos;
}

Sprite.prototype.getImage = function() {
    bufferContext.drawImage (this.playerImage, 64 * (Math.floor(player.animPhase) % 10), 64 * Math.floor (Math.floor(player.animPhase) / 10), player.size.x, player.size.y, 0, 0, player.size.x, player.size.y);
}

if ( 'undefined' != typeof global ) {
    module.exports = global.Sprite = Sprite;
}