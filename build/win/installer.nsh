!macro customInstall
    ; Required as electron-builder does not provide a way to specify it as of version 11.2.4
    WriteRegStr SHCTX "${UNINSTALL_REGISTRY_KEY}" "DisplayIcon" '"$INSTDIR\resources\build\icon.ico"'
!macroend
