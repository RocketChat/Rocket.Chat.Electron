import React from 'react';

import style from './navigationMenuItem.css';
import icons from '../../stylesheets/fontello.less';

class NavigationMenuItem extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-navigation-item">
               <a href="#" className="rcr-navigation-item__link">
                    <div className="rcr-navigation-item__icon">
                        <i className={this.props.icon || 'icon-flash'}></i>
                    </div>
                    <div className="rcr-navigation-item__title">{this.props.title}</div>
                </a>
            </div>
        );
    }
}

export default NavigationMenuItem;