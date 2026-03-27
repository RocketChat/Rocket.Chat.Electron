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

  const propertyAndActions = `
    <!-- DISABLE_AUTO_UPDATES: enterprise property to disable auto-updates -->
    <Property Id="DISABLE_AUTO_UPDATES" Secure="yes"/>

    <CustomAction Id="SetWriteUpdateJsonDir"
      Property="WriteUpdateJson"
      Value="[APPLICATIONFOLDER]"/>

    <CustomAction Id="WriteUpdateJson"
      Script="vbscript"
      Execute="deferred"
      Impersonate="no"
      Return="check">
      <![CDATA[
        On Error Resume Next
        Dim fso, installDir, resourcesDir, filePath, f

        Set fso = CreateObject("Scripting.FileSystemObject")
        installDir = Session.Property("CustomActionData")
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
    </CustomAction>`;

  // -- 2. Scheduling entries (only during install, not uninstall) --

  const sequenceEntries = `
      <Custom Action="SetWriteUpdateJsonDir" Before="WriteUpdateJson">DISABLE_AUTO_UPDATES = 1 AND NOT REMOVE~="ALL"</Custom>
      <Custom Action="WriteUpdateJson" After="InstallFiles">DISABLE_AUTO_UPDATES = 1 AND NOT REMOVE~="ALL"</Custom>`;

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

  await fs.promises.writeFile(projectFile, xml, 'utf8');
};
