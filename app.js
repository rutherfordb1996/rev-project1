const dao = require('./DAO');

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
  if(!req.body.username || !req.body.password || !req.body.admin){
      req.body.valid = false;
      next();
  }else{
      req.body.valid = true;
      next();
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
  if(!req.body.username){
    req.body.valid = false;
    req.body.reason = "you must include your username"
    next();
  }
  else{
      req.body.valid = true;
      next();
  }
}
function validatePermission(req, res, next){
  if(req.body.role === 'admin' && req.body.username){
      req.body.valid = true;
      next();
  }
  else{
      req.body.valid = false;
      next();
  }
}




// Ticket endpoints 
server.patch('/tickets',validatePermission, (req,res) => {
  const id = req.query.ticketID;
  const stat = req.body.status;
  if (req.body.valid){
    dao.isTicketPending(id)
    .then((data) => {
      if(data.Items[0].status === 'pending'){
        dao.updateTicketByID(id,stat,req.body.username)
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
  if(req.body.valid){
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
  else{
    dao.retrieveTicketsByUser(body.username)
    .then((data) => {
      res.send(data.Items);
    })
    .catch((err) => {
      res.send(err);
    })
  }
})

server.post('/tickets',validateNewTicket, (req, res) => {
  const body = req.body;
  if(req.body.valid){
    dao.createTicket(uuid.v4(),body.amount,body.description, body.username);
    res.send("Ticket submitted!");
    }
  else{
    res.send(body.reason);
  }
})






// Users endpoints
server.post('/users',validateNewAccount, (req, res) => {
  const body = req.body;
  if(req.body.valid){
    isUsernameValid(body.username)
    .then((message) => {
      dao.registerNewUser(body.username,body.password,body.admin);
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
      res.setHeader("Content-Type", "application/json") ;
      res.setHeader("User-logged-in", body.username);
      res.send("user logged in successfully").status(200);
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