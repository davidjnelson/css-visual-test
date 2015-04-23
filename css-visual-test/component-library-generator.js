var componentLibraryGenerator = require( __dirname + '/lib/ComponentLibraryGenerator' ),
	manifestBuilder = require( __dirname + '/lib/ManifestBuilder' );

manifestBuilder.buildTestManifest( 'Calypso' )
	.then( componentLibraryGenerator.generateComponentLibrary )
	.then( function() {
		process.exit( 0 );
	} )
	.catch( function( error ) {
		console.log( error.stack );
		process.exit( 1 );
	} );
