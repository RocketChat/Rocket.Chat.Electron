import React from 'react';

import ContentBody from '../../../../components/ContentBody';
import ContentTitle from '../../../../components/ContentTitle';

class Usability extends React.Component {
    
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div>
                <ContentTitle title="Usability preferences" />
                <ContentBody>Cool Usability ;-)</ContentBody>
            </div>
        );
    }
}

export default Usability;