import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, tokensToRegExp } from 'path-to-regexp';
import { load, ALL } from './load.js';

const T = load(ALL);

// Reference implementation: FFZ's FineRouter.route() + _pickRoute() using
// the real path-to-regexp 3.3.0.
function buildReference() {
	const routes = [];
	for (const [name, path, stateFn] of T.TPM_ROUTE_TABLE) {
		const parts = parse(path);
		const score = parts.reduce((total, val) => total + (typeof val === 'string' ? val.split('/').length - 1 : 0), 0);
		routes.push({ name, score, regex: tokensToRegExp(parts), stateFn });
		routes.sort((a, b) => b.score - a.score);
	}
	return (path, state) => {
		for (const route of routes)
			if ( route.regex.exec(path) && (! route.stateFn || route.stateFn(state)) )
				return route.name;
		return null;
	};
}

const reference = buildReference();

test('compiled regexes are identical to path-to-regexp 3.3.0', () => {
	for (const route of T.TPM_ROUTES) {
		const expected = tokensToRegExp(parse(route.path));
		assert.equal(route.regex.source, expected.source, route.path);
		assert.equal(route.regex.flags, expected.flags, route.path);
	}
});

const PATHS = [
	'/', '', '/directory', '/directory/', '/Directory', '/directory/gaming', '/directory/following',
	'/directory/following/live', '/directory/category/just-chatting', '/directory/category/x/clips',
	'/directory/category/x/videos/all', '/directory/all', '/directory/all/tags', '/directory/collection/abc',
	'/somechannel', '/somechannel/', '/SomeChannel', '/some_channel123', '/somechannel/videos',
	'/somechannel/videos/archive', '/somechannel/video/123', '/somechannel/clip/FunnyClip-abc',
	'/somechannel/clips', '/somechannel/collections', '/somechannel/events', '/somechannel/followers',
	'/somechannel/following', '/somechannel/schedule', '/somechannel/about', '/somechannel/squad',
	'/somechannel/dashboard', '/somechannel/dashboard/live', '/somechannel/commandcenter',
	'/videos/123456', '/videos/123456/', '/popout/somechannel/chat', '/popout/moderator/somechannel/chat',
	'/embed/somechannel/chat', '/moderator/somechannel', '/search', '/prime', '/turbo',
	'/drops/inventory', '/drops/campaigns', '/products/foo', '/event/bar', '/settings',
	'/settings/profile', '/subscriptions', '/wallet', '/inventory', '/a/b/c/d', '/somechannel/unknown'
];

const STATES = [undefined, null, {}, { channelView: 'Home' }, { channelView: 'Watch' }];

test('route matching agrees with FFZ\'s router for every path and state', () => {
	for (const path of PATHS)
		for (const state of STATES)
			assert.equal(T.tpmMatchRoute(path, state), reference(path, state), `${path} ${JSON.stringify(state)}`);
});

test('expected route names for key pages', () => {
	assert.equal(T.tpmMatchRoute('/somechannel', undefined), 'user');
	assert.equal(T.tpmMatchRoute('/somechannel', { channelView: 'Home' }), 'user-home');
	assert.equal(T.tpmMatchRoute('/directory', undefined), 'dir');
	assert.equal(T.tpmMatchRoute('/search', undefined), 'search');
	assert.equal(T.tpmMatchRoute('/videos/1', undefined), 'video');
	assert.equal(T.tpmMatchRoute('/x/clip/y', undefined), 'user-clip');
	assert.equal(T.tpmMatchRoute('/settings/profile', undefined), null);
});
