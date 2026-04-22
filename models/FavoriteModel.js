import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    commerceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Commerce',
        required: true
    }
}, {
    timestamps: true,
    collection: 'Favorites'
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;