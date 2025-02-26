const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); 
    }
});

const fileFilter = (req, file, cb) => {
    const allowType = ['image/jpg', 'image/png', 'image/svg+xml', 'image/jpeg'];
    if (allowType.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false); 
    }
};

const limits = { fileSize: 1024 * 1024 }; 

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
