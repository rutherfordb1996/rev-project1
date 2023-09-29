const dao = require('./DAO');
const jwtUtil = require('./utils/jwt_util')

const express = require('express');
const server = express();
const PORT = 3000;

const uuid = require('uuid');

const bodyParser = require('body-parser');

server.use(bodyParser.json());

let localStorage = [];


function patchTicketsLogic(req){
  const id = req.query.ticketID;
  const stat = req.body.status;
  let response = new Promise((resolve,reject) => {
    if(req.body.payload){
    if (req.body.payload.role === 'admin'){
      dao.isTicketPending(id)
      .then((data) => {
        if(data.Items[0].status === 'pending'){
          dao.updateTicketByID(id,stat,req.body.payload.username)
            .then((data) =>{
              resolve({"message":`ticket ${id} has been set to ${stat}`,"status":200});
            })
            .catch((err) => {
              reject({"message":err,"status":500});
            })
        }
        else{
          resolve({"message":"cannot change a resolved ticket","status":403});
        }
      })
      .catch((err) => {
        reject({"message":err,"status":400});
      })
    }
    else{
      resolve({"message":"you do not have permission to do this","status":403});
    }
  }
  else{
    resolve({"message":"you must log in","status":401})
  }
  })
  
  return(response);
}
function getTicketsLogic(req){
  let response = new Promise((resolve,reject) => {
  const body = req.body;
  if(body.payload){
    if(body.payload.role === 'admin'){
      if(req.query.status){
        dao.retrieveTicketsByStatus(req.query.status)
        .then((data) => {
          localStorage = data.Items;
          resolve({"message":localStorage,"status":200});
        })
        .catch((err) => {
          reject({"message":err, "status":400});
        })
      }
      else{
          dao.retrieveAllTickets()
            .then((data) => {
              localStorage = data.Items;
              resolve({"message":localStorage,"status":200});
            })
            .catch((err) => {
              reject({"message":err, "status":500});
            })
      }
    }
    else if(body.payload.role === 'employee'){
      if(req.query.type){
        dao.retrieveTicketsByUserAndType(body.payload.username,req.query.type)
        .then((data) => {
          resolve({"message":data.Items,"status":200});
        })
        .catch((err) => {
          reject({"message":err, "status":500});
        })
      }
      else{
        dao.retrieveTicketsByUser(body.payload.username)
        .then((data) => {
          resolve({"message":data.Items,"status":200});
        })
        .catch((err) => {
          reject({"message":err, "status":500});
        })
      }
    }
  }
  else{
    reject({"message":"you must log in to do this", "status":401});
  }
  })
  return(response);
}
function postTicketsLogic(req){
  let response = new Promise((resolve,reject) => {
    const body = req.body;
    if(req.body.payload){
      if(req.body.valid){
        if(req.body.type){
          dao.createTicket(uuid.v4(),body.amount,body.description, body.payload.username, type=body.type);
        }
        else{
          dao.createTicket(uuid.v4(),body.amount,body.description, body.payload.username);
        }
        
        resolve({"message":"Ticket submitted!","status": 201});
        }
      else{
        reject({"message":body.reason,"status":400})
      }
    }
    else{
      if(req.body.reason){
        reject({"message":req.body.reason,"status":400})
      }
      else{
        reject({"message":"you must be logged in to post a ticket","status":401});
      }
    }
  })
  return response;
}
// Validation functions
function isUsernameValid(username){
  let res = new Promise((resolve,reject) => {
    dao.checkExistingUsers(username)
      .then((data) => {
        if(data.Count){
          reject('Username is taken');
        }
        else{
          resolve("username is valid");
        }
      })
      .catch((err) => {
        reject("there was an error trying to contact our servers, please try again later");
      })
  })
  return(res); 
}
function validateNewAccount(req, res, next){
  if(!req.body.username || !req.body.password){
      req.body.valid = false;
      next();
  }
  else{
    if(!req.body.username.trim() || !req.body.password.trim()){
      req.body.valid = false;
      next();
    }
    else{
        req.body.valid = true;
        next();
    } 
  }
}
function validateNewTicket(req, res, next){
  if(!req.body.amount){
      req.body.valid = false;
      req.body.reason = "you must include an amount"
      next();
  }
  if(!req.body.description){
    req.body.valid = false;
    req.body.reason = "you must include a description"
    next();
  }
  else{
    if(!req.body.amount.trim()){
      req.body.valid = false;
      req.body.reason = "you must include an amount"
      next();
    }
    if(!req.body.description.trim()){
      req.body.valid = false;
      req.body.reason = "you must include a description"
      next();
    }
    else{
      req.body.valid = true;
      next()
    }
  }
}
function validatePermission(req, res, next){
  if(req.headers.authorization){
    const token = req.headers.authorization.split(' ')[1]
    jwtUtil.verifyTokenAndReturnPayload(token)
    .then((payload) => {
      req.body.payload = payload;
      next();
    })
    .catch((err) => {
      req.body.err = err;
      next();
    })
  }
  else{
    req.body.loggedin = false;
    next();
  } 
}
  
  




