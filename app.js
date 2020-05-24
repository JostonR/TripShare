const express = require('express');
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



app.get("/", (req, res) =>{
    console.log("Responding to root route");
    res.send("hello");
});

app.get("/login", (req, res) =>{
    //res.send("login page tbd");
    res.render("homepage.html", {uname: "Vishnu"});
})

app.post("/insert", (req, res) =>{
  /*var connection = get_connection();
  connection.connect(function(err) {
    if (err) throw err;
    const username = req.body.create_username;
    console.log(username);
    const password = req.body.create_password;
    const time = req.body.create_time;
    console.log(time);
    const query_string = "INSERT INTO user (email, pword) VALUES (?, ?)";
    connection.query(query_string, [username, password], function (err, result, fields) {
      if (err) throw err;
      res.redirect('http://google.com');
    });
  });*/
    var connection = get_connection()
    const username = req.body.create_username;
    console.log(username);
    const password = req.body.create_password;
    const query_string = "INSERT INTO user (email, pword) VALUES (?, ?)";
    connection.query(query_string, [username, password], (err, results, fields)=>{
      if(err){
          console.log("error");
          res.sendStatus(500);
          return;
      }
      else{
          console.log("user created!");
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
                  "calenderInfo DATETIME," +
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
})

app.listen(3000, () => {
    console.log("Server is listening");
});
