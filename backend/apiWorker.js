const { parentPort } = require('worker_threads');
const GasPolyfill = require('./GasPolyfill');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

parentPort.on('message', async (msg) => {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    // Initialize Polyfill
    const gas = new GasPolyfill(oAuth2Client);
    
    // Create Sandbox Context
    const sandbox = {
      SpreadsheetApp: gas.SpreadsheetApp,
      DriveApp: gas.DriveApp,
      Utilities: gas.Utilities,
      CacheService: gas.CacheService,
      Session: gas.Session,
      Logger: { log: console.log },
      console: console,
      process: process,
      // stub HTML service if needed
      HtmlService: {
        createTemplateFromFile: () => ({ evaluate: () => ({ setTitle: () => ({ setXFrameOptionsMode: () => ({ addMetaTag: () => '' }) }) }) })
      }
    };
    
    vm.createContext(sandbox);
    
    // Load all GAS files
    const backendFiles = ['App.js', 'AuthService.js', 'MasterDataService.js', 'AsetRouter.gs'];
    for (const file of backendFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, 'utf8');
        vm.runInContext(code, sandbox);
      }
    }
    
    const { func, args } = msg;
    
    if (typeof sandbox[func] !== 'function') {
      throw new Error(`Function ${func} is not defined in the GAS backend.`);
    }
    
    // Execute function synchronously
    const result = sandbox[func].apply(sandbox, args || []);
    
    parentPort.postMessage({ success: true, data: result });
  } catch (e) {
    parentPort.postMessage({ success: false, error: e.message, stack: e.stack });
  }
});
