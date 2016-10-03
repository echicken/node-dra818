const util = require('util');
const EventEmitter = require('events').EventEmitter;
const SerialPort = require('serialport');

const CSS_CODES = [
	"0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008",	"0009",
	"0010", "0011", "0012", "0013", "0014", "0015", "0016", "0017", "0018",
	"0019", "0020", "0021", "0022", "0023", "0024", "0025", "0026", "0027",
	"0028", "0029", "0030", "0031", "0032", "0033", "0034", "0035", "0036",
	"0037", "0038"
];

const TONE_MAP = [
	67, 71.9, 74.4, 77, 79.7, 82.5, 85.4, 88.5, 91.5,
	94.8, 97.4, 100, 103.5, 107.2, 110.9, 114.8, 118.8, 123,
	127.3, 131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 162.2, 167.9,
	173.8, 179.9, 186.2, 192.8, 203.5, 210.7, 218.1, 225.7, 233.6,
	241.8, 250.3
];

const PL_MAP = [
	'XZ', 'XA', 'WA', 'XB', 'WB', 'YZ', 'YA', 'YB', 'ZZ',
	'ZA', 'ZB', '1Z', '1A', '1B', '2Z', '2A', '2B', '3Z',
	'3A', '3B', '4Z', '4A', '4B', '5Z', '5A', '5B', '6Z',
	'6A', '6B', '7Z', '7A', 'M1', 'M2', 'M3', 'M4', 'M5',
	'M6', 'M7'
];

const DCS_CODES = [
	"023I", "025I", "026I", "031I", "032I", "043I", "047I", "051I", "065I",
	"071I", "072I", "073I", "074I", "114I", "115I", "116I", "125I", "131I",
	"132I", "134I", "143I", "152I", "155I", "156I", "162I", "172I", "174I",
	"205I", "223I", "226I", "243I", "244I", "245I", "251I", "261I", "263I",
	"265I", "271I", "306I", "311I", "315I", "331I", "343I", "346I", "351I",
	"364I", "365I", "371I", "411I", "412I", "413I", "423I", "431I", "432I",
	"445I", "464I", "465I", "466I", "503I", "506I", "516I", "532I", "546I",
	"565I", "606I", "612I", "624I", "627I", "631I", "632I", "654I", "662I",
	"664I", "703I", "712I", "723I", "731I", "732I", "734I", "743I", "754I",
	"023N", "025N", "026N", "031N", "032N", "043N", "047N", "051N", "065N",
	"071N", "072N", "073N", "074N", "114N", "115N", "116N", "125N", "131N",
	"132N", "134N", "143N", "152N", "155N", "156N", "162N", "172N", "174N",
	"205N", "223N", "226N", "243N", "244N", "245N", "251N", "261N", "263N",
	"265N", "271N", "306N", "311N", "315N", "331N", "343N", "346N", "351N",
	"364N", "365N", "371N", "411N", "412N", "413N", "423N", "431N", "432N",
	"445N", "464N", "465N", "466N", "503N", "506N", "516N", "532N", "546N",
	"565N", "606N", "612N", "624N", "627N", "631N", "632N", "654N", "662N",
	"664N", "703N", "712N", "723N", "731N", "732N", "734N", "743N", "754N"
];

DRA818 = { VHF : 0, UHF : 1 };

