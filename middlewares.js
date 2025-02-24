module.exports.isLoggedIn =(req,res,next)=> {
    if(!req.isAuthenticated()){
        //If user is not login we save the requested Url for the user in a redirectUrl in session
        //It you try to access direct without the saveRedirectUrl there is some error that after /login the session would be change and redirect values are updated
        req.session.redirectUrl = req.originalUrl;
        req.flash("error","You must be logged in to do any action");
        return res.redirect("/login");
    }
    next();
}
