const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => value * Math.PI / 180;
  
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // Mesafe (km)
  };
  
  const calculateWalkingTimes = (lat1, lon1, lat2, lon2) => {
    const distance = haversineDistance(lat1, lon1, lat2, lon2);
  
    // Yürüyüş hızları (km/saat)
    const walkingSpeedMin = 6; // Maksimum hız (en iyi durum)
    const walkingSpeedMax = 3; // Minimum hız (en kötü durum)
  
    // Minimum ve maksimum süre hesaplaması (saat)
    const minWalkingTime = distance / walkingSpeedMin;
    const maxWalkingTime = distance / walkingSpeedMax;
  
    // Dakika cinsinden süreler
    return {
      minTimeMinutes: minWalkingTime * 60,
      maxTimeMinutes: maxWalkingTime * 60,
    };
  };
  
module.exports = calculateWalkingTimes;  
  