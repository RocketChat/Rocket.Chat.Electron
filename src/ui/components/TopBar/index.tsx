import { Box } from '@rocket.chat/fuselage';

export const TopBar = () => {
  return (
    <Box
      className='rcx-sidebar--main'
      height='x28'
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
      color='default'
      bg='tint'
      width='100%'
    >
      <Box fontScale='p2'>400 Mensagens nao lidas</Box>
    </Box>
  );
};
