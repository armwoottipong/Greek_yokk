/* Shared plain JavaScript: paste into Apps Script as Core.gs. No credentials. */
var InvitationMailer = (function () {
  var appUrl = 'https://armwoottipong.github.io/Greek_yokk/';
  var logoUrl = appUrl + 'brand/mascot.png';
  var roles = { viewer: 'ผู้ดูข้อมูล', manager: 'ผู้จัดการ', admin: 'ผู้ดูแลระบบ' };

  function valid(request) {
    return typeof request.email === 'string' && request.email.length <= 254 &&
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(request.email) &&
      Object.prototype.hasOwnProperty.call(roles, request.role) &&
      typeof request.createdBy === 'string' && request.createdBy.length > 0 &&
      typeof request.createdAt === 'string' && Number.isFinite(Date.parse(request.createdAt));
  }

  function message(request) {
    var role = roles[request.role];
    return {
      to: request.email,
      name: 'Yoggie',
      subject: 'คำเชิญเข้าใช้งาน Yoggie',
      body: 'คุณได้รับเชิญเข้าใช้งาน Yoggie ในสิทธิ์' + role + '\n' +
        'เปิด ' + appUrl + ' และเข้าสู่ระบบ Google ด้วยอีเมลที่ได้รับคำเชิญนี้\n' +
        'หากไม่ทราบที่มาของคำเชิญ สามารถข้ามอีเมลนี้ได้',
      htmlBody: '<div style="font-family:Arial,sans-serif;color:#30271f;max-width:520px;margin:auto;padding:24px">' +
        '<img src="' + logoUrl + '" alt="Yoggie" width="100" height="100">' +
        '<h1 style="font-size:24px">ยินดีต้อนรับสู่ Yoggie</h1>' +
        '<p>คุณได้รับเชิญเข้าใช้งานในสิทธิ์' + role + '</p>' +
        '<p>เข้าสู่ระบบ Google ด้วยอีเมลที่ได้รับคำเชิญนี้</p>' +
        '<p><a href="' + appUrl + '" style="display:inline-block;padding:12px 20px;background:#61412b;color:white;border-radius:12px;text-decoration:none">เปิด Yoggie</a></p>' +
        '<p style="font-size:12px">หากไม่ทราบที่มาของคำเชิญ สามารถข้ามอีเมลนี้ได้</p></div>',
    };
  }

  function process(document, deps) {
    var request = document.data;
    function finish(expected, status, outcome) {
      return deps.cas(expected, { status: status, outcome: outcome, finishedAt: new Date(deps.now()).toISOString() }) ? status : 'contended';
    }
    if (request.status === 'processing') {
      if (!Number.isFinite(request.leaseUntil) || request.leaseUntil <= deps.now()) {
        return finish(document, 'unknown', 'lease_expired_review_required');
      }
      return 'skipped';
    }
    if (request.status !== 'pending') return 'skipped';
    if (!valid(request)) return finish(document, 'cancelled', 'invalid_request');
    if (deps.quota() < 1) return 'quota';
    var claimed = deps.cas(document, {
      status: 'processing', leaseToken: deps.token(),
      leasedAt: new Date(deps.now()).toISOString(), leaseUntil: deps.now() + 10 * 60 * 1000,
    });
    if (!claimed) return 'contended';
    try {
      // Re-read authoritative access after winning the CAS, immediately before send.
      var root = deps.root();
      if (deps.now() >= claimed.data.leaseUntil) return finish(claimed, 'unknown', 'lease_expired_review_required');
      var currentRole = root.userRoles && root.userRoles[request.email] || 'viewer';
      if (!root.allowedEmails || root.allowedEmails[request.email] !== true || currentRole !== request.role) {
        return finish(claimed, 'cancelled', 'access_changed');
      }
      deps.send(message(request));
      return finish(claimed, 'sent', 'mail_accepted');
    } catch (error) {
      // MailApp cannot prove non-delivery on error. Never automatically resend.
      return finish(claimed, 'unknown', 'worker_error_review_required');
    }
  }

  return { process: process };
}());
