const fs = require('fs');
const path = require('path');

const patchWindowsDLLs = ({ appOutDir, x64 }) => {
	fs.copyFileSync(path.join(__dirname, x64 ? 'x64' : 'ia32', 'vccorlib140.dll'),
		path.join(appOutDir, 'vccorlib140.dll'));
};

exports.default = (context) => {
	const { appOutDir, arch, packager: { platform: { nodeName } } } = context;

	if (nodeName === 'win32') {
		patchWindowsDLLs({ appOutDir, x64: arch === 1 });
	}
};
