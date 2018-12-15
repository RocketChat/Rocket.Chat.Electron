const { reporters: { Base } } = require('mocha');
const NYC = require('nyc');


module.exports = function(runner, options = {}) {
	Base.call(this, runner, options);

	runner.on('end', () => {
		const nyc = new NYC({ include: 'src/' });
		nyc.createTempDirectory();
		nyc.addAllFiles();
	});
};

if (require.main === module) {
	const nyc = new NYC({
		include: 'src/',
		reporter: ['text-summary', 'html'],
		reportDir: 'coverage',
	});
	nyc.report();
	nyc.cleanup();
}
