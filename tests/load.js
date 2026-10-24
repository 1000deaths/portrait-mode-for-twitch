// Loads the add-on's classic scripts into one VM context, the way Firefox
// loads content scripts into a shared sandbox.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function load(files, extraGlobals = {}) {
	const context = vm.createContext(Object.assign({ console }, extraGlobals));
	const source = files.map(f => readFileSync(join(root, f), 'utf8')).join('\n;\n');
	vm.runInContext(
		`${source}\n;globalThis.__exports = { TPM_DEFAULTS, tpmNormalizeSettings, tpmProcessThreshold,
			TPM_PORTRAIT_ROUTES, TPM_ROUTE_TABLE, TPM_ROUTES, tpmMatchRoute,
			tpmCompute,
			tpmSearchNode, tpmSearchTree, tpmFindAllInstances, tpmGetReactInstance };`,
		context
	);
	return context.__exports;
}

export const ALL = ['src/settings.js', 'src/routes.js', 'src/logic.js', 'src/react.js'];
