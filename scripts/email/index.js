import mjml2html from 'mjml';
import fs from 'fs';
import path from 'path';
import { client as MG } from 'mailgun.js';
import { MailGunConfig } from "../../config";

const mailgun = MG({
  ...MailGunConfig,
});

async function render(templateName) {
  if (templateName.indexOf('.mjml') === -1) {
    templateName = path.join(__dirname, 'templates', `${templateName}.mjml`);
  }

  return new Promise((resolve, reject) => {
    fs.readFile(templateName, (err, buffer) => err ? reject(err) : resolve(mjml2html(buffer.toString()).html));
  });
}

async function sendEmail(toEmail, html) {
  const msgData = {
    from: 'Gazar.am <info@gazar.am>',
    to: toEmail,
    subject: 'Gazar.am - Թարմ գյուղմթերք գրասենյակների համար',
    text: html,
    html,
  };

  await mailgun.messages.create('mg.gazar.am', msgData);
}

async function Start() {
  const htmlTemplate = await render('it-companies');
  const emails = fs.readFileSync(path.join(__dirname, 'email-list.txt')).toString().split('\n');
  for (const email of emails) {
    if (email.length <= 3) continue;

    console.log('Sending TO: ', email);
    try {
      await sendEmail(email, htmlTemplate);
    } catch(e) {
      console.log('Error sending to: ', email, ' -- >>' , e);
    }
  }
}

Start();
