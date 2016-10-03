# node-dra818
Control a Dorji DRA818 module on a serial port using node.js.

### Use:

```js
const DRA818 = require('dra818');

var radio = new DRA818.Module('/dev/ttyS0', DRA818.VHF);

radio.on(
	'error', (err) => {
		console.log(err);
	}
);

radio.on(
	'change', (setting, value) => {
		console.log(setting + ' changed to ' + value);
	}
);

radio.on(
	'changeError', (setting, value) => {
		console.log('Failed to change ' + setting + ' to ' + value);
		// Reset and retry?
		radio.init();
		radio[setting] = value;
	}
);

radio.open(
	() => {
		try {
			radio.volume = 4;
			radio.narrow = true;
			radio.rxF = 146.52;
			radio.txF = 146.52;
			radio.rxS = 0;
			radio.txS = 0;
			radio.squelch = 0;
		} catch (err) {
			console.log(err);
		}
	}
);
```

### Properties

- DRA818
	- VHF
		- When making a Module, pass this as the 'type' argument if using a DRA818V
	- UHF
		- When making a Module, pass this as the 'type' argument if using a DRA818U or DRA818M
	- TCS_CODES
		- An array of valid CTCSS codes for use with DRA818.Module[rxS, txS]
	- TONE_MAP
		- An array of valid CTCSS frequencies for use with DRA818.Module[rxS, txS]
	- PL_MAP
		- An array of valid Motorla PL tone names for use with DRA818.Module[rxS, txS]
	- DCS_CODES
		- An array of valid CDCSS codes for use with DRA818.Module[rxS, txS]
	- Module(port, type)
		- Module constructor, where 'port' is a serial port (eg. 'COM4' or '/dev/ttyS0') and 'type' is one of DRA818.VHF or DRA818.UHF

### Module properties

- volume
	- Integer in the range of 1 - 8
- squelch
	- Integer in the range of 0 - 8
- narrow
	- Boolean, true for 12.5 kHz bandwidth, false for 25 kHz bandwidth
- rxF, txF
	- Float, up to four digits of precision
	- The receive (rxF) or transmit (txF) frequency, in MHz
	- Must be within the frequency range of the DRA818 module
		- DRA818V: 134.0000 to 174.0000
		- DRA818U/M: 400.0000 to 480.0000
- rxS, txS
	- Set the tone squelch or digital code squelch in use on the receive (rxS) or transmit (txS) frequency
	- Integer in the range of 0 - 38
		- 0 to disable CTCSS/CDCSS
		- 1 - 38 to use the corresponding CTCSS code
	- Float
		- Use a particular CTCSS tone, by frequency in Hz; must match one of the tones specified in TONE_MAP (see index.js)
	- String
		- A DCS code (eg. "023I" or "023N"); must match one of the codes specified in DCS_CODES (see index.js)
		- A Motorola PL tone name (eg. "XZ", "M1"); must match one of the codes specified in PL_MAP
- tailtone
	- Boolean, true to turn on the 'tailtone' function, false otherwise
- emphasis
	- Boolean, enable or disable the pre/de-emphasis filter
- highpass
	- Boolean, enable or disable the high-pass filter
- lowpass
	- Boolean, enable or disable the low-pass filter
- rssi
	- Integer in the range of 0 - 255
	- Received Signal Strength Indicator
- rssiInterval
	- Integer >= 0
	- How often to poll the DRA818 module for the RSSI value
	- Set to 0 to disable polling

### Module methods

- open(callback)
	- Open the serial port and connect to the module
	- Callback is called with no arguments after the serial port has been opened
- close(callback)
	- Close the serial port
	- Callback receives no arguments
- init()
	- Sends the AT+DMOCONNECT command to the module and expects a +DMOCONNECT:0 response.
	- Use it to 'reset' the module after an error (can't remember if this is necessary)
	- This method is called automatically by DRA818.Module.open()

### Module events

- change
	- A setting was changed successfully.  Your callback will receive two arguments: the name of the setting, and the new value
- changeError
	- A new setting was not applied successfully.  Your callback will receive two arguments: the name of the setting, and the value that you tried to set it to
- rssi
	- The Received Signal Strength Indicator has been read from the module.  Your callback will receive one argument: the RSSI value, an integer in the range of 0 - 255
- error
	- Something went wrong; your callback will get an error argument
- disconnect
	- The module has been disconnected
- close
	- The connection to the module has been closed

### Notes on the model

This module uses properties of the DRA818.Module object, with getters and
setters, to adjust the settings of a DRA818 module.  When you set a property,
the relevant command is immediately sent over the serial port.  If the module
responds with an error, an 'error' event will be fired.  If the module reports
that the command was successful, a 'change' event will be fired, confirming the
new setting, and your DRA818.Module's corresponding property will be updated to
reflect the new setting.

Efforts are made to validate settings before commands are sent to the module, so
it is unlikely that the DRA818 will ever respond with an error.  If you attempt
to set a property to an illegal value, an exception will be thrown.  In other
words, it's fairly safe to assume that when you set a property, the command will
succeed, so you can choose to ignore the 'change' event if you wish.

There's a bit of inefficiency here in the cases of the DMOSETGROUP and
DMOSETFILTER commnads, which apply several settings at once.  For example, if
you alter the transmit frequency, receive frequency, and squelch setting of your
DRA818.Module object, three commands will be sent over the serial port even
though this could all be accomplished in one go.  Since this all happens quickly
anyhow, I haven't had any problems with it.

I might have used methods and callbacks instead of getters and setters, but it
seemed more natural to present the settings as properties instead.

If you'd prefer a method/callback interface for changing each setting, or want
to be able to issue the DMOSETGROUP or DMOSETFILTER command and change multiple
settings all in one shot, let me know and I'll look at adding it.
