// @flow
import React, { Component } from 'react';
import styles from './Loading.scss';

export default class Loading extends Component {
  render() {
    return (
      <div className={styles.loadingAnimation} id="loading">
        <div className={styles.bounce1} />
        <div className={styles.bounce2} />
        <div />
      </div>
    );
  }
}
