if(process.env.NODE_ENV !== 'production'){
  require("dotenv").config();
}


const express = require('express');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
const app = express();

app.use(function(req, res, next){
  if (!req.user)
      res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  next();
});


const mysql = require('mysql');
app.use(express.static('./pages'));
const body_parser = require("body-parser");
app.use(body_parser.urlencoded({extended: false}));
const LocalStrategy = require('passport-local').Strategy;

const flash = require("express-flash");

const method_override = require("method-override");
app.use(method_override("_method"));

const passport = require("passport");
const initializePassport = require("./passport-config");

initializePassport(passport);

app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
const bcrypt = require("bcrypt");

var randomstring = require("randomstring");

var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  service:"gmail",
  auth: {
    user: process.env.EMAIL2,
    pass: process.env.EMAIL2_PASSWORD
  }
});


app.set('views', __dirname + '/views');
app.set('view-engine', 'ejs');
app.engine('html', require('ejs').renderFile);


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
app.get('/', check_authenticated, (req, res) =>{
    res.render('home.ejs', {message: req.flash("error")});
});

//TODO change route name to be inline with html (this is not a homepage, it's landing route)
app.get("/welcome", (req, res) =>{
    res.render("homepage.html", {uname: "User"});
});


app.post("/login", passport.authenticate("local", {
  successRedirect: "/dashboard",
  failureRedirect: "/",
  failureFlash: true
}));
app.post("/register", async(req, res) =>{
    var connection = get_connection();
    const username = req.body.create_username;
    console.log(username);
    var email = username + process.env.MAKE_EMAIL;
    var verify_hash = randomstring.generate(parseInt(process.env.VERIFY_HASH));
    var hash_exists = true;
  
    const hashed_password = await bcrypt.hash(req.body.create_password, parseInt(process.env.HASHED_TIMES));
    try{
        const query_string = "INSERT INTO users (email, password, active, hash) VALUES (?, ?, ?, ?)";
        connection.query(query_string, [username, hashed_password, false, verify_hash], (err, results, fields) =>{
          if(err){
            res.render("home.ejs", {message: err.code});
          }
          else{
            var mail_options = {
              from: process.env.EMAIL,
              to: email,
              subject: "Please Verify Your TripShare Account",
              html: "Please click " + "<a href='http://localhost:3000/verify/" + verify_hash + "'>here</a> to verify your account"
            }; 
            transporter.sendMail(mail_options, function(error, info){
              if(error){
                console.log(error);
              }
              else{
                console.log("Email send: " + info.response);
              }
            });   
            res.render("home.ejs", {message: "Please check your email to verify your account"});
          }
        });
    } catch{

    }    
});


app.post("/schedule", check_not_authenticated, (req, res) => {
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
  const time = req.body.time + ":00";
  console.log("date format is: " + date);
  console.log("time format is: " + hour + " hours and " + min + " minutes");
  console.log("raw time: " + req.body.time);
  const date_time = date + " " + hour + ":" + min;

  const connection = get_connection();
  const query_string = "INSERT INTO trips (userID, airline, date, time, calendarInfo, streetNum, streetName, city, state, zip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  connection.query(query_string, [req.user.id, airline, date, time, date_time, street_num, street_addr, "Ann Arbor", "Michigan", zipcode], (err, results, fields) =>{
      if(err){
          console.log("error inserting new trip");
          console.log(err);
          res.sendStatus(500);
          return;
      }
      else{
          console.log("trip scheduled");
          res.send("trip scheduled");
          //TODO: New Modal that says Trip Scheduled with X bar
      }
  });


});

app.get("/dashboard", check_not_authenticated, (req, res) =>{
  
  var connection = get_connection();
  var query_string = "SELECT * FROM Trips WHERE userID= ?";
  connection.query(query_string, [req.user.id], (err, data, fields)=>{
      if (err){
        console.log("Error showing user's trips");
        throw err;
      }
      else{
        res.render("dashboard_proposed_changes.ejs", {user_trip_data: data});
      }
  });
  
 //res.render("dashboard_backup.ejs");
});


