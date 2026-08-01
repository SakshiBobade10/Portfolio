const express = require("express");
const session = require("express-session");
require("dotenv").config();
const db = require("./models/db");
const nodemailer = require("nodemailer");

const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5005;

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "portfolio_secret_key",
    resave: false,
    saveUninitialized: false
}));

// View Engine Setup
app.set("view engine", "ejs");


// ================= PUBLIC PORTFOLIO ROUTES =================

app.get("/", (req, res) => {
    const pSql = "SELECT * FROM projects ORDER BY id DESC";
    const sSql = "SELECT * FROM skills ORDER BY id DESC";
    const iSql = "SELECT * FROM internships ORDER BY id DESC";
    const cSql = "SELECT * FROM certificates ORDER BY id DESC";
    const stSql = "SELECT * FROM strengths ORDER BY id DESC";
    const siteSql = "SELECT * FROM site_info WHERE id = 1";

    db.query(pSql, (err, projects) => {
        if (err) projects = [];
        db.query(sSql, (err, skills) => {
            if (err) skills = [];
            db.query(iSql, (err, internships) => {
                if (err) internships = [];
                db.query(cSql, (err, certificates) => {
                    if (err) certificates = [];
                    db.query(stSql, (err, strengths) => {
                        if (err) strengths = [];
                        db.query(siteSql, (err, profile) => {
                            res.render("index", {
                                projects: projects,
                                skills: skills,
                                internships: internships,
                                certificates: certificates,
                                strengths: strengths,
                                profile: profile ? profile[0] : {}
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get("/about", (req, res) => {
    const siteSql = "SELECT * FROM site_info WHERE id = 1";
    const aboutSql = "SELECT * FROM about_info WHERE id = 1";
    const stSql = "SELECT * FROM strengths ORDER BY id DESC";

    db.query(siteSql, (err, profileRes) => {
        db.query(aboutSql, (err, aboutRes) => {
            db.query(stSql, (err, strengthsRes) => {
                res.render("about", { 
                    profile: (profileRes && profileRes[0]) ? profileRes[0] : {},
                    about: (aboutRes && aboutRes[0]) ? aboutRes[0] : {},
                    strengths: strengthsRes || [] 
                });
            });
        });
    });
});


app.get("/skills", (req, res) => {
    const sql = "SELECT * FROM skills ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.render("skills", { skills: [] });
        }
        res.render("skills", { skills: result });
    });
});

app.get("/contact", (req, res) => {
    res.render("contact");
});


// ================= MESSAGES =================

app.get("/messages", (req, res) => {
    res.redirect("/admin/contacts");
});

app.post("/contact", (req, res) => {
    const { name, email, subject, message } = req.body;
    const sql = "INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)";

    db.query(sql, [name, email, subject, message], async (err) => {
        if (err) {
            console.error("❌ DATABASE INSERT ERROR:", err);
            return res.send("Database Error: " + err.message);
        }

        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "sakshibobade10@gmail.com",
                    pass: "sjfq aztq dxsx vxoa" //  App Password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                //  "Portfolio Contact" 
                from: `"Portfolio Contact Form" <sakshibobade10@gmail.com>`,
                to: "sakshibobade10@gmail.com",
                replyTo: email, 
                subject: `New Portfolio Message: ${subject || 'Inquiry'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                        <h2 style="color: #0d6efd; margin-top: 0;">📩 New Contact Form Submission</h2>
                        <hr style="border: 0; border-top: 1px solid #eee;">
                        <p style="font-size: 15px;"><strong>Sender Name:</strong> ${name}</p>
                        <p style="font-size: 15px;"><strong>Sender Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p style="font-size: 15px;"><strong>Subject:</strong> ${subject || 'N/A'}</p>
                        <hr style="border: 0; border-top: 1px solid #eee;">
                        <p style="font-size: 15px; margin-bottom: 5px;"><strong>Message Content:</strong></p>
                        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0d6efd; border-radius: 4px; font-size: 14px; line-height: 1.5;">
                            ${message}
                        </div>
                        <br>
                        <small style="color: #6c757d;">You can directly reply to this email to respond to ${name}.</small>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log("✅ Mail sent successfully!");

        } catch (mailErr) {
            console.error("❌ MAIL SENDING ERROR:", mailErr);
        }

        res.send("✅ Message Sent Successfully!");
    });
});

app.get("/delete-message/:id", (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM contacts WHERE id=?";

    db.query(sql, [id], (err) => {
        if (err) {
            console.error("❌ DELETE ERROR:", err);
            return res.send("Database Error");
        }
        res.redirect("/admin/contacts");
    });
});


// ================= PROJECTS ROUTES =================

app.get("/projects", (req, res) => {
    const sql = "SELECT * FROM projects ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render("projects", { projects: result });
    });
});

app.get("/add-project", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    res.render("add-project");
});

app.post("/add-project", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    
    const { category, title, description, technology, github_link, demo_link } = req.body;
    
    const sql = "INSERT INTO projects (category, title, description, technology, github_link, demo_link) VALUES (?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [category, title, description, technology, github_link, demo_link], (err, result) => {
        if (err) {
            console.error("Error inserting project:", err);
            return res.send("Database Error");
        }
        res.redirect("/dashboard");
    });
});


// ================= INTERNSHIPS ROUTES =================

app.get("/add-internship", (req, res) => {
    res.render("add-internship");
});

app.get("/internship", (req, res) => {
    const sql = "SELECT * FROM internships ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render("internship", { internships: result });
    });
});

app.post("/add-internship", upload.single("certificate"), (req, res) => {
    const { company, role, duration, description } = req.body;
    const certificate = req.file ? "/uploads/" + req.file.filename : null;

    const sql = `
        INSERT INTO internships (company, role, duration, description, certificate)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [company, role, duration, description, certificate], (err) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.redirect("/dashboard");
    });
});


// ================= SKILLS ROUTES =================

app.get("/add-skill", (req, res) => {
    res.render("add-skill", { title: "Add Skill" });
});

app.post("/add-skill", (req, res) => {
    const { skill_name, proficiency, category } = req.body;
    const query = "INSERT INTO skills (skill_name, proficiency, category) VALUES (?, ?, ?)";

    db.query(query, [skill_name, proficiency, category], (err, result) => {
        if (err) {
            console.log("❌ SKILL ERROR:", err);
            return res.send("Skill Error: " + err.message);
        }
        res.redirect("/dashboard");
    });
});


// ================= CERTIFICATES ROUTES =================

app.get("/certificates", (req, res) => {
    const sql = "SELECT * FROM certificates ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render("certificates", { certificates: result });
    });
});

app.get("/add-certificate", (req, res) => {
    res.render("add-certificate", { title: "Add Certificate" });
});

app.post("/add-certificate", upload.single("certificate"), (req, res) => {
    const { title, organization, issue_date, credential_url } = req.body;
    const certificate = req.file ? "/uploads/" + req.file.filename : null;

    const sql = "INSERT INTO certificates (title, organization, issue_date, credential_url, certificate) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [title, organization, issue_date, credential_url, certificate], (err, result) => {
        if (err) {
            console.log("❌ CERTIFICATE ERROR:", err);
            return res.send("Certificate Error: " + err.message);
        }
        res.redirect("/dashboard");
    });
});


// ================= STRENGTHS ROUTES =================

app.get("/add-strength", (req, res) => {
    res.render("add-strength", { title: "Add Strength" });
});

app.post("/add-strength", (req, res) => {
    const { title } = req.body;
    const sql = "INSERT INTO strengths (title) VALUES (?)";

    db.query(sql, [title], (err, result) => {
        if (err) {
            console.log("❌ STRENGTH ERROR:", err);
            return res.send("Strength Error: " + err.message);
        }
        res.redirect("/dashboard");
    });
});

app.get("/edit-strength/:id", (req, res) => {
    db.query("SELECT * FROM strengths WHERE id = ?", [req.params.id], (err, result) => {
        if (err || result.length === 0) return res.redirect("/dashboard");
        res.render("edit-strength", { strength: result[0], title: "Edit Strength" });
    });
});

app.post("/edit-strength/:id", (req, res) => {
    const { title } = req.body;
    const sql = "UPDATE strengths SET title=? WHERE id=?";

    db.query(sql, [title, req.params.id], (err) => {
        if (err) console.error("❌ STRENGTH UPDATE ERROR:", err);
        res.redirect("/dashboard");
    });
});

app.get("/delete-strength/:id", (req, res) => {
    db.query("DELETE FROM strengths WHERE id = ?", [req.params.id], () => res.redirect("/dashboard"));
});


// ================= AUTHENTICATION =================

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM admin WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, result) => {
        if (err) return res.send("Database Error");

        if (result.length > 0) {
            req.session.admin = result[0];
            return res.redirect("/dashboard");
        } else {
            return res.send("❌ Invalid Username or Password");
        }
    });
});


// ================= ADMIN DASHBOARD =================

app.get("/dashboard", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const pSql = "SELECT * FROM projects ORDER BY id DESC";
    const iSql = "SELECT * FROM internships ORDER BY id DESC";
    const cSql = "SELECT * FROM certificates ORDER BY id DESC";
    const sSql = "SELECT * FROM skills ORDER BY id DESC";
    const stSql = "SELECT * FROM strengths ORDER BY id DESC";
    const mSql = "SELECT * FROM contacts ORDER BY id DESC";

    db.query(pSql, (err, projects) => {
        db.query(iSql, (err, internships) => {
            db.query(cSql, (err, certificates) => {
                db.query(sSql, (err, skills) => {
                    db.query(stSql, (err, strengths) => {
                        db.query(mSql, (err, messages) => {
                            res.render("dashboard", {
                                projects: projects || [],
                                internships: internships || [],
                                certificates: certificates || [],
                                skills: skills || [],
                                strengths: strengths || [],
                                messages: messages || []
                            });
                        });
                    });
                });
            });
        });
    });
});


// ================= DELETE ROUTES =================

app.get("/delete-project/:id", (req, res) => {
    db.query("DELETE FROM projects WHERE id = ?", [req.params.id], () => res.redirect("/dashboard"));
});

app.get("/delete-certificate/:id", (req, res) => {
    db.query("DELETE FROM certificates WHERE id = ?", [req.params.id], () => res.redirect("/dashboard"));
});

app.get("/delete-internship/:id", (req, res) => {
    db.query("DELETE FROM internships WHERE id = ?", [req.params.id], () => res.redirect("/dashboard"));
});

app.get("/delete-skill/:id", (req, res) => {
    db.query("DELETE FROM skills WHERE id = ?", [req.params.id], () => res.redirect("/dashboard"));
});


// ================= EDIT / UPDATE ROUTES =================

// 1. SKILL EDIT & UPDATE
app.get("/edit-skill/:id", (req, res) => {
    db.query("SELECT * FROM skills WHERE id = ?", [req.params.id], (err, result) => {
        if (err || result.length === 0) return res.redirect("/dashboard");
        res.render("edit-skill", { skill: result[0] });
    });
});

app.post("/edit-skill/:id", (req, res) => {
    const { skill_name, proficiency, category } = req.body;
    db.query(
        "UPDATE skills SET skill_name=?, proficiency=?, category=? WHERE id=?",
        [skill_name, proficiency, category, req.params.id],
        (err) => {
            if (err) console.error(err);
            res.redirect("/dashboard");
        }
    );
});


// 2. PROJECT EDIT & UPDATE
app.get("/edit-project/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    db.query("SELECT * FROM projects WHERE id = ?", [req.params.id], (err, result) => {
        if (err || result.length === 0) return res.redirect("/dashboard");
        res.render("edit-project", { project: result[0] });
    });
});

app.post("/edit-project/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    
    const { category, title, description, github_link, demo_link } = req.body;
    db.query(
        "UPDATE projects SET category=?, title=?, description=?, github_link=?, demo_link=? WHERE id=?",
        [category, title, description, github_link, demo_link, req.params.id],
        (err) => {
            if (err) console.error(err);
            res.redirect("/dashboard");
        }
    );
});


