import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/apiError.js";
import cloudinary from "cloudinary";

const videoPublisher = asyncHandler(async (req, res) => {
  const { title, description} = req.body; 

  if(!title || !description) {
    return res.status(400).json(ApiResponse(400, "Title and description are required"));
  }

  const videoFile = req.files?.videoFile?.[0];
  const thumbnail = req.files?.thumbnail?.[0];

  if(!videoFile){
   return res.status(400).json(ApiResponse(400, "Video file is required"));
  }

  if(!thumbnail){
    return res.status(400).json(ApiResponse(400, "Thumbnail image is required"));
  }

  const uploadedVideo = await uploadOnCloudinary(videoFile.path);

    if(!uploadedVideo){
        return res.status(500).json(ApiResponse(500, "Failed to upload video"));
    }

    const uploadThumbnail = await uploadOnCloudinary(thumbnail.path);

    if(!uploadThumbnail){
        return res.status(500).json(ApiResponse(500, "Failed to upload thumbnail"));
    }

  const video = await Video.create({
   title,
   description,
   videoFile : uploadedVideo.url,
   thumbnail : uploadThumbnail.url,
   owner : req.user._id,
   duration : uploadedVideo.duration || 0

  })

  if(!video){
    return res.status(500).json( new ApiResponse(500, "Failed to create video"));
  }

  return res.status(201).json( new ApiResponse(201, "Video published successfully", video))  
}

)

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId).populate("owner", "username avatar")

    if(!video){
        return res.status(404).json(new ApiResponse(404, "Video not found"))
    } 
    return res.status(200).json(new ApiResponse(200, "Video fetched successfully", video))
})

const getAllVideos = asyncHandler(async (req, res) => {
    //  1. Extract query params (all come as strings)
    let {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query;

    //  2. Convert to numbers
    page = Number(page);
    limit = Number(limit);

    // 3. Create filter object
    const filter = {
        isPublished: true // only show published videos
    };

    //  Search by title (case-insensitive)
    if (query) {
        filter.title = { $regex: query, $options: "i" };
    }

    // Filter by user
    if (userId && isValidObjectId(userId)) {
        filter.owner = new mongoose.Types.ObjectId(userId);
    }

    //  4. Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

    //  5. Pagination calculation
    const skip = (page - 1) * limit;

    // 🔹 6.Aggregation pipeline (best for performance)
    const pipeline = [
        {
            $match: filter
        },
        {
            $sort: sortOptions
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        // 🔹 Join with users collection (populate alternative)
        {
            $lookup: {
                from: "users", // collection name in MongoDB
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    avatar: 1
                }
            }
        }
    ];

    // 🔹 7. Execute query
    const videos = await Video.aggregate(pipeline);

    // 🔹 8. Total count for pagination
    const totalVideos = await Video.countDocuments(filter);

    // 🔹 9. Send response
    return res.status(200).json(
        new ApiResponse(200, {
            totalVideos,
            currentPage: page,
            totalPages: Math.ceil(totalVideos / limit),
            videos
        }, "Videos fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  console.log("req.user =>", req.user);

  const { title, description } = req.body || {};

  // 🔹 1. Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  // 🔹 2. Find video
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  //  3. Check ownership

  if (!req.user || !req.user._id) {
  throw new ApiError(401, "Unauthorized request");
}
if (!video.owner) {
  throw new ApiError(500, "Video owner missing");
}
const videoOwnerId = video.owner?.toString();
const loggedInUserId = req.user?._id?.toString();

if (!videoOwnerId || !loggedInUserId) {
    throw new ApiError(401, "Authentication or ownership data missing");
}

if (videoOwnerId !== loggedInUserId) {
    throw new ApiError(403, "You are not the owner of this video");
}
// if (!video.owner) {
//   throw new ApiError(500, "Video owner missing");
// }

//   if (video.owner.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not the owner of this video");
//   }

  //  4. Update text fields (optional)
  if (title) video.title = title;
  if (description) video.description = description;

  //  5. Update thumbnail (optional)
  if (req.files?.thumbnail?.[0]) {
    const thumbnailPath = req.files.thumbnail[0].path;

    const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath);

    if (!uploadedThumbnail) {
      throw new ApiError(500, "Thumbnail upload failed");
    }

    video.thumbnail = uploadedThumbnail.url;
  }

  //  6. Save changes 
  await video.save();

  //  7. Send response (IMPORTANT: always return)
  return res.status(200).json(
    new ApiResponse(200, video, "Video updated successfully")
  );
});
   
const deleteVideo = asyncHandler(async(req, res)=>{
    const {videoId} = req.params;
    // console.log("req.user =>", req.user);
    // console.log("videoId =>", videoId);
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"VideoId is not valid")
    }

    const deletedVideo = await Video.findById(videoId);
    if(!deletedVideo){
        throw new ApiError(404, "Video not found")
    }
    //check ownership

    if (!deletedVideo.owner) {
        throw new ApiError(500, "Video owner is missing ")
    }

    if(deletedVideo.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not the owner of this video")
    }
    
    //delete video from cloudinary
   const getPublicId = (url) => {
  const parts = url.split("/upload/")[1];   // everything after upload/
  const withoutVersion = parts.replace(/v\d+\//, ""); // remove version
  return withoutVersion.split(".")[0]; // remove extension if exists
};

try {
  if (deletedVideo.videoFile) {
    const publicId = getPublicId(deletedVideo.videoFile);
    console.log("Deleting video:", publicId);

    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video"
    });
  }

  if (deletedVideo.thumbnail) {
    const thumbId = getPublicId(deletedVideo.thumbnail);
    console.log("Deleting thumbnail:", thumbId);

    await cloudinary.uploader.destroy(thumbId);
  }

} catch (error) {
  console.error("Cloudinary error:", error);
  throw new ApiError(500, "Failed to delete from Cloudinary");
}

    //delete from database
    await Video.findByIdAndDelete(videoId);

    
   
    return res.status(200).json(new ApiResponse(200,null, "Video deleted successfully"))

})

export { videoPublisher, getVideoById, getAllVideos, updateVideo, deleteVideo}