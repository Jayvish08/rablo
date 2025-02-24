require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport")
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const {isLoggedIn} = require("./middlewares.js");

const Product = require("./models/product");
const app = express();

// Database Connection
const mongo_url = "mongodb://127.0.0.1:27017/rablo";
const dbUrl = process.env.ATLASDB_URL;
async function main() {
    try {
        await mongoose.connect(dbUrl);
        console.log("MongoDB Connection Established");
    } catch (err) {
        console.error("Database Connection Failed:", err);
    }
}
main();

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600
})

store.on("error",(err)=>{
    console.log("Error in Mongo Session store ",err);
})

const sessionOptions = {
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
    }
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());           //For Storing data in a session
passport.deserializeUser(User.deserializeUser());       //For removing data in a session

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

// App Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// Show all products
app.get("/products", async (req, res) => {
    try {
        const allProducts = await Product.find({});
        res.render("index.ejs", { allProducts });
    } catch (error) {
        console.error("Error fetching products:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Add new product form
app.get("/products/new",isLoggedIn, (req, res) => {
    res.render("new.ejs");
});

// Save new product
app.post("/products",isLoggedIn, async (req, res) => {
    try {
        const newProduct = new Product(req.body.product);
        await newProduct.save();
        console.log("Product Added:", newProduct);
        req.flash("success","New Product added");
        res.redirect("/products");
    } catch (error) {
        console.error("Error saving product:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Render edit form
app.get("/products/edit/:productId",isLoggedIn, async (req, res) => {
    const { productId } = req.params;
    try {
        const product = await Product.findOne({ productId });
        if (!product) return res.status(404).send("Product not found");

        res.render("edit.ejs", { product });
    } catch (error) {
        console.error("Error fetching product:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Update product
app.put("/products/:productId",isLoggedIn, async (req, res) => {
    const { productId } = req.params;
    try {
        const updatedProduct = await Product.findOneAndUpdate(
            { productId },
            { ...req.body.product },
            { new: true }
        );
        if (!updatedProduct) return res.status(404).send("Product not found");

        console.log("Product Updated:", updatedProduct);
        req.flash("success","Product Updated");
        res.redirect("/products");
    } catch (error) {
        console.error("Error updating product:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Delete product
app.delete("/products/:productId",isLoggedIn, async (req, res) => {
    const { productId } = req.params;
    try {
        const deletedProduct = await Product.findOneAndDelete({ productId });
        if (!deletedProduct) return res.status(404).send("Product not found");

        console.log("Product Deleted:", deletedProduct);
        req.flash("success","Product deleted");
        res.redirect("/products");
    } catch (error) {
        console.error("Error deleting product:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Fetch featured products
app.get("/products/featured", async (req, res) => {
    try {
        const allProducts = await Product.find({ featured: true });
        res.render("index.ejs", { allProducts });
    } catch (error) {
        console.error("Error fetching featured products:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Fetch products with price less than user input
app.get("/products/price", async (req, res) => {
    const { maxPrice } = req.query;
    try {
        const allProducts = await Product.find({ price: { $lt: maxPrice } });
        res.render("index.ejs", { allProducts });
    } catch (error) {
        console.error("Error fetching products by price:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

// Fetch products with rating higher than user input
app.get("/products/rating", async (req, res) => {
    const { minRating } = req.query;
    const ratingValue = parseFloat(minRating) || 1;

    try {
        const allProducts = await Product.find({ rating: { $gte: ratingValue } });
        res.render("index.ejs", { allProducts });
    } catch (error) {
        console.error("Error fetching products by rating:", error);
        req.flash("error",error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/signup",(req,res)=>{
    res.render("register.ejs");
})

app.post("/signup",async (req,res)=>{
    try{
        let {username,email,password} = req.body;
        const newUser = new User({email,username});
        const registeredUser = await User.register(newUser,password);
        console.log(registeredUser);
        req.logIn(registeredUser,(err)=>{
            if(err){
                return next(err);
            }
            req.flash("success","Welcome to App");
            res.redirect("/products");
        });
       }catch(e){
        req.flash("error",e.message);
        res.redirect("/signup");
       }
})

app.get("/login",(req,res)=>{
    res.render("login.ejs");
})

app.post("/login",passport.authenticate('local',{
            failureRedirect: "/login",
            failureFlash : true
}),(req,res)=>{
    req.flash("success","Welcome back to App!");
    res.redirect("products");
})

app.get("/logout",(req,res)=>{
    req.logOut((err)=>{
        if (err) {
            return next(err);
        }
        req.flash("success","You are logged out!");
        res.redirect("/products");
    })
});
app.all("*",(req,res,next,err)=>{
    req.flash("error",e.message);
    next();
})
// Server
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});
