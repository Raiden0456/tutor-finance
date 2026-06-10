// Metro config for the Expo Router app inside a pnpm monorepo, wired for NativeWind.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so symlinked workspace packages (e.g.
// @tutor-finance/shared) trigger fast refresh and resolve correctly.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// pnpm hoists a second copy of React into the tree, which Metro can bundle
// alongside the app's copy -> "Invalid hook call" / "useState of null". Force
// every `react`/`react-dom` import to resolve to this app's single copy.
const SINGLETONS = ['react', 'react-dom'];
const projectModules = path.resolve(projectRoot, 'node_modules');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pkg = SINGLETONS.find((p) => moduleName === p || moduleName.startsWith(`${p}/`));
  if (pkg) {
    try {
      const filePath = require.resolve(moduleName, { paths: [projectModules] });
      return { type: 'sourceFile', filePath };
    } catch {
      // fall through to default resolution if not present (e.g. react-dom)
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