// 3. CERTIFICATE EDIT & UPDATE
app.get("/edit-certificate/:id", (req, res) => {
    db.query("SELECT * FROM certificates WHERE id = ?", [req.params.id], (err, result) => {
        if (err || result.length === 0) return res.redirect("/dashboard");
        res.render("edit-certificate", { certificate: result[0], title: "Edit Certificate" });
    });
});

app.post("/edit-certificate/:id", upload.single("certificate"), (req, res) => {
    const { title, organization, issue_date, credential_url } = req.body;

    if (req.file) {
        const certificateImage = "/uploads/" + req.file.filename;
        const sql = "UPDATE certificates SET title=?, organization=?, issue_date=?, credential_url=?, certificate=? WHERE id=?";
        db.query(sql, [title, organization, issue_date, credential_url, certificateImage, req.params.id], (err) => {
            if (err) console.error("❌ CERTIFICATE UPDATE ERROR:", err);
            res.redirect("/dashboard");
        });
    } else {
        const sql = "UPDATE certificates SET title=?, organization=?, issue_date=?, credential_url=? WHERE id=?";
        db.query(sql, [title, organization, issue_date, credential_url, req.params.id], (err) => {
            if (err) console.error("❌ CERTIFICATE UPDATE ERROR:", err);
            res.redirect("/dashboard");
        });
    }
});


