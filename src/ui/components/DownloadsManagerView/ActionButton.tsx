import React, { FC } from 'react';

import { ClickableLink, ClickableLinkProps } from './styles';

const ActionButton: FC<ClickableLinkProps> = (props) =>
  <ClickableLink is='a' fontSize='x12' withTruncatedText color='neutral-600' {...props} />;

export default ActionButton;
