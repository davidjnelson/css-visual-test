// The highest value here for the lowest cost at the highest speed is to use the most popular operations systems,
// and the most popular rendering engines across six parallel virtual machines on sauce labs:

// Windows 7 Chrome 41/Latest, Blink rendering engine, Windows 7 operating system
// Windows 7 Firefox 37/Latest, Gecko rendering engine
// Windows 7 IE 11/Latest, Trident Rendering Engine
// IOS Safari 8.2/Latest, Webkit Rendering Engine, IOS operating system
// Android 4.4, Android operating system
// OSX Chrome 41/Latest, OSX Operating System
module.exports = {
	"environments": [
		{
			"browserName": "chrome",
			"platform": "Windows 7",
			"version": "41.0",
			"commandTimeout": 600,
			"idleTimeout": 600
		}
		// Applitools free plan allows for one concurrent vm and sauce labs free plan allows for two concurrent vms.
		// Therefore, leave the most useful variations commented out in this file.  You can add as many as you want
		// using the Sauce Labs Platform Configurator Tool ( select nodejs ): https://docs.saucelabs.com/reference/platforms-configurator/#/
		/*,
		{
			"browserName": "firefox",
			"platform": "Windows 7",
			"version": "37.0",
			"commandTimeout": 600,
			"idleTimeout": 600
		},
		{
			"browserName": "internet explorer",
			"platform": "Windows 7",
			"version": "11.0",
			"commandTimeout": 600,
			"idleTimeout": 600
		},
		{
			"browserName": "iphone",
			"platform": "OS X 10.10",
			"version": "8.2",
			"deviceName": "iPhone Simulator",
			"device-orientation": "portrait",
			"commandTimeout": 600,
			"idleTimeout": 600
		},
		{
			"browserName": "android",
			"platform": "Linux",
			"version": "4.4",
			"deviceName": "Android Emulator",
			"device-orientation": "portrait",
			"commandTimeout": 600,
			"idleTimeout": 600
		},
		{
			"browserName": "chrome",
			"platform": "OS X 10.10",
			"version": "41.0",
			"commandTimeout": 600,
			"idleTimeout": 600
		}*/
	]
};
