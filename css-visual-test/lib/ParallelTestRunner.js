var webdriver = require( 'selenium-webdriver' ),
	Q = require( 'q' ),
	Eyes = require( 'eyes.selenium' ).Eyes,
	sauceConnectLauncher = require( 'sauce-connect-launcher' ),
	winston = require( 'winston' ),
	config = require( __dirname + '/Config' ),
	ParallelTestRunner = {
		queueTestForSingleVariation: function( eyes, driver, variation, seleniumCapability ) {
			var deferred = Q.defer(),
				operationsCompleted = 0;

			driver.get( config.componentLibraryUrl + variation.componentName + '/index-' + variation.direction +
				'-test-data-' + variation.testDataNumber.toString() + '.html' )
				.then( function() {
					// this takes a screenshot
					eyes.checkWindow( variation.componentName + ' -- ' + variation.direction.toUpperCase() +
						' -- Test Data ' + variation.testDataNumber.toString() )
						.then( function() {
							winston.info( 'Visual test completed for ' + variation.sortingKey );

							deferred.resolve();
						} )
						.thenCatch( function( error ) {
							winston.debug( 'error occured in eyes.checkWindow(): ' + error.message );
						} );
				} )
				.thenCatch( function( error ) {
					winston.debug( 'error occured in driver.get(): ' + error.message );
				} );

			return deferred.promise;
		},
		// TODO: rewrite the time estimation to be based on environment startup time + number of tests factoring in parallelization
		estimateRunningTime: function( componentManifest ) {
			var estimatedMinutes = Math.round(
				( componentManifest.testCount * config.singleMobileTestRunWorstCaseRunningTimeSeconds ) /
					( 60 * config.parallelVirtualMachinesCount ) );

			if( estimatedMinutes === 1 ) {
				return '1 minute';
			}

			return estimatedMinutes.toString() + ' minutes'
		},
		printMessageAndExitWithCode: function( message, code ) {
			if( code === 0 ) {
				winston.info( message );
			} else {
				winston.error( message );
			}
			process.exit( code );
		},
		printExecutionSeconds: function( startTime ) {
			var executionMinutes = Math.round( ( new Date() - startTime ) / 60000 ),
				minuteMinutes = ' minutes.';

			if( executionMinutes === 1) {
				minuteMinutes = ' minute.'
			}

			winston.info( 'Visual tests completed in ' + executionMinutes.toString() + minuteMinutes );
		},
		executeTests: function( testsBucketedByVirtualMachine, completedCallback ) {
			var concurrentTestRuns = [],
				startTime = null,
				errorMessages = [],
				componentManifest = testsBucketedByVirtualMachine.componentManifest,
				buildId = componentManifest.buildId;

			winston.info( 'CSS Visual Test started with id: ' + componentManifest.buildId );

			winston.info( 'Running ' + componentManifest.testCount + ' visual tests across ' +
				config.parallelVirtualMachinesCount + ' parallel vms' );

			winston.info( 'Estimated run time: ' + ParallelTestRunner.estimateRunningTime( componentManifest ) );

			startTime = new Date();

			concurrentTestRuns = testsBucketedByVirtualMachine.testsBucketedByVirtualMachine.map(
				function( testBucketedByVirtualMachine ) {
				var eyes = new Eyes();

				eyes.setApiKey( config.applitoolsEyesAccessKey );
				eyes.setBatch( componentManifest.projectName + ' build ' + buildId, buildId, startTime );

				return webdriver.promise.createFlow( function() {
					var seleniumCapability = testBucketedByVirtualMachine.capability,
						driver = new webdriver
							.Builder()
							.usingServer( config.seleniumGridHubUrl )
							.withCapabilities( seleniumCapability )
							.build(),
						eyesTestName = seleniumCapability.name,
						eyesOpenPromise = null;

					eyesOpenPromise = eyes.open( driver, componentManifest.projectName, eyesTestName )
						.then( function( driver ) {
							testBucketedByVirtualMachine.variations.forEach( function( variation ) {
								ParallelTestRunner.queueTestForSingleVariation( eyes, driver, variation, seleniumCapability );
							} );

							winston.debug( 'all tests for partition id ' + testBucketedByVirtualMachine.partitionId + ' queued.' );

							driver.quit();
							// if the visual tests fail, this rejects the promise returned from eyes.open triggering
							// the thenCatch
							eyes.close();

							winston.debug( 'all tests for partition id ' + testBucketedByVirtualMachine.partitionId +
								' had driver.quit() and eyes.close() queued.' );
						} )
						// the google closure promise api used by the selenium webdriverjs and the applitools eyes
						// sdk uses thenCatch and cancel instead of catch and reject.
						.thenCatch( function( error ) {
							winston.debug( 'error for build id: ' + buildId + '\n' + error.message );

							errorMessages.push( error.message );

							// reject the promise that failed, without stopping the other concurrent operations
							eyesOpenPromise.cancel();
						} );
				} );
			} );

			// fullyResolved is webdriver's equivalent of Q's allSettled method
			webdriver.promise.fullyResolved( concurrentTestRuns ).then( function() {
				if( errorMessages.length > 0 ) {
					ParallelTestRunner.printExecutionSeconds( startTime );
					ParallelTestRunner.printMessageAndExitWithCode( 'CSS Visual Test run failed: \n' + errorMessages.join( '\n' ), 1 );
				} else {
					winston.info( 'CSS Visual Test run completed successfully with id: ' + buildId );
					ParallelTestRunner.printExecutionSeconds( startTime );

					if( completedCallback !== undefined ) {
						completedCallback();
					}
				}
			} );
		},
		executeTestRun: function( testsBucketedByVirtualMachine ) {
			winston.info( 'Opening Sauce Connect tunnel.' );
/*
			sauceConnectLauncher( {
				username: config.sauceLabsUsername,
				accessKey: config.sauceLabsAccessKey,
				verbose: false,
				verboseDebugging: false
			}, function ( error , sauceConnectProcess ) {
				if ( error ) {
	 				ParallelTestRunner.printMessageAndExitWithCode( error.message, 1 );
				}

				winston.info( 'Sauce Connect tunnel opened.' );
*/
				ParallelTestRunner.executeTests( testsBucketedByVirtualMachine,
					function() {
//						sauceConnectProcess.close(function () {
							ParallelTestRunner.printMessageAndExitWithCode( 'Sauce Connect tunnel closed.', 0 );
//						} );
					} );
//			} );
		}
	};

module.exports = ParallelTestRunner;
