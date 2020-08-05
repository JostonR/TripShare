if(process.env.NODE_ENV !== 'production'){
  require("dotenv").config();
}


const express = require('express');
var session = require('express-session');
const mysql2 = require("mysql2/promise");
const app = express();

app.use(function(req, res, next){
  if (!req.user)
      res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  next();
});


const mysql = require('mysql');
app.use(express.static('./pages'));
const body_parser = require("body-parser");
app.use(body_parser.urlencoded({extended: true}));
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

function get_connection_two(){
  return mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "mrideshare"
  });
}





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
    var confirmed_password = req.body.confirm_password.toString();
    if(!bcrypt.compareSync(req.body.confirm_password, hashed_password)){
      res.render("home.ejs", {message: "Passwords do not match"});
      return;
    }
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


app.post("/schedule", check_not_authenticated, async(req, res) => {
  console.log("scheduling a trip");
  const check_for_spam_trips = "SELECT * from trips WHERE userID =?";
  const check_trip_num = await get_connection_two();
  const [rows, fields] = await check_trip_num.execute(check_for_spam_trips, [req.user.id]);
  console.log("number of trips is: " + rows.length);
  if(rows.length >= 2){
    res.render("error.ejs", {error: "Please delete current trips to schedule additional ones"});
    return;
  } 
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
          res.redirect("/dashboard");
      }
  });


});

app.get("/dashboard", check_not_authenticated, (req, res) =>{
  
  var connection = get_connection();
  var query_string = "SELECT * FROM Trips WHERE userID= ? ORDER BY calendarINFO";
  connection.query(query_string, [req.user.id], (err, data, fields)=>{
      if (err){
        console.log("Error showing user's trips");
        throw err;
      }
      else{
        var curr_date = new Date();
        var month = curr_date.getMonth() + 1;
        var day = curr_date.getDate();
        var year = curr_date.getFullYear();
        if(day < 10){
          day = "0" + day;
          console.log(day);
        }
        if(month < 10){
          month = "0" + month;
          console.log(month);
        }
        var date = year + "-" + month + "-" + day;
        console.log("day is " + date); 

        res.render("dashboard_proposed_changes.ejs", {user_trip_data: data, current_date: date});
      }
  });

  app.get("/backtodash", check_not_authenticated, (req,res)=>{
    res.redirect("/dashboard");
  })
  
 //res.render("dashboard_backup.ejs");
});


app.post("/alter", check_not_authenticated, (req, res) => {
  var id = req.body.trip_id;
  var trip = req.body.trip;
  var input = req.body.input;

  var connection = get_connection();
  var query_string = "SELECT * FROM Trips WHERE id= ?";
  connection.query(query_string, [req.body.trip_id], (err, data, fields) =>{
    if(err){
      console.log("Error showing current editable trip");
      throw err;
    }
    else{
      var curr_date = new Date();
      var month = curr_date.getMonth() + 1;
      var day = curr_date.getDate();
      var year = curr_date.getFullYear();
      if(day < 10){
        day = "0" + day;
        console.log(day);
      }
      if(month < 10){
        month = "0" + month;
        console.log(month);
      }
      var date = year + "-" + month + "-" + day;
      console.log("day is " + date); 
      res.render("alter_trip.ejs", {trip_details: data, current_date: date});
    }
  });
});

app.post("/delete-trip", check_not_authenticated, (req,res)=>{
  var query_string = "DELETE FROM trips WHERE id = ?";
  var connection = get_connection();
  connection.query(query_string, [req.body.tripID], (err) =>{
    if(err){
      console.log(err);
      throw err;
    }
    else{
      res.redirect("/dashboard");
    }
  });
});


app.post("/edit", check_not_authenticated, (req,res)=>{
  var connection = get_connection();
  var string_query = "Update trips SET streetNum = ?, streetName = ?, zip = ?, airline = ?, calendarInfo = ?, date = ?, time = ?, city = ?, state = ? where id = ?";
  const street_num = req.body.street_num;
  const street_addr = req.body.street_addr;
  const zipcode = req.body.zipcode;
  const airline = req.body.airline;
  const year = "2020";
  const date = req.body.date;
  const hour = req.body.time.substring(0, 2);
  const min = req.body.time.substring(3,5);
  const time = req.body.time + ":00";
  const date_time = date + " " + hour + ":" + min;

  connection.query(string_query, [street_num, street_addr, zipcode, airline, date_time, date, time, "Ann Arbor", "Michigan", req.body.tripID], (err, data)=>{
    if(err){
      console.log(err);
      throw(err);
    }
    else{
      res.redirect("/dashboard");
    }
  });
});


