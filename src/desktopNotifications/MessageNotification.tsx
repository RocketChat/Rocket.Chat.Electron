import {
  Avatar,
  Box,
  Button,
  Icon,
  Label,
  Message,
} from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

import { CustomNotification } from './customNotification';

export function MessageNotification() {
  const [notification, setNotification] = useState<CustomNotification>();

  useEffect(() => {
    ipcRenderer.on('notification', (_event, notification) => {
      setNotification(notification);
      console.log(notification);
    });
  }, []);

  function handleNotificationClick() {
    console.log('notification clicked');
    ipcRenderer.send('desktopNotificationClick', notification);
  }

  ipcRenderer.send('desktopNotificationReady');
  console.log('desktopNotificationReady');

  return (
    // <div
    //   className='notification'
    //   onClick={handleNotificationClick}
    //   style={{ height: '100vh' }}
    // >
    //   <Box h='x50' display='flex' alignItems='center' p='x16'>
    //     <Avatar size='x48' url={String(notification?.avatar)} />
    //     <Box paddingInlineStart='x16'>
    //       <Label>{notification?.title}</Label>
    //     </Box>
    //   </Box>
    //   <Box p='x16' width='x80'>
    //     {notification?.body}
    //   </Box>
    // </div>
    <div>
      <Box
        p='x4'
        maxWidth='x276'
        borderRadius='x10'
        backgroundColor='white'
        onClick={handleNotificationClick}
      >
        <Message>
          <Message.LeftContainer>
            <Avatar url={String(notification?.avatar)} size={'x36'} />
          </Message.LeftContainer>
          <Message.Container>
            <Message.Header>
              <Message.Name>{notification?.title}</Message.Name>
            </Message.Header>
            <Message.Body>{notification?.body}</Message.Body>
          </Message.Container>
        </Message>
      </Box>
    </div>
  );
}
