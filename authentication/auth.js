const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send("Unauthorized: Missing token");
    }

    jwt.verify(token, "Ashrumochana11", (err, user) => {
        if (err) {
            return res.status(403).send("Forbidden: Invalid token");
        }

        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
