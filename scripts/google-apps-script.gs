/**
 * Tiszta Házak — űrlapfogadó Google Apps Script.
 *
 * Ez a fájl NEM a weboldal része: a tartalmát a Google Táblázat
 * Apps Script szerkesztőjébe kell beilleszteni. Telepítési lépések:
 * README.md → „Űrlapok bekötése Google Táblázatba”.
 *
 * A weboldal JSON-t küld (text/plain), hogy ne kelljen CORS preflight.
 */

/** Ide érkezik értesítő e-mail minden új kitöltésről. Üresen: nincs e-mail. */
const NOTIFY_EMAIL = 'tisztahazakbp@gmail.com';

/** Üresen hagyva a szkripthez tartozó táblázatba ír (Bővítmények → Apps Script). */
const SPREADSHEET_ID = '';

const TIMEZONE = 'Europe/Budapest';

/** Melyik űrlap melyik munkalapra és milyen oszlopokba kerül. */
const FORMS = {
  ajanlatkeres: {
    sheet: 'Ajánlatkérés',
    fields: ['name', 'email', 'phone', 'service', 'message'],
    headers: ['Beérkezett', 'Név', 'E-mail', 'Telefon', 'Szolgáltatás', 'Megjegyzés'],
    subject: 'Új árajánlatkérés a weboldalról',
  },
  kapcsolat: {
    sheet: 'Kapcsolat',
    fields: ['name', 'email', 'phone', 'message'],
    headers: ['Beérkezett', 'Név', 'E-mail', 'Telefon', 'Üzenet'],
    subject: 'Új kapcsolatfelvétel a weboldalról',
  },
};

function doPost(e) {
  try {
    const data = readPayload(e);
    const config = FORMS[data.formType] || (data.service ? FORMS.ajanlatkeres : FORMS.kapcsolat);

    /* Robotok jellemzően minden mezőt kitöltenek — a csapdamezőt is. */
    if (String(data._trap || '').trim()) return jsonOut({ ok: true, skipped: 'spam' });
    if (!String(data.name || '').trim() || !String(data.email || '').trim()) {
      return jsonOut({ ok: false, error: 'missing-required' });
    }

    appendRow(config, data);

    /* A táblázat a biztos adattár: e-mail hiba (pl. napi kvóta) ne dobja el a sort. */
    try {
      notify(config, data);
    } catch (mailErr) {
      console.error(mailErr);
    }

    return jsonOut({ ok: true });
  } catch (err) {
    /* A hiba a szkript naplójában marad (Végrehajtások fül), hogy visszakövethető legyen. */
    console.error(err);
    return jsonOut({ ok: false, error: String(err) });
  }
}

/** Böngészőből megnyitva ellenőrizhető, hogy él-e a telepítés. */
function doGet() {
  return jsonOut({ ok: true, service: 'tisztahazak-form' });
}

function readPayload(e) {
  const raw = e && e.postData ? e.postData.contents : '';
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      /* Nem JSON: essünk vissza a szokásos form-encoded paraméterekre. */
    }
  }
  return (e && e.parameter) || {};
}

function appendRow(config, data) {
  /* Egyszerre több kitöltés ne írjon ugyanabba a sorba. */
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet(config);
    const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy.MM.dd HH:mm:ss');
    const row = [stamp].concat(config.fields.map((key) => String(data[key] || '')));
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

function getSheet(config) {
  const book = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Nincs táblázat: állítsd be a SPREADSHEET_ID-t.');

  let sheet = book.getSheetByName(config.sheet);
  if (!sheet) {
    sheet = book.insertSheet(config.sheet);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(config.headers);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notify(config, data) {
  if (!NOTIFY_EMAIL) return;
  const lines = config.fields.map((key, i) => `${config.headers[i + 1]}: ${data[key] || '—'}`);
  const options = {
    to: NOTIFY_EMAIL,
    subject: config.subject,
    body: `${lines.join('\n')}\n\nA teljes lista a Google Táblázatban található.`,
  };
  /* Így a levélre válaszolva egyenesen az érdeklődő címére megy a válasz. */
  const replyTo = String(data.email || '').trim();
  if (replyTo) options.replyTo = replyTo;

  MailApp.sendEmail(options);
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
