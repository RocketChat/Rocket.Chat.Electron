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

!macro customUnInstall
  ${IfNot} ${Silent}
    Delete "$SMSTARTUP\Rocket.Chat.lnk"
  ${endif}
!macroend
