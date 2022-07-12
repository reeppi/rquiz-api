const { putObject, getDirSize, deleteObjects } = require('./s3');
const sharp = require('sharp');
const path = require('path');
const getDb = require('./db');
const mime = require('mime-types');


module.exports = function()
{
router.post('/upload', cors(), (req, res) => {
    console.log("Upload");
    upload(res,req);
});
router.post('/uploadaudio', cors(), (req, res) => {
  console.log("Uploadaudio");
  uploadAudio(res,req);
});
}

async function uploadAudio(res,req) {
  try {
    
    if ( !req.query.name ) 
        throw Error("Visalla ei nimeä.");
    if ( !req.query.question  ) 
        throw Error("Kysymys numeroa ei määritetty");
 
    var quizName=req.query.name.toLowerCase();
    var questionNumber=req.query.question;
       
    if (!req.files || Object.keys(req.files).length === 0) 
      throw Error("ei mitään upattavaa");
    if(!req.files.audio ||req.files.audio == undefined) 
      throw Error("Äänitettä ei ole määritelty");

    var file = req.files.audio;
    var ext =  mime.extension(file.mimetype);
    var genName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    var newFileName = genName+"."+ext;

    const db = await getDb();
    await checkQuestions(db,req,quizName,questionNumber);  
    /*
    var user=await getUser(db,req.user.email);
    if ( !user  )
        throw Error("Ei oikeuksia lisätä äänitteitä");
    if ( !user.audio )
        throw Error("Ei oikeuksia lisätä äänitteitä");*/
        
    var cc= await getDirSize(quizName+"/audio/");
    cc.size+=file.size;
    if ( cc.size >= 5000000 ) throw Error("Visan äänitteiden tallennustila täynnä");
    if ( cc.count >= 10 )  throw Error("Maksimimäärä (10) äänitteitä ylitetty");
    
    await putObject(quizName+"/audio/"+newFileName, file.data, file.data.length);
    await updateAudioToQuiz(db,req,quizName,questionNumber,newFileName);

    console.log(req.files.audio);
    res.json({error:"Äänite lisätty", done:newFileName});
  }
  catch (error) { 
    console.log(error); 
    res.json({error:error.message});
  }  

}

async function upload(res,req) {
  try {
    if ( !req.query.name  ) 
        throw Error("Visalla ei nimeä.");
    if ( !req.query.question  ) 
        throw Error("Kysymys numeroa ei määritetty");

    console.log("Uploading");
    var quizName=req.query.name.toLowerCase();
    var questionNumber=req.query.question;

    if (!req.files || Object.keys(req.files).length === 0) 
      throw Error("ei mitään upattavaa");
    if(!req.files.image ||req.files.image == undefined) 
      throw Error("Kuvaa ei ole määritetty");

    const db = await getDb();
    await checkQuestions(db,req,quizName,questionNumber);  
    var file = req.files.image;
    var genName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
   // var ext=path.parse(file.name).ext
    var ext=mime.extension(file.mimetype); 
    var newFileName=genName+"."+ext;
    var newData = await sharp(file.data).resize(360, 360, {  fit: sharp.fit.inside, withoutEnlargement: true }).toBuffer();
    const metadata = await sharp(newData).metadata();
    var cc= await getDirSize(quizName);
    cc.size+=newData.length;
    if ( cc.size >= 2000000 ) throw Error("Visan kuvien tallenustila täysi");
    if ( cc.count >= 30 )  throw Error("Maksimimäärä (30) kuvia ylitetty");
    
    await putObject(quizName+"/images/"+newFileName, newData, newData.length);
    await updateImageToQuiz(db,req,quizName,questionNumber,newFileName,metadata); 

    res.json({error:"Kuva "+newFileName+" lisätty.", done:newFileName, width:metadata.width, height:metadata.height});
    }
    catch (error) { 
      console.log(error); 
      res.json({error:error.message});
    } 
}


async function updateAudioToQuiz(db,req,quizName,qNumber,fileName) {
  try {
    const questionCollection = db.collection("questions");
    const query = { name: quizName };
    const options = { projection: { _id: 0 }, };
    const quiz = await questionCollection.findOne(query,options);
        if ( quiz == null ) 
          throw Error("Visa pitää tallentaa ensiksi");
        else 
        {
          if ( quiz.email != req.user.email ) 
            throw Error(req.user.email+" ei ole visan "+quizName+" omistaja");

          if ( quiz.questions[qNumber].audio ) 
            await deleteObjects([quizName+"/audio/"+quiz.questions[qNumber].audio]);
          quiz.questions[qNumber].audio = fileName;
          await questionCollection.findOneAndReplace(query,quiz,options);
        }
    } catch (err) { throw(err); }      
}


async function updateImageToQuiz(db,req,quizName,qNumber,fileName,metadata) {
    try {
      const questionCollection = db.collection("questions");
      const query = { name: quizName };
      const options = { projection: { _id: 0 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            throw Error("Visa pitää tallentaa ensiksi");
          else 
          {
            if ( quiz.email != req.user.email ) 
              throw Error(req.user.email+" ei ole visan "+quizName+" omistaja");
            
            if (quiz.questions[qNumber].image)
              await deleteObjects([quizName+"/images/"+quiz.questions[qNumber].image]);
            quiz.questions[qNumber].image = fileName;
            quiz.questions[qNumber].width= metadata.width;
            quiz.questions[qNumber].height= metadata.height;
            await questionCollection.findOneAndReplace(query,quiz,options);
          }
      } catch (err) { throw(err); }      
}

async function checkQuestions(db,req,quizName,qNumber) {
  try {
      const questionCollection = db.collection("questions");
      const query = { name: quizName };
      const options = { projection: { _id: 0, name: 1, email: 1, questions: 1 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            throw Error("Visa pitää tallentaa ensiksi");
          else 
          {
            if ( quiz.email != req.user.email ) throw Error(req.user.email+" ei ole visan "+quizName+" omistaja");
            if ( !quiz.hasOwnProperty("questions") ) throw Error("Tietotyyppi virhe");
            if ( !Array.isArray(quiz.questions) ) throw Error("Tietotyyppi virhe");
            if ( !quiz.questions.hasOwnProperty(qNumber) ) throw Error("Kysymystä ei ole vielä lisätty.");
          }
    } catch (err) { throw(err);  }
}


async function getUser(db,email)
{
    try {
    const userCollection = db.collection("users");
    const query = { email };
    const options = { projection: { _id: 0 }, };
    const user = await userCollection.findOne(query,options);
    return user;
    } catch (error) { throw(error); }
}

