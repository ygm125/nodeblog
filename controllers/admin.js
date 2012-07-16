var DB = require("../models"),
	Topic = DB.Table('Topic'),
    Links = DB.Table('Links'),
    Categories=DB.Table('Categories'),
    User = DB.Table("User");
    
var ObjID=DB.ObjID;
    
var async=require('async');
    
exports.index=function(req, res, next){
	
	if(req.session.user&&req.session.user.is_admin){
		
		route_url(req.url,req, res, next);
        
	}else{
		res.redirect('home');
	}
}
function route_url (url,req,res,next) {
    
	var method=req.method.toLowerCase();
    
	if(method=='get'){
	
		if("/admin/"===url){
			res.render('admin/admin');
			return;
		}
		if("/admin/new_topic"===url){
			res.render('admin/new_topic');
			return;
		}
        
         if(/^\/admin\/edit_topic/.test(url)){
    		res.render('admin/edit_topic');
			return;
		}
        
        if("/admin/operate_topic"===url){
        	res.render('admin/operate_topic');
			return;
		}
        
        if("/admin/add_links"===url){
			res.render('admin/add_links');
			return;
		}
        
        if("/admin/categories"===url){
            res.render('admin/categories');
    		return;
        }
        if("/admin/manage_users"===url){
            res.render('admin/manage_users');
        	return;
        }
        
        res.redirect('/404');
        
	}else if (method=='post') {
       
		if("/admin/new_topic"===url){
			var topic={};
			topic.title=req.body.title;
			topic.content=req.body.content;
            topic.cat1=req.body.cat1;
            topic.cat2=req.body.cat2;
            topic.visit_count=0;
            topic.reply_count=0;
            topic.creat_at=new Date();
            topic.edit_at=new Date();
            topic.author_id=req.session.user['_id'];
            topic.reply=[];
                                
			Topic.save(topic,function(err){
				if(err) return next(err);
                Categories.findOne({_id:ObjID(topic.cat1)},function(err,category){
                    category.count=+category.count+1;
                    var c2=category['cat2'];
                    for(var i=0,j=c2.length;i<j;i++){
                        if(c2[i]['cid']==topic.cat2){
                          c2[i]['count']=+c2[i]['count']+1;
                          break;
                        }
                    }
                    Categories.save(category,function(err){
                       if(err) return next(err);
                       res.end('OK!');
                    });
                })
			});
			return;
		}
        
         if(/^\/admin\/edit_topic/.test(url)){       	
            var opr= req.body.opr;
            if(opr==="get"){
                Topic.findOne({_id:ObjID(req.body.id)},function(err,topic){
                  res.end(JSON.stringify(topic));
                });
                
            }else if(opr==='update'){
                var t={};
                t.title=req.body.title;
                t.content=req.body.content;
                t.edit_at=new Date();
                Topic.update({_id:ObjID(req.body.id)},{$set:t},function(err,topic){                     
                     res.end('OK');
                });
            }
            
			return;
		}
        
         if("/admin/operate_topic"===url){
            var opr= req.body.opr;
            if(opr==="get"){
                Topic.find({},{sort:[['creat_at','desc']]}).toArray(function(err,result){
                 if(err) return next(err);
        			res.end(JSON.stringify(result));
            	});
            }else if(opr==="remove"){
                Topic.remove({_id:ObjID(req.body.id)},function(err){
                    res.end("OK");
                });
            }
			return;
		}
        
        
        if("/admin/add_links"===url){
			var links={};
			links.auth=req.body.auth;
			links.url=req.body.url;
            links.creat_at=new Date();
			Links.save(links,function(err){
				if(err) return next(err);
				res.end('OK!');
			});
			return;
        }
        
        if("/admin/manage_users"===url){
            var opr= req.body.opr;
            
            if(opr==="get"){
                User.find({},{sort:[['create_at','desc']]}).toArray(function(err,result){
                 if(err) return next(err);
            		res.end(JSON.stringify(result));
            	});                
            }else if(opr==="remove"){
                User.remove({_id:ObjID(req.body.id)},function(err){
                    res.end("OK");
                });               
            }else if(opr==="act"){
                var t={};
                t.active=true;
                User.update({_id:ObjID(req.body.id)},{$set:t},function(err){
                    res.end("OK");
                });
            }
            
            return;
        }
        
        
         if("/admin/categories"===url){            
            var opr= req.body.opr;
            if(opr==="add1"){                
                var ct=req.body.content.split(";"),
                    funAy=[];
                for(var i=0;i<ct.length;i++){
                    (function(name,num){                   
                     var categories={};
                     categories.creat_at=new Date();
                     categories.cat1=name;
                     categories.count=0;
                     categories.countid=0;
                     categories.cat2=[];
                     funAy.push(function(callback){                
                         Categories.save(categories,function(err){                  
                           callback(err,num);
                         });  
                     });
                    })(ct[i],i);
                }              
                async.parallel(funAy,function(err, results){
                     if(err)return next(err);
                     res.end("OK!");
                });                       
            }else if(opr==="sel"){
                Categories.find().toArray(function(err,result){
                    if(err)return next(err);
                    res.end(JSON.stringify(result));
                });
            }else if(opr==="add2"){                
                var ct=req.body.content.split(";"),
                    sid=req.body.sid,ay=[];
                    
                Categories.findOne({_id: ObjID(sid) },function(err,categories){
                          
                    for(var i=0;i<ct.length;i++){                     
                        ay.push({"cid":categories['countid']+i+1,"name":ct[i],"count":0});
                    }
                    categories.countid=+categories.countid+ct.length;
                    categories.cat2=categories.cat2.concat(ay);
                    
                    Categories.save(categories,function(err){                     
                        res.end("OK!");
                    });
                });
                                                     
            }
            return;       
        }
  
	}
}
