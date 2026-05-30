const nodemailer = require('nodemailer');
const fs = require('fs');

nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('Failed to create a testing account. ' + err.message);
    return process.exit(1);
  }
  console.log('Credentials obtained:');
  console.log(account);
  
  let env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  env += `\nSMTP_HOST=${account.smtp.host}\nSMTP_PORT=${account.smtp.port}\nSMTP_SECURE=${account.smtp.secure}\nSMTP_USER=${account.user}\nSMTP_PASS=${account.pass}\nSMTP_FROM="Aegis Portal" <test@example.com>\n`;
  fs.writeFileSync('.env', env);
  console.log('Added to .env');
});
