const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const artifactsDir = path.join('C:', 'Users', 'Ubu', '.gemini', 'antigravity', 'brain', '480448e1-a537-4204-9b4f-cb5bfda403c3');

const images = [
  'rv_leveling_blocks_ready_to_ship_1782925687901.jpg',
  'rv_water_filter_ready_to_ship_1782943892512.jpg',
  'rv_sewer_hose_ready_to_ship_1782943899335.jpg',
  'rv_pressure_regulator_ready_to_ship_1782943906261.jpg',
  'rv_surge_protector_ready_to_ship_1782943915267.jpg'
];

async function uploadToCatbox(filePath) {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });
    return res.data;
  } catch (e) {
    console.error('Error uploading:', filePath, e.message);
    return null;
  }
}

async function main() {
  for (const img of images) {
    const p = path.join(artifactsDir, img);
    if (fs.existsSync(p)) {
      const url = await uploadToCatbox(p);
      console.log(`${img}: ${url}`);
    } else {
      console.log(`File not found: ${p}`);
    }
  }
}

main();
