import { ipcRenderer } from 'electron';
import { Component, ReactNode, ErrorInfo } from 'react';

import { EVENT_ERROR_THROWN } from '../../ipc';

export class ErrorCatcher extends Component {
	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error(error);
		console.error(errorInfo.componentStack);
		ipcRenderer.send(EVENT_ERROR_THROWN, error && (error.stack || error));
	}

	render(): ReactNode {
		return this.props.children ?? null;
	}
}
