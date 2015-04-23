var privateConfig = require( __dirname + '/PrivateConfig' ),
	path = require( 'path' ),
	lodashExtend = require( path.resolve( 'node_modules' ) + '/lodash/object/extend' ),
	componentLibraryPort = 4000,
	Config = {
		// IOS Tests vms are crazy slow to start
		singleMobileTestRunWorstCaseRunningTimeSeconds: 50,
		// there must always be at least as many parallel virtual machines as there is environments ( browser/os/device combinations )
		parallelVirtualMachinesCount: 1,
		projectName: 'CSS Visual Test',
		seleniumGridHubUrl: 'http://ondemand.saucelabs.com:80/wd/hub',
		componentLibraryPort: componentLibraryPort,
		componentLibraryUrl: 'http://localhost:' + componentLibraryPort + '/',
		logLevel: 'info' // use debug for debugging, info otherwise
	};

lodashExtend( Config, privateConfig );

module.exports = Config;
