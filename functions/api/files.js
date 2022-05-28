const { putObject, getDirSize, deleteObjects } = require('./s3');
const sharp = require('sharp');
const { MongoClient } = require('mongodb');
const { config } = require('./config');

module.exports = function()
{

router.post('/upload', cors(), async (req, res) => {
    console.log("upload");
    if ( !req.query.name || req.query.name === undefined  ) 
        return res.json({error:"Visalla ei nimeä."});
    if ( !req.query.question || req.query.question === undefined  ) 
        return res.json({error:"Kysymys numeroa ei määritetty"});
  
    var quizName=req.query.name.toLowerCase();
    var questionNumber=req.query.question;

    try {
    var error = await checkQuestions(req,quizName,questionNumber);
      if (error!="") return res.json({error});
    } catch (err) { return res.json({error:err}) } 
    
    if (!req.files || Object.keys(req.files).length === 0) 
        return res.json({error:"ei mitään upattavaa"});
    if(!req.files.image ||req.files.image == undefined) 
        return res.json({error:"Virhe: Kuvaa ei ole määritetty."});
      var file = req.files.image;
      var newData;
      console.log("UPLOADI "+file.name);
      var newFileName=file.name;

      try {
        await sharp(file.data).resize(200, 200, {  fit: sharp.fit.inside, withoutEnlargement: true }).toBuffer().then ( data => { newData=data;} ) ;
        console.log("Length : "+ newData.length);
        var cc= await getDirSize(quizName);
        cc +=newData.length;
        if ( cc >= 1000000 ) return res.json({error:"Visan kuvien tallenustila täysi"});
        await putObject(quizName+"/"+newFileName, newData, newData.length);
        var sError = await updateImageToQuiz(req,quizName,questionNumber,newFileName); 
        if ( sError == "" )
          return res.json({error:"Kuva lisätty.", done:newFileName});
        else 
          return res.json({error:sError});
      }
      catch (err) { 
        console.log(err); 
        return res.json({error:"Virhe:"+err});
      }
});

}

async function updateImageToQuiz(req,quizName,qNumber,fileName) {
  try {
      const client = new MongoClient(config.mongoUri);
      await client.connect();
      const database = client.db("qb");
      const questionCollection = database.collection("questions");
      const query = { name: quizName };
      const options = { projection: { _id: 0, name: 1, email: 1, title:1, public:1, questions: 1 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            return "Visa pitää tallentaa ensiksi";
          else 
          {
            if ( quiz.email != req.user.email ) 
              return req.user.email+" ei ole visan "+quizName+" omistaja";
            
            await deleteObjects([quizName+"/"+quiz.questions[qNumber].image]);
            quiz.questions[qNumber].image = fileName;
            await questionCollection.findOneAndReplace(query,quiz,options);
            
          }
      return "";
  } finally {
      await client.close();
  }
}


async function checkQuestions(req,quizName,qNumber) {
  try {
      const client = new MongoClient(config.mongoUri);
      await client.connect();
      const database = client.db("qb");
      const questionCollection = database.collection("questions");
      const query = { name: quizName.toLowerCase() };
      const options = { projection: { _id: 0, name: 1, email: 1, questions: 1 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            return "Visa pitää tallentaa ensiksi";
          else 
          {
            if ( quiz.email != req.user.email ) 
              return req.user.email+" ei ole visan "+quizName+" omistaja";
            if ( ! quiz.hasOwnProperty("questions") ) return "Tietotyyppi virhe";
            if ( ! Array.isArray(quiz.questions) ) return "Tietotyyppi virhe";
            if ( qNumber >= quiz.questions.length || qNumber < 0 ) 
              return "Tallenna visa välillä jotta voit lisätä kuvan kysymykseen.";
          }
      return "";
  } finally {
      await client.close();
  }
}