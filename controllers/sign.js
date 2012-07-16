var DB = require('../models'),
    User = DB.Table("User");
    
var check = require('validator').check,
	sanitize = require('validator').sanitize;
var crypto = require('crypto');
var config = require('../config').config;
//sign up
exports.signup = function(req, res, next) {
	var method = req.method.toLowerCase();
	if (method == 'get') {
		global.Sidebar('sign/signup');
		return;
	}
	if (method == 'post') {
		var name = sanitize(req.body.name).trim();
		name = sanitize(name).xss();
		var loginname = name.toLowerCase();
		var pass = sanitize(req.body.pass).trim();
		pass = sanitize(pass).xss();
		var email = sanitize(req.body.email).trim();
		email = email.toLowerCase();
		email = sanitize(email).xss();
		var re_pass = sanitize(req.body.re_pass).trim();
		re_pass = sanitize(re_pass).xss();
		if (name == '' || pass == '' || re_pass == '' || email == '') {
			global.Sidebar('sign/signup', {
				error: '信息不完整。',
				name: name,
				email: email
			});
			return;
		}
		if (name.length < 5) {
			global.Sidebar('sign/signup', {
				error: '用户名至少需要5个字符。',
				name: name,
				email: email
			});
			return;
		}
		try {
			check(name, '用户名只能使用0-9，a-z，A-Z。').isAlphanumeric();
		} catch (e) {
			global.Sidebar('sign/signup', {
				error: e.message,
				name: name,
				email: email
			});
			return;
		}
		if (pass != re_pass) {
			global.Sidebar('sign/signup', {
				error: '两次密码输入不一致。',
				name: name,
				email: email
			});
			return;
		}
		try {
			check(email, '不正确的电子邮箱。').isEmail();
		} catch (e) {
			global.Sidebar('sign/signup', {
				error: e.message,
				name: name,
				email: email
			});
			return;
		}
        
       User.find({
			'$or': [{
				'loginname': loginname
			}, {
				'email': email
			}]
		}).toArray(function(err, result) {
			if (err) return next(err);
			if (result.length > 0) {
				global.Sidebar('sign/signup', {
					error: '用户名或邮箱已被使用。',
					name: name,
					email: email
				});
				return;
			}
			// md5 the pass
			pass = md5(pass);
			// create gavatar
			var avatar_url = 'http://www.gravatar.com/avatar/' + md5(email) + '?size=48';
			var user = {};
			user.name = name;
			user.loginname = loginname;
			user.pass = pass;
			user.email = email;
			user.avatar = avatar_url;
			user.active = false;
            user.create_at=new Date();
            user.active_at=new Date();
            user.reply_count=0;
            user.topic_count=0;
            user.score=0;
            user.level=0;
            user.location='';
            user.retrieve_time='';
            user.retrieve_key='';           
            
            User.save(user,function(err) {
				if (err) return next(err);		
				global.Sidebar('sign/signup', {success:'欢迎加入 ' + config.name + '！请耐心等待管理员来激活您的帐号。'});
				return;
			});
		});
        
	}
	
};
/**
 * Show user login page.
 *
 * @param  {HttpRequest} req
 * @param  {HttpResponse} res
 */
exports.showLogin = function(req, res) {
	req.session._loginReferer = req.headers.referer;
	global.Sidebar('sign/signin');
};
/**
 * define some page when login just jump to the home page
 * @type {Array}
 */
var notJump = ['/active_account', //active page
'/reset_pass', //reset password page, avoid to reset twice
'/signup', //regist page
'/search_pass' //serch pass page
];
/**
 * Handle user login.
 *
 * @param  {HttpRequest} req
 * @param  {HttpResponse} res
 * @param  {Function} next
 */
exports.login = function(req, res, next) {
	var loginname = sanitize(req.body.name).trim().toLowerCase();
	var pass = sanitize(req.body.pass).trim();
	if (!loginname || !pass) {
		return global.Sidebar('sign/signin', {
			error: '信息不完整。'
		});
	}
	User.findOne({
		'loginname': loginname
	},function(err, result) {
		if (err) return next(err);
		if (!result) {
			return global.Sidebar('sign/signin', {
				error: '这个用户不存在。'
			});
		}
		pass = md5(pass);
		if (pass !== result.pass) {
			return global.Sidebar('sign/signin', {
				error: '密码错误。'
			});
		}
		if (!result.active) {
			global.Sidebar('sign/signin', {
				error: '此帐号还没有被激活。'
			});
			return;
		}
		// store session cookie
		gen_session(result, res);
		//check at some page just jump to home page 
		var refer = req.session._loginReferer || 'home';
		for (var i = 0, len = notJump.length; i != len; ++i) {
			if (refer.indexOf(notJump[i]) >= 0) {
				refer = 'home';
				break;
			}
		}
		res.redirect(refer);
	});
};
// sign out
exports.signout = function(req, res, next) {
	req.session.destroy();
	res.clearCookie(config.auth_cookie_name, {
		path: '/'
	});
	res.redirect(req.headers.referer || 'home');
};
// auth_user middleware
exports.auth_user = function(req, res, next) {
	if (req.session.user) {
		if (config.admins[req.session.user.name]) {
			req.session.user.is_admin = true;
		}
		res.local('current_user', req.session.user);
		return next();
	} else {
		var cookie = req.cookies[config.auth_cookie_name];
		if (!cookie) return next();
		var auth_token = decrypt(cookie, config.session_secret);
		var auth = auth_token.split('\t');
		//var user_id = auth[0];查_id不行 不知道why
        var user_loginname=auth[1].toLowerCase();
		User.findOne({'loginname': user_loginname},function(err, result) {
            if(err) return next(err);
            if (result) {
				if (config.admins[result.name]) {
					result.is_admin = true;
				}
				req.session.user = result;
				res.local('current_user', req.session.user);
				return next();
            }else{
                return next();
            }
	    });
	}
};
// private
function gen_session(user, res) {
	var auth_token = encrypt(user._id + '\t' + user.name + '\t' + user.pass + '\t' + user.email, config.session_secret);
	res.cookie(config.auth_cookie_name, auth_token, {
		path: '/',
		maxAge: 1000 * 60 * 60 * 24 * 7
	}); //cookie 有效期1周			
}
function encrypt(str, secret) {
	var cipher = crypto.createCipher('aes192', secret);
	var enc = cipher.update(str, 'utf8', 'hex');
	enc += cipher.final('hex');
	return enc;
}
function decrypt(str, secret) {
	var decipher = crypto.createDecipher('aes192', secret);
	var dec = decipher.update(str, 'hex', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}
function md5(str) {
	var md5sum = crypto.createHash('md5');
	md5sum.update(str);
	str = md5sum.digest('hex');
	return str;
}
function randomString(size) {
	size = size || 6;
	var code_string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var max_num = code_string.length + 1;
	var new_pass = '';
	while (size > 0) {
		new_pass += code_string.charAt(Math.floor(Math.random() * max_num));
		size--;
	}
	return new_pass;
}