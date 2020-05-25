const express = require('express');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
const app = express();
const mysql = require('mysql');
//app.use(express.static('./pages'));
const body_parser = require('body-parser');
app.use(body_parser.urlencoded({extended: false}));


app.set('views',__dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


function get_connection(){
    return mysql.createConnection({
        host: "localhost",
        user: "john",
        password: "Pass1234",
        database: "mrideshare"
    });
};

var options = {
  host: 'localhost',
  port: '3306',
  user: 'john',
  password: 'Pass1234',
  database: 'mrideshare'
};

var session_store = new MySQLStore(options);

app.use(session({
  secret: 'session_cookie_secret',
  store: session_store,
  resave: false,
  saveUninitialized: false
}));



app.get("/", (req, res) =>{
    console.log("Responding to root route");
    res.send("hello");
});

app.get("/welcome", (req, res) =>{
    res.render("homepage.html", {uname: "User"});
})

app.get("/login", (req, res)  =>{

  const connection = get_connection();
  console.log("connection passed maybe?");
  const user_username = req.body.login_username;
  const user_password = req.body.login_password;
  console.log("fetching user with username: " + req.body.login_username);
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
      console.log("sesssion for: " + req.session.username);
      res.send("success!");
      //need some response
  });

});

app.post("/insert", (req, res) =>{
    var connection = get_connection();
    const username = req.body.create_username;
    console.log(username);
    const password = req.body.create_password;
    const query_string = "INSERT INTO user (email, password) VALUES (?, ?)";
    connection.query(query_string, [username, password], (err, results, fields)=>{
      if(err){
          console.log("error");
          res.sendStatus(500);
          return;
      }
      else{
          console.log("user created!");
          req.session.username = user_username;
          res.send("new user created");
      }
    })

})

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
      "email VARCHAR(50), " +
      "password VARCHAR(50), " +
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
  const query_string = "INSERT INTO trips (airline, calendarInfo, streetNum, streetName, city, state, zip) VALUES (?, ?)";
  connection.query(query_string, [airline, date_time, street_num, street_addr, "Ann Arbor", "Michigan", zipcode], (err, results, fields) =>{
      if(err){
          console.log("error inserting new trip");
          res.sendStatus(500);
          return;
      }
      else{
          console.log("trip scheduled");
          res.send("trip scheduled");
              //need to reroute
      }
  });


});

app.listen(3000, () => {
    console.log("Server is listening");
});
