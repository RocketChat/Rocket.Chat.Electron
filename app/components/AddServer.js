// @flow
import React, { Component } from 'react';
import Logo from '../images/logo.svg';
import styles from './AddServer.scss';

const defaultServer = 'https://demo.rocket.chat';

export default class AddServer extends Component {
  static validateHost(hostUrl, timeout = 5000) {
    const request = fetch(`${hostUrl}/api/info`)
      .then((res) => {
        if (res.status === 401) {
          const authHeader = res.headers.get('www-authenticate');
          if (authHeader && authHeader.toLowerCase().indexOf('basic ') === 0) {
            throw new Error('Basic Auth Error');
          }
        } else if (!res.ok) {
          throw new Error(`Invalid server url: ${res.statusText}`);
        }
        return res.json();
      })
      .catch((err) => {
        throw new Error(`Invalid server url: ${err.message}`);
      });
    const raceTimeout = new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout));
    return Promise.race([request, raceTimeout]);
  }

  state = {};

  addServer = (e) => {
    e.preventDefault();
    const server = {
      url: this.server.value || defaultServer,
      title: 'RocketChat+'
    };
    AddServer.validateHost(server.url)
      .then(() => this.props.addServer(server))
      .catch((err) => this.setState({ error: err.message }));
  }

  render() {
    return (
      <section className={styles.addServer}>
        <div className={styles.wrapper}>
          <header>
            <a className="logo">
              <img src={Logo} alt="RocketChat+" />
            </a>
          </header>
          <form className={styles.login} onSubmit={this.addServer}>
            <header>
              <h2>Enter your server URL</h2>
            </header>
            <div className="fields">
              <div className={`${styles.input} active`}>
                <input ref={input => { this.server = input; }} type="text" name="host" placeholder={defaultServer} dir="auto" />
              </div>
            </div>

            {this.state.error && <div className="alert alert-danger">{this.state.error}</div>}

            <div className="submit">
              <button type="submit" className="button primary login">Connect</button>
            </div>
          </form>
          <footer>
            <div className="social">
              <nav>
                <a target="_system" className={`${styles.share} button twitter`} href="https://twitter.com/RocketChat"><i className="icon-twitter" /><span>Twitter</span></a>
                <a target="_system" className={`${styles.share} button facebook`} href="https://www.facebook.com/RocketChatApp"><i className="icon-facebook" /><span>Facebook</span></a>
                <a target="_system" className={`${styles.share} button google`} href="https://plus.google.com/+RocketChatApp"><i className="icon-gplus" /><span>Google Plus</span></a>
                <a target="_system" className={`${styles.share} button github`} href="https://github.com/RocketChat/Rocket.Chat"><i className="icon-github-circled" /><span>Github</span></a>
                <a target="_system" className={`${styles.share} button linkedin`} href="https://www.linkedin.com/company/rocket-chat"><i className="icon-linkedin" /><span>LinkedIn</span></a>
              </nav>
            </div>
          </footer>
        </div>
      </section>
    );
  }
}
