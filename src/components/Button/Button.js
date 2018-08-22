const React = require('react');

const style = require('./button.css');

class Button extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let className = 'rcr-button'
        if (this.props.color) {
            className += ` rcr-button__${this.props.color}`;
        }

        return (
            <div>
                <button className={className} onClick={() => this.props.onClick()}>{this.props.value}</button>
            </div>
        );
    }
}

export default Button;
