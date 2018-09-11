import React from 'react';


import Content from '../../../../components/Content';
import ContentBody from '../../../../components/ContentBody';
import ContentTitle from '../../../../components/ContentTitle';
import ContentAction from '../../../../components/ContentAction';

import style from './styles.css';

class Styles extends React.Component {
    
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <Content color="white">
                <ContentTitle title="Style preferences" />
                <ContentBody>
                    <div className="settings">
                        <div className="settings-group">
                            <div className="settings-description">
                                <h3>Tray icon color</h3>
                            </div>
                            <div className="settings-content">
                                <div className="settings-content-1">
                                    <input type="radio" className="custom-control-input" id="customControlValidation2" name="radio-stacked" required />
                                    <label className="custom-control-label" htmlFor="customControlValidation2">White color tray icon</label>
                                    <img className="settings-content-image" src="https://rocket.chat/images/default/logo--dark.svg"/>
                                </div>
                                <div className="settings-content-2">
                                    <input type="radio" className="custom-control-input" id="customControlValidation1" name="radio-stacked" required />
                                    <label className="custom-control-label" htmlFor="customControlValidation2">Colored tray icon</label>
                                    <img className="settings-content-image" src="https://rocket.chat/images/default/logo--dark.svg"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </ContentBody>
                <ContentAction type="Button"/>
            </Content>
        );
    }
}

export default Styles;