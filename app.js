const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const Post = require("./models/postModel");
const User = require("./models/userModel");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'images')));

mongoose.connect("mongodb://localhost:27017/simple-blog", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createPath = (page) => path.join(__dirname, "views", `${page}.ejs`);

// Session setup
app.use(session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: false
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      console.log(password, user.password);
      IsValid = await bcrypt.compare(password, user.password);

      if (!IsValid) {
        return done(null, false, { message: "Incorrect password." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Passport serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Passport deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};


const addUserToLocals = (req, res, next) => {
  res.locals.user = req.user || null; // Assuming you are using Passport.js for authentication
  next();
};

// Use the middleware for all routes
app.use(addUserToLocals);

// CREATE
app.get("/add-post", isAuthenticated, (req, res) => {
  res.render(createPath("add-post"));
});

app.post("/add-post", isAuthenticated, async (req, res) => {
  const { title, content } = req.body;
  
  try {
    // Assuming you have a user object attached to the request (e.g., from Passport.js)
    const author = req.user.username; // Use the authenticated user's ID as the author

    const post = new Post({ title, content, author });
    await post.save();

    res.redirect("/posts");
  } catch (error) {
    console.log("Saving Error!", error);
    res.redirect("/add-post");
  }
});

// ...


// READ
app.get("/", (req, res) => {
  Post.find()
    .then((posts) => res.render(createPath("index"), { posts }))
    .catch((error) => console.log("Finding error! ", error));
});

app.get("/posts", (req, res) => {
  Post.find()
    .then((posts) => res.render(createPath("posts"), { posts }))
    .catch((error) => console.log("Finding error! ", error));
});

app.get("/post/:id", async (req, res) => {
  const postId = req.params.id;
  Post.findById(postId) 
    .then((post) => res.render(createPath("post-detail"), { post }))
    .catch((error) => console.log("Finding error! ", error));
});

// UPDATE
app.get("/edit-post/:id", isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await Post.findById(postId);
    res.render(createPath("edit-post"), { post });
  } catch (err) {
    console.log("Error finding post for editing:", err);
    res.redirect("/posts");
  }
});

// Update Post
app.post("/edit-post/:id", isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const { title, author, content } = req.body;

  try {
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { title, author, content },
      { new: true }
    );
    res.redirect("/posts");
  } catch (err) {
    console.log("Error updating post:", err);
    res.redirect("/posts");
  }
});

// DELETE
app.get("/delete-post/:id", isAuthenticated, async (req, res) => {
  const postId = req.params.id;

  try {
    await Post.deleteOne({ _id: postId });
    res.redirect("/posts");
  } catch (err) {
    console.log("Error deleting post:", err);
    res.redirect("/posts");
  }
});

// Authentication routes

// Register
app.get("/register", (req, res) => {
  res.render(createPath("register"));
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const newUser = new User({ username, password: password });
    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    console.log("Registration error:", err);
    res.redirect("/register");
  }
});

// Login
app.get("/login", (req, res) => {
  res.render(createPath("login"));
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
}));

// Logout
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server has been started on PORT ${PORT}...`);
});
