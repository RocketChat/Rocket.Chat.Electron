import { Box, FieldGroup } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

export type SectionProps = {
  title: string;
  isFirst?: boolean;
  children: ReactNode;
};

export const Section = ({ title, isFirst, children }: SectionProps) => (
  <Box mbs={isFirst ? 0 : 32} mbe={16}>
    <Box fontScale='h4' color='font-default' mbe={16}>
      {title}
    </Box>
    <FieldGroup>{children}</FieldGroup>
  </Box>
);
