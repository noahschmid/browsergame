"use strict";

let room = { name:"ExWi Rockers" };

global.window = global.document = global;

let Server = require("./game.server");

let gameServer = new Server();
gameServer.startup ();
gameServer.update(new Date().getTime());
