import {Router} from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { getAllVideos, getVideoById, videoPublisher, updateVideo, deleteVideo} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// after public routes use verifyJWT
// router.use(verifyJWT);

router.route("/publish").post(
    verifyJWT
    ,upload.fields([
    {
        name : "videoFile", 
        maxCount : 1
    },
    {
        name : "thumbnail",
        maxCount : 1
    }
]), videoPublisher)

// getALLVideo route
router.route("/").get(getAllVideos)

//individual video route
router.route("/:videoId").get(getVideoById)

//update video route

router.route("/:videoId").patch(  verifyJWT,
    upload.fields([
    { name: "thumbnail", maxCount: 1 }
    ]),
    updateVideo)

    //delete video route
router.route("/:videoId").delete(verifyJWT, deleteVideo)

export default router;