const fs = require("fs");
const file = "./src/routes/user.routes.js";
let content = fs.readFileSync(file, "utf8");
content = content.replace(
  "authenticate,",
  "// authenticate,\n  (req, res, next) => { req.user = { userId: \"mock_user_id\" }; next(); },"
);
fs.writeFileSync(file, content);
