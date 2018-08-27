import React from 'react';

import style from './content.css';

class Content extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        let className = 'rcr-content'
        if (this.props.color) {
            className += ` rcr-content__${this.props.color}`
        }

        return (
            <div className={className}>
               {this.props.children}
            </div>
        );
    }
}

export default Content;