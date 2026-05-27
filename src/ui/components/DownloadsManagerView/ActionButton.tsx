import { Button } from '@rocket.chat/fuselage';
import type { ComponentProps } from 'react';

type ActionButtonProps = Omit<ComponentProps<typeof Button>, 'small'>;

const ActionButton = ({ danger, secondary, ...props }: ActionButtonProps) => (
  <Button
    small
    danger={danger}
    secondary={secondary ?? !danger}
    mi='x4'
    {...props}
  />
);

export default ActionButton;
