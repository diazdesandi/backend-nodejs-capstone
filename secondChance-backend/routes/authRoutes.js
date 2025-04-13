const express = require('express');
const { body, validationResult } = require('express-validator');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectToDatabase = require('../models/db');
const router = express.Router();
const dotenv = require('dotenv');
const pino = require('pino');  // Import Pino logger
dotenv.config();

const logger = pino();  // Create a Pino logger instance

//Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
        //Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();
        const collection = db.collection("users");
        const existingEmail = await collection.findOne({ email: req.body.email });

        if (existingEmail) {
            logger.error('Email id already exists');
            return res.status(400).json({ error: 'Email id already exists' });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);
        const email = req.body.email;
        const newUser = await collection.insertOne({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            createdAt: new Date(),
        });

        const payload = {
            user: {
                id: newUser.insertedId,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);
        logger.info('User registered successfully');
        res.json({ authtoken, email });
    } catch (e) {
        logger.error(e);
        return res.status(500).send('Internal server error');
    }
});

router.post('/login', async (req, res) => {

    const { email, password } = req.body;

    try {
        // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();
        // Task 2: Access MongoDB `users` collection
        const collection = db.collection("users");
        // Task 3: Check for user credentials in database
        const user = await collection.findOne({ email });

        // Task 7: Send appropriate message if the user is not found        
        if (!user) {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        // Task 4: Check if the password matches the encrypted password and send appropriate message on mismatch
        const passwordMatch = await bcryptjs.compare(password, user.password);

        if (!passwordMatch) {
            logger.error('Password does not match')
            return res.status(401).json({ error: "Wrong password" })
        }

        // Task 5: Fetch user details from a database
        const { firstName } = user;
        const userEmail = user.email;
        // Task 6: Create JWT authentication if passwords match with user._id as payload
        const payload = {
            user: {
                id: user._id.toString(),
            },
        }
        const authToken = jwt.sign(user._id, JWT_SECRET)
        res.status(200).json({ authToken, firstName, userEmail });

    } catch (e) {
        return res.status(500).send('Internal server error');
    }
});

router.put('/update', async (req, res) => {
    // Task 2: Validate the input using `validationResult` and return an appropriate message if you detect an error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error('Validation errors in update request', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        // Task 3: Check if `email` is present in the header and throw an appropriate error message if it is not present
        const { email } = req.headers;

        if (!email) {
            logger.error("Email not found in request headers")
            return res.status(400).json({ error: "Email not found in request headers" })
        }
        // Task 4: Connect to MongoDB
        const db = await connectToDatabase();
        const collection = db.collection("users");
        // Task 5: Find the user credentials in database
        const existingUser = await collection.findOne({ email });

        if (!existingUser) {
            logger.error("User does not exist")
            return res.status(400).json({ error: "User does not exist" })
        }
        existingUser.updatedAt = new Date();


        // Task 6: Update the user credentials in the database
        const updatedUser = await collection.findOneAndUpdate(
            { email },
            { $set: existingUser },
            { returnDocument: 'after' }
        );

        // Task 7: Create JWT authentication with `user._id` as a payload using the secret key from the .env file
        const payload = {
            user: {
                id: updatedUser._id.toString(),
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);

        res.json({ authtoken });
    } catch (e) {
        return res.status(500).send('Internal server error');

    }
});

module.exports = router;