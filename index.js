import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const app = express();
const PORT = process.env.PORT 
const appName=process.env.APP_NAME
const dbName=process.env.DB_NAME
const uri=process.env.MONGO_URI
app.use(cors());
app.use(express.json());

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      appName,
      dbName
    });
    console.log("MongoDB connection Successfull");
  } catch (err) {
    console.error("MongoDB connection Failed", err.message);
  }
}

connectDB();

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  }
},
{
timestamps:true,
strict:false
}
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const activitySchema = new mongoose.Schema({
  email: {type:String,index:true},
  firstLogin: { type: String },
  lastLogin: { type: String },
  firstView: { type: String },
  lastView: { type: String },
  stalls: { type: [String], default: [] }
}
,
{
  timestamps:true,
  strict:false
}
);

const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);

function getISTTime() {
  return new Date()
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

app.post("/api/user", async (req, res) => {
  const { email } = req.body;

  try {
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.json({ status: "success", message: "User already exists", email });
    }

   await User.create({ email });
    res.json({
      status: "success",
      message: "User created",
      email,
    });
  } catch (err) {
   return res.status(500).json({ status: "error", message:err.message });
  }
});

app.post("/api/user/activity", async (req, res) => {
  const { email, loginTime, viewTime,stall } = req.body;

  (async () => {
    try {

       const time = getISTTime();
      const update = { $set: {}, $setOnInsert: {} };

      if (loginTime) {
       update.$set.lastLogin = time;
       update.$setOnInsert.firstLogin = time;
       await Activity.findOneAndUpdate(
        { email },
        update,
        { upsert: true }
      );
      }

      if (viewTime) {
        const activity=await Activity.findOne({email})
        activity.lastView=time
        if(!activity.firstView){
          activity.firstView=time
        }
        await activity.save()
      }

      if (stall) {
        await Activity.updateOne(
          { email },
          { $addToSet: { stalls: stall } }
        );
      }

    } catch (err) {
      return  res.status(500).json({ status: "error", message:err.message }); 
    }
  })();

  return res.json({ status: "success", message: "Activity updated",email });
});

app.post("/api/user/status", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).lean();

    if (user) {
      return res.json({
        status: "success",
        message: "User exists",
        email,
      });
    }

    try {
      const response = await axios.post(
        "https://sapi.onference.in/UsersApi/checkPaymentStatus",
        { email }
      );

      const paymentStatus = response?.data?.paymentStatus;

      if (paymentStatus === "payment done") {
        return res.json({
          status: "success",
          message: "User exists",
          email,
        });
      }

      return res.json({
        status: "success",
        message: "No User exists",
      });

    } catch (externalErr) {

      return res.json({
        status: "error",
        error:externalErr?.message ,
      });
    }

  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err?.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Om Ganeshaay Namah");
});

app.listen(PORT, () => {
  console.log(`Server connection successfull : ${PORT}`);
});