DRA818.Module = function (port, type) {

	var self = this;
	EventEmitter.call(this);

	var commandQueue = [],
		responseQueue = [],
		settingsQueue = [],
		waiting = false;

	var settings = {
		open : false,
		volume : 4,
		squelch : 4,
		narrow : true,
		txF : type === DRA818.VHF ? '146.5200' : '446.0000',
		rxF : type === DRA818.VHF ? '146.5200' : '446.0000',
		txS : '0000',
		rxS : '0000'
		tailtone : false,
		emphasis : false,
		highpass : false,
		lowpass : false,
	};

	var rssi = {
		value : 0,
		interval : 0,
		evt : null
	};

	/*	Shadow settings object; these settings will be applied to
		'settings' above if we get success message from the DRA818 module. */
	var _settings = {};
	Object.keys(settings).forEach((k) => { _settings[k] = settings[k]; });
	
	this.handle = new SerialPort(port, { autoOpen : false });

	this.handle.on(
		'data', (data) => {
			data = data.toString().trim();
			var rssi = data.match(/^RSSI=(\d+)$/);
			if (rssi !== null) {
				rssi.value = parseInt(rssi[1]);
				self.emit('rssi', rssi.value);
				return;
			}
			if (responseQueue.length < 1) {
				this.emit('error', 'Response without command: ' + data);
			} else {
				var expected = responseQueue.shift();
				var setting = settingsQueue.shift();
				if (data === expected) {
					settings[setting] = _settings[setting];
					this.emit('change', setting, settings[setting]);
				} else {
					this.emit('changeError', setting, settings[setting]);
				}
			}
			waiting = false;
			_sendCommand();
		}
	);

	// Re-throw SerialPort events except 'open' and 'data'
	this.handle.on('error', (err) => { this.emit('error', err); });
	this.handle.on('disconnect', (err) => { this.emit('disconnect', err); });
	this.handle.on('close', () => { this.emit('close'); });

	function _sendCommand() {
		if (!waiting && commandQueue.length > 0) {
			var command = commandQueue.shift();
			if (typeof command === 'function') command = command();
			self.handle.write(command + '\r\n');
			waiting = true;
		}
	}

	function sendCommand(command, response, setting, value) {
		if (typeof command !== 'function' && setting !== 'open') {
			command += (typeof value === 'boolean' ? (value ? 1 : 0) : value);
		}
		commandQueue.push(command);
		responseQueue.push(response);
		settingsQueue.push(setting);
		_settings[setting] = value;
		_sendCommand();
	}

	function setGroupCommand() {
		return util.format(
			'AT+DMOSETGROUP=%s,%s,%s,%s,%s,%s',
			_settings.narrow ? 0 : 1,
			_settings.txF,
			_settings.rxF,
			_settings.txS,
			_settings.squelch,
			_settings.rxS
		);
	}

	function setFilterCommand() {
		return util.format(
			'AT+SETFILTER=%s,%s,%s',
			_settings.emphasis ? 1 : 0,
			_settings.highpass ? 1 : 0,
			_settings.lowpass ? 1 : 0
		);
	}

	function getSetInt(setting, min, max, pad, command, response) {
		Object.defineProperty(
			self, setting, {
				get : function () { return settings[setting]; },
				set : function (value) {
					value = parseInt(value);
					if (isNaN(value) || value < min || value > max) {
						throw 'Invalid ' + setting + ': ' + value;
						return;
					}
					if (pad > 0) {
						value += '';
						while (value.length < pad) { value = '0' + value; }
					}
					if (response !== null) {
						sendCommand(command, response, setting, value);
					} else {
						settings[setting] = value;
						self.emit('change', setting, value);
					}
				}
			}
		);
	}

	function getSetFloat(setting, min, max, command, response) {
		Object.defineProperty(
			self, setting, {
				get : function () { return settings[setting]; },
				set : function (value) {
					value = parseFloat(value);
					if (isNaN(value) || value < min || value > max) {
						throw 'Invalid ' + setting + ': ' + value;
						return;
					}
					value = value.toFixed(4);
					sendCommand(command, response, setting, value);
				}
			}
		);
	}

	function getSetBool(setting, command, response) {
		Object.defineProperty(
			self, setting, {
				get : function () { return settings[setting]; },
				set : function (value) {
					if (typeof value !== 'boolean') {
						throw 'Invalid ' + setting + ': ' + value;
						return;
					}
					sendCommand(command, response, setting, value);
				}
			}
		);
	}

	function setCSS(setting, value) {
		if (typeof value === 'string') {
			if (CSS_CODES.indexOf(value) >= 0) {
				sendCommand(setGroupCommand, '+DMOSETGROUP:0', setting, value);
			} else if (DCS_CODES.indexOf(value) >= 0) {
				sendCommand(setGroupCommand, '+DMOSETGROUP:0', setting, value);
			} else if (PL_MAP.indexOf(value) >= 0) {
				sendCommand(
					setGroupCommand,
					'+DMOSETGROUP:0',
					setting,
					CSS_CODES[PL_MAP.indexOf(value)]
				);
			} else {
				throw 'Invalid ' + setting + ': ' + value;
			}
		} else if (typeof value === 'number') {
			if (value === 0) {
				sendCommand(setGroupCommand, '+DMOSETGROUP:0', setting, '0000');
			} else if (value <= 38) {
				value += '';
				while (value.length < 4) { value = '0' + value; }
				sendCommand(setGroupCommand, '+DMOSETGROUP:0', setting, value);
			} else if (TONE_MAP.indexOf(value) >= 0) {
				sendCommand(
					setGroupCommand,
					'+DMOSETGROUP:0',
					setting,
					CSS_CODES[TONE_MAP.indexOf(value)]
				);
			} else {
				throw 'Invalid ' + setting + ': ' + value;
			}
		}
	}

	function getSetCSS(setting) {
		Object.defineProperty(
			self, setting, {
				get : function () { return settings[setting]; },
				set : function (value) { setCSS(setting, value); }
			}
		);
	}

	getSetInt('volume', 1, 8, 0, 'AT+DMOSETVOLUME=', '+DMOSETVOLUME:0');
	getSetInt('squelch', 0, 8, 0, setGroupCommand, '+DMOSETGROUP:0');

	if (type === DRA818.VHF) {
		getSetFloat('txF', 134, 174, setGroupCommand, '+DMOSETGROUP:0');
		getSetFloat('rxF', 134, 174, setGroupCommand, '+DMOSETGROUP:0');
	} else {
		getSetFloat('txF', 400, 480, setGroupCommand, '+DMOSETGROUP:0');
		getSetFloat('rxF', 400, 480, setGroupCommand, '+DMOSETGROUP:0');		
	}

	getSetCSS('txS');
	getSetCSS('rxS');

	getSetBool('narrow', setGroupCommand, '+DMOSETGROUP:0');
	getSetBool('emphasis', setFilterCommand, '+DMOSETFILTER:0');
	getSetBool('highpass', setFilterCommand, '+DMOSETFILTER:0');
	getSetBool('lowpass', setFilterCommand, '+DMOSETFILTER:0');
	getSetBool('tailtone', 'AT+SETFILTER=', '+DMOSETFILTER:0');

	Object.defineProperty(
		this, 'rssi', {
			get : function () { return rssi.value; },
			set : function () {}
		}
	);

	Object.defineProperty(
		this, 'rssiInterval', {
			get : function () { return rssi.interval; },
			set : function (value) {
				value = parseInt(value);
				if (isNaN(value) || value < 0) {
					throw 'Invalid rssiInterval setting: ' + value;
					return;
				}
				if (rssi.evt !== null) {
					clearInterval(rssi.evt);
					rssi.evt = null;
				}
				if (value > 0) {
					rssi.evt = setInterval(
						() => {
							self.handle.write('RSSI?\r\n');
						},
						value
					);
				}
			}
		}
	);

	this.init = function () {
		settings.open = false;
		sendCommand('AT+DMOCONNECT', '+DMOCONNECT:0', 'open', true);
	}

	this.open = function (callback) {
		this.handle.on(
			'open', () => {
				this.init();
				callback();
			}
		);
		this.handle.open((e) => { if (e !== null) this.emit('error', e); });
	}

	this.close = this.handle.close;

}
util.inherits(DRA818.Module, EventEmitter);

module.exports = DRA818;