const { emailService } = require('../../../../shared');

module.exports = {
    configure: emailService.configure,
    isConfigured: emailService.isConfigured,
    sendPasswordReset: emailService.sendPasswordReset,
    sendVerificationEmail: emailService.sendVerificationEmail
};
