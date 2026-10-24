'use strict';

// Pure decision logic, transcribed from FrankerFaceZ's settings
// (layout.js, css_tweaks/index.js) for the case where FFZ's other layout
// features (swap sidebars, custom chat width, minimal navigation, hidden
// whispers, theatre metadata) are at their defaults.
//
// settings: output of tpmNormalizeSettings()
// ctx: {
//   width, height,            window.innerWidth / innerHeight
//   fullscreen,               !!document.fullscreenElement
//   route,                    FFZ route name or null
//   isWatchParty,
//   rightColumnExpanded,      Twitch redux state.ui.*
//   theatreModeEnabled,
//   sideNavExpanded
// }

function tpmCompute(settings, ctx) {
	// layout.use-portrait
	let usePortrait = false;
	if ( ! ctx.isWatchParty && settings.enabled && TPM_PORTRAIT_ROUTES.includes(ctx.route) && ctx.width > 0 && ctx.height > 0 )
		usePortrait = (ctx.width / ctx.height) <= settings.threshold;

	// layout.inject-portrait
	const injectPortrait = usePortrait && !! ctx.rightColumnExpanded;

	// layout.fix-player-size (only inject-portrait applies here)
	const fixPlayerSize = injectPortrait;

	// layout.use-chat-fix (only use-portrait applies here)
	const useChatFix = ! ctx.isWatchParty && usePortrait;

	// layout.portrait-min-chat
	const compactChat = usePortrait ? settings.compactChat : false;

	// layout.is-theater-mode
	const isTheater = ctx.fullscreen ? false : !! ctx.theatreModeEnabled;

	// layout.side-nav.show
	const sideNavShow = settings.sideNav === 2 ? ! usePortrait : !! settings.sideNav;

	// layout.portrait-extra-height (rem). With FFZ defaults: whispers shown,
	// theatre whispers not hidden, normal navigation, no squad bar
	// (FFZ's hasSquadBar always returns false), new_channel never set.
	let extraHeight;
	if ( isTheater )
		extraHeight = 4;            // whispers bar
	else
		extraHeight = 5 + 4 + 5;    // top nav + whispers bar + channel header

	// layout.portrait-extra-width (rem)
	const extraWidth = (! sideNavShow || isTheater) ? 0 : (ctx.sideNavExpanded ? 24 : 5);

	return {
		usePortrait,
		injectPortrait,
		useChatFix,
		isTheater,
		sideNavShow,
		extraHeight,
		extraWidth,
		invert: settings.invert,
		styles: {
			'portrait': injectPortrait,
			'portrait-chat': compactChat,
			'player-size': fixPlayerSize,
			'chat-fix': useChatFix,
			'hide-side-nav': ! sideNavShow
		}
	};
}
