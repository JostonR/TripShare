
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const mysql = require('mysql');


function find_user_by_id(id){
    console.log("deserialize " + id);
    var id_int = parseInt(id);
    const connect = get_connection();
    const query = "SELECT * from users WHERE id = ?";
    connect.query(query, [id_int], (err, rows) =>{
      console.log("find user with id: " + id);
      if(err){
          console.log(err);
          done(err, false);
      }
      else if(!rows.length){
        console.log("configp: no id found");
        done(null, false, {message: "no user with that email"});
      }
      else if((id !== rows[0].id)){
          console.log("id wrong");
          done(null, false, {message: "incorrect id"});
      }
      else if((id === rows[0].id)){
        console.log("user found!");
        done(null,rows[0]);
    }
    else{
      console.log("nothing works");
      done(null, false);
    }
    });

}

function initialize (passport){
    var user;
    passport.use(new LocalStrategy({usernameField: 'login_username', passwordField: 'login_password'}, function async(login_username, login_password, done){

        const connect = get_connection();
        const query = "SELECT * from users WHERE email = ?";
        connect.query(query, [login_username], (err, rows) =>{
          if(err){
              return done(err);
          }
          else if(!rows.length){
            console.log("configp: no email found");
              return done(null, false, {message: "no user with that email"});
          }
          else if(!bcrypt.compareSync(login_password, rows[0].password)){
              console.log("password wrong");
              return done(null, false, {message: "incorrect password"});
          }
          else if(!rows[0].active){
              console.log("Please verify your account");
              return done(null, false, {message: "Please check your email to verify your account"});
          }
          else if(bcrypt.compareSync(login_password, rows[0].password)){
            console.log("user found!");
            user = rows[0];
            return done(null,rows[0]);
        }
        else{
            console.log("nothing works");
            return done(null, false, {message: "incorrect password"});
        }
          });
    
    }));
    passport.serializeUser(function(user, done) {
        done(null, user.id);
      });
      
    passport.deserializeUser(function(id, done) {
        var id_int = parseInt(id);
        const connect = get_connection();
        const query = "SELECT * from users WHERE id = ?";
        connect.query(query, [id_int], (err, rows) =>{
          console.log("find user with id: " + id);
          if(err){
              console.log(err);
              done(err, false);
          }
          else if(!rows.length){
            console.log("configp: no id found");
            done(null, false, {message: "no user with that email"});
          }
          else if((id !== rows[0].id)){
              console.log("id wrong");
              done(null, false, {message: "incorrect id"});
          }
          else if((id === rows[0].id)){
            console.log("user found!");
            done(null,rows[0]);
        }
        else{
          console.log("nothing works");
          done(null, false);
        }
          });
          
      });
    
};

module.exports = initialize;


function get_connection(){
    return mysql.createConnection({
        host: "localhost",
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: "mrideshare"
    });
};


function get_connection_two(){
    return mysql2.createConnection({
      host: "localhost",
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: "mrideshare"
    });
};




