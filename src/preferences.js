import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom'

import Layout from '../src/components/Layout';

import NavigationMenuSidebar from '../src/components/NavigationMenuSidebar';
import NavigationMenuHeader from '../src/components/NavigationMenuHeader';
import NavigationMenuItem from '../src/components/NavigationMenuItem';
import NavigationMenu from '../src/components/NavigationMenu';

import routes from './scripts/menus/preferences/config/routes';

class HelloMessage extends React.Component {
    
    render() {
      return (
        <div>
          <Router>
            <Layout>
              <NavigationMenuSidebar color="grey">
                <NavigationMenuHeader title="Preferences"/>
                <NavigationMenu>
                  <NavigationMenuItem title="Style" icon="icon-pencil" path="/" />
                  <NavigationMenuItem title="Usability" icon="icon-network" path="/usability" />
                </NavigationMenu>
              </NavigationMenuSidebar>        
              {routes}   
            </Layout>
          </Router>
        </div>
      );
    }
  }
  
  ReactDOM.render(
    <HelloMessage name="New client Preferences for Rocket.Chat" />,
    document.getElementById('root')
  );