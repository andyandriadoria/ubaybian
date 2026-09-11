const SUBJECT_TABS = Object.freeze({
  ubay: Object.freeze([
    'BAHASA INDONESIA', 'MATH', 'PANCASILA', 'ENGLISH', 'SCIENCE',
    'INFORMATIKA', 'GLOBAL CITIZENSHIP', 'PAI',
  ]),
  bian: Object.freeze([
    'BAHASA INDONESIA', 'PAIBP', 'ENGLISH', 'SCIENCE', 'MATH', 'PANCASILA',
  ]),
});

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty('GATEWAY_SECRET');

    if (!expectedSecret || body.secret !== expectedSecret) {
      return json_({ ok: false, code: 'FORBIDDEN' });
    }
    if (body.action !== 'readSheet') {
      return json_({ ok: false, code: 'INVALID_ACTION' });
    }

    const profileSlug = String(body.profileSlug || '').trim();
    const sheetName = String(body.sheetName || '').trim();
    const allowedTabs = SUBJECT_TABS[profileSlug];
    if (!allowedTabs || allowedTabs.indexOf(sheetName) === -1) {
      return json_({ ok: false, code: 'SUBJECT_FORBIDDEN' });
    }

    const spreadsheetId = properties.getProperty(profileSlug === 'ubay' ? 'UBAY_SHEET_ID' : 'BIAN_SHEET_ID');
    if (!spreadsheetId) {
      return json_({ ok: false, code: 'SHEET_NOT_CONFIGURED' });
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      return json_({ ok: false, code: 'SHEET_NOT_FOUND' });
    }

    const lastRow = Math.min(sheet.getLastRow(), 1000);
    const values = lastRow > 0 ? sheet.getRange(1, 1, lastRow, 19).getDisplayValues() : [];
    return json_({ ok: true, values: values });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, code: 'GATEWAY_ERROR' });
  }
}