// 4. INTERNSHIP EDIT & UPDATE
app.get("/edit-internship/:id", (req, res) => {
    db.query("SELECT * FROM internships WHERE id = ?", [req.params.id], (err, result) => {
        if (err || result.length === 0) return res.redirect("/dashboard");
        res.render("edit-internship", { internship: result[0], title: "Edit Internship" });
    });
});

app.post("/edit-internship/:id", upload.single("certificate"), (req, res) => {
    const { company, role, duration, description } = req.body;

    if (req.file) {
        const certificateImage = "/uploads/" + req.file.filename;
        const sql = "UPDATE internships SET company=?, role=?, duration=?, description=?, certificate=? WHERE id=?";
        db.query(sql, [company, role, duration, description, certificateImage, req.params.id], (err) => {
            if (err) console.error("❌ INTERNSHIP UPDATE ERROR:", err);
            res.redirect("/dashboard");
        });
    } else {
        const sql = "UPDATE internships SET company=?, role=?, duration=?, description=? WHERE id=?";
        db.query(sql, [company, role, duration, description, req.params.id], (err) => {
            if (err) console.error("❌ INTERNSHIP UPDATE ERROR:", err);
            res.redirect("/dashboard");
        });
    }
});


// ============ MANAGE HOME AND ABOUT PAGE ============

