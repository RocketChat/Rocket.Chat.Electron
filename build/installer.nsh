!ifndef BUILD_UNINSTALLER
  Function AddToStartup
    CreateShortCut "$SMSTARTUP\Rocket.Chat.lnk" "$INSTDIR\Rocket.Chat.exe" ""
  FunctionEnd

  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Run at startup"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION AddToStartup
!endif

!ifdef BUILD_UNINSTALLER
  Function un.AddAppData
    RMDir /r "$APPDATA\Rocket.Chat"
  FunctionEnd

  ; Using the read me setting to add option to remove app data
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Remove user data"
  !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION un.AddAppData
!endif

!macro customInstall
  ; Remove dangling references of versions 2.13.0 and 2.13.1
  SetRegView 64
  DeleteRegKey HKLM "Software\9b73a9fb-f1d5-59ee-b41e-e1dd393a748a"
  Delete "$SMSTARTUP\Rocket.Chat+.lnk"
!macroend

!macro customUnInstall
  ${IfNot} ${Silent}
    Delete "$SMSTARTUP\Rocket.Chat.lnk"
  ${endif}
!macroend
