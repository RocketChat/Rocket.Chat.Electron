// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
//import styles from './About.css';
import i18n from '../../i18n';
//import Icon from '../images/icon.png';

class About extends Component {
  props: {
  };

  render() {
    return (
      <div>
		<div className="app-name">
            ROCKET CHAT
		</div>
		<div className="app-version"></div>
		<span className="update-spin icon-spin3 animate-spin"></span>

		<button className="update">{i18n.__('Check_for_Updates')}</button>
		<p className="auto-update-container"><input type="checkbox" id="auto-update" checked /> {i18n.__('Check_for_Updates_on_Start')}</p>
		<p className="copyright">{i18n.__('Copyright')}</p>
      </div>
    );
  }
}

export default About;
