// @flow
import React, { Component } from 'react';
import { remote } from 'electron';
import styles from './ServerList.scss';

export default class ServerList extends Component {
  state = {
    imageLoaded: {}
  }

  constructor() {
    super();
    this.contextMenu = remote.Menu.buildFromTemplate([
      {
        label: 'Reload server',
        click: () => this.props.webview[this.selectedServer.url].reload()
      },
      {
        label: 'Remove server',
        click: () => this.props.removeServer(this.selectedServer.url)
      },
      {
        label: 'Open DevTools',
        click: () => this.props.webview[this.selectedServer.url].openDevTools()
      }
    ]);
  }

  componentDidMount() {
  }

  addServer = () => {
    console.log('add server')
  }

  imageLoaded = (url) => {
    const imageLoaded = Object.assign({}, this.state.imageLoaded, { [url]: true });
    console.log(imageLoaded)
    this.setState({ imageLoaded });
  }

  showContextMenu = (e, server) => {
    e.preventDefault();
    this.selectedServer = server;
    this.contextMenu.popup(remote.getCurrentWindow());
  }

  render() {
    return (
      <div className={styles.serverList}>
        <ul>
          {this.props.servers.map((server, index) => (
            <li
              key={index}
              className={this.props.active === server.url && styles.active}
              onClick={() => this.props.changeServer(server.url)}
              onContextMenu={(e) => this.showContextMenu(e, server)}>
              <span
                style={{ display: this.state.imageLoaded[server.url] ? 'none' : 'initial' }}
              >RC</span>
              <div className={styles.tooltip}>{server.title}</div>
              <div className="badge"></div>
              <img
                src={`${server.url}/assets/favicon.svg`}
                alt="RC"
                onLoad={() => this.imageLoaded(server.url)}
                style={{ display: this.state.imageLoaded[server.url] ? 'initial' : 'none' }}
              />
              <div className={styles.name}>{`${process.platform === 'darwin' ? '⌘' : '^'} ${index + 1}`}</div>
            </li>
          ))}
        </ul>
        <ul>
          <li className={styles.addServer}>
            <span onClick={this.props.addServer}>+</span>
            <div className={styles.tooltip}>Add New Server</div>
          </li>
        </ul>
      </div>
    );
  }
}
