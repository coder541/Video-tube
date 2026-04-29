import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, getUserChannelProfile } from "../controllers/user.controller.js";
import {upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
//middleware inject
router.route("/register").post(
    upload.fields([
        {
         name : "avatar",
         maxCount : 1
        },
        {
        name : "coverImage",
        maxCount : 1
        }
    ]),
    registerUser
)


router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)


export default router