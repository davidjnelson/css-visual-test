var readDirectory = require( 'readdirp' ),
	Q = require( 'q' ),
	path = require( 'path' ),
	winston = require( 'winston' );

var ManifestBuilder = {
	buildTestManifest: function( config ) {
		ManifestBuilder.projectName = config.projectName;
		ManifestBuilder.config = config;

		winston.info( 'Started building test manifest by reading the file system.' )

		return ManifestBuilder.findVisualTestDirectories()
			.then( ManifestBuilder.attachJsxFilesToDirectories )
			.then( ManifestBuilder.assembleTests )
			.then( ManifestBuilder.outputSuccessMessage )
			.catch( function( error ) {
				winston.error( error.stack );
				process.exit( 1 );
			} );
	},
	findVisualTestDirectories: function() {
		var deferred = Q.defer();

		readDirectory( {
			root: path.resolve( 'client' ),
			entryType: 'directories'
		}, function( errors, directoryEntries ) {
			var visualTestDirectories = [];

			ManifestBuilder.handleReadDirectoryError( deferred, 'One or more errors occurred finding visual test directories: ', errors );

			visualTestDirectories = directoryEntries.directories.filter( function( element ) {
				return element.fullPath.indexOf( 'visualtests' ) > -1;
			} );

			visualTestDirectories.sort( function (a, b) {
				if (a.parentDir > b.parentDir) {
					return 1;
				}
				if (a.parentDir < b.parentDir) {
					return -1;
				}

				return 0;
			} );

			deferred.resolve( visualTestDirectories );
		} );

		return deferred.promise;
	},
	attachJsxFilesToDirectories: function( visualTestDirectories ) {
		var deferred = Q.defer(),
			jsxDirectoriesAttached = 0;

		visualTestDirectories.forEach( function( directoryEntry, index ) {
			readDirectory( {
				root: directoryEntry.fullPath,
				depth: 0,
				fileFilter: '*.jsx',
				entryType: 'files'
			}, function( errors, jsxFileEntries ) {
				ManifestBuilder.handleReadDirectoryError( deferred, 'One or more errors occured finding jsx files: ', errors );

				jsxFileEntries.files.sort( function (a, b) {
					if (a.name > b.name) {
						return 1;
					}
					if (a.name < b.name) {
						return -1;
					}

					return 0;
				} );

				visualTestDirectories[ index ].jsxFiles = jsxFileEntries.files;

				jsxDirectoriesAttached++;

				if( jsxDirectoriesAttached === visualTestDirectories.length ) {
					deferred.resolve( visualTestDirectories );
				}
			} );
		} );

		return deferred.promise;
	},
	assembleTests: function( visualTestDirectories ) {
		var deferred = Q.defer(),
			componentManifest = {
				projectName: ManifestBuilder.projectName
			},
			variations = [];

		visualTestDirectories.forEach( function( directoryInfo ) {
			directoryInfo.jsxFiles.forEach( function( jsxFileEntry ) {
				var jsxFilename = jsxFileEntry.name,
					jsxFilenameAndDirection = jsxFilename.replace( '.jsx', '' ).split( '-' ),
					jsxFilenameDirection = jsxFilenameAndDirection[ 0 ],
					jsxFilenameTestDataNumber = parseInt( jsxFilenameAndDirection[ 1 ], 10 ),
					variation = {
						componentName: directoryInfo.parentDir.replace( '/', '--' ),
						direction: jsxFilenameDirection,
						testDataNumber: jsxFilenameTestDataNumber,
						bootstrapJsxFileFullPath: jsxFileEntry.fullPath
					};

				variations.push( variation );
			} );
		} );

		componentManifest.variations = variations;

		deferred.resolve( componentManifest );

		return deferred.promise;
	},
	outputSuccessMessage: function( componentManifest ) {
		var deferred = Q.defer();

		componentManifest.config = ManifestBuilder.config;

		winston.info( 'Completed building test manifest by reading the file system.' );

		deferred.resolve( componentManifest );

		return deferred.promise;
	},
	handleReadDirectoryError: function( deferred, message, errors ) {
		if( errors ) {
			deferred.reject( {
				message: message + errors.join( '\n' )
			} );
		}
	}
};

module.exports = ManifestBuilder;
