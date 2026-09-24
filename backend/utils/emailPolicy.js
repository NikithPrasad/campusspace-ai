// Only college accounts may use the system. The domain can be changed with
// ALLOWED_EMAIL_DOMAIN in .env (default: vnrvjiet.in). Subdomains such as
// student.vnrvjiet.in are also accepted; look-alikes such as evilvnrvjiet.in are not.

function allowedDomain() {
  return (process.env.ALLOWED_EMAIL_DOMAIN || 'vnrvjiet.in').trim().toLowerCase();
}

function isAllowedEmail(email = '') {
  const domain = allowedDomain().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^[^@\\s]+@([a-z0-9-]+\\.)*${domain}$`, 'i').test(String(email).trim());
}

function domainMessage() {
  return `Only VNR VJIET accounts are allowed. Use your email ending in @${allowedDomain()}`;
}

module.exports = { allowedDomain, isAllowedEmail, domainMessage };
