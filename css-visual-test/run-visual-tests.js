var ParallelTestPartitioner = require( __dirname + '/lib/ParallelTestPartitioner' ),
	ParallelTestRunner = require( __dirname + '/lib/ParallelTestRunner' ),
	ComponenentLibraryGenerator = require( __dirname + '/lib/ComponentLibraryGenerator' ),
	ManifestBuilder = require( __dirname + '/lib/ManifestBuilder' ),
	Config = require( __dirname + '/lib/Config' ),
	winston = require( 'winston' );

winston.level = Config.logLevel;

ManifestBuilder.buildTestManifest( Config )
	.then( ComponenentLibraryGenerator.generateComponentLibrary )
	.then( ParallelTestPartitioner.partitionComponentManifest )
	.then( ParallelTestRunner.executeTestRun )
	.catch( function( error ) {
		winston.error( error.stack );
		process.exit( 1 );
	} );
