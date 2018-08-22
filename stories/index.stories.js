import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';


import Button from '../src/components/Button';
//import Layout from '../src/components/Layout';

storiesOf('Buttons', module)
  .add('default button', () => <Button onClick={action('clicked')} value="Rocket.Chat"/>)
  .add('primary button', () => <Button color="primary" onClick={action('clicked')}  value="Rocket.Chat"/>)
  .add('cancel button', () => <Button color="cancel" onClick={action('clicked')}  value="Rocket.Chat"/>);

/*storiesOf('Layout', module)
  .add('preferences layout', () => <Layout></Layout>);*/