var path = require( 'path' ),
	fs = require( 'fs'),
	wrench = require( path.resolve( 'node_modules' ) + '/wrench' ),
	jade = require( path.resolve( 'node_modules' ) + '/jade/jade' ),
	browserify = require ( path.resolve( 'node_modules' + '/browserify' ) ),
	fsExtra = require( path.resolve( 'node_modules' ) + '/fs-extra' ),
	reactTools = require( path.resolve( 'node_modules' ) + '/react-tools' ),
	lodashFindIndex = require( path.resolve( 'node_modules' ) + '/lodash/array/findIndex' ),
	Q = require( path.resolve( 'node_modules' ) + '/q' ),
	winston = require( 'winston' ),
	supportedSeleniumEnvironments = require( path.resolve( __dirname, '../' ) + '/SupportedSeleniumEnvironments' ),
	componentLibraryFullPath = path.resolve( 'css-visual-test/component-library' ),
	components = [],
	ComponentLibraryGenerator = null,
	browserifyConfig = {
		transforms: [ 'reactify' ],
		paths: [
			path.resolve( __dirname, '../../client' )
		],
		debug: true,
		extensions: [ '.jsx' ],
		root: path.resolve( __dirname, '../..' )
	};



// Because this algorithm runs in a single process before any multiple processes are spawned for test run speed,
// synchronous calls are better due to being simpler.
ComponentLibraryGenerator = {
	initializeGlobalTestEnvironment: function() {
		if( fs.existsSync( componentLibraryFullPath ) ) {
			wrench.rmdirSyncRecursive( componentLibraryFullPath, false ); // don't fail silently
		}
		
		wrench.copyDirSyncRecursive( 'public', componentLibraryFullPath );

		// copy the phantomjs react shim
		fsExtra.copySync( path.resolve( 'node_modules') + '/react-tools/src/test/phantomjs-shims.js', componentLibraryFullPath + '/phantomjs-shims.js' );
	},
	createComponentTestDirectory: function( componentName ) {
		var componentIndex = ComponentLibraryGenerator.findComponentIndex( components, componentName );

		if( componentIndex < 0 ) {
			components.push( {
				componentName: componentName,
				componentHostPages: []
			} );
		}

		if( ! fs.existsSync( componentLibraryFullPath + '/' + componentName ) ) {
			fs.mkdirSync( componentLibraryFullPath + '/' + componentName );
		}
	},
	createComponentEntryPoint: function( componentName, testDataNumber, bootstrapJsxFileFullPath ) {
		// create an entry point file to render the component
		var componentBootstrap = fs.readFileSync( bootstrapJsxFileFullPath, 'utf8' );
		var renderComponentBootstrap = reactTools.transform( componentBootstrap );

		// save the bundle for this test variation to disk
		fs.writeFileSync( componentLibraryFullPath + '/' + componentName + '/' + componentName + '-entry-point-test-data-' + testDataNumber.toString() + '.js', renderComponentBootstrap );
	},
	createComponentBrowserifyBundleAsync: function( componentName, testDataNumber ) {
		// browserify bundle the entry point file containing the render function
		// consider making bundler.js export and not call createBundle and use that code directly for reuse purposes
		var writeStream = fs.createWriteStream( componentLibraryFullPath + '/' + componentName + '/' + componentName +'-bundle-test-data-' + testDataNumber.toString() + '.js' ),
			deferred = Q.defer();

		writeStream.on( 'finish', function() {
			deferred.resolve( testDataNumber );
		} ).on( 'error', function( exception ) {
			deferred.reject( exception );
		} );

		// bundle is asynchronous
		// TODO: don't bundle react and/or lodash.  load them externally from the host pages instead to increase test run speed.
		browserify( browserifyConfig )
			.add( componentLibraryFullPath + '/' + componentName + '/' + componentName + '-entry-point-test-data-' + testDataNumber.toString() + '.js' )
			.transform( 'reactify' )
			.bundle()
			.pipe( writeStream );

		return deferred.promise;
	},
	createComponentHostPage: function ( componentName, direction, testDataNumber ) {
		var isRTL = false,
			hostPageFilename = '',
			indexJadeFileContents = '',
			compiledTemplate = '',
			componentIndex = 0;

		if( direction === 'RTL' ) {
			isRTL = true;
			hostPageFilename = 'index-rtl-test-data-' + testDataNumber.toString() + '.html';
		} else {
			hostPageFilename = 'index-ltr-test-data-' + testDataNumber.toString() + '.html';
		}

		// compile the jade template for ltr languages for each test
		indexJadeFileContents = fs.readFileSync( path.resolve( 'server' ) + '/pages/index.jade', 'utf8' );

		compiledTemplate = jade.compile( indexJadeFileContents )( {
			compileDebug: false,
			urls: {
				'style.css': '/style.css',
				'style-rtl.css': '/style-rtl.css',
				'build.js': '/' + componentName + '/' + componentName + '-bundle-test-data-' + testDataNumber.toString() + '.js'
			},
			isRTL: isRTL,
			lang: 'en'
		} );

		// react does not work by default with phantomjs due to phantomjs not supporting .bind.  apply shim to fix.
		// leave this in even when removing phantonflow since we may want to use phantom/ghost as a selenium driver
		// for quick smoke tests before long test runs
		compiledTemplate = compiledTemplate.replace('<body>', '<body><script src="/phantomjs-shims.js"></script>');
		compiledTemplate = compiledTemplate.replace('<body class="rtl">', '<body class="rtl"><script src="/phantomjs-shims.js"></script>');

		fs.writeFileSync( componentLibraryFullPath + '/' + componentName + '/' + hostPageFilename, compiledTemplate );

		componentIndex = ComponentLibraryGenerator.findComponentIndex( components, componentName );

		components[componentIndex].componentHostPages.push( {
			componentHostPageName: direction + ' Test Data ' + testDataNumber.toString(),
			componentHostPageUrl: '/' + componentName + '/' + hostPageFilename
		} );
	},
	findComponentIndex: function( components, componentName ) {
		return lodashFindIndex( components, function( component ) {
			return component.componentName === componentName;
		} );
	},
	generateComponentLibraryIndex: function() {
		// consider using jade for this
		var indexPage = '<!doctype HTML><html><body><h1>Component Library</h1>';

		// TODO: sort the components and host pages alphabetically.  they can become out of order since they are async.
		components.forEach( function( component ) {
			indexPage += '<h3>' + component.componentName + '</h3><ul>';

			component.componentHostPages.forEach( function ( hostPage ) {
				indexPage += '<li><a href="' + hostPage.componentHostPageUrl + '">' + hostPage.componentHostPageName + '</a></li>';
			} );

			indexPage += '</ul>';
		} );

		indexPage += '</body></html>';

		fs.writeFileSync( componentLibraryFullPath + '/index.html', indexPage );
	},
	generateComponentLibrary: function( componentManifest ) {
		var deferred = Q.defer(),
			browserifyBundlePromises = [];

		winston.info( 'Component Library Generator started.' );

		ComponentLibraryGenerator.initializeGlobalTestEnvironment();

		componentManifest.variations.forEach( function( componentVariation ) {
			var browserifyBundlePromise = null;

			ComponentLibraryGenerator.createComponentTestDirectory( componentVariation.componentName );

			var componentTestDirectionUpperCase = componentVariation.direction.toUpperCase();

			ComponentLibraryGenerator.createComponentEntryPoint( componentVariation.componentName, componentVariation.testDataNumber, componentVariation.bootstrapJsxFileFullPath );

			browserifyBundlePromise = ComponentLibraryGenerator.createComponentBrowserifyBundleAsync( componentVariation.componentName, componentVariation.testDataNumber );

			browserifyBundlePromises.push( browserifyBundlePromise );

			browserifyBundlePromise.then( function( currentIndex ) {
				ComponentLibraryGenerator.createComponentHostPage( componentVariation.componentName, componentTestDirectionUpperCase, currentIndex );
			}, function( error ) {
				deferred.reject( error );
			} );
		} );

		Q.allSettled( browserifyBundlePromises ).then( function() {
			ComponentLibraryGenerator.generateComponentLibraryIndex();

			componentManifest.supportedSeleniumEnvironments = supportedSeleniumEnvironments;

			winston.info( 'Component Library Generator completed.' );

			deferred.resolve( componentManifest );
		} );

		return deferred.promise;
	}
};

module.exports = ComponentLibraryGenerator;
