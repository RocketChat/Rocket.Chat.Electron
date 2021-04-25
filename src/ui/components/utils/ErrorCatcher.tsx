import { Component, ReactNode, ErrorInfo } from 'react';

import { APP_ERROR_THROWN } from '../../../app/actions';
import { dispatch } from '../../../store';

export class ErrorCatcher extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error);
    console.error(errorInfo.componentStack);
    dispatch({
      type: APP_ERROR_THROWN,
      payload: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  }

  render(): ReactNode {
    return this.props.children ?? null;
  }
}
