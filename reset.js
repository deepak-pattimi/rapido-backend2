require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(async () => {
    const Driver = require('./src/models/Driver');
    await Driver.updateOne({phone: '+916301616598'}, { $set: { todayEarnings: 0 } });
    console.log('Reset driver todayEarnings to 0');
    process.exit(0);
  });
