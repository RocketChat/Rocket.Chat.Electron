import type { ReactNode, ErrorInfo } from 'react';
import { Component } from 'react';

import { APP_ERROR_THROWN } from '../../../app/actions';
import { dispatch } from '../../../store';

type ErrorCatcherProps = {
  children?: ReactNode;
};

export class ErrorCatcher extends Component<ErrorCatcherProps> {
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

  render() {
    return <>{this.props.children ?? null}</>;
  }
}
