/**
 * Module dependencies.
 */
var sign = require('./controllers/sign');
var site = require('./controllers/site');
var admin=require('./controllers/admin');
exports = module.exports = function(app) {
  // home page
   app.get('/', site.index);
   app.get('/about', site.about);
   
   // sign up, login, logout
   app.get('/signup', sign.signup);
   app.post('/signup', sign.signup);
   app.get('/signin', sign.showLogin);
   app.post('/signin', sign.login);
   app.get('/signout', sign.signout);
   
   app.get('/topic/:tid', site.topic);
   
   app.get('/admin',admin.index);
   app.get('/admin/new_topic',admin.index);
   app.post('/admin/new_topic',admin.index);
   app.get(/\/admin\/edit_topic(\/\w+)?/,admin.index);
   app.post('/admin/edit_topic',admin.index);
   app.get('/admin/operate_topic',admin.index);
   app.post('/admin/operate_topic',admin.index);
   app.get('/admin/categories',admin.index);
   app.post('/admin/categories',admin.index);
   app.get('/admin/add_user',admin.index);
   app.get('/admin/manage_users',admin.index);
   app.post('/admin/manage_users',admin.index);
   app.get('/admin/profile',admin.index);
   app.get('/admin/add_links',admin.index);
   app.post('/admin/add_links',admin.index);
  
  
   app.get('*',site.notfind);
};
