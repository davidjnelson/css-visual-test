var assert = require( 'assert' ),
	ParallelTestPartitioner = require( '../lib/ParallelTestPartitioner' ),
	Config = require( '../lib/Config' ),
	fourTestsFromOneDirectoryInputData =
		require( './data/FourTestsFromOneDirectoryInputData' ),
	fiveTestsAcrossTwoDirectoriesInputData =
		require( './data/FiveTestsAcrossTwoDirectoriesInputData' ),
	threeBrowsersSupportedSeleniumEnvironmentsStub =
		require( './data/ThreeBrowsersSupportedSeleniumEnvironmentsStub' ),
	threeBucketsWithFourTestsInEachBucket = require(
		'./data/ThreeBucketsWithFourTestsInEachBucket' ),
	sevenBucketsWithAVaryingNumberOfTestsInEachBucket = require(
		'./data/SevenBucketsWithAVaryingNumberOfTestsInEachBucket' ),
	fifteenBucketsWithOneTestInEachBucket = require(
		'./data/FifteenBucketsWithOneTestInEachBucket' ),
	augmentComponentManifest = function( inputData, parallelVirtualMachinesCount,
		supportedSeleniumCapabilities ) {
		inputData.config = Config;
		inputData.config.parallelVirtualMachinesCount = parallelVirtualMachinesCount;
		inputData.buildId = '';
		inputData.supportedSeleniumEnvironments = supportedSeleniumCapabilities;

		return inputData;
	},
	supportedSeleniumEnvironmentsStub = {};

describe( 'ParallelTestPartitioner', function() {
	describe( '4 tests from one directory, 3 browsers, 3 virtual machines', function() {
		beforeEach( function() {
			fourTestsFromOneDirectoryInputData =
				augmentComponentManifest( fourTestsFromOneDirectoryInputData, 3, threeBrowsersSupportedSeleniumEnvironmentsStub );
		} );

		it( 'should return 3 buckets with 4 tests in each bucket', function( done ) {
			ParallelTestPartitioner.partitionComponentManifest(
				fourTestsFromOneDirectoryInputData ).then(
				function( testsBucketedByVirtualMachine ) {
				try {
					delete testsBucketedByVirtualMachine.componentManifest;

					assert.deepEqual( testsBucketedByVirtualMachine, threeBucketsWithFourTestsInEachBucket );
					done();
				} catch( error ) {
					done( error );
				}
			} );
		} );
	} );

	describe( '5 tests across two directories, 3 browsers, 7 virtual machines', function() {
		beforeEach( function() {
			fiveTestsAcrossTwoDirectoriesInputData =
				augmentComponentManifest( fiveTestsAcrossTwoDirectoriesInputData, 7, threeBrowsersSupportedSeleniumEnvironmentsStub );
		} );

		it( 'should return 7 buckets with a varying number of tests in each bucket', function( done ) {
			ParallelTestPartitioner.partitionComponentManifest(
				fiveTestsAcrossTwoDirectoriesInputData ).then(
				function( testsBucketedByVirtualMachine ) {
				try {
					delete testsBucketedByVirtualMachine.componentManifest;

					assert.deepEqual( testsBucketedByVirtualMachine, sevenBucketsWithAVaryingNumberOfTestsInEachBucket );
					done();
				} catch( error ) {
					done( error );
				}
			} );
		} );
	} );

	describe( '5 tests across two directories, 3 browsers, 25 virtual machines', function() {
		beforeEach( function() {
			fiveTestsAcrossTwoDirectoriesInputData =
				augmentComponentManifest( fiveTestsAcrossTwoDirectoriesInputData, 25, threeBrowsersSupportedSeleniumEnvironmentsStub );
		} );

		it( 'should return 15 buckets with 1 test in each bucket', function( done ) {
			ParallelTestPartitioner.partitionComponentManifest(
				fiveTestsAcrossTwoDirectoriesInputData ).then(
				function( testsBucketedByVirtualMachine ) {
				try {
					delete testsBucketedByVirtualMachine.componentManifest;

					assert.deepEqual( testsBucketedByVirtualMachine, fifteenBucketsWithOneTestInEachBucket );
					done();
				} catch( error ) {
					done( error );
				}
			} );
		} );
	} );
} );
