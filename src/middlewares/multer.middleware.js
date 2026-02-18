import multer from "multer"


//diskStorage configuration
const storage = multer.diskStorage(
    {
        destination : function(req, file, cb){
        cb(null, "./public/temp")
        },
        filename : function(req, file, cb){
        cb(null, file.originalname)
        }
    }
)

//When a file is uploaded, use this diskStorage configuration.
export const upload  = multer({
    storage : storage 
})