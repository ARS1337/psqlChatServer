const mysql = require("mysql");
// pools will use environment variables
// for connection information
let pool;
class Pool {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
const Connect = async () => {
  pool = new Pool({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "mydb",
  });
};

const insertUser = async (userId, pwd, groups) => {
  //correct
  try {
    let query =
      "INSERT INTO USERTABLE ( userid, pwd, groupss) VALUES (" + `'${userId}' , '${pwd}'` + ", '[\"common\"]')";
    let res = await pool
      .query(query)
      .then((r) => r)
      .catch((err) => console.log(err));
    return res;
  } catch (err) {
    console.log("insert user", err);
  }
};

const updateUser = async (user, group) => {
  //correct
  try {
    let updateResult;
    let findResult = await doesUserExists(user);
    let groupss = JSON.parse(findResult?.[0].groupss);
    if (findResult ? true : false) {
      let tempGroup = [...groupss];
      if (!tempGroup.includes(group)) {
        let newGroupArray = [...groupss, group];
        let updateQuery = `update usertable set groupss = '${JSON.stringify(newGroupArray)}' where userid =  '${user}'`;
        updateResult = await pool
          .query(updateQuery)
          .then((r) => r)
          .catch((err) => console.log(err));
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
  //correct
  try {
    let query = `select * from usertable where userid = '${user}' limit 1`;
    let res = await pool
      .query(query)
      .then((res) => res)
      .catch((err) => console.log(err));
    console.log('doesUserExists res : ',res)
    return res;
  } catch (err) {
    console.log("doesUserExists err: ", err);
  }
};

const insertMessages = async (group, data) => {
  console.log("group, data ", group, data);
  let insertQuery = `insert into grouptable (groupname,message,user) values('${group}','${data?.message}','${data?.userName}')`;
  console.log("insertQuery ", insertQuery);
  let findResult = await pool
    .query(insertQuery)
    .then((res) => res)
    .catch((err) => console.log(err));

  return findResult;
};

const findAndInsertGroupPrivate = async (username1, username2) => {
  try {
    if (username1 && username2) {
      let sorted = [username1, username2].sort().join(",");
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
  let findQuery = `select * from grouptable where groupname='${groupName}' AND groupType ='private'`;
  let findResult = await pool
    .query(findQuery)
    .then((res) => res)
    .catch((err) => console.log(err));
  return findResult;
};

const insertGroupPrivate = async (groupName) => {
  let insertQuery = `insert into grouptable (groupname,groupType) values('${groupName}','private')`;
  console.log(
    "inserted group with query: ",
    `insert into grouptable (groupname,type) values('${groupName}','private')`
  );
  let results = await pool
    .query(insertQuery)
    .then((res) => res)
    .catch((err) => console.log(err));
  return results;
};

const insertMessagesPrivate = async (username1, username2, data) => {
  let groupName = await findAndInsertGroupPrivate(username1, username2);
  let insertQuery = `insert into grouptable (groupname,message,user,groupType) values('${groupName}','${data?.message}','${data?.userName}','private') `;
  let findResult = await pool
    .query(insertQuery)
    .then((res) => res)
    .catch((err) => console.log(err));
  return findResult;
};

const getUsersGroups = async (user) => {
  try {
    let res = await doesUserExists(user);
    console.log("user groups ", JSON.parse(res[0]?.groupss));
    return JSON.parse(res[0]?.groupss);
  } catch (err) {
    console.log("getUsersGroup Errorr: ", err);
  }
};

const getMessages = async (group, numberOfMessages) => {
  try {
    let getQuery = `select user,message from grouptable where groupname='${group}'`;
    let result = await pool
      .query(getQuery)
      .then((res) => res)
      .catch((err) => console.log(err));
      console.log("getMessages result : ",result)
    return result;
  } catch (err) {
    console.log("getMessages", err);
  }
};

module.exports = {
  updateUser,
  insertUser,
  doesUserExists,
  insertMessages,
  findAndInsertGroupPrivate,
  insertMessagesPrivate,
  getUsersGroups,
  getMessages,
  Connect,
};
