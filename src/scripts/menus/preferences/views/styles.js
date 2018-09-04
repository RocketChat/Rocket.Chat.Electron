import React from 'react';

import ContentBody from '../../../../components/ContentBody';
import ContentTitle from '../../../../components/ContentTitle';

class Styles extends React.Component {
    
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div>
                <ContentTitle title="Style preferences" />
                <ContentBody>Cool</ContentBody>
            </div>
        );
    }
}

export default Styles;