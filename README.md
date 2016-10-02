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

radio.open(
	(err) => {
		if (err !== null) {
			console.log(err);
		} else {
			radio.volume = 4;
			radio.narrow = true;
			radio.rxFrequency = 146.52;
			radio.txFrequency = 146.52;
			radio.CSS = DRA818.TCS;
			radio.rxTCS = 0;
			radio.txTCS = 0;
			radio.squelch = 0;
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