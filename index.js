const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host:"localhost",
  user:"root",
  password:"",
  database:"campus_event_hub"
});

db.connect(err=>{
  if(err) console.log(err);
  else console.log("DB connected");
});

// EMAIL FUNCTION
async function sendEmail(to){
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "youremail@gmail.com",   // change
      pass: "your_app_password"      // change
    }
  });

  await transporter.sendMail({
    from: "youremail@gmail.com",
    to: to,
    subject: "Event Registration",
    text: "You registered successfully!"
  });
}

// REGISTER
app.post('/register', async (req,res)=>{
  const {name,email,password} = req.body;
  const hash = await bcrypt.hash(password,10);

  db.query("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
  [name,email,hash,'user'], (err)=>{
    if(err) return res.json({message:'Email exists'});
    res.json({message:'Registered'});
  });
});

// LOGIN
app.post('/login',(req,res)=>{
  const {email,password} = req.body;

  db.query("SELECT * FROM users WHERE email=?",[email],
  async (err,data)=>{
    if(data.length===0) return res.json({message:'No user'});

    const user = data[0];
    const ok = await bcrypt.compare(password,user.password);

    if(!ok) return res.json({message:'Wrong pass'});

    res.json({
      user:{
        user_id:user.user_id,
        name:user.name,
        email:user.email,
        role:user.role
      }
    });
  });
});

// EVENTS
app.get('/events',(req,res)=>{
  db.query("SELECT * FROM events",(err,data)=>{
    res.json(data);
  });
});

// EVENT DETAILS
app.get('/events/:id',(req,res)=>{
  db.query("SELECT * FROM events WHERE event_id=?",[req.params.id],
  (err,data)=>{
    res.json(data[0]);
  });
});

// REGISTER EVENT + EMAIL
app.post('/register-event',(req,res)=>{
  const {user_id,event_id} = req.body;

  db.query("INSERT INTO registrations(user_id,event_id) VALUES(?,?)",
  [user_id,event_id],(err)=>{
    if(err) return res.json({message:'Already registered'});

    db.query("SELECT email FROM users WHERE user_id=?",[user_id],
    async (e,u)=>{
      if(u.length>0){
        await sendEmail(u[0].email);
      }
    });

    res.json({message:'Registered + Email sent'});
  });
});

// MY EVENTS
app.get('/my-events/:id',(req,res)=>{
  db.query(`
    SELECT r.registration_id,e.title,e.description,e.date,e.location
    FROM registrations r
    JOIN events e ON r.event_id=e.event_id
    WHERE r.user_id=?`,
  [req.params.id],(err,data)=>{
    res.json(data);
  });
});

// CANCEL
app.delete('/cancel/:id',(req,res)=>{
  db.query("DELETE FROM registrations WHERE registration_id=?",[req.params.id],()=>{
    res.json({message:'Cancelled'});
  });
});

// ADMIN CHECK
function isAdmin(req,res,next){
  const user = req.body.user;
  if(!user || user.role!=='admin'){
    return res.json({message:'Admin only'});
  }
  next();
}

// ADD EVENT
app.post('/admin/events',isAdmin,(req,res)=>{
  const {title,description,date,location,category_id} = req.body;

  db.query("INSERT INTO events(title,description,date,location,category_id) VALUES(?,?,?,?,?)",
  [title,description,date,location,category_id],()=>{
    res.json({message:'Event added'});
  });
});

// DELETE EVENT
app.delete('/admin/events/:id',isAdmin,(req,res)=>{
  db.query("DELETE FROM events WHERE event_id=?",[req.params.id],()=>{
    res.json({message:'Deleted'});
  });
});

// CATEGORY
app.get('/categories',(req,res)=>{
  db.query("SELECT * FROM categories",(err,data)=>{
    res.json(data);
  });
});

app.post('/admin/categories',(req,res)=>{
  const {name} = req.body;
  db.query("INSERT INTO categories(name) VALUES(?)",[name],()=>{
    res.json({message:'Category added'});
  });
});

app.delete('/admin/categories/:id',(req,res)=>{
  db.query("DELETE FROM categories WHERE category_id=?",[req.params.id],()=>{
    res.json({message:'Deleted'});
  });
});

app.listen(3000,()=>console.log("Server running"));