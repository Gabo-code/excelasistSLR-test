// Función doGet para obtener la lista de conductores
function doGet(e) {
  const sheetName = "Conductores"; 
  const nameColumn = 1;
  const startRow = 2; 

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
            .createTextOutput(JSON.stringify({ error: "Hoja \'" + sheetName + "\' no encontrada." }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const range = sheet.getRange(startRow, nameColumn, sheet.getLastRow() - (startRow - 1), 1);
    const values = range.getValues();
    const drivers = values.flat().filter(name => name.toString().trim() !== "");

    return ContentService
          .createTextOutput(JSON.stringify({ drivers: drivers }))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en doGet: " + error.toString() + " Stack: " + error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ error: "Error interno del servidor en doGet: " + error.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función doPost para registrar la asistencia
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "AsistenciasRegistradas";
    let sheet = ss.getSheetByName(sheetName);

    const expectedHeaders = ["Nombre", "Fecha Hora Ingreso", "Vehículo"];
    let columnMap = {}; 

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      expectedHeaders.forEach((header, index) => {
        columnMap[header] = index + 1; 
      });
    } else {
      const lastCol = sheet.getLastColumn();
      const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      currentHeaders.forEach((header, index) => {
        if (header && header.toString().trim() !== "") { 
          columnMap[header] = index + 1;
        }
      });

      let nextHeaderCol = lastCol > 0 ? lastCol : 0;
      expectedHeaders.forEach(expectedHeader => {
        if (!columnMap[expectedHeader]) {
          nextHeaderCol++;
          sheet.getRange(1, nextHeaderCol).setValue(expectedHeader);
          columnMap[expectedHeader] = nextHeaderCol;
        }
      });
    }

    const driver = e.parameter.driver;
    const timestamp = e.parameter.timestamp;
    const vehicleType = e.parameter.vehicleType;

    if (!driver || !timestamp || !vehicleType) {
      return ContentService
            .createTextOutput(JSON.stringify({ status: "error", message: "Faltan datos (conductor, timestamp o tipo de vehículo)." }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const nextRow = sheet.getLastRow() + 1;

    if (columnMap["Nombre"]) {
      sheet.getRange(nextRow, columnMap["Nombre"]).setValue(driver);
    }
    if (columnMap["Fecha Hora Ingreso"]) {
      sheet.getRange(nextRow, columnMap["Fecha Hora Ingreso"]).setValue(timestamp);
    }
    if (columnMap["Vehículo"]) {
      sheet.getRange(nextRow, columnMap["Vehículo"]).setValue(vehicleType);
    }

    return ContentService
          .createTextOutput(JSON.stringify({ status: "success", message: `Asistencia registrada para ${driver} (${vehicleType})` }))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en doPost: " + error.toString() + " Stack: " + error.stack); 
    return ContentService
          .createTextOutput(JSON.stringify({ status: "error", message: "Error interno del servidor al procesar la solicitud." }))
          .setMimeType(ContentService.MimeType.JSON);
  }
} 