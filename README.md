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

radio.open(
	(err) => {
		if (err !== null) {
			console.log(err);
		} else {
			try {
				radio.volume = 4;
				radio.narrow = true;
				radio.rxFrequency = 146.52;
				radio.txFrequency = 146.52;
				radio.CSS = DRA818.TCS;
				radio.rxTCS = 0;
				radio.txTCS = 0;
				radio.squelch = 0;
			} catch (err) {
				console.log(err);
			}
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
	- TCS
		- If using CTCSS, set Module.TCS to DRA818.TCS to tell it to use tone squelch.
	- DCS
		- If using CDCSS, set Module.TCS to DRA818.DCS to tell it to use digital squelch.
	- Module(port, type)
		- Module constructor, where 'port' is a serial port (eg. 'COM4' or '/dev/ttyS0') and 'type' is one of DRA818.VHF or DRA818.UHF

### Module properties

- volume
	- Integer in the range of 1 - 8
- squelch
	- Integer in the range of 0 - 8
- narrow
	- Boolean, true for 12.5 kHz bandwidth, false for 25 kHz bandwidth
- CSS
	- The Coded Squelch System in use, one of DRA818.TCS or DRA818.DCS
- txTCS
	- Integer in the range of 0 - 38
	- The TCS tone in use on the transmit frequency when in TCS mode
	- Set to 0 to disable transmit TCS
- rxTCS
	- Integer in the range of 0 - 38
	- The TCS tone in use on the receive frequency when in TCS mode
	- Set to 0 to disable receive TCS
- txDCS
	- String describing the DCS code in use on the transmit frequency
	- See the DCS_CODES array in index.js for possible values
- rxDCS
	- String describing the DCS code in use on the receive frequency
	- See the DCS_CODES array in index.js for possible values
- tailtone
	- Boolean, set to true to turn on the 'tailtone' function, false otherwise
- emphasis
	- Boolean, enable or disable the pre/de-emphasis filter
- highpass
	- Boolean, enable or disable the high-pass filter
- lowpass
	- Boolean, enable or disable the low-pass filter
- rxFrequency
	- Float, the receive frequency
	- Up to four digits of precision
	- Must be within the frequency range of the module
- txFrequency
	- Float, the transmit frequency
	- Up to four digits of precision
	- Must be within the frequency range of the module

### Module methods

- open(callback)
	- Open the serial port and connect to the module
	- Callback receives an error argument, which is null upon success
- close(callback)
	- Close the serial port
	- Callback receives no arguments
- getRSSI(callback)
	- Get the Received Signal Strength Indicator
	- Callback receives two arguments, error and RSSI
		- If error is null, RSSI will be an integer in the range of 0 - 255
		- If error is not null, RSSI couldn't be read and will be null

### Module events

- change
	- A setting was changed successfully.  Your callback will receive two arguments: the name of the setting, and the new value.
- error
	- Something went wrong; your callback will get an error argument
- disconnect
	- The module has been disconnected
- close
	- The connection to the module has been closed

### Notes on CTCSS and CDCSS

The Module.CSS property defines which type of Coded Squelch System is currently
in use.  This should be one of DRA818.TCS or DRA818.DCS for Tone Coded Squelch
and Digital Code Squelch, respectively.

The Module.txTCS and rxTCS properties define which tones will be used on the
transmit and receive frequencies when Module.CSS is set to DRA818.TCS.  Set one
or both of these to 0 if you don't want tone squelch on that frequency.

The Module.txDCS and rxDCS properties define which codes will be used on the
transmit and receive frequencies when Module.CSS is set to DRA818.DCS.  These
values must correspond to entries in the DCS_CODES array.  (See index.js)

To disable CSS, set Module.CSS to DRA818.TCS, set Module.txTCS to 0, and set
Module.rxTCS to 0.  CSS is disabled by default.

I neglected to consider that someone might want to use tone squelch on one
frequency and digital squelch on the other.  I can make this possible if anyone
wants it.

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
