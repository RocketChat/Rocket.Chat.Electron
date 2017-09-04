// @flow
import React, { Component } from 'react';
import i18n from '../i18n';
import LoadingErrorImage from '../images/error.png';
import styles from './LoadingFail.scss';

export default class LoadingFail extends Component {
  render() {
    return (
      <section className={styles.loadingFail}>
        <img src={LoadingErrorImage} alt="Loading Error" />
        <div className={styles.failControls}>
          <h2>{i18n.__('Server_Failed_to_Load')}</h2>
          <button className="button primary" onClick={this.props.reload}>{i18n.__('Reload')}</button>
        </div>
      </section>
    );
  }
}
