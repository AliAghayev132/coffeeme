(async () => {
  const bcrypt = require("bcrypt");
  const password = "123eli456";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
})();
