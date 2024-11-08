function generateUniqueReferenceCode() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let referenceCode = "";

  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referenceCode += characters[randomIndex];
  }

  const timeStamp = Date.now().toString(36);
  referenceCode += timeStamp.slice(-3);

  return referenceCode;
}
module.exports = generateUniqueReferenceCode;
