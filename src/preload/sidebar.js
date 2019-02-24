import { ipcRenderer } from 'electron';


const requestSidebarColor = function pollSidebarColor() {
	const sidebar = document.querySelector('.sidebar');
	if (sidebar) {
		const { color, background } = window.getComputedStyle(sidebar);
		const sidebarItem = sidebar.querySelector('.sidebar-item');
		const itemColor = sidebarItem && window.getComputedStyle(sidebarItem).color;
		ipcRenderer.sendToHost('sidebar-background', { color: itemColor || color, background });
		return;
	}

	const fullpage = document.querySelector('.full-page');
	if (fullpage) {
		const { color, background } = window.getComputedStyle(fullpage);
		ipcRenderer.sendToHost('sidebar-background', { color, background });
		return;
	}

	requestAnimationFrame(pollSidebarColor);
};

export default () => {
	ipcRenderer.on('request-sidebar-color', requestSidebarColor);
};
