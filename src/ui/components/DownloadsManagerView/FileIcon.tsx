import path from 'path';

import { Box } from '@rocket.chat/fuselage';
import React, { FC, useMemo } from 'react';

type FileIconProps = {
  fileName: string;
  mimeType: string;
};

const FileIcon: FC<FileIconProps> = ({ fileName, mimeType }) => {
  const label = useMemo(() => {
    const extension = path.extname(fileName);

    if (extension) {
      return extension.slice(1);
    }

    return /^\w+\/([-.\w]+)(?:\+[-.\w]+)?$/.exec(mimeType)?.[1];
  }, [fileName, mimeType]);

  return (
    <Box display='flex' flexDirection='column' width='x36' height='x44'>
      <Box is='img' src='images/file-icon.svg' alt={label} width='x36' />
      <Box
        width={32}
        mi={2}
        mbs={-20}
        color='neutral-600'
        fontScale='c2'
        textAlign='center'
        withTruncatedText
      >
        {label}
      </Box>
    </Box>
  );
};

export default FileIcon;
