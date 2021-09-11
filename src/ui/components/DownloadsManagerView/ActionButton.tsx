import { Box } from '@rocket.chat/fuselage';
import React, { AllHTMLAttributes, FC } from 'react';

type ActionButtonProps = {
  onClick: AllHTMLAttributes<HTMLAnchorElement>['onClick'];
};

const ActionButton: FC<ActionButtonProps> = (props) => (
  <>
    <Box marginInline={4} withRichContent>
      <a href='#' {...props} />
    </Box>
  </>
);

export default ActionButton;
