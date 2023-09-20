const dao = require('./DAO');

const express = require('express');
const server = express();
const PORT = 3000;

const uuid = require('uuid');

const bodyParser = require('body-parser');

server.use(bodyParser.json());

function validateNewAccount(req, res, next){
  if(!req.body.username || !req.body.password || !req.body.admin){
      req.body.valid = false;
      next();
  }else{
      req.body.valid = true;
      next();
  }
}
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
server.listen(PORT, () => {
  console.log(`Server is listening on Port: ${PORT}`);
});