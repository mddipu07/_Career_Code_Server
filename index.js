const express =require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 3000;


const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin-service-key.json");


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleWare
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h3fyjhx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyFireBaseToken = async (req , res , next) =>{
      console.log('token in the middleware' , req.headers)
      const authHeader = req.headers?.authorization;
  
      if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).send({messeage: 'unuthorized access'})
      }
      const token = authHeader.split(' ')[1];

      try{
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
        console.log('decoded token',decoded);
      }
      catch(error){
        return res.status(401).send({message: 'unauthorized access'})
      }
      
}


const verifyTokenEmail = (req,res, next) =>{
    if(req.query.email !== req.decoded.email){
       return  res.status(403).send({message: 'forbidden access'})
    }
    next();
}

async function run() {
  try {
 
    // await client.connect();


    const jobsCollection = client.db('career-code').collection('jobs');
    const applicationsCollection = client.db('careerCode').collection('applications')



    // jwt tken related api


   
   
    app.get('/jobs' , async(req, res) =>{
        const email = req.query.email;
        const query = {};
        if(email){
          query.hr_email = email;
        }

        const cursor = jobsCollection.find(query);
        const result = await cursor.toArray()
        res.send(result);
    });

    // app.get('/jobsByEmailAddress' , async(req,res) =>{
    //    const email = req.query.email;
    //    const query = {hr_email: email}
    //    const result = await jobsCollection.find(query).toArray()
    //    res.send(result)
    // })
        app.get('/jobs/applications' ,verifyFireBaseToken,verifyTokenEmail, async(req, res) =>{
       const email = req.query.email;

       const query = {hr_email: email};
       const jobs = await jobsCollection.find(query).toArray();

       for(const job of jobs){
         const applicationQuery = {jobId: job._id.toString()}
         const application_count = await applicationsCollection.countDocuments(applicationQuery)
         job.application_count = application_count;
       }
       res.send(jobs);

    })



    app.get('/jobs/:id', async(req,res) =>{
       const id = req.params.id;
       const query = {_id: new ObjectId(id)}
       const result = await jobsCollection.findOne(query)
       res.send(result)
       
    });

    app.post('/jobs',async(req,res) =>{
          const newJob = req.body;
          console.log(newJob);
          const result = await jobsCollection.insertOne(newJob);
          res.send(result);


    })




    // job application related apis


    app.get('/applications',verifyFireBaseToken,verifyTokenEmail,async(req,res) =>{
       const email = req.query.email;
       if(email !== req.decoded.email){
        return res.status(403).message({message: 'forbiden access'})
       }
       console.log('req header', req.headers);
  
       const query = {
        applicant: email 
       }
       const result = await applicationsCollection.find(query).toArray();
 
        for(const application of result){
           const jobId = application.jobId;
           const jobQuery = {_id: new ObjectId(jobId)}
           const job = await jobsCollection.findOne(jobQuery);
           application.company = job.company
           application.title = job.title
           application.company_logo = job.company_logo


        }


       res.send(result)
    })

     app.get('/applications/job/:job_id', async(req, res) =>{
       const job_id = req.params.job_id;
        const query = {jobId: job_id}
        const result = await applicationsCollection.find(query).toArray();
        res.send(result);
     })


      app.post('/applications', async(req,res) =>{
         const application = req.body;
         console.log(application);
         const result = await applicationsCollection.insertOne(application);
         res.send(result)
      });

      app.patch('/applications/:id' , async (req,res) =>{
        const id = req.params.id;
         const updated = req.body;
         const filter = {_id: new ObjectId(id)}
         const updatedDoc = {
          $set:{
            status: req.body.status
          }
         }
         const result = await applicationsCollection.updateOne(filter , updatedDoc)
         res.send(result);

      })


    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
 
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req, res) =>{
      res.send('career code cooking')
})


app.listen(port,() =>{
     console.log(`Career Code server Is Running On port ${port}`);
})