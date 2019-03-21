const fs = require('fs');
const net = require('./net');

function wsSendError(ws, message) {
	ws.send(JSON.stringify({
		m: "E",
		d: message,
	}))
}

class ETMap {
	constructor(name, path, uuid, savediagram_interval, destroycallback) {
		this.name = name;
		this.path = path;
		this.uuid = uuid;
		this.diagram = null;
		this.clients = [];
		this.saveinterval = null;
		this.destroycallback = destroycallback;
		this.savediagram_interval = savediagram_interval;
		this.logmessage("Created");
	}

	loadDefault() {
		this.diagram = {
			L2: {
				device: {},
				link: {},
				base: {
					0: {
						type: "F",
						name: "Floor",
						px: 0, py: 0, pz: 0, 
						rx: 0, ry: 0, rz: 0,
						sx: 20, sy: .5, sz: 20,
						color1: 0xffffff,
						color2: 0xffbbaa,
						t1name: "b1_t1",
						t2name: "b2_t1",
						tsx: 1,
						tsy: 1,
						data: [],
					}
				},
				text: {},
				symbol: {},
			},

			L3: {

			}
		}
	}

	logmessage(message) {
		console.log("UUID: " + this.uuid + " C: " + this.clients.length + " M: " + message);
	}

	initialize(callback) {
		this.logmessage("Initialize Called");

		fs.readFile(this.path + this.uuid + ".json", "utf-8", (err, data) => {
			if(err) {
				// Load default diagram
				this.loadDefault();
				callback(null);
				this.logmessage("Diagram not found. Loaded default");
			}
			else {
				try {
					this.diagram = JSON.parse(data);
				}
				catch(err) {
					callback("Parse Error");
					this.logmessage("Parse Error");
					return;
				}
			}

			// Set timeout to save diagram every 5 minutes
			this.saveinterval = setInterval(() => {
				this.save(null)
			}, this.savediagram_interval * 1000)

			// Broadcast to all existing clients the diagram
			for(let x = 0; x < this.clients.length; x++) {
				this.sendInitializeMessage(this.clients[x]);
			}

			callback(null);
			this.logmessage("Diagram loaded.");
			return;
		})
	}

	destroy() {
		// Clear the save interval
		clearInterval(this.saveinterval);

		// Close all websockets
		for(let x = 0; x < this.clients.length; x++) {
			this.clients[x].close()
		}

		// Save diagrams
		this.save();

		// Callback
		this.destroycallback(this.uuid);
		this.logmessage("Destroyed.");
	}

	save(callback) {
		fs.writeFile(this.path + this.uuid + ".json", JSON.stringify(this.diagram), (err) => {
			if(err) {
				this.logmessage("Error saving diagram: " + err);
				if(callback)
					callback("Error saving diagram");
				return;
			}

			this.logmessage("Diagram saved");

			if(callback) callback();
		})
	}

	addWS(ws) {
		// Maximum of 20 persons per diagram
		if(this.clients.length > 10) {
			this.logmessage("Maximum number of users reached")
			ws.close();
			return;
		}

		// Add the ws to client list
		this.clients.push(ws);

		// Setup websocket
		this.setupWSCalls(ws);

		// If the diagram is loaded, we send it to the client. If not, there is no need as the function
		// that loads it, will send it to all already connected ones.
		if(this.diagram != null) {
			this.sendInitializeMessage(ws);
		}

		this.logmessage("Client added")
	}

	removeWS(ws) {
		for(let x = 0; x < this.clients.length; x++) {
			if (this.clients[x] == ws) {
				this.clients.splice(x, 1);
				break;
			}
		}
		this.logmessage("Client removed")

		if(this.clients.length == 0) {
			this.destroy();
		}
	}

	setupWSCalls(ws) {
		ws.on("message", (message) => {
			this.processMessage(ws, message);
		})

		ws.on("close", () => {
			clearInterval(ws.interval);
			this.removeWS(ws);
		})

        ws.on("error", (error) => {
            console.log("WS ERROR on diagram:")
            console.log(error)
			clearInterval(ws.interval);
			this.removeWS(ws); 
        })

		// PING PONG to detect broken connections
		ws.isAlive = true;
		ws.interval = setInterval(() => {
			if (ws.isAlive === false) {
				this.logmessage("Ping Pong Failed")
				clearInterval(ws.interval);
				//this.removeWS(ws);
				ws.terminate();
				return;
			}

			ws.isAlive = false;
			ws.ping('', false, true);

		}, 5000);

		ws.on("pong", () => {
			ws.isAlive = true;
		})
	}

	sendInitializeMessage(ws) {
		ws.send(JSON.stringify({
				m: "I", 
				d: {n: this.name, d: this.diagram}
			}))
	}

