const AWS = require('aws-sdk');
require('dotenv').config({ path: require('find-config')('.env') });

AWS.config.update({
    region: 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_1,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_1
});

const dynamoDB = new AWS.DynamoDB();
const dynamoDocClient = new AWS.DynamoDB.DocumentClient();

//code to get existing usernames
function checkExistingUsers(username){
    var params = {
       KeyConditionExpression: 'username = :n',
       TableName: 'project1_users',
       ExpressionAttributeValues: { ":n": username },
      };
      
      return(dynamoDocClient.query(params).promise());
}
function loginToAccount(username,password){
    var params = {
        KeyConditionExpression: '#u = :n',
        FilterExpression: '#p = :p',
        TableName: 'project1_users',
        ExpressionAttributeValues: { ":n": username, ":p": password},
        ExpressionAttributeNames: { "#u": 'username', '#p': 'password'},
    }
    return(dynamoDocClient.query(params).promise());
}

//code to persist new user to the database 
function registerNewUser(username,pass,admin){
    var params = {
        TableName: 'project1_users',
        Item: {
          'username' : {S: username},
          'password' : {S: pass},
          'role' : {S: admin}
        }
    };
    dynamoDB.putItem(params, (err, data) =>{
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data);
        }
      });      
}
module.exports = {
    registerNewUser,
    checkExistingUsers,
    loginToAccount
}
