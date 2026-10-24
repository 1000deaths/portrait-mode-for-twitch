'use strict';

// Route matching copied from FrankerFaceZ's FineRouter + Twilight.ROUTES.
// FFZ uses path-to-regexp 3.x with default options (case-insensitive,
// non-strict trailing slash, anchored end) and sorts routes by "score":
// the number of `/` characters in the static parts of the path. Ties keep
// registration order. Only routes for www.twitch.tv are included; FFZ's
// dashboard / player / clips routes are bound to other hostnames.

const TPM_PORTRAIT_ROUTES = Object.freeze([
	'user', 'video', 'user-video', 'user-clip', 'user-videos', 'user-clips',
	'user-collections', 'user-events', 'user-followers', 'user-following'
]);

const TPM_ROUTE_TABLE = [
	['front-page', '/'],
	['collection', '/directory/collection/:collectionID'],
	['dir', '/directory'],
	['dir-gaming', '/directory/gaming'],
	['dir-irl', '/directory/irl'],
	['dir-music', '/directory/music'],
	['dir-creative', '/directory/creative'],
	['dir-esports', '/directory/esports'],
	['dir-following', '/directory/following/:category?'],
	['dir-game-index', '/directory/category/:gameName'],
	['dir-game-clips', '/directory/category/:gameName/clips'],
	['dir-game-videos', '/directory/category/:gameName/videos/:filter'],
	['dir-all', '/directory/all/:filter?'],
	['dash', '/:userName/dashboard/:live?'],
	['event', '/event/:eventName'],
	['popout', '/popout/:userName/chat'],
	['video', '/videos/:videoID'],
	['user-video', '/:userName/video/:videoID'],
	['user-videos', '/:userName/videos/:filter?'],
	['user-clips', '/:userName/clips'],
	['user-clip', '/:userName/clip/:clipID'],
	['user-collections', '/:userName/collections'],
	['user-events', '/:userName/events'],
	['user-followers', '/:userName/followers'],
	['user-following', '/:userName/following'],
	['user-schedule', '/:userName/schedule'],
	['user-about', '/:userName/about'],
	['product', '/products/:productName'],
	['prime', '/prime'],
	['turbo', '/turbo'],
	['search', '/search'],
	['squad', '/:userName/squad'],
	['command-center', '/:userName/commandcenter'],
	['embed-chat', '/embed/:userName/chat'],
	['mod-view', '/moderator/:userName'],
	['mod-popout-chat', '/popout/moderator/:userName/chat'],
	['drops-inventory', '/drops/inventory'],
	['drops-campaigns', '/drops/campaigns'],
	// Registered separately by FFZ, distinguished by router state.
	['user', '/:userName', state => state?.channelView !== 'Home'],
	['user-home', '/:userName', state => state?.channelView === 'Home']
];

function tpmEscapeRegex(str) {
	return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
}

// Compiles the subset of path-to-regexp 3.x syntax used above:
// static text, `/:name` and optional `/:name?` segments.
function tpmCompileRoute(path) {
	const param = /\/:(\w+)(\?)?/g;
	let regex = '^', score = 0, last = 0, m;

	while ( (m = param.exec(path)) !== null ) {
		const text = path.slice(last, m.index);
		score += text.split('/').length - 1;
		regex += tpmEscapeRegex(text);
		regex += m[2] ? '(?:\\/([^\\/]+?))?' : '\\/([^\\/]+?)';
		last = param.lastIndex;
	}

	const tail = path.slice(last);
	if ( tail ) {
		score += tail.split('/').length - 1;
		regex += tpmEscapeRegex(tail);
	}

	// end: true, strict: false
	regex += '(?:\\/)?$';
	return { regex: new RegExp(regex, 'i'), score };
}

const TPM_ROUTES = TPM_ROUTE_TABLE
	.map(([name, path, stateFn], index) => Object.assign({ name, path, stateFn: stateFn || null, index }, tpmCompileRoute(path)))
	.sort((a, b) => (b.score - a.score) || (a.index - b.index));

// Returns the FFZ route name for a pathname + router location state, or null.
function tpmMatchRoute(pathname, state) {
	for (const route of TPM_ROUTES) {
		if ( route.regex.exec(pathname) && (! route.stateFn || route.stateFn(state)) )
			return route.name;
	}
	return null;
}
