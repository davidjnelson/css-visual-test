var Q = require( 'q' ),
	uuid = require( 'node-uuid' ),
	lodashFindIndex = require( 'lodash/array/findIndex' ),
	supportedSeleniumEnvironments = {},
	ParallelTestPartitioner = {
		// See https://docs.google.com/document/d/1GlurM0T_K3RHSsEATI4FH42Ggqd-lritkI-7fW8A398/edit?usp=sharing
		// for a detailed explanation of this algorithm.
		// The distribution is not 100% uniform in certain cases. I came up with a much better algorithm which is as
		// uniform as can be and will increase test run speed by 2-3x in those cases.
		// TODO: implement the improved algorithm, which is illustrated here:
		// https://cloud.githubusercontent.com/assets/381633/7289966/8b7cbf5a-e92c-11e4-9fd4-ba981d71c3ef.jpg
		partitionComponentManifest: function( componentManifest ) {
			// Normally I prefer one var, but I had a bizarre bug where the count of
			// testsBucketedByVirtualMachineWithRemainder.remainder was shrinking between when
			// generateTestsBucketedByVirtualMachine() returned and after
			// fillTestsBucketedByVirtualMachineWithRemainder() started.  This fixed it.
			var config = componentManifest.config;
			var deferred = Q.defer();
			var buildId = '';

			supportedSeleniumEnvironments = componentManifest.supportedSeleniumEnvironments;

			if( componentManifest.buildId === undefined ) {
				buildId = uuid.v4();
			}

			var augmentedSupportedSeleniumEnvironments =
				ParallelTestPartitioner.augmentSupportedSeleniumEnvironments( supportedSeleniumEnvironments,
					componentManifest.projectName, buildId, config.sauceLabsUsername, config.sauceLabsAccessKey );
			var testsBucketedBySeleniumCapability = ParallelTestPartitioner.generateTestsBucketedBySeleniumCapability (
				componentManifest, augmentedSupportedSeleniumEnvironments, buildId, config
			);

			componentManifest.testCount = testsBucketedBySeleniumCapability.testsBucketedBySeleniumCapability.length;

			var testsBucketedBySeleniumCapabilitySortedByEnvironment =
				testsBucketedBySeleniumCapability.testsBucketedBySeleniumCapability.sort(
					ParallelTestPartitioner.sortTestsBucketedBySeleniumCapabilityBySortingKeyComparator );
			var variationsPerVirtualMachineBucket = Math.floor(
				testsBucketedBySeleniumCapability.testsBucketedBySeleniumCapability.length /
					config.parallelVirtualMachinesCount );
			var variationsPerVirtualMachineBucketRemainder =
				testsBucketedBySeleniumCapability.testsBucketedBySeleniumCapability.length %
					config.parallelVirtualMachinesCount;
			var testsBucketedByVirtualMachineWithRemainder = ParallelTestPartitioner.generateTestsBucketedByVirtualMachine(
				testsBucketedBySeleniumCapabilitySortedByEnvironment, variationsPerVirtualMachineBucket,
				variationsPerVirtualMachineBucketRemainder, config.parallelVirtualMachinesCount );
			var testsBucketedByVirtualMachine = ParallelTestPartitioner.fillTestsBucketedByVirtualMachineWithRemainder(
				testsBucketedByVirtualMachineWithRemainder
			);

			componentManifest.buildId = buildId;

			testsBucketedByVirtualMachine.componentManifest = componentManifest;

			deferred.resolve( testsBucketedByVirtualMachine );

			return deferred.promise;
		},
		findBucketIndex: function( testsBucketedByVirtualMachineWithRemainder, testBucketedByVirtualMachineRemainderItem ) {
			return lodashFindIndex( testsBucketedByVirtualMachineWithRemainder.testsBucketedByVirtualMachine,
				function( searchedTestBucketedByVirtualMachine ) {
					return searchedTestBucketedByVirtualMachine.groupingKey === testBucketedByVirtualMachineRemainderItem.groupingKey;
				} );
		},
		createVariationFromSeleniumCapability: function ( seleniumCapability ) {
			return {
				componentName: seleniumCapability.componentName,
				direction: seleniumCapability.direction,
				testDataNumber: seleniumCapability.testDataNumber,
				sortingKey: seleniumCapability.sortingKey
			};
		},
		fillEachBucketWithOneTest: function( testsBucketedBySeleniumCapabilitySortedByEnvironment,
			testsBucketedByVirtualMachine ) {
			var partitionId = 1;

			testsBucketedBySeleniumCapabilitySortedByEnvironment.forEach( function ( testWithSeleniumCapability ) {
				testsBucketedByVirtualMachine.testsBucketedByVirtualMachine.push( {
					capability: testWithSeleniumCapability.capability,
					variations: [ ParallelTestPartitioner.createVariationFromSeleniumCapability( testWithSeleniumCapability ) ],
					partitionId: partitionId
				} );

				partitionId++;
			} );

			testsBucketedByVirtualMachine.remainder = [];

			return testsBucketedByVirtualMachine;
		},
		fillTestsBucketedByVirtualMachineWithRemainder: function( testsBucketedByVirtualMachineWithRemainder ) {
			var testBucketedByVirtualMachineRemainderItem = {},
				bucketToFillIndex = 0;

			if( testsBucketedByVirtualMachineWithRemainder.remainder.length > 0 ) {
				while( testsBucketedByVirtualMachineWithRemainder.remainder.length > 0 ) {
					testBucketedByVirtualMachineRemainderItem = testsBucketedByVirtualMachineWithRemainder.remainder.shift();

					bucketToFillIndex = ParallelTestPartitioner.findBucketIndex( testsBucketedByVirtualMachineWithRemainder,
						testBucketedByVirtualMachineRemainderItem );

					testsBucketedByVirtualMachineWithRemainder.testsBucketedByVirtualMachine[ bucketToFillIndex ].variations.push(
						ParallelTestPartitioner.createVariationFromSeleniumCapability( testBucketedByVirtualMachineRemainderItem )
					);
				}
			}

			delete testsBucketedByVirtualMachineWithRemainder.remainder;

			return testsBucketedByVirtualMachineWithRemainder;
		},
		sortTestsBucketedBySeleniumCapabilityBySortingKeyComparator: function( testBucketedBySeleniumCapabilityA, testBucketedBySeleniumCapabilityB ) {
			if ( testBucketedBySeleniumCapabilityA.sortingKey > testBucketedBySeleniumCapabilityB.sortingKey ) {
				return 1;
			}
			if ( testBucketedBySeleniumCapabilityA.sortingKey < testBucketedBySeleniumCapabilityB.sortingKey ) {
				return -1;
			}

			return 0;
		},
		generateTestsBucketedByVirtualMachine: function( testsBucketedBySeleniumCapabilitySortedByEnvironment,
			variationsPerVirtualMachineBucket, variationsPerVirtualMachineBucketRemainder, parallelVirtualMachinesCount ) {
			var testsBucketedByVirtualMachine = {
					testsBucketedByVirtualMachine: []
				},
				itemsToIterate = testsBucketedBySeleniumCapabilitySortedByEnvironment.length -
					variationsPerVirtualMachineBucketRemainder,
				removedTestWithSeleniumCapability = null,
				testBucketedByVirtualMachine = null,
				partitionId = 1;

			if( itemsToIterate === 0 ) {
				// if we have more buckets than test, just put each test in it's own bucket
				return ParallelTestPartitioner.fillEachBucketWithOneTest( testsBucketedBySeleniumCapabilitySortedByEnvironment,
					testsBucketedByVirtualMachine );
			}

			while( itemsToIterate > 0 &&
				testsBucketedByVirtualMachine.testsBucketedByVirtualMachine.length < parallelVirtualMachinesCount ) {
				removedTestWithSeleniumCapability = testsBucketedBySeleniumCapabilitySortedByEnvironment.shift();

				if( testsBucketedByVirtualMachine.testsBucketedByVirtualMachine.length === 0 ||
					testBucketedByVirtualMachine.variations.length === variationsPerVirtualMachineBucket ||
					removedTestWithSeleniumCapability.groupingKey !== testBucketedByVirtualMachine.groupingKey ) {

					testBucketedByVirtualMachine = {
						capability: removedTestWithSeleniumCapability.capability,
						variations: [],
						groupingKey: ParallelTestPartitioner.generateGroupingKey(
							removedTestWithSeleniumCapability.capability.browserName,
							removedTestWithSeleniumCapability.capability.platform,
							removedTestWithSeleniumCapability.capability.version ),
						partitionId: partitionId
					};

					testsBucketedByVirtualMachine.testsBucketedByVirtualMachine.push( testBucketedByVirtualMachine );
					partitionId++;
				}

				testBucketedByVirtualMachine.variations.push(
					ParallelTestPartitioner.createVariationFromSeleniumCapability( removedTestWithSeleniumCapability ) );

				itemsToIterate--;
			}

			testsBucketedByVirtualMachine.remainder = testsBucketedBySeleniumCapabilitySortedByEnvironment;

			return testsBucketedByVirtualMachine;
		},
		generateTestsBucketedBySeleniumCapability: function( componentManifest, augmentedSupportedSeleniumEnvironments,
			buildId, config ) {
			var testsBucketedBySeleniumCapability = {
					testsBucketedBySeleniumCapability: []
				};

			// n^2 is not great, but input size is small. should be fine.
			componentManifest.variations.forEach( function( variation ) {
				augmentedSupportedSeleniumEnvironments.forEach( function( environment ) {
					var test = {
						groupingKey: ParallelTestPartitioner.generateGroupingKey( environment.browserName,
							environment.platform, environment.version ),
						sortingKey: ParallelTestPartitioner.generateSortingKey(
							environment.browserName,
							environment.platform,
							environment.version,
							variation.componentName,
							variation.direction,
							variation.testDataNumber ),
						capability: {
							build: buildId,
							name: ParallelTestPartitioner.generateTestName(componentManifest.projectName,
								environment.browserName, environment.platform, environment.version ),
							username: config.sauceLabsUsername,
							accessKey: config.sauceLabsAccessKey,
							browserName: environment.browserName,
							platform: environment.platform,
							version: environment.version
						},
						componentName: variation.componentName,
						direction: variation.direction,
						testDataNumber: variation.testDataNumber
					};

					if( environment.deviceName !== undefined ) {
						test.capability.deviceName = environment.deviceName;
					}

					if( environment[ 'device-orientation' ] !== undefined ) {
						test.capability[ 'device-orientation' ] = environment[ 'device-orientation' ];
					}

					testsBucketedBySeleniumCapability.testsBucketedBySeleniumCapability.push( test );
				} );
			} );

			return testsBucketedBySeleniumCapability;
		},
		generateSortingKey: function( browserName, platform, version, componentName, direction, testDataNumber ) {
			return ParallelTestPartitioner.generateGroupingKey( browserName, platform, version) + '-' +
				componentName + '-' + direction + '-' + testDataNumber.toString();
		},
		generateGroupingKey: function( browserName, platform, version ) {
			return browserName.replace( ' ', '-' ) + '-' + platform.replace( ' ', '-' ) + '-' + version.replace( ' ', '-' );
		},
		generateTestName: function ( projectName, browserName, platform, version ) {
			return 'All ' + projectName + ' components with all variations in ' + browserName + ' ' + version + ' on ' + platform + '.';
		},
		augmentSupportedSeleniumEnvironments: function( supportedSeleniumEnvironments, projectName, buildId,
				sauceLabsUsername, sauceLabsAccessKey ) {
			return supportedSeleniumEnvironments.environments.map( function( supportedSeleniumEnvironment ) {
				supportedSeleniumEnvironment.build = buildId;
				supportedSeleniumEnvironment.name = ParallelTestPartitioner.generateTestName( projectName,
					supportedSeleniumEnvironment.browserName, supportedSeleniumEnvironment.platform,
					supportedSeleniumEnvironment.version );
				supportedSeleniumEnvironment.username = sauceLabsUsername;
				supportedSeleniumEnvironment.accessKey = sauceLabsAccessKey;

				return supportedSeleniumEnvironment;
			} );
		}
	};

module.exports = ParallelTestPartitioner;