// Ticket endpoints 
server.patch('/tickets',validatePermission, (req,res) => {
  patchTicketsLogic(req)
  .then((data) => {
    res.status(data.status);
    res.send(data.message);
  })
  .catch((err) =>{
    res.status(err.status);
    res.send("there was an error \n"+err.message);
  })
})

server.get('/tickets',validatePermission, (req,res) =>{
  getTicketsLogic(req)
  .then((data) => {
    res.status(data.status);
    res.send(data.message);
  })
  .catch((err) => {
    res.status(err.status);
    res.send(err.message);
  })
})

server.post('/tickets',validateNewTicket,validatePermission, (req, res) => {
  postTicketsLogic(req)
  .then((data) => {
    res.status(data.status);
    res.send(data.message);
  })
  .catch((err) => {
    res.status(err.status);
    res.send(err.message);
  })
})


function setRoleLogic(req){
  let response = new Promise((resolve,reject) => {
    if(req.body.payload){
      if(req.body.payload.role === 'admin'){
        dao.updateUserByUsername(req.query.username,req.query.role)
        .then((data) => {
          resolve({"message":"role updated!","status":200});
        })
        .catch((err) => {
          reject({"message":err,"status":500});
        })
      }
      else{
          reject({"message":"you do not have permission to do this","status":403});
        }
    }
    else{
      reject({"message":"you must log in","status":402});
    }
    
    
  })
  return response;
}
function createAccountLogic(req){
  let response = new Promise((resolve,reject) => {
  const body = req.body;
  if(req.body.valid){
    isUsernameValid(body.username)
    .then((message) => {
      dao.registerNewUser(body.username,body.password);
      resolve({"message":"Account created for: "+body.username, "status":201});
    })
    .catch((message) => {
      reject({"message":message, "status":400});
    })
  }
  else{
    reject({"message":"you are missing required inputs\n Please include:\n1) a username\n2) a password",
    "status":400});
  }
  })
  return response;
}
function loginLogic(req){
  let response = new Promise((resolve,reject) => {
  const body = req.body;
  dao.loginToAccount(body.username,body.password)
  .then((data) => {
    if(data.Count){
      const token = jwtUtil.createJWT(body.username, data.Items[0].role);
      resolve({"message":"login successful!", "token": token, "status":200, 
      "user": body.username})
    }
    else{
      reject({"message":"Invalid credentials", "status":402});
    }
  })
  .catch((err) => {
    reject({"message":"There was an error\n"+err, "status":500});
  })
  })
  return response;
}




// Users endpoints
server.patch('/users/setrole',validatePermission, (req,res) => {
  setRoleLogic(req)
  .then((data) => {
    res.status(data.status);
    res.send(data.message);
  })
  .catch((err) =>{
    res.status(err.status);
    res.send("there was an error \n"+err.message);
  })
})
server.post('/users',validateNewAccount, (req, res) => {
  createAccountLogic(req)
  .then((data) => {
    res.status(data.status);
    res.send(data.message);
  })
  .catch((err) =>{
    res.status(err.status);
    res.send("there was an error \n"+err.message);
  })
})

server.post('/users/login', (req,res) => {
  loginLogic(req)
  .then((data) => {
    console.log(data);
    res.status(data.status);
    jsondata = {"message":data.message +"\n you are logged in as: "+ data.user, "token": data.token}
    res.send(jsondata);
  })
  .catch((err) =>{
    res.status(err.status);
    res.send("there was an error \n"+err.message);
  })
  
})


server.listen(PORT, () => {
  console.log(`Server is listening on Port: ${PORT}`);
});
