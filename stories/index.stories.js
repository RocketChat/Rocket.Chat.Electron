import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';


import Button from '../src/components/Button';
import Layout from '../src/components/Layout';

import NavigationMenuSidebar from '../src/components/NavigationMenuSidebar';
import NavigationMenuHeader from '../src/components/NavigationMenuHeader';
import NavigationMenuItem from '../src/components/NavigationMenuItem';
import NavigationMenu from '../src/components/NavigationMenu';


storiesOf('Buttons', module)
  .add('default button', () => <Button onClick={action('clicked')} value="Rocket.Chat" />)
  .add('primary button', () => <Button color="primary" onClick={action('clicked')} value="Rocket.Chat" />)
  .add('cancel button', () => <Button color="cancel" onClick={action('clicked')} value="Rocket.Chat" />);

const column1 = {
  'grid-column': '1',
  'grid-row': '1',
  'backgroundColor': '#1d74f5'
};

const column2 = {
  'grid-column': '2',
  'grid-row': '1',
  'backgroundColor': '#f5455c'
};

storiesOf('Layout', module)
  .add('preferences layout', () => <Layout>
    <div style={column1}>
      <h1>Menu</h1>
    </div>
    <div style={column2}>
      <h1>Content</h1>
    </div>
    </Layout>);

storiesOf('Navigation', module)
  .add('navigation menu', () => <Layout>
    <NavigationMenuSidebar color="grey">
      <NavigationMenuHeader title="Navigation Header"/>
      <NavigationMenu>
        <NavigationMenuItem title="Network"/>
        <NavigationMenuItem title="Style"/>
        <NavigationMenuItem title="Stuff"/>
      </NavigationMenu>
    </NavigationMenuSidebar>
    <div style={column2}>
      <h1>Content</h1>
    </div>
    </Layout>);    