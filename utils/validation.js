// ValidatorService.js

class ValidatorService {
  // Email doğrulaması
  static validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  // Azerbaycan telefon numarası doğrulaması
  static validateAzerbaijanPhoneNumber(phoneNumber) {
    const azPhoneNumberRegex = /^(?:\+994|994|0)?(50|99|51|55|70|77)\d{7}$/;
    return azPhoneNumberRegex.test(phoneNumber);
  }

  // Şifre doğrulaması
  static validatePassword(password) {
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    return passwordRegex.test(password);
  }
}

module.exports = ValidatorService;