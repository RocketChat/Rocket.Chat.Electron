import React from 'react';
import { Route } from 'react-router-dom'

import style from './routes.css'

import Styles from '../views/styles';
import Usability from '../views/usability';

const routes = (
    <div className="rcr-routes-container">
      <Route path="/" component={Styles} />
      <Route path="/usability" component={Usability} />      
    </div>
  );

export default routes;