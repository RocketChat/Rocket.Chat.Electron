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
  !insertMacro registerTelephonyCapabilities
!macroend

!macro customUnInstall
  ${IfNot} ${Silent}
    Delete "$SMSTARTUP\Rocket.Chat.lnk"
  ${EndIf}
  !insertMacro unregisterTelephonyCapabilities
!macroend

; Register Rocket.Chat in RegisteredApplications + Capabilities\URLAssociations so
; the Windows 11 Default Apps picker exposes it as a candidate for tel/callto/sip
; and the `ms-settings:defaultapps?registeredApp{User|Machine}=Rocket.Chat` deep
; link lands on the app-specific page.
!macro registerTelephonyCapabilities
  ${If} $installMode == "all"
    !insertMacro writeTelephonyCapabilities HKLM
  ${Else}
    !insertMacro writeTelephonyCapabilities HKCU
  ${EndIf}
!macroend

!macro writeTelephonyCapabilities ROOT
  ; Per-scheme ProgIDs that the picker references through URLAssociations.
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.tel" "" "URL:Rocket.Chat Telephony"
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.tel" "URL Protocol" ""
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.tel\DefaultIcon" "" "$INSTDIR\Rocket.Chat.exe,0"
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.tel\shell\open\command" "" '"$INSTDIR\Rocket.Chat.exe" "%1"'

  WriteRegStr ${ROOT} "Software\Classes\RocketChat.callto" "" "URL:Rocket.Chat Telephony"
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.callto" "URL Protocol" ""
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.callto\DefaultIcon" "" "$INSTDIR\Rocket.Chat.exe,0"
  WriteRegStr ${ROOT} "Software\Classes\RocketChat.callto\shell\open\command" "" '"$INSTDIR\Rocket.Chat.exe" "%1"'

  ; Capabilities surface consumed by Windows 11 Default Apps.
  WriteRegStr ${ROOT} "Software\Rocket.Chat\Capabilities" "ApplicationName" "Rocket.Chat"
  WriteRegStr ${ROOT} "Software\Rocket.Chat\Capabilities" "ApplicationDescription" "Rocket.Chat Desktop"
  WriteRegStr ${ROOT} "Software\Rocket.Chat\Capabilities" "ApplicationIcon" "$INSTDIR\Rocket.Chat.exe,0"
  WriteRegStr ${ROOT} "Software\Rocket.Chat\Capabilities\URLAssociations" "tel" "RocketChat.tel"
  WriteRegStr ${ROOT} "Software\Rocket.Chat\Capabilities\URLAssociations" "callto" "RocketChat.callto"

  ; Entry point picked up by Default Apps and the ms-settings deep link.
  WriteRegStr ${ROOT} "Software\RegisteredApplications" "Rocket.Chat" "Software\Rocket.Chat\Capabilities"
!macroend

!macro unregisterTelephonyCapabilities
  ${If} $installMode == "all"
    !insertMacro deleteTelephonyCapabilities HKLM
  ${Else}
    !insertMacro deleteTelephonyCapabilities HKCU
  ${EndIf}
!macroend

!macro deleteTelephonyCapabilities ROOT
  DeleteRegValue ${ROOT} "Software\RegisteredApplications" "Rocket.Chat"
  DeleteRegKey ${ROOT} "Software\Rocket.Chat\Capabilities"
  DeleteRegKey /ifempty ${ROOT} "Software\Rocket.Chat"
  DeleteRegKey ${ROOT} "Software\Classes\RocketChat.tel"
  DeleteRegKey ${ROOT} "Software\Classes\RocketChat.callto"
  ; Prior versions may have created RocketChat.sip; clean it up just in case.
  DeleteRegKey ${ROOT} "Software\Classes\RocketChat.sip"
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
