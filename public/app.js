function viewport() {
	var e = window, a = 'inner';
	if ( !( 'innerWidth' in window ) ) {
		a = 'client';
		e = document.documentElement || document.body;
	}
	return { width : e[ a+'Width' ] , height : e[ a+'Height' ] }
}

const WINDOW_WIDTH = window.innerWidth;
const WINDOW_HEIGHT = window.innerHeight;

let canvas = document.getElementById ("canvas");
document.getElementById ('canvas').width = WINDOW_WIDTH;
document.getElementById ('canvas').height = WINDOW_HEIGHT;
canvas.getContext ("2d").font = '30px Arial';

let client = new Client(canvas, WINDOW_WIDTH, WINDOW_HEIGHT);
client.connectToServer();
client.update(new Date().getTime());