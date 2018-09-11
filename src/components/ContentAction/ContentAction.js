import React from 'react';

import Button from '../Button'

import style from './contentAction.css';


class ContentAction extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="rcr-content-action">
               <Button color="primary" value="Save Settings"/>
            </div>
        );
    }
}

export default ContentAction;