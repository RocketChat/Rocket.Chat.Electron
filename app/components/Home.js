// @flow
import React, { Component } from 'react';
import WebView from './WebView';
import ServerList from './ServerList';
import AddServer from './AddServer';
import Loading from './Loading';
import UpdateBar from './UpdateBar';
import styles from './Home.scss';

export default class Home extends Component {
  state = {
    loading: true
  };


  componentWillMount() {
    this.props.loadServers();
    this.init(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.init(nextProps);
  }

  init(props) {
    console.log(props);
    if (!props.servers.length) {
      this.setState({
        addServer: true
      });
    } else if (props.servers !== this.props.servers && this.state.addServer === true) {
      this.setState({
        addServer: false
      });
    }
  }

  addServer = () => {
    console.log('add server')
    this.setState({
      addServer: true
    });
  }

  setActive = (url) => {
    this.props.setActive(url);
    this.setState({
      addServer: false
    });
  }

  render() {
    console.log('render')
    console.log(this.props.update);
    const serverListVisible = this.props.sidebarStatus;
    const serversWidth = serverListVisible ? 80 : 0;
    return (
      <div>

        {serverListVisible &&
          <ServerList
            addServer={this.addServer}
            servers={this.props.servers}
            changeServer={this.setActive}
          />
        }

        <div className={styles.appContainer} style={{ left: serversWidth }}>
          {this.props.update && <UpdateBar {...this.props.update} margin={!serverListVisible && process.platform === 'darwin'} />}
          <div className="drag-region top-bar" />
          {this.state.addServer && <AddServer addServer={this.props.addServer} />}

          {this.props.servers.map((server, i) => (
            <WebView
              {...server}
              key={server.url}
              active={this.props.active ? server.url === this.props.active : i === 0}
              setActive={this.setActive}
              updateServer={this.props.updateServer}
            />))}
        </div>
      </div>
    );
  }
}
