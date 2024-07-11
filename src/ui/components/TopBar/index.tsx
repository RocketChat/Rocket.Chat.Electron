import { Box } from '@rocket.chat/fuselage';

export const TopBar = () => {
  return (
    <Box
      height='x28'
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
      color='default'
      bg='light'
      width='100%'
    >
      <Box fontScale='p2'>400 Mensagens nao lidas</Box>
    </Box>
  );
};
