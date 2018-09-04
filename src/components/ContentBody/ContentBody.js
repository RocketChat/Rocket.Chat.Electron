import React from 'react';

import style from './contentBody.css';

class ContentBody extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-content-body">
               {this.props.routes}
            </div>        
        );
    }
}

export default ContentBody;