
const bcrypt = require("bcrypt");
const User = require("../model/user");
const { isEmployeePosition } = require('../middleware/roleUtils');

class LoginController {
    show(req, res){
        res.render('auth/login', {layout: false});
    }


    async checked (req, res) {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.render("auth/login", { 
                layout: false , 
                error: "Incorrect email or password." , email: req.body.email});
        }

        // Compare submitted password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("auth/login", { layout: false , error: "Incorrect email or password.",  email: req.body.email });
        }

        // Login successful
        req.session.user = {
            _id: user._id,
            avatar: user.avatar,
            name: user.name,
            position: user.position,
            totalWorkingHours: user.totalWorkingHours || 0,
        };
        if (isEmployeePosition(user.position)) {
            return res.redirect('/dashboard');
        }
        res.redirect("/auth");
        };
   
}

module.exports = new LoginController;

