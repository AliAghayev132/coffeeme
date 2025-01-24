// utils/dateUtils.js

/**
 * UTC zamanını Azerbaycan saatına (UTC+4) çevirir.
 * @returns {Date} Azerbaycan saatına göre tarih və zaman
 */

function getAzerbaijanTime() {
    const now = new Date();
    now.setHours(now.getHours() + 4); 
    return now;
}

module.exports = {
    getAzerbaijanTime
};