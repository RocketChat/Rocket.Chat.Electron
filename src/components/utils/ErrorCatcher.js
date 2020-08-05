import { ipcRenderer } from 'electron';
import { Component } from 'react';

import { EVENT_ERROR_THROWN } from '../../ipc';

export class ErrorCatcher extends Component {
	componentDidCatch(error, errorInfo) {
		console.error(error);
		console.error(errorInfo.componentStack);
		ipcRenderer.send(EVENT_ERROR_THROWN, error && (error.stack || error));
	}

	render() {
		return this.props.children;
	}
}
