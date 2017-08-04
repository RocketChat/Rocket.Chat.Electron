!ifndef BUILD_UNINSTALLER
  Function AddToStartup
    CreateShortCut "$SMSTARTUP\Rocket.Chat+.lnk" "$INSTDIR\Rocket.Chat+.exe" ""
  FunctionEnd

  ; Using the read me setting as an easy way to add an add to startup option
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Run at startup"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION AddToStartup
!endif

!ifdef BUILD_UNINSTALLER
  Function un.AddAppData
    RMDir /r "$APPDATA\Rocket.Chat+"
  FunctionEnd

  ; Using the read me setting to add option to remove app data
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Remove user data"
  !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION un.AddAppData
!endif

!macro customInstall
    ; Required as electron-builder does not provide a way to specify it as of version 11.2.4
    WriteRegStr SHCTX "${UNINSTALL_REGISTRY_KEY}" "DisplayIcon" '"$INSTDIR\resources\build\icon.ico"'
!macroend

!macro customUnInstall
  ${IfNot} ${Silent}
    Delete "$SMSTARTUP\Rocket.Chat+.lnk"
  ${endif}
!macroend
