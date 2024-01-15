import { Box } from '@rocket.chat/fuselage';
import type { AllHTMLAttributes } from 'react';

type ActionButtonProps = AllHTMLAttributes<HTMLAnchorElement>;

const ActionButton = (props: ActionButtonProps) => (
  <>
    <Box marginInline={4} withRichContent>
      <a href='#' {...props} />
    </Box>
  </>
);

export default ActionButton;
