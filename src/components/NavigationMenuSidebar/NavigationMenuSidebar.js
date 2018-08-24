import React from 'react';

import style from './navigationMenuSidebar.css';

class NavigationMenuSidebar extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        let className = 'rcr-navigation-menu-sidebar'
        if (this.props.color) {
            className += ` rcr-navigation-menu-sidebar__${this.props.color}`
        }

        return (
            <div className={className}>
               {this.props.children}
            </div>
        );
    }
}

export default NavigationMenuSidebar;