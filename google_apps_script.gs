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

// Función para crear la carpeta de fotos si no existe
function getOrCreatePhotoFolder() {
  const folderName = "Fotos_Asistencia";
  let folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

// Función para guardar la foto y obtener el enlace
function savePhoto(base64Data, fileName) {
  try {
    // Decodificar la imagen base64
    const photoBlob = Utilities.newBlob(Utilities.base64Decode(base64Data.split(',')[1]), 'image/jpeg', fileName);
    
    // Obtener o crear la carpeta
    const folder = getOrCreatePhotoFolder();
    
    // Guardar el archivo
    const file = folder.createFile(photoBlob);
    
    // Configurar permisos de visualización
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (error) {
    console.error("Error al guardar la foto:", error);
    throw error;
  }
}

// Función doPost actualizada para manejar fotos
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "AsistenciasRegistradas";
    let sheet = ss.getSheetByName(sheetName);

    const expectedHeaders = ["Nombre", "Fecha Hora Ingreso", "Vehículo", "Foto"];
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
    const photoData = e.parameter.photo;

    if (!driver || !timestamp || !vehicleType || !photoData) {
      return ContentService
            .createTextOutput(JSON.stringify({ 
              status: "error", 
              message: "Faltan datos requeridos (conductor, timestamp, tipo de vehículo o foto)." 
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Guardar la foto y obtener el enlace
    const fileName = `${driver}_${timestamp.replace(/[/:]/g, '-')}.jpg`;
    const photoUrl = savePhoto(photoData, fileName);

    const nextRow = sheet.getLastRow() + 1;

    // Escribir los datos en la hoja
    if (columnMap["Nombre"]) {
      sheet.getRange(nextRow, columnMap["Nombre"]).setValue(driver);
    }
    if (columnMap["Fecha Hora Ingreso"]) {
      sheet.getRange(nextRow, columnMap["Fecha Hora Ingreso"]).setValue(timestamp);
    }
    if (columnMap["Vehículo"]) {
      sheet.getRange(nextRow, columnMap["Vehículo"]).setValue(vehicleType);
    }
    if (columnMap["Foto"]) {
      sheet.getRange(nextRow, columnMap["Foto"]).setValue(photoUrl);
    }

    return ContentService
          .createTextOutput(JSON.stringify({ 
            status: "success", 
            message: `Asistencia registrada para ${driver} (${vehicleType})`,
            photoUrl: photoUrl
          }))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en doPost:", error.toString(), "Stack:", error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ 
            status: "error", 
            message: "Error interno del servidor al procesar la solicitud." 
          }))
          .setMimeType(ContentService.MimeType.JSON);
  }
} 