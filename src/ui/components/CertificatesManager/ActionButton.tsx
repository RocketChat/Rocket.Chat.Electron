import { Button } from '@rocket.chat/fuselage';
import type { ComponentProps } from 'react';

type ActionButtonProps = ComponentProps<typeof Button>;

const ActionButton = (props: ActionButtonProps) => (
  <Button small danger {...props} />
);

export default ActionButton;
