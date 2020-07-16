if(process.env.NODE_ENV !== 'production'){
  require("dotenv").config();
}

const express = require('express');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
const app = express();
const mysql = require('mysql');
app.use(express.static('./pages'));
const body_parser = require("body-parser");
app.use(body_parser.urlencoded({extended: false}));

const flash = require("express-flash");

const passport = require("passport");
const initializePassport = require("./passport-config");
console.log("1) debugging purposes.");
initializePassport(passport, login_username => {
  //return users.find(user => user.login_username === login_username);
  console.log("user in appjs: " + login_username);
  const connect = get_connection();
  const query = "SELECT password from users WHERE email = ?";
  console.log("create sql query in login");
  connect.query(query, [login_username], (err, rows) =>{
    console.log("authenticating");
    if(err){
        console.log("error" + err + " error");
        console.log("login passport has error");
        res.sendStatus(500);
        res.end();
    }
    else if(!rows.length){
      console.log("IP: no user found");
        return null;
    }
    else{
      console.log("db retrieval success!");
      console.log(rows[0].email);
      return rows[0];
    }

    });
});

app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
const bcrypt = require("bcrypt");


app.set('views', __dirname + '/views');
app.set('view-engine', 'ejs');
app.engine('html', require('ejs').renderFile);

/*
sql connection options
host: 'localhost',
  port: '3306',
  user: 'john',
  password: 'Pass1234',
  database: 'mrideshare'
*/

function get_connection(){
    return mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "password",
        database: "mrideshare"
    });
};

var options = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "mrideshare"
};

var session_store = new MySQLStore(options);

app.use(session({
  secret: 'session_cookie_secret',
  store: session_store,
  resave: false,
  saveUninitialized: false
}));


//TODO move /welcome contents to this route
app.get('/', (req, res) =>{
    res.render('home.ejs', {message: ""});
});

//TODO change route name to be inline with html (this is not a homepage, it's landing route)
app.get("/welcome", (req, res) =>{
    res.render("homepage.html", {uname: "User"});
});


app.post("/login", passport.authenticate("local", {
  successRedirect: "/dashboard.html",
  failureRedirect: "/login",
  failureFlash: true
}));
//TODO on successful authentication, need to render dashboard
//1) unsuccessful login render error page if not in system
//2) unsuccessful login render verifcation page if account made but no verification
/*
app.post("/login", (req, res)  =>{

  const connection = get_connection();
  console.log("connection passed maybe?");
  const user_username = req.body.login_username;
  const user_password = req.body.login_password;
  console.log("fetching user with username: " + user_username);
  const query_string = "SELECT password FROM users WHERE email = ?";
  connection.query(query_string, [user_username], (err, results, fields) =>{
      console.log("authenticating");
      if(err){
          console.log("error" + err + " error");
          res.sendStatus(500);
          res.end();
          return;
      }

      req.session.username = user_username;
      console.log("fetched new user");
      const session_name = req.session.username;
      console.log("sesssion for: " + session_name);
      console.log("ratchet version: " + req.session.username);
      res.send("success!"); 
      //need some response
  });

});
*/
//TODO 
//1) Look into email verification 
//2) on successful registration, render to email verification page
app.post("/register", async(req, res) =>{
    var connection = get_connection();
    const username = req.body.create_username;
    console.log(username);
    
    try{
        const hashed_password = await bcrypt.hash(req.body.create_password, 5);
        console.log(hashed_password);
        const query_string = "INSERT INTO users (email, password) VALUES (?, ?)";
        connection.query(query_string, [username, hashed_password], (err, results, fields) =>{
          if(err){
            res.render("error.ejs", {error: err.code});
          }
          else{
            res.render("home.ejs", {message: "Please log in"});
          }
        });
    } catch{

    }
    


  
});

//TODO add additional layer of trip preferences... each trip have an id, pass the id to preferences page ith separate table in backend 

app.post("/schedule", (req, res) => {
  console.log("scheduling a trip");
  const street_num = req.body.street_num;
  const street_addr = req.body.street_addr;
  const zipcode = req.body.zipcode;
  const airline = req.body.airline;
  //const month = get_selected_option(req.body.month);
 // const day = get_selected_option(req.body.day);
  const year = "2020";
  const date = req.body.date;
  const hour = req.body.time.substring(0, 2);
  const min = req.body.time.substring(3,5);

  const date_time = date + " " + hour + ":" + min;

  const connection = get_connection();
  const query_string = "INSERT INTO trips (userID, airline, calendarInfo, streetNum, streetName, city, state, zip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  connection.query(query_string, [1, airline, date_time, street_num, street_addr, "Ann Arbor", "Michigan", zipcode], (err, results, fields) =>{
      if(err){
          console.log("error inserting new trip");
          res.sendStatus(500);
          return;
      }
      else{
          console.log("trip scheduled");
          console.log("session for: " + req.session.username);
          res.send("trip scheduled");
              //need to reroute
      }
  });


});

app.get("/dashboard", (req, res) =>{

});


//----------------------------------------------------------------------------------------------------------
//Helpers
//----------------------------------------------------------------------------------------------------------

app.get("/nukeDB", (req, res) =>{
    res.render("initializeDB.html");
})

app.get("/init", (req, res)=>{
    var connection = get_connection();
    var query_string = "drop database mrideshare;";
    connection.query(query_string, (err, results, fields)=>{
        if (err){
          console.log("Error dropping database mrideshare");
        }
        else{
          console.log("success");
        }
    })
    query_string = "create database mrideshare;";
    connection.query(query_string, (err, results, fields)=>{
        if (err){
          console.log("Error creating database mrideshare");
        }
        else{
          console.log("success");
        }
    })
    query_string = "USE mrideshare";
    connection.query(query_string, (err, results, fields)=>{
        if (err){
          console.log("Error creating database mrideshare");
        }
        else{
          console.log("success");
        }
    })
    query_string = "create table users (" +
      "id INTEGER not NULL AUTO_INCREMENT," +
      "email VARCHAR(100) not NULL UNIQUE, " +
      "password VARCHAR(100) not NULL, " +
      "PRIMARY KEY(id))";
    connection.query(query_string, (err, results, fields)=>{
          if (err){
            throw(err);
          }
          else{
            console.log("success");
          }
    })
    query_string = "create table trips (" +
                  "id INTEGER not NULL AUTO_INCREMENT," +
                  "userID INTEGER," +
                  "airline VARCHAR(50)," +
                  "calendarInfo DATETIME," +
                  "streetNum INTEGER," +
                  "streetName VARCHAR(50)," +
                  "city VARCHAR(50)," +
                  "state VARCHAR(15)," +
                  "zip INTEGER(5)," +
                  "PRIMARY KEY(id)," +
                  "FOREIGN KEY(userID) REFERENCES users(id) ON DELETE CASCADE)";
     connection.query(query_string, (err, results, fields)=>{
          if (err){
            throw(err);
          }
          else{
            console.log("success");
          }
      })
      res.redirect()
});



app.listen(3000, () => {
    console.log("Server is listening");
});
