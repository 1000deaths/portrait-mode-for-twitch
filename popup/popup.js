'use strict';

const form = document.getElementById('settings');

function render(s) {
	form.elements.enabled.checked = s.enabled;
	form.elements.invert.checked = s.invert;
	form.elements.threshold.value = String(s.threshold);
	form.elements.compactChat.checked = s.compactChat;
	form.elements.sideNav.value = String(s.sideNav);
}

function read() {
	return tpmNormalizeSettings({
		enabled: form.elements.enabled.checked,
		invert: form.elements.invert.checked,
		threshold: form.elements.threshold.value,
		compactChat: form.elements.compactChat.checked,
		sideNav: form.elements.sideNav.value
	});
}

async function save() {
	const s = read();
	await browser.storage.local.set(s);
	// Show the value actually used (e.g. an invalid threshold becomes 1.25).
	render(s);
}

form.addEventListener('change', save);
form.addEventListener('submit', event => {
	event.preventDefault();
	save();
});

browser.storage.local.get(null).then(raw => render(tpmNormalizeSettings(raw)));
