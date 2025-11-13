import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import MessageNotification from "../models/MessageNotification.js";
import dotenv from "dotenv";
dotenv.config({ path: "./../.env" });

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    const currentUser = req.user;

    const recommendedUsers = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, //exclude current user
        { _id: { $nin: currentUser.friends } }, // exclude current user's friends
        { isOnboarded: true },
      ],
    });
    res.status(200).json(recommendedUsers);
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("friends")
      .populate(
        "friends",
        "fullName profilePic nativeLanguage learningLanguage"
      );

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    // prevent sending req to yourself
    if (myId === recipientId) {
      return res
        .status(400)
        .json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends.includes(myId)) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
    }

    // check if a req already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "A friend request already exists between you and this user",
      });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Verify the current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    // add each user to the other's friends array
    // $addToSet: adds elements to an array only if they do not already exist.
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate(
      "sender",
      "fullName profilePic nativeLanguage learningLanguage"
    );

    const acceptedReqs = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
    }).populate("recipient", "fullName profilePic");

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.log("Error in getPendingFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "pending",
    }).populate(
      "recipient",
      "fullName profilePic nativeLanguage learningLanguage"
    );

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createMessageNotification(req, res) {
  try {
    const { senderId, recipientId, messageId, channelId, messageText } =
      req.body;

    // Prevent creating notification for self
    if (senderId === recipientId) {
      return res
        .status(400)
        .json({ message: "Cannot create notification for self" });
    }

    // Check if notification already exists for this message
    const existingNotification = await MessageNotification.findOne({
      sender: senderId,
      recipient: recipientId,
      messageId,
    });

    if (existingNotification) {
      return res.status(200).json(existingNotification);
    }

    const notification = await MessageNotification.create({
      sender: senderId,
      recipient: recipientId,
      messageId,
      channelId,
      messageText,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error(
      "Error in createMessageNotification controller",
      error.message
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMessageNotifications(req, res) {
  try {
    const notifications = await MessageNotification.find({
      recipient: req.user.id,
      isRead: false,
    }).populate("sender", "fullName profilePic");

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error in getMessageNotifications controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function markNotificationsAsRead(req, res) {
  try {
    await MessageNotification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error in markNotificationsAsRead controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUnreadNotificationCount(req, res) {
  try {
    const friendRequestCount = await FriendRequest.countDocuments({
      recipient: req.user.id,
      status: "pending",
    });

    const messageNotificationCount = await MessageNotification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    const totalUnread = friendRequestCount + messageNotificationCount;

    res.status(200).json({ count: totalUnread });
  } catch (error) {
    console.error(
      "Error in getUnreadNotificationCount controller",
      error.message
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
}