app.get("/edit-profile", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    db.query("SELECT * FROM site_info WHERE id = 1", (err, result) => {
        if (err) {
            console.error("❌ PROFILE FETCH ERROR:", err);
            return res.send("Database Error");
        }
        res.render("edit-profile", { profile: (result && result.length > 0) ? result[0] : {} });
    });
});

app.post("/edit-profile", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const { full_name, role_headline, bio, email, github_url, linkedin_url } = req.body;

    const sql = `
        UPDATE site_info 
        SET full_name=?, role_headline=?, bio=?, email=?, github_url=?, linkedin_url=? 
        WHERE id=1
    `;
    
    db.query(sql, [full_name, role_headline, bio, email, github_url, linkedin_url], (err) => {
        if (err) {
            console.error("❌ HOME PAGE UPDATE ERROR:", err);
            return res.send("Database Error: " + err.message);
        }
        res.redirect("/dashboard");
    });
});

app.get("/edit-about", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    db.query("SELECT * FROM about_info WHERE id = 1", (err, result) => {
        if (err) {
            console.error("❌ ABOUT FETCH ERROR:", err);
            return res.send("Database Error");
        }
        res.render("edit-about", { about: (result && result.length > 0) ? result[0] : {} });
    });
});

app.post("/edit-about", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const { location, education, about_bio } = req.body;

    const sql = `
        INSERT INTO about_info (id, location, education, about_bio)
        VALUES (1, ?, ?, ?)
        ON DUPLICATE KEY UPDATE location=?, education=?, about_bio=?
    `;

    db.query(sql, [location, education, about_bio, location, education, about_bio], (err) => {
        if (err) {
            console.error("❌ ABOUT UPDATE ERROR:", err);
            return res.send("Database Error: " + err.message);
        }
        res.redirect("/dashboard");
    });
});

app.get("/admin/contacts", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const sql = "SELECT * FROM contacts ORDER BY id DESC";
    db.query(sql, (err, messages) => {
        if (err) {
            console.error("❌ MESSAGES FETCH ERROR:", err);
            return res.send("Database Error: " + err.message);
        }
        res.render("admin-contacts", { messages: messages || [] });
    });
});

app.get("/delete-contact/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const sql = "DELETE FROM contacts WHERE id = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) console.error("❌ DELETE ERROR:", err);
        res.redirect("/admin/contacts");
    });
});


// ================= LOGOUT =================

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});


// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});