app.post("/search", (req, res) =>{
  var date = req.body.search_date;
  var airline = req.body.search_airline;
  var start_time = req.body.search_start_time;
  var end_time = req.body.search_end_time;


  if(req.body.search_start_time == ""){
    console.log("start_time is empty");
  }
  var search_criteria =[];
  search_criteria.push(date);
  search_criteria.push(req.user.id);
  var additional_params = 0;
  var connection = get_connection();
  var query_string = "SELECT * FROM Trips WHERE date = ? AND userID <> ?";
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

app.get("/forgot", (req,res) =>{
  res.render("forgot_password.ejs");
});

app.post("/password-change", async function(req,res){
  if(req.body.change_password !== req.body.confirm_change_password){
    res.render("change_password.ejs", {message: "Passwords don't match. Try again", uniqname: req.body.uniqname});
  }
  else{
    const hashed_password = await bcrypt.hash(req.body.change_password, parseInt(process.env.HASHED_TIMES));
    var connection = get_connection();
    connection.query("Update users SET password = ? WHERE email=?", [hashed_password, req.body.uniqname], (err, data)=>{
      if(err){
        console.log(err);
        throw err;
      }
      else{
        res.render("home.ejs", {message: "Password Reset. Please log in"});
      }
    })
  }
});

app.get("/forget-password/:uniqname/:change_hash", async function(req, res){
  const connection = await get_connection_two();
  const change_password = await get_connection_two();

  var requested_date;
  var results;
  const [rows, fields] = await connection.execute("SELECT * FROM users WHERE email = ?", [req.params.uniqname]);
  console.log(rows);
  console.log("email is " + rows[0].change_password_last_request);
  var curr_date = new Date();
  requested_date = rows[0].change_password_last_request;
  
  // the following is to handle cases where the times are on the opposite side of
// midnight e.g. when you want to get the difference between 9:00 PM and 5:00 AM

  if (curr_date < requested_date) {
    console.log("something's not right with change pssword date");
    date2.setDate(date2.getDate() + 1);
  }

  else{
    var diff = curr_date - requested_date;
    //1 hour
    var THRESHOLD = 1800000;
    if(diff < THRESHOLD){
      if(!bcrypt.compareSync(req.params.change_hash, rows[0].change_password_hash)){
        res.render("home.ejs", {message: "Token wrong. Please go to forgot password and try again"});
      }
      else{
        //var redirect_route = "/change-password/" + req.params.uniqname + "/" + req.params.change_hash;
        //res.redirect("/");
        res.render("change_password.ejs", {message: "please enter a new password", uniqname: req.params.uniqname});
      }
    }
    else{
      res.render("home.ejs", {message: "Token expired. Please go to forgot password and try again"});
    }
  }


});

app.post("/forgot-password", async function(req,res){
  var uniqname = req.body.uniqname;
  var email = uniqname + process.env.MAKE_EMAIL;
  var verify_hash = randomstring.generate(parseInt(process.env.VERIFY_HASH));
  var hashed_password = await bcrypt.hash(verify_hash, parseInt(process.env.HASHED_TIMES));
  var current_date = new Date();
  var set_hash = "UPDATE users SET change_password_hash = ?, change_password_last_request = ? WHERE email = ?";

  const connection = get_connection();
  
  connection.query(set_hash, [hashed_password, current_date, uniqname], (err, data)=>{
    if(err){
      console.log(err);
      throw err;
    }
    else{
      var uniq_hash = uniqname + "/" + verify_hash;
      var mail_options = {
        from: process.env.EMAIL,
        to: email,
        subject: "Reset Your MTripShare Password",
        html: "Please click " + "<a href='http://localhost:3000/forget-password/" + uniq_hash + "'>here</a> to reset your password"
      }; 
      transporter.sendMail(mail_options, function(error, info){
        if(error){
          console.log(error);
        }
        else{
          console.log("Email send: " + info.response);
        }
      });   
      res.render("home.ejs", {message: "Please check your email for instructons"});
    }
  });

});

app.get("/test/:name/:color", (req,res)=>{
  if(req.params.name == "Joston"){
    console.log("Joston");
    res.send("hello");
  }
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
      "hash VARCHAR(128), " +
      "email VARCHAR(100) not NULL UNIQUE, " +
      "password VARCHAR(100) not NULL, " +
      "change_password_hash VARCHAR(256), " +
      "change_password_last_request DATETIME, " + 
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
