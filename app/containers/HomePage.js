// @flow
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Home from '../components/Home';
import * as ServerActions from '../actions/server';

function mapStateToProps(state) {
  return {
    counter: state.counter,
    servers: state.servers,
    active: state.activeServer,
    sidebarStatus: state.sidebarStatus,
    update: state.update
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(ServerActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);
