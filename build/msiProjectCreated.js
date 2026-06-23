/**
 * electron-builder msiProjectCreated hook
 *
 * Injects a DISABLE_AUTO_UPDATES public property into the WiX project so that
 * enterprise admins can run:
 *
 *   msiexec /i rocketchat.msi DISABLE_AUTO_UPDATES=1 /qn
 *
 * When set, a deferred custom action writes resources/update.json with
 * {"canUpdate": false, "autoUpdate": false}, matching the NSIS installer's
 * /disableAutoUpdates behaviour.
 *
 * Implementation notes:
 * - Uses string replacement on electron-builder's generated .wxs file.
 *   This relies on the presence of </InstallExecuteSequence> and </Product>
 *   closing tags, which is validated at build time (throws if missing).
 * - The VBScript runs as a deferred custom action with elevated privileges
 *   (Impersonate="no") to write into Program Files.
 * - update.json is not explicitly cleaned up on uninstall because the MSI
 *   removes the entire installation directory (including resources/).
 */
const fs = require('fs');

exports.default = async function msiProjectCreated(projectFile) {
  let xml = await fs.promises.readFile(projectFile, 'utf8');

  // -- 1. Property and custom action definitions --
  //
  // WiX CustomActionData idiom for passing data to a deferred CA:
  //   - Immediate type-51 CA where Property="<deferred-CA-Id>" sets the
  //     session property whose value becomes CustomActionData at deferred
  //     execution time.
  //   - The immediate CA is scheduled just before the deferred CA, so the
  //     value is captured into the execution script for the elevated phase.
  //   - Deferred CA (Impersonate="no") runs elevated during commit phase and
  //     has no access to session properties other than CustomActionData.

  const propertyAndActions = `
    <!-- DISABLE_AUTO_UPDATES: enterprise property to disable auto-updates -->
    <Property Id="DISABLE_AUTO_UPDATES" Secure="yes"/>

    <!-- Immediate CA: sets CustomActionData for the deferred WriteUpdateJson CA.
         Property attribute MUST match the deferred CA's Id. -->
    <CustomAction Id="SetWriteUpdateJsonData"
      Property="WriteUpdateJson"
      Value="[APPLICATIONFOLDER]"
      Execute="immediate"
      Return="check"/>

    <CustomAction Id="WriteUpdateJson"
      Script="vbscript"
      Execute="deferred"
      Impersonate="no"
      Return="check">
      <![CDATA[
        ' On Error Resume Next is deliberate: every subsequent operation
        ' checks Err.Number explicitly so failures raise with context instead
        ' of aborting the CA mid-write. Do NOT add code below without an
        ' explicit Err.Number check or an On Error GoTo 0 reset first.
        On Error Resume Next
        Dim fso, installDir, resourcesDir, filePath, f

        Set fso = CreateObject("Scripting.FileSystemObject")
        installDir = Session.Property("CustomActionData")

        If Len(installDir) = 0 Then
          Err.Raise 1, "WriteUpdateJson", "CustomActionData is empty — SetWriteUpdateJsonData did not run"
        End If

        If Right(installDir, 1) <> "\\" Then installDir = installDir & "\\"

        resourcesDir = installDir & "resources"
        If Not fso.FolderExists(resourcesDir) Then
          Err.Raise 1, "WriteUpdateJson", "resources folder not found: " & resourcesDir
        End If

        filePath = resourcesDir & "\\update.json"
        Set f = fso.CreateTextFile(filePath, True)
        If Err.Number <> 0 Then
          Dim errMsg
          errMsg = "Failed to create " & filePath & ": " & Err.Description
          Err.Clear
          Err.Raise 1, "WriteUpdateJson", errMsg
        End If

        f.WriteLine "{"
        f.WriteLine "  ""canUpdate"": false,"
        f.WriteLine "  ""autoUpdate"": false"
        f.WriteLine "}"
        f.Close

        If Err.Number <> 0 Then
          Err.Raise Err.Number, "WriteUpdateJson", "Failed to write " & filePath & ": " & Err.Description
        End If
      ]]>
    </CustomAction>

    <!-- SET_DEFAULT_ASSOCIATIONS: enterprise property to wire the Windows
         "DefaultAssociationsConfiguration" policy at the bundled XML so
         tel:/callto: default to Rocket.Chat without admins authoring the
         policy XML themselves. Active Directory GPOs still override this
         locally-written value at the next gpupdate cycle. -->
    <Property Id="SET_DEFAULT_ASSOCIATIONS" Secure="yes"/>

    <CustomAction Id="SetWriteDefaultAssociationsPolicyData"
      Property="WriteDefaultAssociationsPolicy"
      Value="[APPLICATIONFOLDER]"
      Execute="immediate"
      Return="check"/>

    <CustomAction Id="SetCleanupDefaultAssociationsPolicyData"
      Property="CleanupDefaultAssociationsPolicy"
      Value="[APPLICATIONFOLDER]"
      Execute="immediate"
      Return="check"/>

    <CustomAction Id="WriteDefaultAssociationsPolicy"
      Script="vbscript"
      Execute="deferred"
      Impersonate="no"
      Return="check">
      <![CDATA[
        On Error Resume Next
        Dim shell, installDir, xmlPath, policyKey, sentinelKey, writeErr

        Set shell = CreateObject("WScript.Shell")
        installDir = Session.Property("CustomActionData")

        If Len(installDir) = 0 Then
          Err.Raise 1, "WriteDefaultAssociationsPolicy", "CustomActionData is empty — SetWriteDefaultAssociationsPolicyData did not run"
        End If

        If Right(installDir, 1) <> "\\" Then installDir = installDir & "\\"

        xmlPath = installDir & "resources\\RocketChatDefaultAppAssociations.xml"
        policyKey = "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System\\DefaultAssociationsConfiguration"
        sentinelKey = "HKLM\\SOFTWARE\\Rocket.Chat\\InstallState\\WroteDefaultAssociationsPolicy"

        shell.RegWrite policyKey, xmlPath, "REG_SZ"
        If Err.Number <> 0 Then
          writeErr = Err.Description
          Err.Clear
          Err.Raise 1, "WriteDefaultAssociationsPolicy", "Failed to write " & policyKey & ": " & writeErr
        End If

        shell.RegWrite sentinelKey, "1", "REG_SZ"
        If Err.Number <> 0 Then
          writeErr = Err.Description
          Err.Clear
          Err.Raise 1, "WriteDefaultAssociationsPolicy", "Failed to write " & sentinelKey & ": " & writeErr
        End If
      ]]>
    </CustomAction>

    <CustomAction Id="CleanupDefaultAssociationsPolicy"
      Script="vbscript"
      Execute="deferred"
      Impersonate="no"
      Return="check">
      <![CDATA[
        On Error Resume Next
        Dim shell, installDir, expectedXmlPath, policyKey, sentinelKey, sentinelValue, currentValue

        Set shell = CreateObject("WScript.Shell")
        installDir = Session.Property("CustomActionData")

        If Len(installDir) > 0 Then
          If Right(installDir, 1) <> "\\" Then installDir = installDir & "\\"
          expectedXmlPath = installDir & "resources\\RocketChatDefaultAppAssociations.xml"
          policyKey = "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System\\DefaultAssociationsConfiguration"
          sentinelKey = "HKLM\\SOFTWARE\\Rocket.Chat\\InstallState\\WroteDefaultAssociationsPolicy"

          sentinelValue = ""
          sentinelValue = shell.RegRead(sentinelKey)
          Err.Clear

          If sentinelValue = "1" Then
            currentValue = ""
            currentValue = shell.RegRead(policyKey)
            Err.Clear

            If currentValue = expectedXmlPath Then
              shell.RegDelete policyKey
              Err.Clear
            End If

            shell.RegDelete sentinelKey
            Err.Clear
          End If
        End If
      ]]>
    </CustomAction>

    <CustomAction Id="SetWriteTelephonyCapabilitiesData"
      Property="WriteTelephonyCapabilities"
      Value="[APPLICATIONFOLDER]"
      Execute="immediate"
      Return="check"/>

    <CustomAction Id="SetCleanupTelephonyCapabilitiesData"
      Property="CleanupTelephonyCapabilities"
      Value="[APPLICATIONFOLDER]"
      Execute="immediate"
      Return="check"/>

    <CustomAction Id="WriteTelephonyCapabilities"
      Script="vbscript"
      Execute="deferred"
      Impersonate="no"
      Return="check">
      <![CDATA[
        On Error Resume Next
        Dim shell, installDir, exePath, writeErr

        Set shell = CreateObject("WScript.Shell")
        installDir = Session.Property("CustomActionData")

        If Len(installDir) = 0 Then
          Err.Raise 1, "WriteTelephonyCapabilities", "CustomActionData is empty — SetWriteTelephonyCapabilitiesData did not run"
        End If

        If Right(installDir, 1) <> "\\" Then installDir = installDir & "\\"

        exePath = Chr(34) & installDir & "Rocket.Chat.exe" & Chr(34) & " " & Chr(34) & "%1" & Chr(34)

        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\", "URL:Rocket.Chat Telephony", "REG_SZ"
        If Err.Number <> 0 Then
          writeErr = Err.Description
          Err.Clear
          Err.Raise 1, "WriteTelephonyCapabilities", "Failed to write HKLM\\SOFTWARE\\Classes\\RocketChat.tel: " & writeErr
        End If
        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\URL Protocol", "", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\DefaultIcon\\", installDir & "Rocket.Chat.exe,0", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\shell\\open\\command\\", exePath, "REG_SZ"

        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\", "URL:Rocket.Chat Telephony", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\URL Protocol", "", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\DefaultIcon\\", installDir & "Rocket.Chat.exe,0", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\shell\\open\\command\\", exePath, "REG_SZ"

        shell.RegWrite "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\ApplicationName", "Rocket.Chat", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\ApplicationDescription", "Rocket.Chat Desktop", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\ApplicationIcon", installDir & "Rocket.Chat.exe,0", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\URLAssociations\\tel", "RocketChat.tel", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\URLAssociations\\callto", "RocketChat.callto", "REG_SZ"
        shell.RegWrite "HKLM\\SOFTWARE\\RegisteredApplications\\Rocket.Chat", "Software\\Rocket.Chat\\Capabilities", "REG_SZ"
        If Err.Number <> 0 Then
          writeErr = Err.Description
          Err.Clear
          Err.Raise 1, "WriteTelephonyCapabilities", "Failed to write HKLM\\SOFTWARE\\RegisteredApplications\\Rocket.Chat: " & writeErr
        End If
      ]]>
    </CustomAction>

    <CustomAction Id="CleanupTelephonyCapabilities"
      Script="vbscript"
      Execute="deferred"
      Impersonate="no"
      Return="check">
      <![CDATA[
        On Error Resume Next
        Dim shell
        Set shell = CreateObject("WScript.Shell")

        shell.RegDelete "HKLM\\SOFTWARE\\RegisteredApplications\\Rocket.Chat"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\URLAssociations\\tel"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\URLAssociations\\callto"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\ApplicationName"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\ApplicationDescription"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\ApplicationIcon"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\shell\\open\\command\\"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\DefaultIcon\\"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\URL Protocol"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.tel\\"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\shell\\open\\command\\"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\DefaultIcon\\"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\URL Protocol"
        Err.Clear
        shell.RegDelete "HKLM\\SOFTWARE\\Classes\\RocketChat.callto\\"
        Err.Clear
      ]]>
    </CustomAction>`;

  // -- 2. Scheduling entries (only during install, not uninstall) --
  //
  // Both CAs scheduled explicitly After="InstallFiles" in dependency order.
  // The immediate setter runs first to populate CustomActionData, then the
  // deferred writer runs. Condition also excludes maintenance mode (Installed)
  // so update.json is not rewritten on repair/modify.

  const installCondition =
    'DISABLE_AUTO_UPDATES = "1" AND NOT Installed AND NOT REMOVE~="ALL"';

  const setDefaultAssocInstallCondition =
    'SET_DEFAULT_ASSOCIATIONS = "1" AND NOT Installed AND NOT REMOVE~="ALL"';

  // Skip cleanup during a major upgrade — when the old MSI's uninstall
  // sequence runs as part of RemoveExistingProducts, UPGRADINGPRODUCTCODE
  // is populated with the new product's code. Wiping the policy mid-upgrade
  // would leave a clean install of the new MSI without the policy (the new
  // install only re-writes when SET_DEFAULT_ASSOCIATIONS=1 is passed again,
  // which admins typically forget on upgrade).
  const setDefaultAssocUninstallCondition =
    'REMOVE~="ALL" AND UPGRADINGPRODUCTCODE=""';
  const telephonyUninstallCondition =
    'REMOVE~="ALL" AND UPGRADINGPRODUCTCODE=""';
  const telephonyInstallCondition = 'NOT REMOVE~="ALL"';

  const sequenceEntries = `
      <Custom Action="SetWriteUpdateJsonData" After="InstallFiles">${installCondition}</Custom>
      <Custom Action="WriteUpdateJson" After="SetWriteUpdateJsonData">${installCondition}</Custom>
      <Custom Action="SetWriteDefaultAssociationsPolicyData" After="InstallFiles">${setDefaultAssocInstallCondition}</Custom>
      <Custom Action="WriteDefaultAssociationsPolicy" After="SetWriteDefaultAssociationsPolicyData">${setDefaultAssocInstallCondition}</Custom>
      <Custom Action="SetWriteTelephonyCapabilitiesData" After="InstallFiles">${telephonyInstallCondition}</Custom>
      <Custom Action="WriteTelephonyCapabilities" After="SetWriteTelephonyCapabilitiesData">${telephonyInstallCondition}</Custom>
      <Custom Action="SetCleanupDefaultAssociationsPolicyData" Before="RemoveFiles">${setDefaultAssocUninstallCondition}</Custom>
      <Custom Action="CleanupDefaultAssociationsPolicy" After="SetCleanupDefaultAssociationsPolicyData">${setDefaultAssocUninstallCondition}</Custom>
      <Custom Action="SetCleanupTelephonyCapabilitiesData" Before="RemoveFiles">${telephonyUninstallCondition}</Custom>
      <Custom Action="CleanupTelephonyCapabilities" After="SetCleanupTelephonyCapabilitiesData">${telephonyUninstallCondition}</Custom>`;

  // -- 3. Inject into the WiX XML --

  // 3a. Inject scheduling into InstallExecuteSequence
  if (xml.includes('</InstallExecuteSequence>')) {
    xml = xml.replace(
      '</InstallExecuteSequence>',
      `${sequenceEntries}\n        </InstallExecuteSequence>`
    );
  } else {
    const fullSequence = `
    <InstallExecuteSequence>${sequenceEntries}
    </InstallExecuteSequence>`;
    xml = xml.replace('</Product>', `${fullSequence}\n  </Product>`);
  }

  // 3b. Inject property and custom action definitions before </Product>
  xml = xml.replace('</Product>', `${propertyAndActions}\n  </Product>`);

  // -- 4. Build-time validation --

  if (!xml.includes('DISABLE_AUTO_UPDATES')) {
    throw new Error(
      `msiProjectCreated: failed to inject DISABLE_AUTO_UPDATES into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('WriteUpdateJson')) {
    throw new Error(
      `msiProjectCreated: failed to inject WriteUpdateJson custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('SetWriteUpdateJsonData')) {
    throw new Error(
      `msiProjectCreated: failed to inject SetWriteUpdateJsonData custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('SET_DEFAULT_ASSOCIATIONS')) {
    throw new Error(
      `msiProjectCreated: failed to inject SET_DEFAULT_ASSOCIATIONS into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('WriteDefaultAssociationsPolicy')) {
    throw new Error(
      `msiProjectCreated: failed to inject WriteDefaultAssociationsPolicy custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('CleanupDefaultAssociationsPolicy')) {
    throw new Error(
      `msiProjectCreated: failed to inject CleanupDefaultAssociationsPolicy custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('SetWriteDefaultAssociationsPolicyData')) {
    throw new Error(
      `msiProjectCreated: failed to inject SetWriteDefaultAssociationsPolicyData custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('SetCleanupDefaultAssociationsPolicyData')) {
    throw new Error(
      `msiProjectCreated: failed to inject SetCleanupDefaultAssociationsPolicyData custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }
  if (!xml.includes('WriteTelephonyCapabilities')) {
    throw new Error(
      `msiProjectCreated: failed to inject WriteTelephonyCapabilities custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  if (!xml.includes('CleanupTelephonyCapabilities')) {
    throw new Error(
      `msiProjectCreated: failed to inject CleanupTelephonyCapabilities custom action into WiX project. ` +
        `The generated .wxs structure may have changed — check ${projectFile}`
    );
  }

  await fs.promises.writeFile(projectFile, xml, 'utf8');
};
