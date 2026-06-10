import path from 'path';

import { Box } from '@rocket.chat/fuselage';
import { useMemo } from 'react';

type FileIconProps = {
  fileName: string;
  mimeType: string;
};

const FileIcon = ({ fileName, mimeType }: FileIconProps) => {
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
        width='x32'
        mi='x2'
        mbs='neg-x20'
        color='hint'
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
