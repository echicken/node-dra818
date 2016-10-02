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
	- UHF
	- TCS
	- DCS
	- Module

### Module properties

- volume
- squelch
- narrow
- CSS
- txTCS
- rxTCS
- txDCS
- rxDCS
- tailtone
- emphasis
- highpass
- lowpass
- rxFrequency
- txFrequency

### Module methods

- open(callback)
- close(callback)
- getRSSI(callback)

### Module events

- error
- disconnect
- close

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