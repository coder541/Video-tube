import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

//data comes in a server in json format form FORM, URL
app.use(express.json({
    limit : "16kb"

}))
//handle data form URL
app.use(express.urlencoded({extended : true, limit : "16kb"}))

//for storing files and folder on server
app.use(express.static("public"))

//for handling cookies  : access cookies from user browser
//  and perform crud on them

app.use(cookieParser())


//routes import
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
//as we make the seperate files for router and controller
//so we have to make the middleware here before we write controller and route in one place
app.use("/api/v1/users", userRouter)  // this send the user to userRouter and there it decide on which route to send the user
app.use("/api/v1/videos", videoRouter);
export default app ;