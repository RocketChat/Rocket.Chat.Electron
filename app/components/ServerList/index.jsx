// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import styles from './ServerList.scss';

export default class ServerList extends Component {
  state = {
    imageLoaded: {}
  }

  addServer = () => {
    console.log('add server')
  }

  imageLoaded = (url) => {
    const imageLoaded = Object.assign({}, this.state.imageLoaded, { [url]: true });
    console.log(imageLoaded)
    this.setState({ imageLoaded });
  }

  render() {
    return (
      <div className={styles.serverList}>
        <ul>
          {this.props.servers.map((server, index) => (
            <li key={index} onClick={() => this.props.changeServer(server.url)}>
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
