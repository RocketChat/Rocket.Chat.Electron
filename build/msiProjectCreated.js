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
 */
const fs = require('fs');

exports.default = async function msiProjectCreated(projectFile) {
  let xml = await fs.promises.readFile(projectFile, 'utf8');

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
        Dim fso, installDir, filePath, f
        Set fso = CreateObject("Scripting.FileSystemObject")
        installDir = Session.Property("CustomActionData")
        If Right(installDir, 1) <> "\\" Then installDir = installDir & "\\"
        filePath = installDir & "resources\\update.json"
        Set f = fso.CreateTextFile(filePath, True)
        f.WriteLine "{"
        f.WriteLine "  ""canUpdate"": false,"
        f.WriteLine "  ""autoUpdate"": false"
        f.WriteLine "}"
        f.Close
      ]]>
    </CustomAction>`;

  const sequenceEntries = `
      <Custom Action="SetWriteUpdateJsonDir" Before="WriteUpdateJson">DISABLE_AUTO_UPDATES = 1</Custom>
      <Custom Action="WriteUpdateJson" After="InstallFiles">DISABLE_AUTO_UPDATES = 1</Custom>`;

  // Inject custom action entries into existing InstallExecuteSequence if present,
  // otherwise create a new one
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

  // Inject property and custom action definitions before </Product>
  xml = xml.replace('</Product>', `${propertyAndActions}\n  </Product>`);

  await fs.promises.writeFile(projectFile, xml, 'utf8');
};
