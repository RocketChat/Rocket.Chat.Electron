import React from 'react';
import { Link } from 'react-router-dom'

import style from './navigationMenuItem.css';
import icons from '../../stylesheets/fontello.less';

class NavigationMenuItem extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-navigation-item">
               <Link to={this.props.path} className="rcr-navigation-item__link">
                    <div className="rcr-navigation-item__icon">
                        <i className={this.props.icon || 'icon-flash'}></i>
                    </div>
                    <div className="rcr-navigation-item__title">{this.props.title}</div>
                </Link>
            </div>
        );
    }
}

export default NavigationMenuItem;