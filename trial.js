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
  


  // Import necessary modules and models
const WeekList = require("./model/weekList"); // Adjust the path accordingly

// ... (your existing code)

// API to get a specific weeklist by ID
app.get("/weeklist/:id", authenticateToken, async (req, res) => {
  try {
    const weekListId = req.params.id;
    const userId = req.user.id;

    const weekList = await WeekList.findOne({ _id: weekListId, user: userId });

    if (!weekList) {
      return res.status(404).send("Week list not found");
    }

    res.json(weekList);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// API to get the feed of active weeklists for all users
app.get("/feed", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const activeWeekLists = await WeekList.find({
      user: { $ne: userId }, // Exclude the user's own weeklists
      endDate: { $gt: new Date() }, // Check if the week list is still active
      state: "active",
    }).select("-tasks");

    res.json(activeWeekLists);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Middleware to check if the weeklist is still editable
const checkWeeklistEditable = async (req, res, next) => {
  try {
    const weekListId = req.params.weekListId;
    const weekList = await WeekList.findById(weekListId);

    if (!weekList) {
      return res.status(404).send("Week list not found");
    }

    if (weekList.state !== "active") {
      return res.status(400).send("Week list is not active");
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to check if the weeklist is still editable
const checkWeeklistCompletion = async (req, res, next) => {
  try {
    const weekListId = req.params.weekListId;
    const weekList = await WeekList.findById(weekListId);

    if (!weekList) {
      return res.status(404).send("Week list not found");
    }

    if (weekList.state !== "completed") {
      return res.status(400).send("Week list is not completed");
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// API to mark/unmark a task in a week list
app.patch(
  "/weeklist/:weekListId/task/:taskId",
  authenticateToken,
  checkWeeklistEditable,
  async (req, res) => {
    try {
      const weekListId = req.params.weekListId;
      const taskId = req.params.taskId;
      const { marked } = req.body;

      const updatedWeekList = await WeekList.findOneAndUpdate(
        { _id: weekListId, "tasks._id": taskId },
        {
          $set: {
            "tasks.$.marked": marked,
            "tasks.$.completedAt": marked ? new Date() : null,
          },
        },
        { new: true }
      );

      res.json(updatedWeekList);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// API to mark a week list as completed
app.post(
  "/weeklist/:weekListId/complete",
  authenticateToken,
  checkWeeklistEditable,
  async (req, res) => {
    try {
      const weekListId = req.params.weekListId;

      const completedWeekList = await WeekList.findByIdAndUpdate(
        weekListId,
        { state: "completed" },
        { new: true }
      );

      res.json(completedWeekList);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// ... (your existing code)
