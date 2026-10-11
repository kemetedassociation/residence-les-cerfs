/**
 * Résidence Les Cerfs : relais d'envoi des e-mails aux voyageurs, depuis la boîte Gmail
 * cerf74390@gmail.com (même principe que le site LUZDOSOL).
 *
 * Le serveur de réservation appelle ce script avec une clé secrète ; le script envoie
 * l'e-mail avec Gmail. Les voyageurs voient votre adresse et vous répondent directement.
 *
 * Mise en place : voir RESERVATION.md, section « E-mails aux voyageurs ».
 * Ne collez pas ce fichier-ci : collez « Code.a-coller.gs », qui contient déjà la clé secrète.
 */
const SECRET = '__MAIL_RELAY_SECRET__';

function doPost(e) {
  let p;
  try {
    p = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false, error: 'bad request' });
  }
  if (!p || p.secret !== SECRET) return out({ ok: false, error: 'unauthorized' });
  if (!p.to || !p.subject) return out({ ok: false, error: 'missing fields' });
  if (MailApp.getRemainingDailyQuota() < 1) return out({ ok: false, error: 'quota' });
  MailApp.sendEmail({
    to: p.to,
    cc: p.cc || '',
    replyTo: p.replyTo || '',
    name: p.name || 'Résidence Les Cerfs',
    subject: p.subject,
    body: p.text || '',
    htmlBody: p.html || undefined,
  });
  return out({ ok: true, quota: MailApp.getRemainingDailyQuota() });
}

function doGet() {
  return ContentService.createTextOutput('Résidence Les Cerfs : relais e-mail actif');
}

/** À lancer une fois depuis l'éditeur : autorise l'envoi d'e-mails et vous envoie un test. */
function autoriser() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Résidence Les Cerfs : relais e-mail autorisé', 'Le relais d’envoi des e-mails aux voyageurs est prêt.');
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
