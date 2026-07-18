const mongoose = require('mongoose');

async function checkRides() {
  await mongoose.connect('mongodb://iamjoker:iamjoker@ac-6aqxcla-shard-00-00.1dpyobu.mongodb.net:27017,ac-6aqxcla-shard-00-01.1dpyobu.mongodb.net:27017,ac-6aqxcla-shard-00-02.1dpyobu.mongodb.net:27017/?ssl=true&replicaSet=atlas-hwkksz-shard-0&authSource=admin&appName=Cluster0');
  
  const rideSchema = new mongoose.Schema({}, { strict: false });
  const Ride = mongoose.model('Ride', rideSchema, 'rides'); 

  const allRides = await Ride.find({}).sort({ createdAt: -1 }).limit(10);
  console.log(`There are ${allRides.length} recent rides.`);
  
  allRides.forEach(r => console.log(r._id, r.status, r.fare));
  
  process.exit(0);
}

checkRides();
