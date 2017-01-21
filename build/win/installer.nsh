!ifndef BUILD_UNINSTALLER
  Function AddToStartUp
    CreateShortCut "$SMSTARTUP\Rocket.Chat+.lnk" "$INSTDIR\Rocket.Chat+.exe" ""
  FunctionEnd
  
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Run at startup"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION AddToStartUp

!endif


!macro customInstall
    ; Required as electron-builder does not provide a way to specify it as of version 11.2.4
    WriteRegStr SHCTX "${UNINSTALL_REGISTRY_KEY}" "DisplayIcon" '"$INSTDIR\resources\build\icon.ico"'

    ;!ifdef BUILD_UNINSTALLER
    ;Function AddToStartup2
    ;  CreateShortCut "$SMSTARTUP\Rocket.Chat+.lnk" "$INSTDIR\Rocket.Chat+.exe" ""
    ;FunctionEnd
    ;!endif

    ; Using the read me setting as an easy way to add an add to startup option
    ; !define EnableAddToStartup

!macroend

!macro customUnInstall
  Delete "$SMSTARTUP\Rocket.Chat+.lnk"
!macroend
