import mongoose from "mongoose";

console.log("✅ db.js file loaded");

export const connectDB = async ()=>{
  try{
    const conn =await mongoose.connect(process.env.MONGO_URI);
    console.log(`MONGODB Connected:${conn.connection.host}`);
  }
  catch(error){
    console.log("Error in connecting to MONGODB",error);
    process.exit(1); //1 means failure
  }
}