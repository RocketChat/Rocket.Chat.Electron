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
        const label = this.props.label;
        const labelId = this.props.labelId;
        let inputLabel;
        if(label && labelId) {
            inputLabel = <label for={labelId}>{label}</label>;
        } 
        return (
            <div className="rcr-input-text">
                {inputLabel}   
                <input type="text" name={this.props.name} value={this.state.textValue} onChange={this.handleChange} placeholder={this.props.placeholder} id={labelId}/>
            </div>
        );
    }
}

export default Textinput;