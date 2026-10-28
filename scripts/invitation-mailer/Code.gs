/* Private owner-run Apps Script. No doGet/doPost or web-app deployment. */
function yoggieConfig_() {
  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('MAILER_ENABLED') !== 'true') throw new Error('Mailer disabled');
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== 'armwoottipong@gmail.com') {
    throw new Error('Run only as the authorized Yoggie owner');
  }
  return {
    database: 'projects/yoggie-db/databases/(default)',
    shop: 'shops/greek-yogg',
  };
}

function yoggieApi_(path, method, payload) {
  var response = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/' + path, {
    method: method || 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    contentType: 'application/json',
    payload: payload === undefined ? undefined : JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  var result = JSON.parse(response.getContentText() || '{}');
  // CAS precondition lost: neither a successful claim nor permission to send.
  if (code === 409 || code === 412 || (result.error && result.error.status === 'FAILED_PRECONDITION')) return null;
  if (code < 200 || code >= 300) {
    // Only expose diagnostic enums, never response bodies, addresses or tokens.
    var reasons = ((result.error && result.error.details) || []).map(function (detail) {
      return detail.reason;
    }).filter(function (reason) { return typeof reason === 'string' && /^[A-Z_]{1,80}$/.test(reason); });
    throw new Error('Firestore HTTP ' + code + (reasons.length ? ' [' + reasons.join(', ') + ']' : ''));
  }
  return result;
}

function yoggieDecode_(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('mapValue' in value) {
    var output = Object.create(null), fields = value.mapValue.fields || {};
    Object.keys(fields).forEach(function (key) { output[key] = yoggieDecode_(fields[key]); });
    return output;
  }
  return null;
}

function yoggieDocument_(document) {
  return { name: document.name, updateTime: document.updateTime, data: yoggieDecode_({ mapValue: { fields: document.fields || {} } }) };
}

function yoggieCas_(config, document, patch) {
  var fields = {};
  Object.keys(patch).forEach(function (key) {
    if (key === 'finishedAt' || key === 'leasedAt') fields[key] = { timestampValue: patch[key] };
    else if (typeof patch[key] === 'number') fields[key] = { integerValue: String(patch[key]) };
    else fields[key] = { stringValue: patch[key] };
  });
  var result = yoggieApi_(config.database + '/documents:commit', 'post', { writes: [{
    update: { name: document.name, fields: fields },
    updateMask: { fieldPaths: Object.keys(patch) },
    currentDocument: { updateTime: document.updateTime },
  }] });
  if (!result) return null;
  return { name: document.name, updateTime: result.writeResults[0].updateTime, data: Object.assign({}, document.data, patch) };
}

function yoggieList_(config, status) {
  var rows = yoggieApi_(config.database + '/documents/' + config.shop + ':runQuery', 'post', {
    structuredQuery: {
      from: [{ collectionId: 'invitations' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: status } } },
      limit: 10,
    },
  });
  return rows.filter(function (row) { return row.document; }).map(function (row) { return yoggieDocument_(row.document); });
}

function yoggieSender_() {
  // The HTML uses a fixed public logo URL; no image or file is attached.
  return function (message) {
    MailApp.sendEmail({
      to: message.to, name: message.name, subject: message.subject,
      body: message.body, htmlBody: message.htmlBody,
    });
  };
}

function runYoggieInvitations() {
  var config = yoggieConfig_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var deadline = Date.now() + 4 * 60 * 1000;
    // Resolve expired leases first; never reclaim them for sending.
    var documents = yoggieList_(config, 'processing').concat(yoggieList_(config, 'pending'));
    var sender = yoggieSender_();
    documents.forEach(function (document) {
      if (Date.now() >= deadline) return;
      var outcome = InvitationMailer.process(document, {
        now: Date.now,
        token: function () { return Utilities.getUuid(); },
        quota: function () { return MailApp.getRemainingDailyQuota(); },
        root: function () { return yoggieDocument_(yoggieApi_(config.database + '/documents/' + config.shop)).data; },
        cas: function (expected, patch) { return yoggieCas_(config, expected, patch); },
        send: sender,
      });
      // Do not log recipient addresses, tokens, or message contents.
      console.log(document.name.split('/').pop() + ': ' + outcome);
    });
  } finally {
    lock.releaseLock();
  }
}

function checkYoggieMailer() {
  var config = yoggieConfig_();
  var root = yoggieDocument_(yoggieApi_(config.database + '/documents/' + config.shop)).data;
  if (!root.allowedEmails || !root.userRoles) throw new Error('Access configuration missing');
  console.log('Firestore accessible; remaining email recipients: ' + MailApp.getRemainingDailyQuota());
}

function installYoggieInvitationTrigger() {
  // Explicit owner-only setup step. This creates a trigger, never sends mail.
  checkYoggieMailer();
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runYoggieInvitations') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('runYoggieInvitations').timeBased().everyMinutes(5).create();
}
