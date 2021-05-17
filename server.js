
const express = require("express");
const app = express();
const mongodb = require("mongodb");
const cors = require("cors");
const shortId = require("shortid");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs")
const url = require('url');
require("dotenv").config();


app.use(cors());
app.use(express.json())

const URL = "mongodb+srv://mohit:user1234@cluster0.qzjia.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const DB = "urlShortner"


function authenticate(req, res, next) {
    if (req.headers.authorization) {
        try {
            let jwtValid = jwt.verify(req.headers.authorization, process.env.SECRET);
            console.log('jwtValid-----', jwtValid)
            if (jwtValid) {
                req.userId = jwtValid._id;
                next();
            }

        } catch (error) {
            res.status(401).json({
                message: "Invalid Token"
            })
        }
    }
    else {
        res.status(401).json({
            message: "No Token Present"
        })
    }
}

app.get('/checkToken', authenticate, async (req, res) => {
    console.log("request.userId----2nd", req.userId)
    try {
        let connection = await mongodb.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
        let db = connection.db(DB);
        let dataUrl = await db.collection("users").findOne({ _id: mongodb.ObjectID(req.userId) });
        await connection.close();
        res.json(dataUrl);
        console.log("dataUrl----", dataUrl);

    }
    catch (error) {
        console.log(error);
    }
})


app.post('/registerUsers', async (req, res) => {
    try {
        let connection = await mongodb.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
        let db = connection.db(DB);

        let isEmailUnique = await db.collection("users").findOne({ email: req.body.email });
        console.log("isEmailUnique-----", isEmailUnique)
        if (isEmailUnique) {
            res.status(401).json({
                message: "Email Already Exist"
            })
        }
        else {

            let salt = await bcrypt.genSalt(10);

            let hash = await bcrypt.hash(req.body.password, salt);

            req.body.password = hash;

            await db.collection("users").insertOne(req.body);

            await connection.close();

            res.json({
                message: "User Registered"
            })
        }

    } catch (error) {
        console.log("ERROR --",error);
    }
})


app.post('/loginUser', async (req, res) => {
    try {

        let connection = await mongodb.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
        let db = connection.db(DB);

        let user = await db.collection("users").findOne({ email: req.body.email });
        await connection.close();

        if (user) {
            let isPassword = await bcrypt.compare(req.body.password, user.password)
            if (isPassword) {
                let token = jwt.sign({ _id: user._id }, process.env.SECRET, { expiresIn: "1h" });
                res.json({
                    message: "Successfull Login",
                    token
                })
            }
            else {
                res.status(404).json({
                    message: "Incorrect Email or Password"
                });
            }
        }
        else {
            res.status(404).json({
                message: "Incorrect Email or Password"
            })
        }
    } catch (error) {
        console.log("ERROR ----",error);
    }
})


app.post('/urls', async (req, res, next) => {
    try {
        let dataRecieved = req.body;
 //       console.log("dataRecieved---", dataRecieved);     {urlToAdd , _id}
        let connection = await mongodb.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
        let db = connection.db(DB);
        await db.collection("users").updateOne({ _id: mongodb.ObjectID(dataRecieved._id) }, { $push: { links: { $each: [{ "longUrl": dataRecieved.urlToAdd, "shortUrl": shortId.generate() }] } } });
        let userData = await db.collection("users").findOne({_id : mongodb.ObjectID(dataRecieved._id)});
        connection.close();
        res.json(userData);

    } catch (error) {
        console.log(error)
    }
})



app.get("/:id/:shortUrl", async (req, res) => {
    try {
        let shortUrl = req.params.shortUrl;
        let id = req.params.id;
//        console.log("req.params=====",req.params);     { id: '6080705d9fb4f95ec49583d1', shortUrl: 'wIwMIJdFR' }
        let connection = await mongodb.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
        let db = connection.db(DB);
        let recievedUrl = await db.collection("users").findOne({ _id : mongodb.ObjectID(id)});
//      console.log(recievedUrl);  recievedurl   is   User Data
        await connection.close();
            let links = recievedUrl.links.find((item ) => item.shortUrl == shortUrl);
 //           console.log("longUrl-----",links.longUrl); https://docs.google.com/document/d/1nD7fzgzw5UmFSpnHK2FWVadnp4y7EaND26_AqkZzSTw/edit
         res.redirect(links.longUrl)
            


    } catch (error) {
        console.log(error);
    }
})

let PORT = (process.env.PORT || 5000);
app.listen(PORT, () => {
    console.log("listning on port" , PORT);
});