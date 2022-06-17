const express = require("express");
const cors = require("cors");
const { read } = require("fs");
const app = express();
const cookieParser = require("cookie-parser");
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
const httpServer = require("http").createServer(app);
const options = {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.1.6:3000","*"],
  },
};
const io = require("socket.io")(httpServer, options);
const { body, validationResult } = require("express-validator");
const {
  updateUser,
  insertUser,
  Connect,
  doesUserExists,
  insertGroup,
  insertMessages,
  findAndInsertGroupPrivate,
  insertMessagesPrivate,
  getUsersGroups,
  getMessages
} = require("./Psql");

app.post(
  "/socket",
  body("name").custom(async (value, { req }) => {
    console.log(req.body, "req.body");
  }),
  body("name", "name should atleast be of 1 character")
    .exists()
    .trim()
    .isLength({ min: 1 }),
  body(
    "name",
    "name can only contain alphabets and numbers, no special character"
  ).isAlphanumeric(),
  body("pwd", "password should be of atleast 6 chars")
    .exists()
    .isLength({ min: 6 }),
  body("name").custom(async (value, { req }) => {
    let result = await doesUserExists(value);
    if (!result && req.body.process == "login") {
      return Promise.reject("user name does not exist, sign up first!");
    }
    if (req.body.process == "signup") {
      if (result ? true : false) {
        return Promise.reject(
          "username already exists, try again with a different user name "
        );
      }
    }
  }),
  body("pwd").custom(async (value, { req }) => {
    if (req.body.process == "login") {
      let result = await doesUserExists(req.body.name);
      if (result && result.pwd !== value) {
        return Promise.reject("wrong password");
      }
    }
  }),
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (req.body.process == "signup") {
      let results = await insertUser(req.body.name, req.body.pwd);
    }
    res.sendStatus(200);
    console.log(req.body.name, "connected");
  }
);

app.post(
  "/joinGroup",
  body("group", "group name should be atleast 1 character in length")
    .exists()
    .trim()
    .isLength({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.sendStatus(200);
    console.log("post called group");
  }
);
app.post(
  "/privateChat",
  body("connectTo", "username should be atleast 1 character in length")
    .exists()
    .trim()
    .isLength({ min: 1 }),
  body("connectTo").custom(async (value, { req }) => {
    let userExists = await doesUserExists(value);
    if (!userExists) {
      return Promise.reject("user doesn't exist");
    }
  }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log(req.body);
    let groupName = await findAndInsertGroupPrivate(
      req.body.connectTo,
      req.body.currUser
    );
    res.end(JSON.stringify({ groupName: groupName }));
  }
);

io.use((socket, next) => {
  const socketID = socket.handshake.auth.sessionID;
  console.log("auth: ", socket.handshake.auth);
  if (socketID != "undefined" && socketID != null && socketID != "") {
    socket.id = socketID;
  }
  next();
});

io.on("connection", (socket) => {
  console.log(socket.id, " connected");

  socket.emit("join", { socketID: socket.id });

  socket.on("join", async (data) => {
    console.log("join called", data);
    socket.leave(data.currGroup);
    socket.join(data.joinWithGroup);
    let results = await insertGroup(data.joinWithGroup);
    let res1 = await updateUser(data.user, data.joinWithGroup);
    io.emit("joinMessage", {
      userName: "messageBot",
      message: `${data.user} has joined group ${data.joinWithGroup} !`,
    });
  });

  socket.on("joinCommon", (data, callback) => {
    socket.join("common");
  });

  socket.on("chat", async (chat) => {
    io.to(chat.currGroup).emit("chat", {
      userName: chat.userName,
      message: chat.message,
    });
    let results = await insertMessages(chat.currGroup, {
      userName:chat.userName,
      message:chat.message
    });
    console.log(
      "message: ",
      `${chat.userName}:${chat.message}:${chat.currGroup}`
    );
  });

  socket.on("getUsersGroups", async ({ user }) => {
    let res = await getUsersGroups(user);
    socket.emit("getUsersGroups", res);
  });

  socket.on("getMoreMessages", async ({ groupName,numberOfMessages }) => {
    let res = await getMessages(groupName,numberOfMessages);
    socket.emit("getMoreMessages", res);
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});


const tryConnect= async () => {
  let res = await Connect();
  console.log("Connected to server successfully!");

  // if (!Object.keys(res).includes("errno")) {
  //   console.log("node server listening on *:3001");
  //   return true;
  // } else {
  //   console.log(
  //     "Couldn't connect . Retrying again in 5 secs..."
  //   );
  //   console.log("Error is : ", res);
  //   return false;
  // }
};

httpServer.listen(3001, async () => {
  console.log("starting node server");
  let connected = await tryConnect();
  // if (!connected) {
  //   let interval = await setInterval(async () => {
  //     let res = await tryConnect();
  //     if (res) {
  //       clearInterval(interval);
  //     }
  //   }, 5000);
  // }
});