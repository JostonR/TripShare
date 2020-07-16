
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize (passport, getUserbyEmail){
    const authenticateUser = async (login_username, login_password, done) => {
        console.log("test if we hit this line in pconfig");
        const user = await getUserbyEmail(login_username);
        console.log("user: " + login_username);
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