	broadcastMessage(message) {
		let jsonmsg = JSON.stringify(message);

		for(let i = 0; i < this.clients.length; i++) {
			this.clients[i].send(jsonmsg);
		}
	}

	processMessage(ws, message) {
		let m;

		try {
			m = JSON.parse(message);
		}
		catch(err) {
			this.logmessage("WS parse error.");
			ws.terminate();
			return;
		}

		if(! (("m" in m) && ("d" in m)) ) {
			this.logmessage("WS msg format error.");
			ws.terminate();
			return;
		}

		switch(m.m) {
			case "A":
				this.processMessage_add(ws, m.d);
				break;
			case "M":
				this.processMessage_move(ws, m.d);
				break;
			case "R":
				this.processMessage_rotate(ws, m.d);
				break;
			case "X":
				this.processMessage_resize(ws, m.d);
				break;
			case "P":
				this.processMessage_settings(ws, m.d);
				break;
			case "C":
				this.processMessage_config(ws, m.d);
				break;
			case "D":
				this.processMessage_delete(ws, m.d);
				break;
			default:
				this.logmessage("WS msg type error.");
				ws.terminate();
				return;				
		}
	}

	processMessage_add(ws, d) {
		if(d.v === "L2" && d.t === "base") {
			this.addL2Base(ws, d);
		}
		else if (d.v === "L2" && d.t === "device") {
			this.addL2Device(ws, d);
		}
		else if (d.v === "L2" && d.t === "link") {
			this.addL2Link(ws, d);
		}
		else if (d.v === "L2" && d.t === "joint") {
			this.addL2Joint(ws, d);
		}
		else if (d.v === "L2" && d.t === "text") {
			this.addL2Text(ws, d);
		}
		else if (d.v === "L2" && d.t === "symbol") {
			this.addL2Symbol(ws, d);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}	
	processMessage_move(ws, d) {
		if(d.v == "L2" && d.t == "base") {
			this.moveL2Base(ws, d.i, d.x, d.y, d.z);
		}
		else if(d.v == "L2" && d.t == "device") {
			this.moveL2Device(ws, d.i, d.x, d.y, d.z, d.base);
		}
		else if(d.v == "L2" && d.t == "joint") {
			this.moveL2Joint(ws, d.i, d.joint_index, d.x, d.y, d.z);
		}
		else if(d.v == "L2" && d.t == "text") {
			this.moveL2Text(ws, d.i, d.x, d.y, d.z, d.base);
		}
		else if(d.v == "L2" && d.t == "symbol") {
			this.moveL2Symbol(ws, d.i, d.x, d.y, d.z, d.base);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}
	processMessage_rotate(ws, d) {
		if(d.v == "L2" && d.t == "base") {
			this.rotateL2Base(ws, d.i, d.x, d.y, d.z);
		}
		else if(d.v == "L2" && d.t == "device") {
			this.rotateL2Device(ws, d.i, d.x, d.y, d.z);
		}
		else if(d.v == "L2" && d.t == "text") {
			this.rotateL2Text(ws, d.i, d.x, d.y);
		}
		else if(d.v == "L2" && d.t == "symbol") {
			this.rotateL2Symbol(ws, d.i, d.x, d.y, d.z);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}
	processMessage_resize(ws, d) {
		if(d.v == "L2" && d.t == "base") {
			this.resizeL2Base(ws, d.i, d.x, d.y, d.z);
		}
		else if(d.v == "L2" && d.t == "device") {
			this.resizeL2Device(ws, d.i, d.x, d.y, d.z);
		}
		else if(d.v == "L2" && d.t == "symbol") {
			this.resizeL2Symbol(ws, d.i, d.x, d.y, d.z);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}
	processMessage_settings(ws, d) {
		if(d.v == "L2" && d.t == "base") {
			this.settingsL2Base(ws, d.i, d.name, d.color1, d.color2, d.t1name, d.t2name, d.sy, d.tsx, d.tsy);
		}
		else if(d.v == "L2" && d.t == "device") {
			this.settingsL2Device(ws, d.i, d.name, d.color1, d.color2, d.ifnaming);
		}
		else if(d.v == "L2" && d.t == "link") {
			this.settingsL2Link(ws, d.i, d.type, d.order, d.color, d.weight, d.height);
		}
		else if(d.v == "L2" && d.t == "text") {
			this.settingsL2Text(ws, d.i, d.text, d.height, d.depth, d.py, d.color);
		}
		else if(d.v == "L2" && d.t == "symbol") {
			this.settingsL2Symbol(ws, d);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}
	processMessage_config(ws, d) {
		if(d.v == "L2" && d.t == "device") {
			this.configL2Device(ws, d);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}
	processMessage_delete(ws, d) {
		if(d.v == "L2" && d.t == "base") {
			this.deleteL2Base(ws, d.i);
		}
		else if(d.v == "L2" && d.t == "device") {
			this.deleteL2Device(ws, d.i);
		}
		else if(d.v == "L2" && d.t == "link") {
			this.deleteL2Link(ws, d.i);
		}
		else if(d.v == "L2" && d.t == "joint") {
			this.deleteL2Joint(ws, d.i, d.pi);
		}
		else if(d.v == "L2" && d.t == "text") {
			this.deleteL2Text(ws, d.i);
		}
		else if(d.v == "L2" && d.t == "symbol") {
			this.deleteL2Symbol(ws, d.i);
		}
		else {
			this.logmessage("WS msg error.");
			ws.terminate();
			return;
		}
	}

	/****************************************************/
	/* Functions to manage base and device L2 objects   */
	/****************************************************/
	addL2Base(ws, d) {
		// Verify Parameters
		if (
				(! (typeof d.px === "number")) ||
				(! (typeof d.py === "number")) ||
				(! (typeof d.pz === "number")) ||
				(! (typeof d.sx === "number")) ||
				(! (typeof d.sy === "number")) ||
				(! (typeof d.sz === "number")) ||
				(! (typeof d.rx === "number")) ||
				(! (typeof d.ry === "number")) ||
				(! (typeof d.rz === "number")) ||
				(! (typeof d.st === "string"))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		// Find the highest id and return the next number
		let newid = 0;
		for(let id in this.diagram.L2.base) {
			if(Number.parseInt(id) >= newid)
				newid = Number.parseInt(id) + 1;
		}

		if((d.st === "F") || (d.st === "W")) {
			this.diagram.L2.base[newid] = {
				type: d.st,
				name: "",
				px: d.px, py: d.py, pz: d.pz, 
				rx: d.rx, ry: d.ry, rz: d.rz,
				sx: d.sx, sy: d.sy, sz: d.sz,
				color1: 0xffffff,
				color2: 0xffbbaa,
				t1name: "b1_t1",
				t2name: "b2_t1",
				tsx: 1,
				tsy: 1,
				data: [],
			}
			this.broadcastMessage({
				m: "A",
				d: {
					v: "L2",
					t: "base",
					i: ""+newid,
					d: this.diagram.L2.base[newid],
				}
			});
		}
		else {
			wsSendError(ws, "Invalid type.");
		}
	}

	addL2Device(ws, d) {
		// Verify parameters
		if (
				(! (typeof d.px === "number")) ||
				(! (typeof d.py === "number")) ||
				(! (typeof d.pz === "number")) ||
				(! (typeof d.sx === "number")) ||
				(! (typeof d.sy === "number")) ||
				(! (typeof d.sz === "number")) ||
				(! (typeof d.rx === "number")) ||
				(! (typeof d.ry === "number")) ||
				(! (typeof d.rz === "number")) ||
				(! (typeof d.color1 === "number")) ||
				(! (typeof d.color2 === "number")) ||
				(! (typeof d.st === "string")) ||
				(["R", "S", "F", "LB", "ML", "SR", "ST"].indexOf(d.st) === -1) ||
				(! (typeof d.base === "string")) ||
				(! (d.base in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		// Find the highest id and return the next number
		let newid = 0;
		for(let id in this.diagram.L2.device) {
			if(Number.parseInt(id) >= newid)
				newid = Number.parseInt(id) + 1;
		}

		this.diagram.L2.device[newid] = {
				type: d.st,
				name: "",
				px: d.px, py: d.py, pz: d.pz, 
				rx: d.rx, ry: d.ry, rz: d.rz,
				sx: d.sx, sy: d.sy, sz: d.sz,
				color1: d.color1,
				color2: d.color2,

				base: d.base,
				ifnaming: [
					"Ethernet{1-64}"
				],
		        vlans: {"0": {name: "VLAN 0"}},
		        vrfs: {"0:0": {name: "default"}},
		        svis: {},
				data: [],			
		}
		this.broadcastMessage({
			m: "A",
			d: {
				v: "L2",
				t: "device",
				i: ""+newid,
				d: this.diagram.L2.device[newid],
			}
		});
	}

	addL2Link(ws, d) {
		// Verify parameters
		if (
				(! (typeof d.type === "number")) ||
				( (d.type != 0) && (d.type != 1)) ||
				(! (typeof d.color === "number")) ||
				(! (typeof d.weight === "number")) ||
				(! (typeof d.height === "number")) ||
				(! (typeof d.dev1_id === "string")) ||
				(! (d.dev1_id in this.diagram.L2.device)) ||
				(! (typeof d.dev2_id === "string")) ||
				(! (d.dev2_id in this.diagram.L2.device))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		// Find the highest id and return the next number
		let newid = 0;
		for(let id in this.diagram.L2.link) {
			if(Number.parseInt(id) >= newid)
				newid = Number.parseInt(id) + 1;
		}

		this.diagram.L2.link[newid] = {
			type: d.type,
			order: "YX",
			devs: [
				{id: d.dev1_id, ifid: ""},
				{id: d.dev2_id, ifid: ""},
			],
			linedata: {
				weight: d.weight,
				height: d.height,
				color: d.color,
				points: []
			}
		}

		this.broadcastMessage({
			m: "A",
			d: {
				v: "L2",
				t: "link",
				i: ""+newid,
				d: this.diagram.L2.link[newid],
			}
		});
	}

	addL2Joint(ws, d) {
		// Verify parameters
		if (
				(! (typeof d.link_id === "string")) ||
				(! (typeof d.joint_index === "number")) ||
				(! (typeof d.px === "number")) ||
				(! (typeof d.py === "number")) ||
				(! (typeof d.pz === "number")) ||
				(! (d.link_id in this.diagram.L2.link)) ||
				(d.joint_index > this.diagram.L2.link[d.link_id].linedata.points.length) ||
				(d.joint_index < 0)
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.link[d.link_id].linedata.points.splice(d.joint_index, 0, [d.px, d.py, d.pz])

		this.broadcastMessage({
			m: "A",
			d: {
				v: "L2",
				t: "joint",
				link_id: d.link_id,
				joint_index: d.joint_index,
				px: d.px, py: d.py, pz: d.pz,
			}
		});

	}

	addL2Text(ws, d) {
		// Verify parameters
		if (
				(! (typeof d.text === "string")) ||
				(! (d.text.length < 64)) ||
				(! (d.text.length > 0)) ||
				(! (typeof d.px === "number")) ||
				(! (typeof d.py === "number")) ||
				(! (typeof d.pz === "number")) ||
				(! (typeof d.height === "number")) ||
				(! (typeof d.depth === "number")) ||
				(! (typeof d.rx === "number")) ||
				(! (typeof d.ry === "number")) ||
				(! (typeof d.color === "number")) ||
				(! (typeof d.base === "string")) ||
				(! (d.base in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		// Find the highest id and return the next number
		let newid = 0;
		for(let id in this.diagram.L2.text) {
			if(Number.parseInt(id) >= newid)
				newid = Number.parseInt(id) + 1;
		}

		this.diagram.L2.text[newid] = {
				type: "F",
				text: d.text,
				px: d.px, py: d.py, pz: d.pz, 
				rx: d.rx, ry: d.ry,
				height: d.height, depth: d.depth,
				color: d.color,

				base: d.base,
		}
		this.broadcastMessage({
			m: "A",
			d: {
				v: "L2",
				t: "text",
				i: ""+newid,
				d: this.diagram.L2.text[newid],
			}
		});
	}

	addL2Symbol(ws, d) {
		// Verify parameters
		if (
				(! (typeof d.px === "number")) ||
				(! (typeof d.py === "number")) ||
				(! (typeof d.pz === "number")) ||
				(! (typeof d.sx === "number")) ||
				(! (typeof d.sy === "number")) ||
				(! (typeof d.sz === "number")) ||
				(! (typeof d.rx === "number")) ||
				(! (typeof d.ry === "number")) ||
				(! (typeof d.rz === "number")) ||
				(! (typeof d.color === "number")) ||
				(! (typeof d.st === "string")) ||
				(! (typeof d.base === "string")) ||
				(! (d.base in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}
		if (! ["F", "X", "V"].includes(d.st)) {
			wsSendError(ws, "Symbol Type Invalid.");
			return;
		}

		let cd = {};
		if (d.st === "F") {
			if((d.cd === undefined) || (d.cd.flagcolor === undefined)) {
				wsSendError(ws, "Invalid format (2)");
				return;				
			}
			cd.flagcolor = d.cd.flagcolor;
		}

		// Find the highest id and return the next number
		let newid = 0;
		for(let id in this.diagram.L2.symbol) {
			if(Number.parseInt(id) >= newid)
				newid = Number.parseInt(id) + 1;
		}

		this.diagram.L2.symbol[newid] = {
				type: d.st,
				px: d.px, py: d.py, pz: d.pz, 
				rx: d.rx, ry: d.ry, rz: d.rz,
				sx: d.sx, sy: d.sy, sz: d.sz,
				color: d.color,
				cd: cd,

				base: d.base,
		}
		this.broadcastMessage({
			m: "A",
			d: {
				v: "L2",
				t: "symbol",
				i: ""+newid,
				d: this.diagram.L2.symbol[newid],
			}
		});
	}

	moveL2Base(ws, id, px, py, pz) {
		// Verify Parameters
		if (
				(! (typeof px === "number")) ||
				(! (typeof py === "number")) ||
				(! (typeof pz === "number")) ||
				(! (id in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.base[id].px = px;
		this.diagram.L2.base[id].py = py;
		this.diagram.L2.base[id].pz = pz;

		this.broadcastMessage({
				m: "M",
				d: {
					v: "L2",
					t: "base",
					i: id,
					x: px, y: py, z: pz,
				}			
		})
	}

	moveL2Device(ws, id, px, py, pz, base) {
		// Verify Parameters
		if (
				(! (typeof px === "number")) ||
				(! (typeof py === "number")) ||
				(! (typeof pz === "number")) ||
				(! (typeof base === "string")) ||
				(! (base in this.diagram.L2.base)) ||
				(! (id in this.diagram.L2.device))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.device[id].px = px;
		this.diagram.L2.device[id].py = py;
		this.diagram.L2.device[id].pz = pz;
		this.diagram.L2.device[id].base = base;

		this.broadcastMessage({
				m: "M",
				d: {
					v: "L2",
					t: "device",
					i: id,
					x: px, y: py, z: pz, base: base
				}			
		})
	}

	moveL2Joint(ws, id, joint_index, px, py, pz) {
		if (
				(! (typeof px === "number")) ||
				(! (typeof py === "number")) ||
				(! (typeof pz === "number")) ||
				(! (typeof joint_index === "number")) ||
				(! (typeof id === "string")) ||
				(! (id in this.diagram.L2.link)) ||
				(joint_index >= this.diagram.L2.link[id].linedata.points.length) ||
				(joint_index < 0)
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.link[id].linedata.points[joint_index] = [px, py, pz];

		this.broadcastMessage({
				m: "M",
				d: {
					v: "L2",
					t: "joint",
					i: id,
					joint_index: joint_index,
					x: px, y: py, z: pz,
				}			
		})
	}

	moveL2Text(ws, id, px, py, pz, base) {
		// Verify Parameters
		if (
				(! (typeof px === "number")) ||
				(! (typeof pz === "number")) ||
				(! (typeof base === "string")) ||
				(! (base in this.diagram.L2.base)) ||
				(! (id in this.diagram.L2.text))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.text[id].px = px;
		this.diagram.L2.text[id].pz = pz;
		this.diagram.L2.text[id].base = base;

		this.broadcastMessage({
				m: "M",
				d: {
					v: "L2",
					t: "text",
					i: id,
					x: px, z: pz, base: base
				}			
		})
	}

	moveL2Symbol(ws, id, px, py, pz, base) {
		// Verify Parameters
		if (
				(! (typeof px === "number")) ||
				(! (typeof py === "number")) ||
				(! (typeof pz === "number")) ||
				(! (typeof base === "string")) ||
				(! (base in this.diagram.L2.base)) ||
				(! (id in this.diagram.L2.symbol))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.symbol[id].px = px;
		this.diagram.L2.symbol[id].py = py;
		this.diagram.L2.symbol[id].pz = pz;
		this.diagram.L2.symbol[id].base = base;

		this.broadcastMessage({
				m: "M",
				d: {
					v: "L2",
					t: "symbol",
					i: id,
					x: px, y: py, z: pz, base: base
				}			
		})
	}

	rotateL2Base(ws, id, rx, ry, rz) {
		// Verify Parameters
		if (
				(! (typeof rx === "number")) ||
				(! (typeof ry === "number")) ||
				(! (typeof rz === "number")) ||
				(! (id in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.base[id].rx = rx;
		this.diagram.L2.base[id].ry = ry;
		this.diagram.L2.base[id].rz = rz;

		this.broadcastMessage({
				m: "R",
				d: {
					v: "L2",
					t: "base",
					i: id,
					x: rx, y: ry, z: rz,
				}			
		})
	}

	rotateL2Device(ws, id, rx, ry, rz) {
		// Verify Parameters
		if (
				(! (typeof rx === "number")) ||
				(! (typeof ry === "number")) ||
				(! (typeof rz === "number")) ||
				(! (id in this.diagram.L2.device))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.device[id].rx = rx;
		this.diagram.L2.device[id].ry = ry;
		this.diagram.L2.device[id].rz = rz;

		this.broadcastMessage({
				m: "R",
				d: {
					v: "L2",
					t: "device",
					i: id,
					x: rx, y: ry, z: rz,
				}			
		})
	}

	rotateL2Text(ws, id, rx, ry) {
		// Verify Parameters
		if (
				(! (typeof rx === "number")) ||
				(! (typeof ry === "number")) ||
				(! (id in this.diagram.L2.text))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.text[id].rx = rx;
		this.diagram.L2.text[id].ry = ry;

		this.broadcastMessage({
				m: "R",
				d: {
					v: "L2",
					t: "text",
					i: id,
					x: rx, y: ry,
				}			
		})
	}

	rotateL2Symbol(ws, id, rx, ry, rz) {
		// Verify Parameters
		if (
				(! (typeof rx === "number")) ||
				(! (typeof ry === "number")) ||
				(! (typeof rz === "number")) ||
				(! (id in this.diagram.L2.symbol))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.symbol[id].rx = rx;
		this.diagram.L2.symbol[id].ry = ry;
		this.diagram.L2.symbol[id].rz = rz;

		this.broadcastMessage({
				m: "R",
				d: {
					v: "L2",
					t: "symbol",
					i: id,
					x: rx, y: ry, z: rz,
				}			
		})
	}

	resizeL2Base(ws, id, sx, sy, sz) {
		// Verify Parameters
		if (
				(! (typeof sx === "number")) ||
				(! (typeof sy === "number")) ||
				(! (typeof sz === "number")) ||
				(! (id in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.base[id].sx = sx;
		this.diagram.L2.base[id].sy = sy;
		this.diagram.L2.base[id].sz = sz;

		this.broadcastMessage({
				m: "X",
				d: {
					v: "L2",
					t: "base",
					i: id,
					x: sx, y: sy, z: sz,
				}			
		})
	}

	resizeL2Device(ws, id, sx, sy, sz) {
		// Verify Parameters
		if (
				(! (typeof sx === "number")) ||
				(! (typeof sy === "number")) ||
				(! (typeof sz === "number")) ||
				(! (id in this.diagram.L2.device))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.device[id].sx = sx;
		this.diagram.L2.device[id].sy = sy;
		this.diagram.L2.device[id].sz = sz;

		this.broadcastMessage({
				m: "X",
				d: {
					v: "L2",
					t: "device",
					i: id,
					x: sx, y: sy, z: sz,
				}			
		})
	}

	resizeL2Symbol(ws, id, sx, sy, sz) {
		// Verify Parameters
		if (
				(! (typeof sx === "number")) ||
				(! (typeof sy === "number")) ||
				(! (typeof sz === "number")) ||
				(! (id in this.diagram.L2.symbol))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.symbol[id].sx = sx;
		this.diagram.L2.symbol[id].sy = sy;
		this.diagram.L2.symbol[id].sz = sz;

		this.broadcastMessage({
				m: "X",
				d: {
					v: "L2",
					t: "symbol",
					i: id,
					x: sx, y: sy, z: sz,
				}			
		})
	}

	settingsL2Base(ws, id, name, color1, color2, t1name, t2name, sy, tsx, tsy) {
		// Check parameters
		if (
				(! (typeof name === "string")) ||
				(name.length > 128) ||
				(! (typeof color1 === "number")) ||
				(color1 < 0) ||
				(! (typeof color2 === "number")) ||
				(color2 < 0) ||
				(! (typeof sy === "number")) ||
				(! (typeof tsx === "number")) ||
				(! (typeof tsy === "number")) ||
				(! (typeof t1name === "string")) ||
				(t1name.length > 16) ||
				(! (typeof t2name === "string")) ||
				(t2name.length > 16) ||
				(! (id in this.diagram.L2.base))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}
		this.diagram.L2.base[id].name = name;
		this.diagram.L2.base[id].color1 = color1;
		this.diagram.L2.base[id].color2 = color2;
		this.diagram.L2.base[id].t1name = t1name;
		this.diagram.L2.base[id].t2name = t2name;
		this.diagram.L2.base[id].sy = sy;
		this.diagram.L2.base[id].tsx = tsx;
		this.diagram.L2.base[id].tsy = tsy;

		// Check and update all devices on this level
		for(let devid in this.diagram.L2.device) {
			if (this.diagram.L2.device[devid].base == id) {
				this.diagram.L2.device[devid].py = sy;
			}
		}

		this.broadcastMessage({
			m: "P",
			d: {
				v: "L2",
				t: "base",
				i: id,
				name: name, color1: color1, color2: color2, t1name: t1name, t2name: t2name, sy:sy, tsx: tsx, tsy: tsy
			}
		})
	}

	settingsL2Device(ws, id, name, color1, color2, ifnaming) {
		// Check parameters
		if (
				(! (typeof name === "string")) ||
				(name.length > 128) ||
				(! (typeof color1 === "number")) ||
				(color1 < 0) ||
				(! (typeof color2 === "number")) ||
				(color2 < 0) ||
				(! (typeof ifnaming === "object")) ||
				(! (ifnaming.constructor === Array)) ||
				(! (id in this.diagram.L2.device))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}
		for(let x = 0; x < ifnaming.length; x++) 
			if(typeof ifnaming[x] !== "string") {
				wsSendError(ws, "Invalid format");
				return;				
			}


		this.diagram.L2.device[id].name = name;
		this.diagram.L2.device[id].color1 = color1;
		this.diagram.L2.device[id].color2 = color2;
		this.diagram.L2.device[id].ifnaming = ifnaming;

		this.broadcastMessage({
			m: "P",
			d: {
				v: "L2",
				t: "device",
				i: id,
				name: name, color1: color1, color2: color2, ifnaming: ifnaming,
			}
		})
	}

	settingsL2Link(ws, id, type, order, color, weight, height) {
		if (
				(! (typeof type === "number")) ||
				(! (typeof order === "string")) ||
				(! (typeof color === "number")) ||
				(! (typeof weight === "number")) ||
				(! (typeof height === "number")) ||
				(! (id in this.diagram.L2.link))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.link[id].type = type;
		this.diagram.L2.link[id].order = order;
		this.diagram.L2.link[id].linedata.color = color;
		this.diagram.L2.link[id].linedata.height = height;

		this.broadcastMessage({
			m: "P",
			d: {
				v: "L2",
				t: "link",
				i: id,
				type: type, order: order, color: color, weight: weight, height: height,
			}
		})
	}
	
	settingsL2Text(ws, id, text, height, depth, py, color) {
		if (
				(! (typeof text === "string")) ||
				(! (text.length > 0)) ||
				(! (text.length < 64)) ||
				(! (typeof height === "number")) ||
				(! (typeof depth === "number")) ||
				(! (typeof color === "number")) ||
				(! (typeof py === "number")) ||
				(! (id in this.diagram.L2.text))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.text[id].text = text;
		this.diagram.L2.text[id].height = height;
		this.diagram.L2.text[id].depth = depth;
		this.diagram.L2.text[id].color = color;
		this.diagram.L2.text[id].py = py;

		this.broadcastMessage({
			m: "P",
			d: {
				v: "L2",
				t: "text",
				i: id,
				text: text, py: py, color: color, height: height, depth: depth,
			}
		})
	}

	settingsL2SymbolFlag(ws, id, color, flagcolor) {
		if (
				(! (typeof color === "number")) ||
				(! (typeof flagcolor === "number"))
			) {
			wsSendError(ws, "Invalid format");
			return;
		}

		this.diagram.L2.symbol[id].color = color;
		this.diagram.L2.symbol[id].cd.flagcolor = flagcolor;		

		this.broadcastMessage({
			m: "P",
			d: {
				v: "L2",
				t: "symbol",
				i: id,
				color: color, flagcolor: flagcolor,
			}
		})
	}

	settingsL2Symbol(ws, d) {
		if (
				(! (d.i in this.diagram.L2.symbol))
			) {
			wsSendError(ws, "Invalid format");
			return;	
		}
		if(this.diagram.L2.symbol[d.i].type == "F")
			this.settingsL2SymbolFlag(ws, d.i, d.color, d.flagcolor)
	}

	configL2Device(ws, d) {
		if (
				(! (d.i in this.diagram.L2.device))
			) {
			wsSendError(ws, "Device doesn't exist");
			return;	
		}

		if(typeof(d.vlans) !== "object" || typeof(d.vrfs) !== "object" || typeof(d.svis) !== "object" || typeof(d.los) !== "object") {
			wsSendError(ws, "Invalid format");
			return;	
		}
		// Verify correctness of vlans and vrfs
		let vlans = {};
		let vrfs = {};
		let svis = {};
		let los = {};
		for(let vlan_tag in d.vlans) {
			let vlan = d.vlans[vlan_tag];
			if(
					(typeof(vlan) !== "object") ||
					(isNaN(vlan_tag)) ||
					(vlan_tag < 0) ||
					(vlan_tag > 4093) ||
					(typeof(vlan.name) != "string") ||
					(vlan.name.length > 32)
					) {
				wsSendError(ws, "Invalid format (vlans)");
				return;
			}
			vlans[vlan_tag] = { name: vlan.name };
		}
		for(let vrf_rd in d.vrfs) {
			let vrf = d.vrfs[vrf_rd];
			if(
					(typeof(vrf) !== "object") ||
					(typeof(vrf.name) != "string") ||
					(vrf.name.length > 32) ||
					(vrf_rd.length > 32)
					) {
				wsSendError(ws, "Invalid format (vrfs)");
				return;
			}
			vrfs[vrf_rd] = { name: vrf.name };
		}
		for(let svi_tag in d.svis) {
			let svi = d.svis[svi_tag];
			if(
					(typeof(svi) !== "object") ||
					(isNaN(svi_tag)) ||
					(svi_tag < 0) ||
					(svi_tag > 4093) ||
					(typeof(svi.name) != "string") ||
					(svi.name.length > 32) ||
					(! svi.ipv4 instanceof Array) ||
					(! svi.ipv6 instanceof Array)
					) {
				wsSendError(ws, "Invalid format (svis)");
				return;
			}

			// Check ips:
			for(let x = 0; x < svi.ipv4.length; x++) {
				if(net.getIPv4Interface(svi.ipv4[x]) === undefined) {
					wsSendError(ws, "Invalid format (svis ipv4)");
					return;
				}
			}
			for(let x = 0; x < svi.ipv6.length; x++) {
				if(net.getIPv6Interface(svi.ipv6[x]) === undefined) {
					wsSendError(ws, "Invalid format (svis ipv6)");
					return;	
				}
			}

			svis[svi_tag] = { name: svi.name, ipv4: svi.ipv4, ipv6: svi.ipv6 };
		}

		for(let lo_id in d.los) {
			let lo = d.los[lo_id];
			if(
					(typeof(lo) !== "object") ||
					(isNaN(lo_id)) ||
					(lo_id < 0) ||
					(lo_id > 10) ||
					(typeof(lo.name) != "string") ||
					(lo.name.length > 32) ||
					(! lo.ipv4 instanceof Array) ||
					(! lo.ipv6 instanceof Array)
					) {
				wsSendError(ws, "Invalid format (loopback)");
				console.log(d);
				return;
			}

			// Check ips:
			for(let x = 0; x < lo.ipv4.length; x++) {
				if(net.getIPv4Interface(lo.ipv4[x]) === undefined) {
					wsSendError(ws, "Invalid format (loopbacks ipv4)");
					return;
				}
			}
			for(let x = 0; x < lo.ipv6.length; x++) {
				if(net.getIPv6Interface(lo.ipv6[x]) === undefined) {
					wsSendError(ws, "Invalid format (loopbacks ipv6)");
					return;	
				}
			}

			los[lo_id] = { name: lo.name, ipv4: lo.ipv4, ipv6: lo.ipv6 };
		}

		this.diagram.L2.device[d.i].vlans = vlans;
		this.diagram.L2.device[d.i].vrfs = vrfs;
		this.diagram.L2.device[d.i].svis = svis;
		this.diagram.L2.device[d.i].los = los;

		this.broadcastMessage({
			m: "C",
			d: {
				v: "L2",
				t: "device",
				i: d.i,
				vlans: vlans,
				vrfs: vrfs,
				svis: svis,
				los: los,
			}
		});
	}

	deleteL2Base(ws, id) {
		if(id in this.diagram.L2.base) {
			delete this.diagram.L2.base[id];

			this.broadcastMessage({
				m: "D",
				d: {
					v: "L2",
					t: "base",
					i: id
				}
			});
		}
		else {
			wsSendError(ws, "Base Element doesn't exist");
		}
	}

	deleteL2Device(ws, id) {
		if(id in this.diagram.L2.device) {
			delete this.diagram.L2.device[id];
			for (let linkid in this.diagram.L2.link) {
				for(let x = 0; x < this.diagram.L2.link[linkid].devs.length; x++) {
					if (this.diagram.L2.link[linkid].devs[x].id == id) {
						delete this.diagram.L2.link[linkid];
						console.log("Deleted extra link");
						break;
					}
				}
			}

			this.broadcastMessage({
				m: "D",
				d: {
					v: "L2",
					t: "device",
					i: id
				}
			});
		}
		else {
			wsSendError(ws, "Device doesn't exist");
		}
	}

	deleteL2Link(ws, id) {
		if(id in this.diagram.L2.link) {
			delete this.diagram.L2.link[id];

			this.broadcastMessage({
				m: "D",
				d: {
					v: "L2",
					t: "link",
					i: id
				}
			});
		}
		else {
			wsSendError(ws, "Link doesn't exist");
		}
	}

	deleteL2Joint(ws, link_id, point_index) {
		if(
			(typeof point_index === "number") &&
			(typeof link_id === "string") &&
			(link_id in this.diagram.L2.link) &&
			(point_index < this.diagram.L2.link[link_id].linedata.points.length) &&
			(point_index >= 0)
			) {
			this.diagram.L2.link[link_id].linedata.points.splice(point_index, 1);

			this.broadcastMessage({
				m: "D",
				d: {
					v: "L2",
					t: "joint",
					i: link_id,
					pi: point_index,
				}
			});
		}
		else {
			wsSendError(ws, "Joint doesn't exist");
		}
	}

	deleteL2Text(ws, id) {
		if(id in this.diagram.L2.text) {
			delete this.diagram.L2.text[id];

			this.broadcastMessage({
				m: "D",
				d: {
					v: "L2",
					t: "text",
					i: id
				}
			});
		}
		else {
			wsSendError(ws, "Text doesn't exist");
		}
	}

	deleteL2Symbol(ws, id) {
		if(id in this.diagram.L2.symbol) {
			delete this.diagram.L2.symbol[id];

			this.broadcastMessage({
				m: "D",
				d: {
					v: "L2",
					t: "symbol",
					i: id
				}
			});
		}
		else {
			wsSendError(ws, "Symbol doesn't exist");
		}
	}


}

module.exports = ETMap;