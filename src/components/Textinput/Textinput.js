import React from 'react';

import style from './textinput.css';

class Textinput extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            textState: ''
        };

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({textState: event.target.value});
    }
 
    render() {
        return (
            <div className="rcr-input-text">
               <input type="text" name={this.props.name} value={this.state.textValue} onChange={this.handleChange}/>
            </div>
        );
    }
}

export default Textinput;