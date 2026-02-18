import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary";



const generateAccessAndRefreshToken =async (userId)=>{
 try {
   const user = await User.findById(userId)
   const accessToken = await user.generateAccessToken()
   const refreshToken = await user.generateRefreshToken()
   //save refreshToken in DB
   user.refreshToken = refreshToken
   await user.save({validateBeforeSave : false})

   return {accessToken, refreshToken}

 } catch (error){
     console.error("Token generation error:", error);
  throw error; // DO NOT wrap it yet
   throw new ApiError(500, "Something went wrong while generating access and refresh token")
  
    
}
}

const registerUser = asyncHandler(async(req, res)=>{
   //   res.status(200).json({
   //      message : "ok"
   //   })

// get user details from frontend
// validation not empty
// check if user already exists: username, email
// check for images, check for avatar
// upload them to cloudinary, avatar
// create user object -create entry in db
// remove password and refresh token field from response
// check for user creation
// return res

//take info from frontEnd
console.log("req.files →", req.files);
console.log("req.body →", req.body);
const {fullName, email, username,password } = req.body


//validation of userDetails

   if (
      [fullName, email, username, password].some((field)=>
         field?.trim() === ""
      )
   ) {
      throw new ApiError(400, "All fields are required")
   }

   //checks for existing user
   const existingUser = await User.findOne({
      $or : [
         {email},
         {username}
      ]
   })   
     console.log(existingUser)
   if (existingUser) {
      throw new ApiError(409, "User already exists")
   }
   
   // check for images, check for avatar
   const avatarLocalPath = req.files?.avatar?.[0]?.path;
   // const  = req.files?.coverImage?.[0]?.path;
   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path;
   }

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required")
   }
   // upload them to cloudinary, avatar

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
     if (!avatar) {
      throw new ApiError(400, "Avatar file is required")
   }

   // create user object -create entry in db

   const user = await User.create({
   fullName,
   avatar : avatar.url,
   coverImage : coverImage?{
      url : coverImage.url,
      public_id : coverImage.public_id 
    } : undefined ,
   email,
   password,
   username : username.toLowerCase()
    })

   // remove password and refresh token field from response
   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )
   // check for user creation

   if(!createdUser){
   throw new ApiError(500, "something went wrong while registering the user")
   }

   //return response
   return res.status(201).json(
      new ApiResponse(200, createdUser, "User registered successfully")
   )

  })

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body || {};

  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      message: "User logged in successfully",
      user: loggedInUser,
      accessToken,
      refreshToken
    });
});

 const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


//refresh the new access token
const refreshAccessToken = asyncHandler(async(req, res)=>{
   const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

   if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
   }

   try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
   
      const user = await User.findById(decodedToken?._id)
   
      if(!user){
         throw new ApiError(401, "invalid refresh token")
      }
   
      if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh token is expired or used")
      }
   
      const options = {
         httpOnly : true,
         secure : true
      }
   
      const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
   
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
      new ApiResponse(
         200,
         {accessToken, refreshToken : newRefreshToken},
         "Access token refreshed"
      )
      )
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
   }
});

//Change password

const changeCurrentPassword = asyncHandler(async (req, res)=>{
   const {oldPassword, newPassword} = req.body
   
   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave : false})
   
   return res
   .status(200)
   .json(new ApiResponse(200, {}, "password changed successfully"))
})

//get current user

const getCurrentUser = asyncHandler(async(req, res)=>{
   return res
   .status(200)
   .json(200,req.user, "current user fetched successfully")
})

//change user details

const updateAccountDetails = asyncHandler(async(req, res)=>{
  const {fullName, email} = req.body

  if (!fullName || !email) {
   throw new ApiError(400, "All field are required")
  }

  const user = User.findByIdAndUpdate(
   req.user?._id,
   {
      $set : {
         fullName,
         email : email
      }
   },
   {new : true} //gives the field which changes
).select("-password")

  return res.status(200)
  .json(
   new ApiResponse(200, user, "Account details updated successfully")
  )
})

//change or update the avatar

const updateUserAvatar = asyncHandler(async(req, res)=>{

   const avatarLocalPath = req.file?.path

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
   }

   const avatar =await uploadOnCloudinary(avatarLocalPath)

   if (!avatar.url) {
      throw new ApiError(400, "Error while uploading avatar file")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set : {
            avatar : avatar.url
         }
      },
      {new : true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Avatar image is updated successfully"))
})


//change the coverImage

const updateUserCoverImage= asyncHandler(async(req, res)=>{

   const coverImageLocalPath = req.file?.path

   if (!coverImageLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
   }
   const oldUrlCoverImagePublicId = req.user?.coverImage?.public_id;

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   

   if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading coverImage file")
   }
   
  if (oldUrlCoverImagePublicId) {
   try {
      await cloudinary.uploader.destroy(oldUrlCoverImagePublicId)
   } catch (error) {
      throw new ApiError(400, "Failed to delete old cover image")
   }
  }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set : {
            url : coverImage.url,
            public_id : coverImage.public_id
         }
      },
      {new : true}
   ).select("-password")
   
   //delete the avatar image
   

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Coverr image is updated successfully"))
})

//GET USER PROFILE DETAILS

const getUserChannelProfile = asyncHandler(async(req, res)=>{
   const {username } = req.params
   if (!username.trim()) {
      throw new ApiError(400, "username not found")
   }

   const channel = await User.aggregate([
      {
         $match : {
            username : username?.toLowerCase()
         }
      },
      {
         //Channel's Total Subscriber:-
       $lookup : {
         from : "subscriptions",
         localField : "_id",
         foreignField : "channel",
         as : "subscribers"
      }
      },
      //select the channel, get the subscriber : then count the documents 
      // vice versa, to get the Channel.
      //to whom the user subscribed:-
      {
       $lookup : {
          from : "subscriptions",
          localField : "_id",
          foreignField : "subscriber",
          as : "subscribedTo"
         }
      },
      {
       $addFields : { 
            subscribersCount : {
               $size : "$subscribers"
            },
            channelsSubscribedToCount : {
               $size : "$subscribedTo"
            },
            isSubscribed : {
               $cond : {
                  if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                  then : true,
                  else : false
               }
               
            }
         }
      },
      {
         $project : {
            fullName : 1,
            username : 1,
            subscribersCount : 1,
            channelsSubscribedToCount : 1,
            isSubscribed : 1,
            avatar : 1,
            coverImage : 1,
            email : 1
         }
      }
   ])
 
   console.log(subscribedTo)

   if (!channel?.length) {
      throw new ApiError(404, "channel does not exists")
   }
   return res
   .status(200)
   .json(
   new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
   )

},
)
   
const getWatchHistory = asyncHandler(async(req, res)=>{
const user = await User.aggregate([
   {
      $match : {
         _id : u
      }
   }
])
})




export {
        registerUser, 
        loginUser, 
        logoutUser, 
        refreshAccessToken,
        changeCurrentPassword, 
        getCurrentUser, 
        updateAccountDetails, 
        updateUserAvatar, 
        updateUserCoverImage, 
        getUserChannelProfile,

      }  