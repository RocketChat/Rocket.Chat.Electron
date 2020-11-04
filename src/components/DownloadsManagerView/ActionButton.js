import React from 'react';

import { ClickableLink } from './styles';

const ActionButton = (props) => <ClickableLink fontSize='x12' withTruncatedText color='neutral-600' { ...props } />;

export default ActionButton;
