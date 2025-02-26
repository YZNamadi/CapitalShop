const multer = require('multer');
const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
cb(null,'./upload')
    },
    filename:(req,file,cb)=>{
        cb(null,file.originalname)
    }
});

const fileFilter = (req,file,cb)=>{
  
     const allowType = ['image/jpg','image/png','image/svg','image/jpeg']
     if(allowType.includes(file.mimetype)){
        cb(null,true)
     }else{
        cb(new Error('only image allowed'))
     }

};
const limits = {fileSize:1024 * 1024}
const upload = multer({fileFilter,limits,storage});
module.exports = upload 