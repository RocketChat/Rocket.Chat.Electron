import React from 'react';
import { Route } from 'react-router-dom'

import Styles from '../views/styles';
import Network from '../views/network';

const routes = (
    <div>
      <Route path="/styles" component={Styles} />
      <Route path="/network" component={Network} />      
    </div>
  );

export default routes;