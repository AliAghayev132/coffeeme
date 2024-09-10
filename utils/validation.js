const validateEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

const validateAzerbaijanPhoneNumber = (phoneNumber) => {
  const azPhoneNumberRegex = /^(?:\+994|994|0)?(50|99|51|55|70|77)\d{7}$/;
  return azPhoneNumberRegex.test(phoneNumber);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
  return passwordRegex.test(password);
};

module.exports = {
  validateAzerbaijanPhoneNumber,
  validateEmail,
  validatePassword,
};
