const express = require("express");
const db = require("./database/db");
const dotenv = require("dotenv");
const User = require("./model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { healthCheckHandler } = require("./model/health"); // Adjust the path accordingly
const { authenticateToken } = require("./authentication/auth")


dotenv.config(); // Load environment variables first

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.get("/health", healthCheckHandler);

app.post("/register", async (req, res, next) => {
  try {
    // get all the data from the user
    const { fullname, email, password ,age , gender , mobile} = req.body;
    
    // all the data should exist
    if (!(fullname && email && password && age && gender && mobile)) {
      return res.status(400).send("All fields are compulsory");
    }

    // check if the user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(401).send("User already registered");
    }

    // encrypt the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // save the user in MongoDB
    const user = await User.create({
      fullname,
      email,
      password: hashedPassword,
      age,
      gender,
      mobile,
    });

    // generate a token for the user and send it
    const token = jwt.sign(
      { id: user._id, email },
      "Ashrumochana11", // process.env.jwtsecret
      {
        expiresIn: "3hr",
      }
    );
    user.token = token;
    user.password = undefined;

    // cookie section
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    res.status(201).cookie("token", token, options).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

app.post("/login", authenticateToken ,async (req, res) => {
  try {
    // get all the data from front end
    const { email, password } = req.body;
    // validation
    if (!(email && password)) {
      return res.status(400).send("Send all the data");
    }
    // find user in DB
    const user = await User.findOne({ email });
    // if user is not there, then what?
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { id: user._id },
        "Ashrumochana11", // process.env.jwtsecret
        {
          expiresIn: "2hr",
        }
      );
      user.token = token;
      user.password = undefined;
      // cookie section
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      res.status(200).cookie("token", token, options).json({
        success: true,
        token,
        user,
      });
    } else {
      res.status(401).send("Invalid email or password");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});





// ... (your existing code)

// Middleware to check if the user has less than 2 active week lists
const checkActiveWeekLists = async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming authenticateToken sets req.user
    const activeWeekLists = await WeekList.countDocuments({
      user: userId,
      endDate: { $gt: new Date() }, // Check if the week list is still active
    });

    if (activeWeekLists >= 2) {
      return res.status(400).send("You can only have two active week lists at a time");
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// API to add a new week list
app.post("/weeklist", authenticateToken, checkActiveWeekLists, async (req, res) => {
  try {
    const { description, tasks, endDate } = req.body;
    const userId = req.user.id;

    const weekList = await WeekList.create({
      user: userId,
      description,
      tasks,
      endDate: new Date(endDate),
    });

    res.status(201).json(weekList);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Middleware to check if it's within 24 hours of publishing the week list
const checkTimeValidity = async (req, res, next) => {
  try {
    const weekListId = req.params.weekListId;
    const weekList = await WeekList.findById(weekListId);

    if (!weekList) {
      return res.status(404).send("Week list not found");
    }

    const timeDiff = new Date() - weekList.createdAt;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return res.status(400).send("You can only edit or delete the week list within 24 hours");
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// API to update a week list
app.put("/weeklist/:weekListId", authenticateToken, checkTimeValidity, async (req, res) => {
  try {
    const weekListId = req.params.weekListId;
    const { description, tasks } = req.body;

    const updatedWeekList = await WeekList.findByIdAndUpdate(
      weekListId,
      { description, tasks },
      { new: true }
    );

    res.json(updatedWeekList);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// API to delete a week list
app.delete("/weeklist/:weekListId", authenticateToken, checkTimeValidity, async (req, res) => {
  try {
    const weekListId = req.params.weekListId;

    await WeekList.findByIdAndDelete(weekListId);

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// API to mark/unmark a task in a week list
app.patch("/weeklist/:weekListId/task/:taskId", authenticateToken, async (req, res) => {
  try {
    const weekListId = req.params.weekListId;
    const taskId = req.params.taskId;
    const { marked } = req.body;

    const updatedWeekList = await WeekList.findOneAndUpdate(
      { _id: weekListId, "tasks._id": taskId },
      { $set: { "tasks.$.marked": marked, "tasks.$.completedAt": marked ? new Date() : null } },
      { new: true }
    );

    res.json(updatedWeekList);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// API to get all week lists with time left to complete
app.get("/weeklists", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const weekLists = await WeekList.find({ user: userId }).select("-tasks");

    const weekListsWithTimeLeft = weekLists.map((weekList) => {
      const timeLeft = Math.max(0, weekList.endDate - new Date());

      return {
        ...weekList.toObject(),
        timeLeft,
      };
    });

    res.json(weekListsWithTimeLeft);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// ... (your existing code)








// Connect to MongoDB

db.connect();

const port = process.env.PORT
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
