/**
 * ODeSy - Portal Dashboard
 * File: AuthService.gs
 * Fungsi: Memvalidasi login user ke Master ODeSy.
 */

// Gunakan Spreadsheet ID Master yang baru saja Anda ciptakan!
const MASTER_SS_ID = "1bM98ecqLd8mV0mez1TGftOwv9-l4fNTHmt527z9v03s";

function getCurrentUser() {
  try {
    const email = Session.getActiveUser().getEmail();
    
    // Buka Master ODeSy
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const userSheet = ss.getSheetByName("USERS");
    const data = userSheet.getDataRange().getValues();
    
    // Looping mencari email
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][4] === "ACTIVE") { 
        return {
          status: "SUCCESS",
          user: {
            userId: data[i][0],
            email: data[i][1],
            displayName: data[i][2],
            roleId: data[i][3]
          }
        };
      }
    }
    
    return {
      status: "UNAUTHORIZED",
      message: "Email tidak terdaftar."
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: error.toString()
    };
  }
}
