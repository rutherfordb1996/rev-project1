const AWS = require('aws-sdk');
require('dotenv').config({ path: require('find-config')('.env') });

AWS.config.update({
    region: 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_1,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_1
});
const usersTable = "project1_users"
const ticketsTable = "project1_tickets"
const dynamoDB = new AWS.DynamoDB();
const dynamoDocClient = new AWS.DynamoDB.DocumentClient();

//code to get existing usernames
function checkExistingUsers(username){
    var params = {
       KeyConditionExpression: 'username = :n',
       TableName: usersTable,
       ExpressionAttributeValues: { ":n": username },
      };
      
      return(dynamoDocClient.query(params).promise());
}
function loginToAccount(username,password){
    var params = {
        KeyConditionExpression: '#u = :n',
        FilterExpression: '#p = :p',
        TableName: usersTable,
        ExpressionAttributeValues: { ":n": username, ":p": password},
        ExpressionAttributeNames: { "#u": 'username', '#p': 'password'},
    }
    return(dynamoDocClient.query(params).promise());
}

//code to persist new user to the database 
function registerNewUser(username,pass){
    var params = {
        TableName: usersTable,
        Item: {
          'username' : {S: username},
          'password' : {S: pass},
          'role' : {S: 'employee'}
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
function updateUserByUsername(username, role){
  const params = {
      TableName: usersTable,
      Key: {
          username
      },
      UpdateExpression: 'set #r = :value',
      ExpressionAttributeNames:{
          '#r': 'role'
      },
      ExpressionAttributeValues:{
          ':value': role
      }
  }

  return dynamoDocClient.update(params).promise();
}





// ticketing functions
function retrieveTicketsByStatus(status){
  const params = {
      TableName: ticketsTable,
      FilterExpression: '#s = :value',
      ExpressionAttributeNames: {
          '#s': 'status'
      },
      ExpressionAttributeValues: {
          ':value': status
      }
  };

  return dynamoDocClient.scan(params).promise();
}
function retrieveTicketsByUser(username){
  const params = {
      TableName: ticketsTable,
      FilterExpression: '#u = :value',
      ExpressionAttributeNames: {
          '#u': 'submitted_by'
      },
      ExpressionAttributeValues: {
          ':value': username
      }
  };
  return dynamoDocClient.scan(params).promise();
}
  function retrieveTicketsByUserAndType(username,type){
    const params = {
        TableName: ticketsTable,
        FilterExpression: '#u = :value and #t = :t',
        ExpressionAttributeNames: {
            '#u': 'submitted_by',
            "#t": 'type'
        },
        ExpressionAttributeValues: {
            ':value': username,
            ':t': type
        }
    };

  return dynamoDocClient.scan(params).promise();
}
function retrieveAllTickets(){
  const params = {
      TableName: ticketsTable
  };

  return dynamoDocClient.scan(params).promise();
}


function createTicket( ID, amount, description, user, type = "default"){
  var params = {
    TableName: ticketsTable,
    Item: {
      'ticket_id' : {S: ID},
      'amount' : {N: amount},
      'description' : {S: description},
      'status' : {S: 'pending'},
      'submitted_by': {S: user},
      'resolver' : {S: ' '},
      'type' : {S: type}
    }
  };
  dynamoDB.putItem(params, (err, data) =>{
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
    });
};
function updateTicketByID(ticket_id, status, resolver){
  const params = {
      TableName: ticketsTable,
      Key: {
          ticket_id
      },
      UpdateExpression: 'set #s = :value, #r = :res',
      ExpressionAttributeNames:{
          '#s': 'status',
          '#r': 'resolver'
      },
      ExpressionAttributeValues:{
          ':value': status,
          ':res' : resolver
      }
  }

  return dynamoDocClient.update(params).promise();
}
function isTicketPending(ticket_id){
  var params = {
      KeyConditionExpression: '#i = :i',
      TableName: ticketsTable,
      ExpressionAttributeValues: { ":i": ticket_id},
      ExpressionAttributeNames: { "#i": 'ticket_id'},
  }
  return(dynamoDocClient.query(params).promise());
}



module.exports = {
    registerNewUser,
    checkExistingUsers,
    loginToAccount,
    createTicket,
    retrieveTicketsByStatus,
    updateTicketByID,
    isTicketPending,
    retrieveAllTickets,
    retrieveTicketsByUser,
    retrieveTicketsByUserAndType,
    updateUserByUsername
}
