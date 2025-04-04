# Rocket.Chat Desktop Client

## Important: Setting Sandbox Permissions

Before running Rocket.Chat Desktop, you need to set the correct permissions for the chrome-sandbox file.
Run the included set-permissions.sh script with sudo:

```
sudo ./set-permissions.sh
```

This is necessary for the Electron sandbox security to work correctly. Without this step, 
the application might crash with an error about the sandbox helper binary not being configured correctly.

## Alternative Method

If you're unable to run the script for any reason, you can manually set the permissions:

```
sudo chmod 4755 ./chrome-sandbox
```

## Running Without Sandbox

If you cannot set the SUID permissions for security policy reasons, you can run the application
with sandbox disabled (less secure):

```
./rocketchat-desktop --no-sandbox
```

## Support

If you encounter any issues, please report them at:
https://github.com/RocketChat/Rocket.Chat.Electron/issues
