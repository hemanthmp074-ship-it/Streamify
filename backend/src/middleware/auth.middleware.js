import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config({ path: "./../.env" });

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!decoded) {
      console.log("Invalid token");
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      console.log("unauthorised");
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.code === "ECONNRESET") {
      console.warn(
        "⚠️ Connection reset while verifying user — possibly MongoDB connection lost"
      );
    } else {
      console.error("Error in protectRoute middleware:", error);
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};
