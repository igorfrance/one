// Karma configuration
// Generated on Sat Nov 02 2013 12:07:31 GMT+0100 (W. Europe Standard Time)

module.exports = function (config)
{
	//noinspection KarmaConfigFile
	config.set({

		// base path, that will be used to resolve files and exclude
		basePath: '.',

		// frameworks to use
		frameworks: ['qunit'],

		// list of files / patterns to load in the browser
		files: [
			'test/lib/jquery-2.0.3.min.js',
			'test/lib/jquery.mockjax.js',
			'dist/one.js',
			'test/tests/core/*.js',
			'test/tests/utils/*.js',
			'test/tests/interactive/dragger.js'
		],

		// list of files to exclude
		exclude: [

		],

		// test results reporter to use
		// possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
		//reporters: ['progress', 'dots', 'junit', 'coverage'],
		reporters: ['teamcity'],

		// web server port
		port: 9876,

		// enable / disable colors in the output (reporters and logs)
		colors: true,

		// level of logging
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,

		// enable / disable watching file and executing tests whenever any file changes
		autoWatch: true,

		// Start these browsers, currently available:
		// - Chrome
		// - ChromeCanary
		// - Firefox
		// - Opera
		// - Safari (only Mac)
		// - PhantomJS
		// - IE (only Windows)
		browsers: ['Chrome'],
		//browsers: ['Chrome', 'Firefox'],

		// If browser does not capture in given timeout [ms], kill it
		captureTimeout: 60000,

		// Continuous Integration mode
		// if true, it capture browsers, run tests and exit
		singleRun: false
	});
};
