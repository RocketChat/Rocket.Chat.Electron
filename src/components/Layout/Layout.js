import React from 'react';

import style from './layout.css';

class Layout extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-layout__container">
               {this.props.children}
            </div>
        );
    }
}

export default Layout;