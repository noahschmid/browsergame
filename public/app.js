function viewport() {
	var e = window, a = 'inner';
	if ( !( 'innerWidth' in window ) ) {
		a = 'client';
		e = document.documentElement || document.body;
	}
	return { width : e[ a+'Width' ] , height : e[ a+'Height' ] }
}

let WINDOW_WIDTH = window.innerWidth;
let WINDOW_HEIGHT = window.innerHeight;

let canvas = document.getElementById ("canvas");
document.getElementById ('canvas').width = WINDOW_WIDTH;
document.getElementById ('canvas').height = WINDOW_HEIGHT;
canvas.getContext ("2d").font = '30px Arial';

let client = new Client(canvas, WINDOW_WIDTH, WINDOW_HEIGHT);
client.connectToServer();
client.update(new Date().getTime());

let onresize = function(e) {
	WINDOW_WIDTH = window.innerWidth;
	WINDOW_HEIGHT = window.innerHeight;
   client.resize (WINDOW_WIDTH, WINDOW_HEIGHT);
   document.getElementById ('canvas').width = WINDOW_WIDTH;
   document.getElementById ('canvas').height = WINDOW_HEIGHT;
}
window.addEventListener("resize", onresize);