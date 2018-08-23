const React = require('react');

const style = require('./layout.css');

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