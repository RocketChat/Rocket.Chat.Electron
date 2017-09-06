// @flow
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import WebView from './WebView';
import ServerList from '../ServerList';
import AddServer from '../AddServer';
import Loading from '../common/Loading';
import UpdateBar from './UpdateBar';
import styles from './Home.scss';

export default class Home extends Component {
  constructor() {
    super();
    this.state = {
      loading: true
    };
    this.webview = {};

    //ipcRenderer.on('')
  }

  componentWillMount() {
    this.props.loadServers();
    this.init(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.init(nextProps);
  }

  init(props) {
    if (!props.servers.length && props.active) {
      this.props.setActive(null);
    }
  }

  addServer = () => {
    this.props.setActive(null);
  }

  setActive = (url) => {
    this.props.setActive(url);
  }

  render() {
    // Only show serverlist if user wants it, and there is more than 1 server,
    // or if on add server page, so they can get back to existing servers
    const serverListVisible =
      (this.props.sidebarStatus && this.props.servers.length > 1) ||
      (this.props.servers.length && !this.props.active);
    console.log('serverListVisible')
    console.log(serverListVisible)
    console.log(this.props.servers)
    const serversWidth = serverListVisible ? 60 : 0;
    const active = this.props.active;
    return (
      <div>

        {serverListVisible &&
          <ServerList
            addServer={this.addServer}
            servers={this.props.servers}
            changeServer={this.setActive}
            active={active}
            webview={this.webview}
            removeServer={this.props.removeServer}
          />
        }

        <div className={styles.appContainer} style={{ left: serversWidth }}>
          {this.props.update && <UpdateBar {...this.props.update} margin={!serverListVisible && process.platform === 'darwin'} />}
          <div className="drag-region top-bar" />
          {!this.props.active && <AddServer addServer={this.props.addServer} />}

          {this.props.servers.map((server, i) => (
            <WebView
              {...server}
              ref={webview => {this.webview[server.url] = webview;}}
              key={server.url}
              active={server.url === active}
              setActive={this.setActive}
              updateServer={this.props.updateServer}
            />))}
        </div>
      </div>
    );
  }
}
