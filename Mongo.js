const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://admin:admin@cluster0.g2vmz.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let userCollection;

let Connect = async () => {
  try {
    let res = await client.connect();
    await client.db("data").command({ ping: 1 });
    userCollection = client.db("data").collection("users");
    return res;
  } catch (err) {
    return err;
  }
};

const insertUser = async (userId, pwd, groups) => {
  try {
    // let results = await doesUserExists(userId);
    // if (results ? true : false) {
    let dataToInsert = {
      userId: userId,
      pwd: pwd,
      groups: ["common"],
    };
    const result = await client
      .db("data")
      .collection("users")
      .insertOne(dataToInsert);
    return result.insertedCount;
    // } else {
    //   return false;
    // }
  } catch (err) {
  }
};

const updateUser = async (user, group) => {
  try {
    let filter, updateDocument, updateResult;
    let findResult = await doesUserExists(user);
    if (findResult ? true : false) {
      let tempGroup = [...findResult.groups];
      let temp = tempGroup.includes(group);
      if (!temp) {
        tempGroup = [...findResult.groups, group];
        filter = { userId: user };
        updateDocument = {
          $set: {
            groups: tempGroup,
          },
        };
        updateResult = await client
          .db("data")
          .collection("users")
          .updateOne(filter, updateDocument);
      }

      return updateResult;
    } else {
      return false;
    }
  } catch (err) {
  }
};

const doesUserExists = async (user) => {
  try {
    let findResult = await client
      .db("data")
      .collection("users")
      .findOne({ userId: user });

    return findResult;
  } catch (err) {
  }
};

const insertGroup = async (group) => {
  try {
    let doesAlreadyExist = await doesFieldExist("groupName", group);
    if (!doesAlreadyExist) {
      let dataToInsert = {
        groupName: group,
        messages: [],
      };
      let findResult = await client
        .db("data")
        .collection("users")
        .insertOne(dataToInsert);
    } else {
      return "group already exists";
    }
  } catch (err) {
  }
};

const insertMessages = async (group, data) => {
  let findResult = await client
    .db("data")
    .collection("users")
    .updateOne({ groupName: group }, { $push: { messages: data } });
  return findResult;
};

const doesFieldExist = async (field, fieldValue) => {
  try {
    let dataToFind = { [field]: fieldValue };
    let findResult = await client
      .db("data")
      .collection("users")
      .findOne(dataToFind);
    return findResult;
  } catch (err) {
    return err;
  }
};

const findAndInsertGroupPrivate = async (username1, username2) => {
  try {
    if (username1 && username2) {
      let groupName = `${username1},${username2}`;
      let findResult = await doesPrivateGroupExist(groupName);
      if (!findResult) {
        groupName = `${username2},${username1}`;
        let findResult1 = await doesPrivateGroupExist(groupName);
        if (!findResult1) {
          await insertGroupPrivate(groupName);
        } else {
          return groupName;
        }
      } else {
        return groupName;
      }
      return groupName;
    } else {
      return (
        "username is not defined: username1:" +
        username1 +
        " and username2: " +
        username2
      );
    }
  } catch (err) {
  }
};

const doesPrivateGroupExist = async (groupName) => {
  try {
    let filter = {
      groupName: groupName,
      type: "private",
    };
    let findResult = await userCollection.findOne(filter);
    return findResult;
  } catch (err) {
  }
};

const insertGroupPrivate = async (groupName) => {
  let dataToInsert = {
    groupName: groupName,
    type: "private",
    messages: [],
  };
  let results = await userCollection.insertOne(dataToInsert);
  return results;
};

const insertMessagesPrivate = async (username1, username2, data) => {
  let groupName = await findAndInsertGroupPrivate(username1, username2);
  let findResult = await userCollection.updateOne(
    { groupName: groupName, type: "private" },
    { $push: { messages: data } }
  );
  return findResult;
};

const getUsersGroups = async (user) => {
  try {
    let res = await doesUserExists(user);
    return res;
  } catch (err) {
  }
};

const getMessages = async (group, numberOfMessages) => {
  try {
    let res = await userCollection.aggregate([
      { $match: { groupName: group } },
      { $project: { groupName: group, data: { $slice: ["$messages", -numberOfMessages] } } },
    ]);
    let tempmessages =[];
    await res.forEach(x=>tempmessages=x.data);
    return tempmessages;
  } catch (err) {
  }
};

module.exports = {
  updateUser,
  insertUser,
  Connect,
  doesUserExists,
  insertGroup,
  doesFieldExist,
  insertMessages,
  findAndInsertGroupPrivate,
  insertMessagesPrivate,
  getUsersGroups,
  getMessages,
};