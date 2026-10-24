import test from 'node:test';
import assert from 'node:assert/strict';
import { load, ALL } from './load.js';

const T = load(ALL);
const S = (o = {}) => T.tpmNormalizeSettings(o);

const baseCtx = {
	width: 800, height: 1000, fullscreen: false, route: 'user', isWatchParty: false,
	rightColumnExpanded: true, theatreModeEnabled: false, sideNavExpanded: false
};
const C = (o = {}) => Object.assign({}, baseCtx, o);

test('settings defaults and threshold validation match FFZ', () => {
	assert.deepEqual({ ...S() }, { enabled: true, invert: false, threshold: 1.25, compactChat: false, sideNav: 1 });
	for (const bad of ['', 'abc', '0', '-1', 'Infinity', null, undefined, NaN])
		assert.equal(S({ threshold: bad }).threshold, 1.25, String(bad));
	assert.equal(S({ threshold: '1.5' }).threshold, 1.5);
	assert.equal(S({ threshold: '0.9x' }).threshold, 0.9);
	assert.equal(S({ sideNav: '2' }).sideNav, 2);
	assert.equal(S({ sideNav: 7 }).sideNav, 1);
});

test('portrait activates on tall windows on portrait routes', () => {
	const d = T.tpmCompute(S(), C());
	assert.equal(d.usePortrait, true);
	assert.equal(d.injectPortrait, true);
	assert.deepEqual({ ...d.styles }, { 'portrait': true, 'portrait-chat': false, 'player-size': true, 'chat-fix': true, 'hide-side-nav': false });
	assert.equal(d.extraHeight, 14);
	assert.equal(d.extraWidth, 5);
});

test('threshold boundary is inclusive (ratio <= threshold)', () => {
	assert.equal(T.tpmCompute(S(), C({ width: 1250, height: 1000 })).usePortrait, true);
	assert.equal(T.tpmCompute(S(), C({ width: 1251, height: 1000 })).usePortrait, false);
	assert.equal(T.tpmCompute(S({ threshold: 2 }), C({ width: 1920, height: 1000 })).usePortrait, true);
});

test('portrait stays off where FFZ keeps it off', () => {
	assert.equal(T.tpmCompute(S({ enabled: false }), C()).usePortrait, false);
	assert.equal(T.tpmCompute(S(), C({ isWatchParty: true })).usePortrait, false);
	assert.equal(T.tpmCompute(S(), C({ route: 'user-home' })).usePortrait, false);
	assert.equal(T.tpmCompute(S(), C({ route: 'dir' })).usePortrait, false);
	assert.equal(T.tpmCompute(S(), C({ route: null })).usePortrait, false);
	for (const r of T.TPM_PORTRAIT_ROUTES)
		assert.equal(T.tpmCompute(S(), C({ route: r })).usePortrait, true, r);
});

test('collapsed chat: chat-fix still applies, portrait layout does not', () => {
	const d = T.tpmCompute(S(), C({ rightColumnExpanded: false }));
	assert.equal(d.usePortrait, true);
	assert.equal(d.styles.portrait, false);
	assert.equal(d.styles['player-size'], false);
	assert.equal(d.styles['chat-fix'], true);
});

test('compact chat only applies while in portrait', () => {
	assert.equal(T.tpmCompute(S({ compactChat: true }), C()).styles['portrait-chat'], true);
	assert.equal(T.tpmCompute(S({ compactChat: true }), C({ width: 2000 })).styles['portrait-chat'], false);
});

test('extra height and width follow FFZ formulas', () => {
	assert.equal(T.tpmCompute(S(), C({ theatreModeEnabled: true })).extraHeight, 4);
	assert.equal(T.tpmCompute(S(), C({ theatreModeEnabled: true })).extraWidth, 0);
	// fullscreen cancels theatre mode
	assert.equal(T.tpmCompute(S(), C({ theatreModeEnabled: true, fullscreen: true })).extraHeight, 14);
	assert.equal(T.tpmCompute(S(), C({ sideNavExpanded: true })).extraWidth, 24);
	assert.equal(T.tpmCompute(S({ sideNav: 0 }), C()).extraWidth, 0);
	assert.equal(T.tpmCompute(S({ sideNav: 2 }), C()).extraWidth, 0);
	assert.equal(T.tpmCompute(S({ sideNav: 2 }), C({ width: 2000 })).extraWidth, 5);
});

test('side navigation visibility options', () => {
	assert.equal(T.tpmCompute(S({ sideNav: 1 }), C()).styles['hide-side-nav'], false);
	assert.equal(T.tpmCompute(S({ sideNav: 0 }), C({ width: 2000 })).styles['hide-side-nav'], true);
	assert.equal(T.tpmCompute(S({ sideNav: 2 }), C()).styles['hide-side-nav'], true);
	assert.equal(T.tpmCompute(S({ sideNav: 2 }), C({ width: 2000 })).styles['hide-side-nav'], false);
});