app.post("/search", (req, res) =>{
  var date = req.body.search_date;
  var airline = req.body.search_airline;
  var start_time = req.body.search_start_time;
  var end_time = req.body.search_end_time;
  console.log("date: " + date);
  console.log("airline: " + airline);
  console.log("start_time: " + req.body.search_start_time);
  console.log(req.body.search_start_time);
  console.log("end_time: " + end_time);

  if(req.body.search_start_time == ""){
    console.log("start_time is empty");
  }
  var search_criteria =[];
  search_criteria.push(date);
  var additional_params = 0;
  var connection = get_connection();
  var query_string = "SELECT * FROM Trips Where date = ?";
  if(airline != "Any"){
    query_string += " AND airline= ?";
    search_criteria.push(airline);
  }
  if(start_time != ""){
    query_string += " AND time >= ?";
    search_criteria.push(start_time);
  }

  if(end_time != ""){
    query_string += " AND time <= ?";
    search_criteria.push(end_time);
  }

  connection.query(query_string, search_criteria, (err, data, fields) =>{
    if(err){
      console.log("error showing search critera");
      console.log(err);
      throw err;
    }
    else{
      var user_info;
      connection.query("SELECT * FROM users", [], (err, results)=>{
        if(err){
          console.log("cant get users for search results");
          console.log(err);
          throw err;
        }
        else{
          user_info = results;
          var header = "Showing results for";
          //for(var i = 0; i < )
          res.render("search_results.ejs", {search_results_data: data, user_table: user_info, criteria: search_criteria});
        }
      });
    }
  });

});

app.get("/schedule_modal", (req, res) => {

});


//----------------------------------------------------------------------------------------------------------
//Helpers Routes
//----------------------------------------------------------------------------------------------------------
app.get("/verify/:verify_hash", function(req, res){
  const connection = get_connection();
  const inner_connection = get_connection();
  var query_string = "SELECT id FROM users WHERE hash=?";
  connection.query(query_string, [req.params.verify_hash], function(err, data){
    if(err){
      console.log(err);
    }
    else if(data.length != 0){
      query_string = "UPDATE users SET active =? WHERE id=?";
        inner_connection.query(query_string, [true, data[0]]);
        res.render("home.ejs", {message: "Thank you for verifying. Please log in"});
    }
    else{
      res.render("home.ejs", {message: "Couldn't Verify user"});
    }
  });
});


app.delete("/logout", (req,res) =>{
  req.logOut();
  res.redirect("/");
});

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
    });
    query_string = "create database mrideshare;";
    connection.query(query_string, (err, results, fields)=>{
        if (err){
          console.log("Error creating database mrideshare");
        }
        else{
          console.log("success");
        }
    });
    query_string = "USE mrideshare";
    connection.query(query_string, (err, results, fields)=>{
        if (err){
          console.log("Error creating database mrideshare");
        }
        else{
          console.log("success");
        }
    });
    query_string = "create table users (" +
      "id INTEGER not NULL AUTO_INCREMENT, " +
      "active BOOLEAN, " + 
      "hash VARCHAR(128) UNIQUE, " +
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
    });
    query_string = "create table trips (" +
                  "id INTEGER not NULL AUTO_INCREMENT," +
                  "userID INTEGER," +
                  "airline VARCHAR(50)," +
                  "date DATE," + 
                  "time TIME," +
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
      });
      res.redirect();
});



app.listen(3000, () => {
    console.log("Server is listening");
});

//----------------------------------------------------------------------------------------------------------
//Helpers Functions
//----------------------------------------------------------------------------------------------------------

function check_authenticated(req, res, next){
  if(!req.isAuthenticated()){
    return next();
  }
  else{
    res.redirect("/dashboard");
  }
}

function check_not_authenticated(req, res, next){
  if(req.isAuthenticated()){
    next();
  }
  else{
    res.redirect("/");
  }
}

function print_hello(req,res){
  console.log("hello from html");
}
/* Cannot get proporty so implement within dashboard route
function show_scheduled_trips(req, res){
  var connection = get_connection();
  var query_string = "SELECT * FROM Trips WHERE userID= ?";
  connection.query(query_string, [req.user.id], (err, data, fields)=>{
      if (err){
        console.log("Error showing user's trips");
        throw err;
      }
      else{
        console.log("showing user trips");
        res.render("dashboard.ejs", {user_trip_data: data});
        return data;
      }
  });
}
*/
