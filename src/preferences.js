import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom'

import Layout from '../src/components/Layout';

import NavigationMenuSidebar from '../src/components/NavigationMenuSidebar';
import NavigationMenuHeader from '../src/components/NavigationMenuHeader';
import NavigationMenuItem from '../src/components/NavigationMenuItem';
import NavigationMenu from '../src/components/NavigationMenu';

import Content from '../src/components/Content';

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
                  <NavigationMenuItem title="Style" icon="icon-pencil" path="/styles" />
                  <NavigationMenuItem title="Network" icon="icon-network" path="/network" />
                </NavigationMenu>
              </NavigationMenuSidebar>
              <Content color="grey">          
                {routes}   
              </Content>
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