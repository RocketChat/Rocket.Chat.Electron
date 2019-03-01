import { ipcRenderer } from 'electron';


function getStylesFromSidebar(sidebar) {
	const { color, background } = window.getComputedStyle(sidebar);
	const sidebarItem = sidebar.querySelector('.sidebar-item');
	const itemColor = sidebarItem && window.getComputedStyle(sidebarItem).color;
	ipcRenderer.sendToHost('sidebar-style', { color: itemColor || color, background });
}

function getStylesFromPage(fullpage) {
	const { color, background } = window.getComputedStyle(fullpage);
	ipcRenderer.sendToHost('sidebar-style', { color, background });
}

function createStylesObserver(element, getStylesFrom) {
	const observer = new MutationObserver(() => {
		getStylesFrom(element);
	});

	observer.observe(element, { attributes: true });
	getStylesFrom(element);

	return observer;
}

let observer;

function requestSidebarStyle() {
	const sidebar = document.querySelector('.sidebar');
	if (sidebar) {
		observer && observer.disconnect();
		observer = createStylesObserver(sidebar, getStylesFromSidebar);
		return;
	}

	const fullpage = document.querySelector('.full-page');
	if (fullpage) {
		observer = createStylesObserver(fullpage, getStylesFromPage);
		setTimeout(requestSidebarStyle, 1000);
		return;
	}

	requestAnimationFrame(requestSidebarStyle);
}

export default () => {
	window.addEventListener('load', requestSidebarStyle);
};
