
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '/root/Odesy_Portal/.env' });

// We need to simulate the worker env
const { SpreadsheetApp, Logger, Utilities, Session } = require('/root/Odesy_Portal/backend/GasPolyfill');
global.SpreadsheetApp = SpreadsheetApp;
global.Logger = Logger;
global.Utilities = Utilities;
global.Session = Session;

const MasterDataCode = fs.readFileSync('/root/Odesy_Portal/backend/MasterDataService.js', 'utf8');
eval(MasterDataCode);

async function test() {
   await SpreadsheetApp.init(); // if needed
   let data = getClustersAndCompaniesFromSheet_();
   console.log(JSON.stringify(data, null, 2));
}
test();

