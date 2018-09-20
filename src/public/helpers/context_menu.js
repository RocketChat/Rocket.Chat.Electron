// This gives you default context menu (cut, copy, paste)
// in all input fields and textareas across your app.
const i18n = require('../../i18n');

(function() {
	'use strict';

	const { remote } = require('electron');
	const { Menu, MenuItem } = remote;

	const isAnyTextSelected = function() {
		return window.getSelection().toString() !== '';
	};

	const cut = new MenuItem({
		label: i18n.__('Cut'),
		click() {
			document.execCommand('cut');
		},
	});

	const copy = new MenuItem({
		label: i18n.__('Copy'),
		click() {
			document.execCommand('copy');
		},
	});

	const paste = new MenuItem({
		label: i18n.__('Paste'),
		click() {
			document.execCommand('paste');
		},
	});

	const normalMenu = new Menu();
	normalMenu.append(copy);

	const textEditingMenu = new Menu();
	textEditingMenu.append(cut);
	textEditingMenu.append(copy);
	textEditingMenu.append(paste);

	document.addEventListener('contextmenu', function(e) {
		switch (e.target.nodeName) {
			case 'TEXTAREA':
			case 'INPUT':
				e.preventDefault();
				textEditingMenu.popup(remote.getCurrentWindow());
				break;
			default:
				if (isAnyTextSelected()) {
					e.preventDefault();
					normalMenu.popup(remote.getCurrentWindow());
				}
		}
	}, false);

}());
