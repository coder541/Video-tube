//Takes token from request
//If token is missing---User is not logged in
//Verifies the token ---Uses secret key to check
//Extracts user ID from token---Gets _id from decoded token
//Finds user in database--Fetches user by ID
//If user does not exist---Token is invalid
// If everything is valid---Attaches user to request:

import  jwt  from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { application } from "express";

export const verifyJWT = asyncHandler(async(req, res, next)=>{
  try {
    //Takes token from request
   const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
   
   //If token is missing
   if (!token) {
    throw new ApiError(401, "Unauthorized request")
   }

   //Verifies the token ---Uses secret key to check
   const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

   //Extracts user ID from token---Gets _id from decoded token
   const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

   //If user does not exist---Token is invalid
   if (!user) {
    throw new ApiError(401, "Invalid access token")
   }

   // If everything is valid---Attaches user to request:
   req.user = user;
   next()


  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
  }
})






