const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
currentlogins = {}


const storage = multer.diskStorage({
    destination : (req,file,cb)=>{
        const userName = currentlogins[req.socket.remoteAddress];
        const repoName = req.url.split('/')[2];
        cb(null,`${__dirname}/userData/${userName}/${repoName}`);
    },
    filename : (req,file,cb)=>{
        cb(null,Date.now()+path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage});


app.set('view engine','ejs');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));

app.get('/',(req,res)=>{
    if(currentlogins[req.socket.remoteAddress] === undefined)
        res.render(`home`,{title : 'Home'});
    else
        res.redirect('/dashboard');
});

app.get('/login',(req,res)=>{
    if(currentlogins[req.socket.remoteAddress] === undefined)
        res.render(`login`,{title : 'Log in', invalid : false});
    else
        res.redirect('/dashboard');
});

app.get('/signup',(req,res)=>{
    if(currentlogins[req.socket.remoteAddress] === undefined)
        res.render(`signup`,{title : 'Sign up', alreadyExists : false, passwordMismatch : false});
    else
        res.redirect('/dashboard');
});

app.get('/dashboard',(req,res)=>{
    if(currentlogins[req.socket.remoteAddress] === undefined)
    {
        res.redirect('/');
    }
    else{
        const userName = currentlogins[req.socket.remoteAddress];
        const repositories = fs.readdirSync(`${__dirname}/userData/${userName}`, { withFileTypes: true })
                            .filter((item) => item.isDirectory())
                            .map((item) => item.name);
        res.render('dashboard',{title : 'Dashboard', userName, repositories });
    }
});

app.get('/logout',(req,res)=>{
    delete currentlogins[req.socket.remoteAddress];
    res.redirect('/');
});

app.get('/getFile/:id',(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const ripoName = req.params.id.split('&')[0];
    const fileName = req.params.id.split('&')[1];
    if(fs.existsSync(`${__dirname}/userData/${userName}/${ripoName}/${fileName}`))
        res.sendFile(`${__dirname}/userData/${userName}/${ripoName}/${fileName}`);
});

app.get('/deleteFile/:id',(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const repoName = req.params.id.split('&')[0];
    const fileName = req.params.id.split('&')[1];
    if(fs.existsSync(`${__dirname}/userData/${userName}/${repoName}/${fileName}`))
        fs.unlink(`${__dirname}/userData/${userName}/${repoName}/${fileName}`,()=>{});
    res.redirect(`/getRepo${repoName}`);
});

app.get('/viewFile:id',(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const repoName = req.params.id.split('&')[0];
    const fileName = req.params.id.split('&')[1];
    if(fs.existsSync(`${__dirname}/userData/${userName}/${repoName}/${fileName}`))
    {
        const ext = fileName.split('.')[fileName.split('.').length-1];
        if(ext=='png'||ext=='jpeg'||ext=='jpg'||ext=='gif')
            res.render('viewImage',{repoName,fileName,userName,title:'Image'});
        else
        {
            fs.readFile(`${__dirname}/userData/${userName}/${repoName}/${fileName}`, (err, data) => {
                if (err) {
                  console.log(err);
                }
                const content = data.toString();
                res.render('viewText',{repoName,fileName,userName,content,title:'Text'});
              });
        }
    }
});


app.get('/downloadFile/:id',(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const repoName = req.params.id.split('&')[0];
    const fileName = req.params.id.split('&')[1];
    if(fs.existsSync(`${__dirname}/userData/${userName}/${repoName}/${fileName}`))
        res.download(`${__dirname}/userData/${userName}/${repoName}/${fileName}`);
});

app.get('/deleteRepo:id',(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const repoName = req.params.id;
    if(fs.existsSync(`${__dirname}/userData/${userName}/${repoName}`))
        fs.rmSync(`${__dirname}/userData/${userName}/${repoName}`,{recursive:true,force:true});
    res.redirect('/dashboard');
});

app.get('/getRepo:id',(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const repoName = req.params.id;
    if(fs.existsSync(`${__dirname}/userData/${userName}/${repoName}`))
    {
        const items = fs.readdirSync(`${__dirname}/userData/${userName}/${repoName}`, { withFileTypes: true })
                                .map((item) => item.name);
        res.render('repository',{title : repoName, userName , repoName , items});
    }
    else
        res.redirect('/dashboard');
});

app.post('/addFile/:id',upload.single('newFile'),(req,res)=>{
    const repoName = req.url.split('/')[2];
    res.redirect(`/getRepo${repoName}`);
});

app.post('/addText/:id',upload.none(),(req,res)=>{
    const userName = currentlogins[req.socket.remoteAddress];
    const repoName = req.url.split('/')[2];
    if(fs.existsSync(`${__dirname}/userData/${userName}/${repoName}`))
        fs.writeFileSync(`${__dirname}/userData/${userName}/${repoName}/${Date.now()}.txt`,req.body.newText,()=>{});
    res.redirect(`/getRepo${repoName}`);
});


app.post('/signup',(req,res)=>{
    const userName = req.body.userName;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if(fs.existsSync(`${__dirname}/userData/${userName}`))
    {
        res.render(`signup`,{title : 'Sign up', alreadyExists : true, passwordMismatch : false, firstName, lastName});
    }
    else if(password!=confirmPassword)
    {
        res.render(`signup`,{title : 'Sign up', alreadyExists : false, passwordMismatch : true, firstName, lastName, userName});
    }
    else
    {
        fs.mkdirSync(`${__dirname}/userData/${userName}`,()=>{});
        fs.writeFile(`${__dirname}/userData/${userName}/name.txt`,`${firstName} ${lastName}`,()=>{});
        fs.writeFile(`${__dirname}/userData/${userName}/password.txt`,`${password}`,()=>{});
        currentlogins[req.socket.remoteAddress] = userName;
        res.redirect('/dashboard');
    }
});

app.post('/login',(req,res)=>{
    const userName = req.body.userName;
    const password = req.body.password;
    if(!fs.existsSync(`${__dirname}/userData/${userName}`))
    {
        res.render('login',{title : 'Log in', invalid : true, userName});
    }
    else
    {
        fs.readFile(`${__dirname}/userData/${userName}/password.txt`,(err,data)=>{
            let actualPassword = data.toString();
            if(password === actualPassword)
            {
                currentlogins[req.socket.remoteAddress] = userName;
                res.redirect('/dashboard');
            }
            else
                res.render('login',{title : 'Log in', invalid : true, userName});
        });
    }
});

app.post('/addRepo',(req,res)=>{
    const newRepo = req.body.newRepo;
    const userName = currentlogins[req.socket.remoteAddress];
    if(fs.existsSync(`${__dirname}/userData/${userName}`) && !fs.existsSync(`${__dirname}/userData/${userName}/${newRepo}`))
        fs.mkdirSync(`${__dirname}/userData/${userName}/${newRepo}`,()=>{});
    res.redirect('/dashboard');
});

app.use((req,res)=>{
    console.log(req.url);
    console.log(req.method);
});

app.listen(process.env.PORT, () => console.log(`Example app listening on port ${process.env.PORT}!`));
