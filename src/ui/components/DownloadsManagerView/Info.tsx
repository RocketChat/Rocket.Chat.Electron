import { Box, BoxProps } from '@rocket.chat/fuselage';
import React, { FC } from 'react';

const Info: FC<BoxProps> = (props) =>
  <Box fontSize='x12' withTruncatedText color='neutral-600' { ...props } />;

export default Info;
