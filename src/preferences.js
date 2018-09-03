import React from 'react';
import ReactDOM from 'react-dom';

import Layout from '../src/components/Layout';

import NavigationMenuSidebar from '../src/components/NavigationMenuSidebar';
import NavigationMenuHeader from '../src/components/NavigationMenuHeader';
import NavigationMenuItem from '../src/components/NavigationMenuItem';
import NavigationMenu from '../src/components/NavigationMenu';

import Content from '../src/components/Content';
import ContentTitle from '../src/components/ContentTitle';
import ContentBody from '../src/components/ContentBody';


class HelloMessage extends React.Component {
    render() {
      return (
        <div>
          <Layout>
            <NavigationMenuSidebar color="grey">
              <NavigationMenuHeader title="Preferences"/>
              <NavigationMenu>
                <NavigationMenuItem title="Style" icon="icon-pencil"/>
              </NavigationMenu>
            </NavigationMenuSidebar>
            <Content color="grey">
              <ContentTitle title="Hello Content"/>
              <ContentBody>Content Body</ContentBody>
            </Content>
          </Layout>
        </div>
      );
    }
  }
  
  ReactDOM.render(
    <HelloMessage name="New client Preferences for Rocket.Chat" />,
    document.getElementById('root')
  );