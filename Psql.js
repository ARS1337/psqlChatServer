const { Pool, Client } = require("pg");
// pools will use environment variables
// for connection information
var pool;
const Connect = () => {
  pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "admin",
    port: 5432,
  });
};

const insertUser = async (userId, pwd, groups) => {
  let query = "INSERT INTO USERTABLE ( userid, pwd, groups) VALUES (" + `'${userId}' , '${pwd}'` + ", '{common}')";
  pool
    .query(query)
    .then((res) => {
      return res.rowCount;
    })
    .catch((err) => {
      console.log("insertUser" + err);
    });
};

const updateUser = async (user, group) => {
  try {
    let updateResult;
    let findResult = await doesUserExists(user);
    if (findResult ? true : false) {
      let tempGroup = [...findResult.groups];
      let temp = tempGroup.includes(group);
      if (!temp) {
        let updateQuery = `update usertable set groups = array_append(groups,'${group}') where userid =  '${user}'`;
        updateResult = await pool
          .query(updateQuery)
          .then((r) => r)
          .catch((err) => console.log("updateUser chain catch", err));
      }
      return updateResult;
    } else {
      console.log("no user with such name");
      return false;
    }
  } catch (err) {
    console.log("updateUser catch", err);
  }
};

const doesUserExists = async (user) => {
  let query = "select * from usertable where userid = '" + user + "' limit 1";
  let res = await pool
    .query(query)
    .then((r) => r?.rows[0])
    .catch((err) => {
      console.log("doesUserExists", err);
      return false;
    });
  return res;
};

const insertGroup = async (group) => {
  try {
    let checkIfExistsQuery = `select * from grouptable where groupname= '${group}' limit 1`;
    let doesAlreadyExist = await pool
      .query(checkIfExistsQuery)
      .then((r) => r?.rows[0])
      .catch((err) => console.log(err));
    if (!doesAlreadyExist) {
      let insertQuery = `insert into grouptable (groupname) values ('${group}')`;
      pool
        .query(insertQuery)
        .then((r) => r.rows)
        .catch((err) => console.log("insertGroup", err));
    } else {
      return "group already exists";
    }
  } catch (err) {
    console.log("insertGroup", err);
  }
};

const insertMessages = async (group, data) => {
  let insertQuery = `update grouptable set messages = array_append(messages,'${data}') where groupname='${group}'`;
  let findResult = pool
    .query(insertQuery)
    .then((res) => res)
    .catch((err) => console.log("insertMessages", err));

  return findResult;
};

const findAndInsertGroupPrivate = async (username1, username2) => {
  try {
    if (username1 && username2) {
      let sorted = [username1,username2].sort().join(',')
      let groupName = sorted;
      let findResult = await doesPrivateGroupExist(groupName);
      if (!findResult) {
        groupName = `${username2}_${username1}`;
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
      return "username is not defined: username1:" + username1 + " and username2: " + username2;
    }
  } catch (err) {
    console.log("findAndInsertGroupPrivate ", err);
  }
};

const doesPrivateGroupExist = async (groupName) => {
  let findQuery = `select * from grouptable where groupname='${groupName}' AND type ='private'`;
  let findResult = await pool
    .query(findQuery)
    .then((r) => r.rows)
    .catch((err) => console.log("doesPrivateGroupExist", " ", err));
  return findResult;
};

const insertGroupPrivate = async (groupName) => {
  let insertQuery = `insert into grouptable (groupname,type) values('${groupName}','private')`;
  console.log("********************************************************");
  console.log(
    "inserted group with query: ",
    `insert into grouptable (groupname,type) values('${groupName}','private')`
  );
  console.log("********************************************************");
  let results = await pool
    .query(insertQuery)
    .then((r) => r.rows)
    .catch((err) => console.log("insertGroupPrivate ", err));
  return results;
};

const insertMessagesPrivate = async (username1, username2, data) => {
  let groupName = await findAndInsertGroupPrivate(username1, username2);
  let insertQuery = `update grouptable set messages = append_array(messages,'${data}') where groupname = '${groupName}'`;
  let findResult = await pool
    .query(insertQuery)
    .then((r) => r.rows)
    .catch((err) => console.log("insertMessagesPrivatePsql", err));
  return findResult;
};

const getUsersGroups = async (user) => {
  try {
    let res = await doesUserExists(user);
    console.log("user groups ", res);
    return res;
  } catch (err) {
    console.log("getUsersGroup Errorr: ", err);
  }
};

const getMessages = async (group, numberOfMessages) => {
  try {
    let getQuery = `select * from grouptable where groupname='${group}' limit ${numberOfMessages}`;
    let result = await pool
      .query(getQuery)
      .then((r) => r.rows)
      .catch((err) => console.log(err));
    let tempmessages = [];
    await result.forEach((x) => (tempmessages = x.data));
    return tempmessages;
  } catch (err) {
    console.log("getMessages", err);
  }
};

module.exports = {
  updateUser,
  insertUser,
  doesUserExists,
  insertGroup,
  insertMessages,
  findAndInsertGroupPrivate,
  insertMessagesPrivate,
  getUsersGroups,
  getMessages,
  Connect
};
