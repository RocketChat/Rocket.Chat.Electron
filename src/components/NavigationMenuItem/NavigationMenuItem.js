import React from 'react';

import style from './navigationMenuItem.css';

class NavigationMenuItem extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-navigation-item">
               <a href="#">
                    <div className="rcr-navigation-item__picture">
                        <i className="icon-globe"></i>
                    </div>
                    <div className="rcr-navigation-item__title">{this.props.title}</div>
                </a>
            </div>
        );
    }
}

export default NavigationMenuItem;