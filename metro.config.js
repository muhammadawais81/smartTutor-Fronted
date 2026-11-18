const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const shimRoot = path.resolve(__dirname, 'shims/agora-react-native-rtm');
const shimIndex = path.join(shimRoot, 'index.js');
const shimRtmEngine = path.join(shimRoot, 'src/RtmEngine.js');

const config = {
	watchFolders: [path.resolve(__dirname, 'shims')],
	resolver: {
		nodeModulesPaths: [path.resolve(__dirname, 'shims'), path.resolve(__dirname, 'node_modules')],
		extraNodeModules: {
			'agora-react-native-rtm': shimRoot,
		},
		resolveRequest: (context, moduleName, platform) => {
			if (moduleName === 'agora-react-native-rtm') {
				return {type: 'sourceFile', filePath: shimIndex};
			}
			if (moduleName.startsWith('agora-react-native-rtm/')) {
				if (moduleName.includes('src/RtmEngine')) {
					return {type: 'sourceFile', filePath: shimRtmEngine};
				}
				return {type: 'sourceFile', filePath: shimIndex};
			}

			return context.resolveRequest(context, moduleName, platform);
		},
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
