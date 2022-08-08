import { Box, FieldGroup } from '@rocket.chat/fuselage';
import React, { FC } from 'react';

import { FlashFrame } from './features/FlashFrame';
import { HardwareAcceleration } from './features/HardwareAcceleration';
import { InternalVideoChatWindow } from './features/InternalVideoChatWindow';
import { MinimizeOnClose } from './features/MinimizeOnClose';
import { ReportErrors } from './features/ReportErrors';

export const GeneralTab: FC = () => (
  <Box is='form' margin={24} maxWidth={960} flexGrow={1} flexShrink={1}>
    <FieldGroup>
      <ReportErrors />
      <FlashFrame />
      <HardwareAcceleration />
      <InternalVideoChatWindow />
      {process.platform === 'win32' && <MinimizeOnClose />}
    </FieldGroup>
  </Box>
);
