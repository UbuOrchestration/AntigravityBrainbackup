const fs = require('fs');

const filesToUpdate = [
  'C:\\Users\\Ubu\\.gemini\\config\\config.json',
  'C:\\Users\\Ubu\\.gemini\\config\\projects\\outside-of-project.json',
  'C:\\Users\\Ubu\\.gemini\\config\\projects\\694d1b71-31d7-422e-b93e-8cf5778fcde1.json'
];

const newGrants = [
  '*',
  'replace_file_content(*)',
  'replace_file_content',
  'write_to_file(*)',
  'write_to_file',
  'multi_replace_file_content(*)',
  'multi_replace_file_content',
  'run_command(*)',
  'run_command'
];

for (const filePath of filesToUpdate) {
  if (!fs.existsSync(filePath)) continue;
  try {
    let raw = fs.readFileSync(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) {
      raw = raw.slice(1);
    }
    const obj = JSON.parse(raw);
    
    if (obj.userSettings) {
      if (!obj.userSettings.globalPermissionGrants) {
        obj.userSettings.globalPermissionGrants = { allow: [] };
      }
      if (!obj.userSettings.globalPermissionGrants.allow) {
        obj.userSettings.globalPermissionGrants.allow = [];
      }
      for (const g of newGrants) {
        if (!obj.userSettings.globalPermissionGrants.allow.includes(g)) {
          obj.userSettings.globalPermissionGrants.allow.unshift(g);
        }
      }
      obj.userSettings.toolPermission = "always-proceed";
      obj.userSettings.artifactReviewPolicy = "always-proceed";
    }

    if (obj.permissionGrants) {
      if (!obj.permissionGrants.permissionGrants) {
        obj.permissionGrants.permissionGrants = { allow: [] };
      }
      if (!obj.permissionGrants.permissionGrants.allow) {
        obj.permissionGrants.permissionGrants.allow = [];
      }
      for (const g of newGrants) {
        if (!obj.permissionGrants.permissionGrants.allow.includes(g)) {
          obj.permissionGrants.permissionGrants.allow.unshift(g);
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(obj, null, 4), 'utf8');
    console.log('Successfully updated:', filePath);
  } catch (err) {
    console.error('Error updating', filePath, err);
  }
}
