const { putObject, getDirSize, deleteObjects } = require('./s3');
const sharp = require('sharp');
const { MongoClient } = require('mongodb');
const { config } = require('./config');
const path = require('path');
const AwaitLock = require('await-lock');

module.exports = function()
{

router.post('/upload', cors(), async (req, res) => {
    console.log("UPLOAD");
    try {
      client = new MongoClient(config.mongoUri);
      
      if ( !req.query.name || req.query.name === undefined  ) 
          throw "Visalla ei nimeä.";
      if ( !req.query.question || req.query.question === undefined  ) 
          throw "Kysymys numeroa ei määritetty";

      var quizName=req.query.name.toLowerCase();
      var questionNumber=req.query.question;

      if (!req.files || Object.keys(req.files).length === 0) 
        throw "ei mitään upattavaa";
      if(!req.files.image ||req.files.image == undefined) 
        throw "Kuvaa ei ole määritetty";

      await client.connect();
      await checkQuestions(client,req,quizName,questionNumber);  
      var file = req.files.image;
      var newData;
      var genName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
      var ext=path.parse(file.name).ext
      var newFileName=genName+ext;
      await sharp(file.data).resize(360, 360, {  fit: sharp.fit.inside, withoutEnlargement: true }).toBuffer().then ( data => { newData=data;} ) ;
      const metadata = await sharp(newData).metadata();
      var cc= await getDirSize(quizName);
      
      //console.log("Hakemiston koko : "+cc.size+" Kuvia yhteensä : "+cc.count);
      cc.size+=newData.length;
      if ( cc.size >= 2000000 ) throw "Visan kuvien tallenustila täysi";
      if ( cc.count >= 30 )  throw "Maksimimäärä (30) kuvia ylitetty";
    
      await putObject(quizName+"/"+newFileName, newData, newData.length);
      await updateImageToQuiz(client,req,quizName,questionNumber,newFileName,metadata); 

      res.json({error:"Kuva "+file.name+" lisätty.", done:newFileName, width:metadata.width, height:metadata.height});
      }
      catch (error) { 
        console.log(error); 
        res.json({error});
      } finally { 
        await client.close();  
      }
});

}

async function updateImageToQuiz(client,req,quizName,qNumber,fileName,metadata) {
    try {
      const database = client.db("qb");
      const questionCollection = database.collection("questions");
      const query = { name: quizName };
      const options = { projection: { _id: 0, name: 1, email: 1, title:1, public:1, questions: 1 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            throw "Visa pitää tallentaa ensiksi";
          else 
          {
            if ( quiz.email != req.user.email ) 
              throw req.user.email+" ei ole visan "+quizName+" omistaja";

            await deleteObjects([quizName+"/"+quiz.questions[qNumber].image]);
            quiz.questions[qNumber].image = fileName;
            quiz.questions[qNumber].width= metadata.width;
            quiz.questions[qNumber].height= metadata.height;
            await questionCollection.findOneAndReplace(query,quiz,options);
          }
      } catch (err) { throw(err); }      
}

async function checkQuestions(client,req,quizName,qNumber) {
  try {
      const database = client.db("qb");
      const questionCollection = database.collection("questions");
      const query = { name: quizName };
      const options = { projection: { _id: 0, name: 1, email: 1, questions: 1 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            throw "Visa pitää tallentaa ensiksi";
          else 
          {
            if ( quiz.email != req.user.email ) throw req.user.email+" ei ole visan "+quizName+" omistaja";
            if ( !quiz.hasOwnProperty("questions") ) throw "Tietotyyppi virhe";
            if ( !Array.isArray(quiz.questions) ) throw "Tietotyyppi virhe";
            if ( qNumber >= quiz.questions.length || qNumber < 0 ) throw "Kysymystä ei ole vielä lisätty.";
          }
    } catch (err) { throw(err); }
}