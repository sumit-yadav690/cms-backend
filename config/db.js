const mongoose = require("mongoose");

const connect = async () => {
  return await mongoose
    .connect(process.env.DATABASE_URL)
    .then(() => {
      console.log("Database Connected Successfully");
    })
    .catch(() => {
      console.log("Database Connection Failed");
    });
};

module.exports = connect;
