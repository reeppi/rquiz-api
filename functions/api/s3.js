const AWS = require("aws-sdk");
const {config} = require ('./config');
const fs = require('fs');
const mime = require('mime');
const s3 = new AWS.S3( { accessKeyId:config.s3accessKeyId,
                        secretAccessKey:config.s3secretAccessKey,
                        region: config.s3region });

const bucketName ="tietovisa";

exports.deleteObjects = function(files) {
  return new Promise(function(resolve, reject) {
    var Objects= [];
    files.forEach(function(Key) { Objects.push({Key}) } );
    s3.deleteObjects( {Bucket:bucketName, Delete: { Objects } }, 
    function(err,data) {
      if (err ) { reject(err); }
      else { resolve(data);}
    }
    );
  });
};

exports.listObjects = function(dir) {
  return new Promise(function(resolve, reject) {
  s3.listObjectsV2({Bucket:bucketName, Prefix:dir,MaxKeys:100}, 
  function(err,data) {
      if (err ) { reject(err); }
      else { resolve(data);}
    }
    );
  });
};

exports.getDirSize = function(dir) {
  return new Promise(function(resolve, reject) {
  exports.listObjects(dir).then(function(data) { 
    var size =0;
    var count = 0;
    data.Contents.forEach(function(d) { count+=1; size+=d.Size } ); 
    resolve({size,count});
    } )
  })
};

exports.putObject = function(filename, buffer, contentLength) {
    return new Promise(function(resolve, reject) {
      var params = {Bucket: bucketName, Key: filename, Body: buffer, ContentLength: contentLength, ContentType: mime.getType(filename), ACL:'public-read'};
        s3.putObject(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  };

  exports.uploadObject = function(filename, filePath) {
    return new Promise(function(resolve, reject) {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    }).then(function(data) {
      return exports.putObject(filename, data, data.length);
    });
  };

 