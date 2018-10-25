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
  ; Remove dangling reference of version 2.13.1
  ${If} $installMode == "all"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\66bed7da-e601-54e6-b2e8-7be611d82556"
  ${Else}
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\66bed7da-e601-54e6-b2e8-7be611d82556"
  ${EndIf}
  !insertMacro disableAutoUpdates
  Delete "$SMSTARTUP\Rocket.Chat+.lnk"
!macroend

!macro customUnInstall
  ${IfNot} ${Silent}
    Delete "$SMSTARTUP\Rocket.Chat.lnk"
  ${EndIf}
!macroend

!macro disableAutoUpdates
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/disableAutoUpdates" $R1
  ${IfNot} ${Errors}
    !insertMacro writeUpdateFile
  ${EndIf}
!macroend

!macro writeUpdateFile
  FileOpen $4 '$INSTDIR\resources\update.json' w
  FileWrite $4 '{$\r$\n'
  FileWrite $4 '  "canUpdate": false,$\r$\n'
  FileWrite $4 '  "autoUpdate": false$\r$\n'
  FileWrite $4 '}$\r$\n'
  FileClose $4
!macroend
