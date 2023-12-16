const healthCheckHandler = (req, res) => {
    res.json({
        server: "weeklist-server",
        currentTime: new Date(),
        state: "active",
        message:"successful",
    });
};

module.exports = { healthCheckHandler };
