const { putObject, getDirSize, deleteObjects } = require('./s3');
const sharp = require('sharp');
const path = require('path');
const getDb = require('./db');


module.exports = function()
{
router.post('/upload', cors(), (req, res) => {
    console.log("Upload");
    upload(res,req);
});
}

async function upload(res,req) {
  try {
    if ( !req.query.name || req.query.name === undefined  ) 
        throw Error("Visalla ei nimeä.");
    if ( !req.query.question || req.query.question === undefined  ) 
        throw Error("Kysymys numeroa ei määritetty");

    var quizName=req.query.name.toLowerCase();
    var questionNumber=req.query.question;

    if (!req.files || Object.keys(req.files).length === 0) 
      throw Error("ei mitään upattavaa");
    if(!req.files.image ||req.files.image == undefined) 
      throw Error("Kuvaa ei ole määritetty");

    const db = await getDb();
    await checkQuestions(db,req,quizName,questionNumber);  
    var file = req.files.image;
    var newData;
    var genName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    var ext=path.parse(file.name).ext
    var newFileName=genName+ext;
    await sharp(file.data).resize(360, 360, {  fit: sharp.fit.inside, withoutEnlargement: true }).toBuffer().then ( data => { newData=data;} ) ;
    const metadata = await sharp(newData).metadata();
    var cc= await getDirSize(quizName);

    cc.size+=newData.length;
    if ( cc.size >= 2000000 ) throw Error("Visan kuvien tallenustila täysi");
    if ( cc.count >= 30 )  throw Error("Maksimimäärä (30) kuvia ylitetty");
  
    await putObject(quizName+"/"+newFileName, newData, newData.length);
    await updateImageToQuiz(db,req,quizName,questionNumber,newFileName,metadata); 

    res.json({error:"Kuva "+file.name+" lisätty.", done:newFileName, width:metadata.width, height:metadata.height});
    }
    catch (error) { 
      console.log(error); 
      res.json({error:error.message});
    } 
}


async function updateImageToQuiz(db,req,quizName,qNumber,fileName,metadata) {
    try {
      const questionCollection = db.collection("questions");
      const query = { name: quizName };
      const options = { projection: { _id: 0, name: 1, email: 1, title:1, public:1, questions: 1 }, };
      const quiz = await questionCollection.findOne(query,options);
          if ( quiz == null ) 
            throw Error("Visa pitää tallentaa ensiksi");
          else 
          {
            if ( quiz.email != req.user.email ) 
              throw Error(req.user.email+" ei ole visan "+quizName+" omistaja");

            await deleteObjects([quizName+"/"+quiz.questions[qNumber].image]);
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
            if ( quiz.questions.hasOwnProperty(qNumber) ) throw Error("Kysymystä ei ole vielä lisätty.");
          }
    } catch (err) { throw(err); }
}