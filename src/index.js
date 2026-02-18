//1st way to import dotenv
// require('dotenv').config({
//     path : "./env"
// })

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";


import connectDB from "./db/index.js";
import dotenv from "dotenv"
import app from "./app.js";

dotenv.config({
    path: "./.env"
})
connectDB()
.then(()=>{
    
   
    app.listen(process.env.PORT || 8000 ,()=>{
     console.log(`SERVER IS RUNNNING AT PORT : ${process.env.PORT}` )
    })
})
.catch((error)=>{
    console.log("MONGO-DB connection Failed !!!", error)
})










//FIRST APPROACH TO CONNECT DATABASE

// import express from "express"
// const app = express();

// ( async ()=>{
//    try {
//    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//    app.on("error",(error)=>{
//     console.log("error:", error);
//     throw error;
//    } )

//    app.listen(process.env.PORT, ()=>{
//     console.log(`app is listening on port ${process.env.PORT}`)
//    })
//    } catch (error) {
//     console.log("ERROR : ", error);
//     throw error
//    }
// })()