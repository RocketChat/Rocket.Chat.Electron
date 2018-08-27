import React from 'react';

import style from './contentTitle.css';

class ContentTitle extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-content-title">
               <span>{this.props.title}</span>
            </div>
        );
    }
}

export default ContentTitle;