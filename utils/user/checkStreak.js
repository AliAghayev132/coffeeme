const checkStreak = ({ streak }) => {
    if (streak) {
        const { lastOrderDate } = streak;
        const now = new Date();
        
        if (lastOrderDate) {
            // Convert lastOrderDate to Date if it's a timestamp
            const lastOrderDateObj = new Date(lastOrderDate);
            
            // Check if lastOrderDateObj is a valid date
            if (!isNaN(lastOrderDateObj.getTime())) {
                const differenceInHours = (now - lastOrderDateObj) / (1000 * 60 * 60);
                
                // Check if the difference is within the last 24 hours
                return differenceInHours <= 24;
            }
        }
        
        return false;
    }
    
    return false;
}

module.exports = checkStreak;
