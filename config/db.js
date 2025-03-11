const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');

const connectDB = () => {
    mongoose.connect(db, {
        useUnifiedTopology: true,
        useNewUrlParser: true,

    })
        .then(() => {
            console.log(`MongoDB Connected... ${db}`);
        })
        .catch(err => {
            console.log(err.message);
            process.exit(1);
        });
};


module.exports = connectDB;