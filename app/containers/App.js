// @flow
import React, { Component } from 'react';
import type { Children } from 'react';
//import Notification from '../lib/Notification';
//import Notification from 'node-mac-notifier';


export default class App extends Component {
  props: {
    children: Children
  };

  componentWillMount() {
    /*if (process.platform === 'darwin') {
      window.Notification = Notification;
    };*/
  }

  render() {
    return (
      <div>
        {this.props.children}
      </div>
    );
  }
}
