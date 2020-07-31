
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const mysql = require('mysql');


function find_user_by_id(id){
    console.log("deserialize " + id);
    console.log("trying to find user already");
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
          console.log("authenticating user: " + login_username + " with password " + login_password);
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
        console.log("made it out with a user " + user.email + " and password " + user.password);
        console.log("user with id " + user.id);
        done(null, user.id);
      });
      
    passport.deserializeUser(function(id, done) {
        console.log("deserialize " + id);
        console.log("trying to find user already");
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



/* OG Solution
function initialize (passport, getUserbyEmail){
    const authenticateUser = async (login_username, login_password, done) => {
        console.log("user: " + login_username + " with password " + login_password);
        console.log("test if we hit this line in pconfig");
        const user = await getUserbyEmail(login_username);
        //const user = null;
        console.log(user);
        if(user == null){
            console.log("pconfig I: no person found with that usernme");
            return done(null, false, {message: "no user with that email"});
        }

        try{
            if (await bcrypt.compare(login_password, user.password)) {
                return done(null, user);
            }

            else{
                return done(null, false, {message: "Password incorrect"});
            }
        }catch(e){
            console.log("error logging in");
            return done(e);
        }
    }
    passport.use(new LocalStrategy({usernameField: 'login_username', passwordField: 'login_password'}, authenticateUser));
    passport.serializeUser((user, done) => { });
    passport.deserializeUser((id, done) => { });
};

module.exports = initialize;
*/
/*
function initialize (passport){
    const authenticateUser = async (login_username, login_password, done) => {

        const connect = get_connection();
        const query = "SELECT * from users WHERE email = ?";
        connect.query(query, [login_username], (err, rows) =>{
          console.log("authenticating user: " + login_username + " with password " + login_password);
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
          else if(bcrypt.compareSync(login_password, rows[0].password)){
            console.log("user found!");
            user = rows[0];
            return done(null,rows[0]);
          }
          else{
              console.log("nothing works lmao");
              return done(null, false);
          }
        });
    }
    console.log("about to test user" + authenticateUser.username);
    passport.use(new LocalStrategy({usernameField: 'login_username', passwordField: 'login_password'}, authenticateUser));
    passport.serializeUser((user, done) => { });
    passport.deserializeUser((id, done) => { });
};

module.exports = initialize;
*/
function get_connection(){
    return mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "password",
        database: "mrideshare"
    });
};




