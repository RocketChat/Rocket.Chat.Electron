import { Avatar, Box, Button, Icon, Label } from '@rocket.chat/fuselage';
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
    <div
      className='notification'
      onClick={handleNotificationClick}
      style={{ height: '100vh' }}
    >
      <Box h='x50' display='flex' alignItems='center' p='x16'>
        <Avatar rounded size='x48' url={String(notification?.avatar)} />
        <Label>{notification?.title}</Label>
      </Box>
      <Box width='x100'>
        <span>{notification?.body}</span>
      </Box>
    </div>
  );
}
