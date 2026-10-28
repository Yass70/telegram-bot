// ملف إدارة قاعدة البيانات أو التخزين المؤقت
// يمكنك تخصيصه حسب نوع القاعدة التي تستخدمها (MongoDB, SQLite, JSON, إلخ)

const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'database.json');

// قراءة البيانات بأمان
function readData() {
    try {
        if (fs.existsSync(dbFile)) {
            const data = fs.readFileSync(dbFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("خطأ في قراءة قاعدة البيانات:", error);
    }
    return {};
}

// كتابة البيانات بأمان
function writeData(data) {
    try {
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("خطأ في كتابة قاعدة البيانات:", error);
    }
}

module.exports = {
    readData,
    writeData
};
