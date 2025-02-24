const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
    productId: { 
        type: String, 
        unique: true, 
        default: () => new mongoose.Types.ObjectId().toString() 
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    featured: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    company: {
        type: String,
        required: true,
        trim: true
    }
});

module.exports = mongoose.model("Product", productSchema);
