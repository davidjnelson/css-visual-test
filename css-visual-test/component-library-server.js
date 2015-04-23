var path = require( 'path' ),
	connect = require( path.resolve( 'node_modules' ) + '/connect' ),
	winston = require( path.resolve( 'node_modules' ) + '/winston' ),
	portScanner = require( path.resolve( 'node_modules' ) + '/portscanner' ),
	psAux = require( path.resolve( 'node_modules' ) + '/ps-aux' ),
	config = require( __dirname + '/lib/Config' ),
	componentLibraryServerRunning = false,
	port9200Open = false,
	componentLibraryServerPort = config.componentLibraryPort,
	printToConsoleAndExit = function( message, code ) {
		winston.error( message );
		process.exit( code );
	};

psAux.singleton.parsed(function ( error, processList ) {
	var serverProcessesRunning = 0;

	if( error ) {
		printToConsoleAndExit( 'Error calling ps aux: ' + error.message );
	}

	processList.forEach( function( process ) {
		if( process.command.indexOf( 'css-visual-test/component-library-server.js' ) > 0 ) {
			serverProcessesRunning++;
		}
	} );

	// exclude the process running the check
	if( serverProcessesRunning > 1 ) {
		componentLibraryServerRunning = true;
	}

	portScanner.checkPortStatus( componentLibraryServerPort, 'localhost', function( error, status ) {
		if( status === 'open' ) {
			port9200Open = true;
		}

		// I'm intentionally not including the case where the server is running on a port that is not 9200,
		// because the tests depend on that port.
		if( port9200Open &&
			! componentLibraryServerRunning ) {
			// the port being in use is a fatal error and should stop excecution of the rest of the steps in the test
			printToConsoleAndExit( 'Port ' + componentLibraryServerPort + ' is in use by something other than the Component Library ' +
				'Server.  Please shut down the program using this port and try again.', 1 );
		} else if( ! port9200Open &&
				   ! componentLibraryServerRunning ) {
			connect(
				connect.static( path.join( __dirname, 'component-library' ) ) // Serve the component library
			).listen( componentLibraryServerPort );

			winston.info( 'Component Library Server started on port ' + componentLibraryServerPort + '.' );
		} else if( port9200Open &&
				   componentLibraryServerRunning ) {
			printToConsoleAndExit( 'Component Library Server is already running on port ' + componentLibraryServerPort +
			'. Server not started.', 0 );
		}
	});
} );

