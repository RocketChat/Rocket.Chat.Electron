// @flow
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import LoadingFail from './LoadingFail';
import Loading from '../common/Loading';
import styles from './WebView.scss';

export default class WebView extends Component {
  webview: Object
  state = {
    loading: true
  };

  componentDidMount() {
    this.webview.src = this.props.lastPath || this.props.url;
    this.webview.addEventListener('ipc-message', this.onIpcMessage);
    this.webview.addEventListener('console-message', (e) => {
      console.log('webview:', e.message);
    });
    this.webview.addEventListener('dom-ready', this.finishLoad);
    this.webview.addEventListener('did-navigate-in-page', ({ url }) => this.props.updateServer(this.props.url, { lastPath: url }));

    this.webview.addEventListener('did-fail-load', (e) => {
      if (e.isMainFrame) {
        this.setState({
          loadingError: true
        });
      }
    });

    this.webview.addEventListener('did-get-response-details', (e) => {
      if (e.resourceType === 'mainFrame' && e.httpResponseCode >= 500) {
        this.setState({
          loadingError: true
        });
      }
    });

    ipcRenderer.on('toggle-dev-tools', () => this.props.active && this.openDevTools())
    ipcRenderer.on('reload', () => this.props.active && this.reload())
  }

  finishLoad = () => {
    console.log('FINISH LOAD')
    this.setState({
      loading: false
    });
  }

  reload = () => {
    this.setState({
      loadingError: false,
      loading: true
    });
    this.webview.reload();
  }

  openDevTools = () => {
    this.webview.openDevTools();
  }

  onIpcMessage = (event) => {
    console.log('ipc-message')
    //this.emit('ipc-message-'+event.channel, host.url, event.args);

    switch (event.channel) {
      case 'title-changed': {
        let title = event.args[0];
        if (title === 'Rocket.Chat' && !this.props.url.includes('//demo.rocket.chat')) {
          title += ` - ${this.props.url}`;
        }
        this.props.updateServer(this.props.url, { title });
        break;
      }
      case 'unread-changed':
        // sidebar.setBadge(host.url, event.args[0]);
        break;
      case 'focus':
        this.props.setActive(this.props.url);
        break;
      case 'get-sourceId':
        /* desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
          if (error) {
            throw error;
          }

          sources = sources.map(source => {
            source.thumbnail = source.thumbnail.toDataURL();
            return source;
          });
          ipcRenderer.send('screenshare', sources);
        }); */
        break;
      default:
        break;
    }
  }

  render() {
    const style = {};
    if (this.props.active) {
      style.height = '100%';
    }
    return (
      <div style={style}>
        {this.state.loading && <Loading />}
        {this.state.loadingError && <LoadingFail reload={this.reload} />}
        <webview
          ref={webview => { this.webview = webview; }}
          allowpopups
          disablewebsecurity
          preload="preload.js"
          className={styles.webview}
          style={{
            zIndex: this.props.active ? 1 : 0
          }}/>
        </div>
    )
  }
}
