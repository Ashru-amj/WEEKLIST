const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        trim: true, 
    },
    email: {
        type: String,
        required: true, 
        unique: true, 
        
    },
    password: {
        type: String,
        required: true,
        minlength: 8, 
    },
    age: {
        type: Number,
        min: 0, 
        max: 150, 
    },
    gender: {
        type: String,
        required: true, 
    },
    mobile: {
        type: Number,
        required: true,
    },
    token:{
        type:String,
        default:null,
    }
});

module.exports = mongoose.model('User', userSchema);