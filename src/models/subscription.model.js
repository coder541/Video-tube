import mongoose, { Types } from "mongoose";
import { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {
    type : Types.Schema.ObjectId,  // one who is subscribing
    ref : "User",
    },

    channel : {
    type : Types.Schema.ObjectId, // one to whom 'subscriber' is subscribing
    ref : "User"
    }
},{ timestamps : true})


export const Subscription = mongoose.model("Subscription", subscriptionSchema);
