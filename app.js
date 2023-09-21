const dao = require('./DAO');
const jwtUtil = require('./utils/jwt_util')

const express = require('express');
const server = express();
const PORT = 3000;

const uuid = require('uuid');

const bodyParser = require('body-parser');

server.use(bodyParser.json());

let localStorage = [];



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
  if(!req.body.username.trim() || !req.body.password.trim()){
      req.body.valid = false;
      next();
  }else{
      req.body.valid = true;
      next();
  }
}
function validateNewTicket(req, res, next){
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
      next();
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
    next();
  } 
}
  
  




// Ticket endpoints 
server.patch('/tickets',validatePermission, (req,res) => {
  const id = req.query.ticketID;
  const stat = req.body.status;
  if (req.body.payload.role === 'admin'){
    dao.isTicketPending(id)
    .then((data) => {
      if(data.Items[0].status === 'pending'){
        dao.updateTicketByID(id,stat,req.body.payload.username)
          .then((data) =>{
            res.send(`ticket ${id} has been set to ${stat}`);
          })
          .catch((err) => {
            res.send(err);
          })
      }
      else{
        res.send("cannot change a resolved ticket")
      }
    })
    .catch((err) => {
      res.send(err);
    })
  }
  else{
    res.send("you do not have permission to do this")
  }
})

server.get('/tickets',validatePermission, (req,res) =>{
  const body = req.body;
  if(body.payload){
    if(body.payload.role === 'admin'){
      if(req.query.status){
        dao.retrieveTicketsByStatus(req.query.status)
        .then((data) => {
          localStorage = data.Items;
          res.send(localStorage);
        })
        .catch((err) => {
          res.send(err);
        })
      }
      else{
          dao.retrieveAllTickets()
            .then((data) => {
              localStorage = data.Items;
              res.send(localStorage);
            })
            .catch((err) => {
              res.send(err);
            })
      }
    }
    else if(body.payload.role === 'employee'){
      if(req.query.type){
        dao.retrieveTicketsByUserAndType(body.payload.username,req.query.type)
        .then((data) => {
          res.send(data.Items);
        })
        .catch((err) => {
          res.send(err);
        })
      }
      else{
        dao.retrieveTicketsByUser(body.payload.username)
        .then((data) => {
         res.send(data.Items);
        })
        .catch((err) => {
         res.send(err);
        })
      }
    }
  }
  else{
    res.send("you must log in to do this")
  }
})

server.post('/tickets',validateNewTicket,validatePermission, (req, res) => {
  const body = req.body;
  if(req.body.payload){
    if(req.body.valid){
      if(req.body.type){
        dao.createTicket(uuid.v4(),body.amount,body.description, body.payload.username, type=body.type);
      }
      else{
        dao.createTicket(uuid.v4(),body.amount,body.description, body.payload.username);
      }
      
      res.send("Ticket submitted!");
      }
    else{
      res.send(body.reason);
    }
  }
  else{
    res.send("you must be logged in to post a ticket");
  }
})






// Users endpoints
server.patch('/users/setrole',validatePermission, (req,res) => {
  if(req.body.payload.role === 'admin'){
    dao.updateUserByUsername(req.query.username,req.query.role)
    .then((data) => {
      res.send("role updated!");
    })
    .catch((err) => {
      res.send(err);
    })
  }
  else{
    res.send("you do not have permission to do this")
  }
})
server.post('/users',validateNewAccount, (req, res) => {
  const body = req.body;
  if(req.body.valid){
    isUsernameValid(body.username)
    .then((message) => {
      dao.registerNewUser(body.username,body.password);
      res.send(message+"\n\nAccount created!");
    })
    .catch((message) => {
      res.send(message);
    })
  }
  else{
    res.send("you are missing required inputs\n Please include:\n1) a username\n2) a password\n3) whether you are an administrator")
  }
})

server.post('/users/login', (req,res) => {
  const body = req.body;
  dao.loginToAccount(body.username,body.password)
  .then((data) => {
    if(data.Count){
      const token = jwtUtil.createJWT(body.username, data.Items[0].role);
      res.setHeader("Content-Type", "application/json") ;
      res.setHeader("User-logged-in", body.username);
      res.send({
        message: "login successful",
        token : token
      }).status(200);
    }
    else{
      res.send("Invalid credentials");
    }
  })
  .catch((err) => {
    res.send("invalid credentials")
  })
})


server.listen(PORT, () => {
  console.log(`Server is listening on Port: ${PORT}`);
});