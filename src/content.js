'use strict';

(() => {
	if ( window.top !== window )
		return;

	// FFZ waits 500ms on Firefox before forcing Twitch to re-measure.
	const RESIZE_DELAY = 500;
	const POLL_INTERVAL = 250;

	let settings = null;

	const ctx = {
		width: window.innerWidth,
		height: window.innerHeight,
		fullscreen: !! document.fullscreenElement,
		route: null,
		isWatchParty: false,
		rightColumnExpanded: false,
		theatreModeEnabled: false,
		sideNavExpanded: false
	};

	// ------------------------------------------------------------------
	// Style management (equivalent of FFZ's css_tweaks ManagedStyle)
	// ------------------------------------------------------------------

	const styleElements = new Map();

	function setStyle(key, css) {
		let el = styleElements.get(key);
		if ( ! el ) {
			el = document.createElement('style');
			el.dataset.tpm = key;
			styleElements.set(key, el);
		}

		if ( el.textContent !== css )
			el.textContent = css;

		if ( ! el.isConnected )
			(document.head || document.documentElement).appendChild(el);
	}

	function deleteStyle(key) {
		const el = styleElements.get(key);
		if ( el ) {
			el.remove();
			styleElements.delete(key);
		}
	}

	const toggled = {};

	function toggleStyle(key, val) {
		val = !! val;
		if ( (toggled[key] ?? false) === val )
			return;

		toggled[key] = val;
		if ( val )
			setStyle(key, TPM_STYLES[key]);
		else
			deleteStyle(key);
	}

	function setVariable(key, val) {
		setStyle(`var--${key}`, `body { --tpm-${key}: ${val}; }`);
	}

	// ------------------------------------------------------------------
	// Reading Twitch's React / Redux state
	// ------------------------------------------------------------------

	const page = {
		store: null,
		history: null,
		router: null,
		attempts: 0,
		lastSearch: 0,
		warned: false
	};

	function findPageObjects() {
		if ( page.store && (page.history || page.router) )
			return;

		// Back off if Twitch's internals can't be found, so a changed site
		// doesn't cost a tree search every poll.
		const now = Date.now();
		if ( page.attempts > 40 && now - page.lastSearch < 5000 )
			return;

		const root = tpmGetRootFiber();
		if ( ! root )
			return;

		page.attempts++;
		page.lastSearch = now;

		if ( ! page.store ) {
			const node = tpmSearchNode(root, n => n?.pendingProps?.store?.getState);
			if ( node )
				page.store = node.pendingProps.store;
		}

		if ( ! page.history && ! page.router ) {
			const inst = tpmSearchTree(root, n => n?.props?.history);
			if ( inst )
				page.history = inst.props.history;
			else {
				const node = tpmSearchNode(root, n => n?.pendingProps?.router?.subscribe);
				if ( node )
					page.router = node.pendingProps.router;
			}
		}

		if ( page.attempts === 40 && ! page.warned && ! (page.store && (page.history || page.router)) ) {
			page.warned = true;
			console.warn('[Portrait Mode for Twitch] Could not find Twitch\'s internal state; Twitch may have changed.');
		}
	}

	function readLocation() {
		if ( page.history )
			return page.history.location ?? null;
		if ( page.router )
			return page.router.router?.state?.location ?? page.router.state?.location ?? null;
		return null;
	}

	function readContext() {
		findPageObjects();

		let ui = null;
		try {
			ui = page.store?.getState?.()?.ui ?? null;
		} catch (err) {
			ui = null;
		}

		ctx.rightColumnExpanded = !! ui?.rightColumnExpanded;
		ctx.theatreModeEnabled = !! ui?.theatreModeEnabled;
		ctx.sideNavExpanded = !! ui?.sideNavExpanded;

		const location = readLocation();
		ctx.route = location ? tpmMatchRoute(String(location.pathname ?? ''), location.state) : null;

		// FFZ's channel module: watch party flag from the stream info bar.
		let watching = false;
		const bar = document.querySelector('#live-channel-stream-information');
		if ( bar ) {
			const react = tpmGetReactInstance(bar);
			let props = react?.child?.memoizedProps;
			if ( ! props?.channelLogin )
				props = props?.children?.props;
			watching = !! props?.watchPartyProps?.isShowingWatchPartyInMain;
		}
		ctx.isWatchParty = watching;
	}

	// ------------------------------------------------------------------
	// Player fixes (FFZ: Player.repositionPlayer, Layout.handleResize)
	// ------------------------------------------------------------------

	function fixPlayer() {
		try {
			const el = document.querySelector('.channel-root__player');
			const node = el && tpmSearchNode(tpmGetReactInstance(el), n => n.memoizedProps?.triggerPlayerReposition, 50);
			if ( node )
				node.memoizedProps.triggerPlayerReposition();
		} catch (err) {
			/* Twitch changed; nothing to fix. */
		}
	}

	let resizeTimer = null;

	function handleResize() {
		if ( resizeTimer )
			return;

		resizeTimer = setTimeout(() => {
			resizeTimer = null;
			try {
				const detectors = tpmFindAllInstances(
					tpmGetRootFiber(),
					n => n.maybeDebounceOnScroll && n.setGrowDivRef && n.props?.onResize
				);

				for (const inst of detectors) {
					try {
						inst?.onScroll?.();
					} catch (err) {
						/* ignore */
					}
				}
			} catch (err) {
				/* ignore */
			}

			fixPlayer();
		}, RESIZE_DELAY);
	}

	// ------------------------------------------------------------------
	// Applying the computed state
	// ------------------------------------------------------------------

	let last = null;
	let noAnimFrame = null;

	function apply() {
		if ( ! settings )
			return;

		const d = tpmCompute(settings, ctx);

		document.body?.classList.toggle('tpm--portrait-invert', d.invert);
		setVariable('portrait-extra-width', `${d.extraWidth}rem`);
		setVariable('portrait-extra-height', `${d.extraHeight}rem`);

		const prev = last || { useChatFix: false, sideNavShow: true };
		last = d;

		// layout.use-chat-fix changed()
		if ( d.useChatFix !== prev.useChatFix ) {
			if ( d.useChatFix )
				toggleStyle('chat-no-animate', true);
			else if ( ! noAnimFrame )
				noAnimFrame = requestAnimationFrame(() => {
					noAnimFrame = null;
					if ( ! last?.useChatFix )
						toggleStyle('chat-no-animate', false);
				});
		}

		for (const [key, val] of Object.entries(d.styles))
			toggleStyle(key, val);

		if ( d.useChatFix !== prev.useChatFix ) {
			fixPlayer();
			handleResize();
		}

		if ( d.sideNavShow !== prev.sideNavShow )
			handleResize();
	}

	function update() {
		try {
			readContext();
		} catch (err) {
			/* keep previous context */
		}
		apply();
	}

	// ------------------------------------------------------------------
	// Wiring
	// ------------------------------------------------------------------

	window.addEventListener('resize', () => {
		ctx.width = window.innerWidth;
		ctx.height = window.innerHeight;
		apply();
	});

	document.addEventListener('fullscreenchange', () => {
		ctx.fullscreen = !! document.fullscreenElement;
		apply();
	});

	async function loadSettings() {
		try {
			settings = tpmNormalizeSettings(await browser.storage.local.get(null));
		} catch (err) {
			settings = tpmNormalizeSettings(null);
		}
	}

	browser.storage.onChanged.addListener((changes, area) => {
		if ( area === 'local' )
			loadSettings().then(apply);
	});

	loadSettings().then(() => {
		update();
		setInterval(update, POLL_INTERVAL);
	});
})();
