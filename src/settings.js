'use strict';

// Settings mirror FrankerFaceZ's "Appearance > Layout >> Channel" portrait
// options plus its "Display Side Navigation" option (which has a
// "Hide in Portrait" choice). Shared by the content script and the popup.

const TPM_DEFAULTS = Object.freeze({
	// layout.portrait — FFZ defaults this to false; this add-on exists to
	// provide it, so it starts enabled.
	enabled: true,
	// layout.portrait-invert
	invert: false,
	// layout.portrait-threshold
	threshold: 1.25,
	// layout.portrait-min-chat
	compactChat: false,
	// layout.side-nav.show: 0 = Never, 1 = Always, 2 = Hide in Portrait
	sideNav: 1
});

// Same validation FFZ applies to the threshold text box.
function tpmProcessThreshold(val) {
	val = parseFloat(val, 10);
	if ( isNaN(val) || ! isFinite(val) || val <= 0 )
		return 1.25;

	return val;
}

function tpmNormalizeSettings(raw) {
	const s = Object.assign({}, TPM_DEFAULTS, raw || {});
	return {
		enabled: !! s.enabled,
		invert: !! s.invert,
		threshold: tpmProcessThreshold(s.threshold),
		compactChat: !! s.compactChat,
		sideNav: [0, 1, 2].includes(Number(s.sideNav)) ? Number(s.sideNav) : 1
	};
}
