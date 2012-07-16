var config = require('../config').config;
var DB = require("../models"),
    Topic=DB.Table('Topic'),
    Links=DB.Table('Links'),
    Categories=DB.Table('Categories');
    
var ObjID=DB.ObjID;
var async = require('async');
exports.index = function(req, res, next) {
    
   var cur_page=Number(req.query.page) || 1;
   var staticObj={'current_page': cur_page};
   
   var dynamicObj={"_get":true};//动态对象的要加_get属性区分
   dynamicObj['topic']=function(callback){
        Topic.find({},{sort:[['creat_at','desc']],skip:(cur_page-1)*config.list_topic_count,limit:config.list_topic_count}).toArray(function(err,topic){
             callback(err, topic);    
        });
   };
    dynamicObj['pages']=function(callback){
        Topic.count({},function(err,count){
             callback(err, Math.ceil(count/config.list_topic_count));    
        });
   };
   
   global.Sidebar('index',staticObj,dynamicObj);
};
exports.about = function(req, res, next) {
    global.Sidebar('static/about');
};
exports.notfind = function(req, res, next) {
    global.Sidebar('static/404',true);
};
exports.topic = function(req, res, next) {
   var dynamicObj={"_get":true};
   dynamicObj['topic']=function(callback){       
       Topic.findOne({_id:ObjID(req.params.tid)},function(err,topic){
             callback(err, topic);    
       });
   };  
   global.Sidebar('topic/topic',dynamicObj);
};
//
exports.sidebar=function(req, res, next) {
    
    global.Sidebar=function(page,staticObj,dynamicObj,noSidebar){
    
        var funObj={},
            toString=Object.prototype.toString,
            len= arguments.length;
        
        if(len===2){
            if(toString.call(staticObj) == '[object Boolean]'){
                noSidebar=staticObj;
                staticObj=dynamicObj=null;
            }          
            if(toString.call(staticObj) == '[object Object]'){
                if(staticObj['_get']){
                    dynamicObj=staticObj;
                    staticObj=noSidebar=null;                    
                }
            }
        }       
        if(toString.call(dynamicObj) == '[object Object]'){
            delete dynamicObj['_get']
            for(var key in dynamicObj){
                funObj[key]=dynamicObj[key];
            }
        }
          
        if(!noSidebar){
            
            funObj['categories']=function(callback){
            
              Categories.find().toArray(function(err,categories){
                    callback(err, categories);    
               });
            };           
            
            funObj['recenttopic']=function(callback){
            
              Topic.find({},{sort:[['creat_at','desc']],limit:config.recent_topic_count}).toArray(function(err,recenttopic){
                    callback(err, recenttopic);    
               });
            };
            funObj['links']=function(callback){
                    
               Links.find().toArray(function(err,links){
                    callback(err, links); 
               }); 
             };      
        }
        
        async.parallel(funObj,function(err, results){
             if(err)return next(err);
             
             if(toString.call(staticObj) == '[object Object]'){ 
                 for(var i in staticObj){
                     if (!(i in results)) {
                		results[i] = staticObj[i];
        			}
                 }             
             }
             res.render(page, results);
         });      
    }
    
    return next();
};
