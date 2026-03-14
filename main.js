const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {    
    function toSeconds(time) {

        let parts = time.split(" ");
        let clock = parts[0];
        let period = parts[1];

        let t = clock.split(":");
        let hours = parseInt(t[0]);
        let minutes = parseInt(t[1]);
        let seconds = parseInt(t[2]);

        if (period === "pm" && hours !== 12) {
            hours += 12;
        }

        if (period === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let difference = end - start;
    //Handle case of difference being negative
    if (difference < 0) {
      difference += 24 * 3600;
                        }
    let h = Math.floor(difference / 3600);
    let m = Math.floor((difference % 3600) / 60);
    let s = difference % 60;

    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function toSeconds(time) {
        let parts = time.split(" ");
        let clock = parts[0];
        let period = parts[1];

        let t = clock.split(":");
        let hours = parseInt(t[0]);
        let minutes = parseInt(t[1]);
        let seconds = parseInt(t[2]);

        if (period === "pm" && hours !== 12) {
            hours += 12;
        }
        if (period === "am" && hours === 12){
             hours = 0;
        }

        return hours*3600 + minutes*60 + seconds;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let open = toSeconds("8:00:00 am");
    let close = toSeconds("10:00:00 pm");

    let idle = 0;

    if (start < open) {
        idle += open - start;
    }

    if (end > close) {
        idle += end - close;
    }

    let h = Math.floor(idle / 3600);
    let m = Math.floor((idle % 3600) / 60);
    let s = idle % 60;

    return h + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function toSecondsActive(time) {
        let parts = time.split(":");
        let hours = parseInt(parts[0]);
        let minutes = parseInt(parts[1]);
        let seconds = parseInt(parts[2]);

        return hours*3600 + minutes*60 + seconds;
    }

    let shift = toSecondsActive(shiftDuration);
    let idle = toSecondsActive(idleTime);

    let active = shift - idle;

    let h = Math.floor(active / 3600);
    let m = Math.floor((active % 3600) / 60);
    let s = active % 60;

    return h + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(time){
        let parts = time.split(":");

        let hours = parseInt(parts[0]);
        let minutes = parseInt(parts[1]);
        let seconds = parseInt(parts[2]);

        return hours*3600 + minutes*60 + seconds;
    }

    let activeSeconds = toSeconds(activeTime);

    let normalQuota = (8*3600) + (24*60); 
    let eidQuota = 6*3600;

    let d = new Date(date);
    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");
    //First check if it is currently eid,then calculate based on that fact
    if (d >= eidStart && d <= eidEnd) {
        return activeSeconds >= eidQuota;
    } else {
        return activeSeconds >= normalQuota;
    }
}
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    try {
        // Read existing file
        let data = "";
        try {
            data = fs.readFileSync(textFile, "utf8");
        } catch (err) {
            data = "";
        }
        let lines = data.trim() ? data.trim().split("\n") : [];

        // Check for duplicate
        let duplicateIndex = lines.findIndex(line => {
            let parts = line.split(",");
            return parts[0] === shiftObj.driverID && parts[1] === shiftObj.date;
        });

        // If duplicate exists, return empty object
        if (duplicateIndex !== -1) {
            return {};
        }

        // Calculate derived fields
        let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
        let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
        let activeTime = getActiveTime(shiftDuration, idleTime);
        let quotaMet = metQuota(shiftObj.date, activeTime);
        let hasBonus = false;

        // Build CSV line
        let newLine = [
            shiftObj.driverID,
            shiftObj.date,
            shiftObj.startTime,
            shiftObj.endTime,
            shiftDuration,
            idleTime,
            activeTime,
            quotaMet,
            hasBonus
        ].join(",");

        // Add new line
        lines.push(newLine);

        // Sort by date ascending
        lines.sort((a, b) => {
            let dateA = a.split(",")[1];
            let dateB = b.split(",")[1];
            return new Date(dateA) - new Date(dateB);
        });

        // Write back
        fs.writeFileSync(textFile, lines.join("\n"));

        // Return record as object
        return {
            driverID: shiftObj.driverID,
            driverName: shiftObj.driverName || "",
            date: shiftObj.date,
            startTime: shiftObj.startTime,
            endTime: shiftObj.endTime,
            shiftDuration: shiftDuration,
            idleTime: idleTime,
            activeTime: activeTime,
            metQuota: quotaMet,
            hasBonus: hasBonus
        };
    } catch (err) {
        console.error("Error in addShiftRecord:", err);
        return {};
    }
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
