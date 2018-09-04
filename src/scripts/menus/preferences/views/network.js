import React from 'react';

import ContentBody from '../../../../components/ContentBody';
import ContentTitle from '../../../../components/ContentTitle';

class Network extends React.Component {
    
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div>
                <ContentTitle title="Network preferences" />
                <ContentBody>Cool Network ;-)</ContentBody>
            </div>
        );
    }
}

export default Network;