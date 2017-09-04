// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as UpdateActions from '../actions/update';
import styles from './UpdateBar.scss';
import store from '../utils/store';
import { ipcRenderer } from 'electron';

class UpdateBar extends Component {
  state = {};

  isVisible() {
    const { version, checked, skip, downloaded, closed } = this.props;
    if (version && version !== skip && !closed) {
      return true;
    }
    return false;
  }

  download = () => {
    ipcRenderer.send('download-update');
    this.setState({
      downloading: true
    });
  }

  skip = () => {
    this.props.updateAvailable({ skip: this.props.version });
  }

  close = () => {
    this.props.updateAvailable({ closed: true });
  }

  cancel = () => {
    //TODO
  }

  render() {
    if (!this.isVisible()) {
      return null;
    }
    return (
      <div>
        <div className={styles.progress} style={{ width: `${this.props.progress ? this.props.progress.percent : 0}%` }} />
        <div className={styles.updateBar}>
          <div style={{ marginLeft: this.props.margin ? 60 : 0 }}>
            {this.state.downloading ?
              <span>Downloading Update ...{this.props.progress && `${this.props.progress.percent}% - ${this.props.progess.bytesPerSecond/1000} KB/s`}</span>
              :
              <span>Version {this.props.version} is now available to download.</span>
            }
            <span className={styles.right}>
              {this.state.downloading ?
                <button className="button" onClick={this.cancel}>Cancel</button>
                :
                <span>
                  <button className="button" onClick={this.download}>Download</button>
                  <button className="button" onClick={this.skip}>Skip</button>
                </span>
              }
              <i className="icon-cancel" onClick={this.close} />
            </span>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    update: state.update
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(UpdateActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UpdateBar);
