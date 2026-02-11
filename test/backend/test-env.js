require("dotenv").config();

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log(
  "JWT_SECRET length:",
  process.env.JWT_SECRET ? process.env.JWT_SECRET.length : "undefined"
);
console.log("JWT_REFRESH_SECRET:", process.env.JWT_REFRESH_SECRET);
console.log(
  "JWT_REFRESH_SECRET length:",
  process.env.JWT_REFRESH_SECRET
    ? process.env.JWT_REFRESH_SECRET.length
    : "undefined"
);
console.log("SESSION_SECRET:", process.env.SESSION_SECRET);
console.log(
  "SESSION_SECRET length:",
  process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : "undefined"
);
