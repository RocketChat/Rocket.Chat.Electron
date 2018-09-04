import React from 'react';

import style from './navigationMenu.css';

class NavigationMenu extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {    
        return (
            <div className="rcr-navigation-menu">
                {this.props.children}
            </div>
        );
    }
}

export default NavigationMenu;