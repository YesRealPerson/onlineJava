const env = require('dotenv');
const http = require('http');
const express = require('express');
const fs = require('fs')
const path = require("path");
const { Worker } = require("worker_threads");

env.config();

const allowedUsers = process.env.ALLOWED_USERS.split(",");
const app = express();
const server = http.createServer(app);

app.use(express.static('./static', { extensions: ['html'] }));

// Helper functions

const checkTime = async (worker) => {
    await new Promise(r => setTimeout(r, 1500));
    if(worker.threadId != -1){
        worker.terminate();
        return true;
    }
    return false;
}

// App functions

app.use(function (req, res, next) {
    try {
        var data = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            data += chunk;
        });

        req.on('end', function () {
            req.body = data;
            next();
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post("/compile", async (req, res) => {
    try {
        let code = req.body;
        fs.readFile("users.json", async (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0]
                let filename = code.split("{")[0].trim().split(" ");
                filename = filename[filename.length - 1];
                fs.writeFile(`./Users/${user}/${filename}.java`, code, async (err) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        let worker = new Worker("./compileJava.js", {
                            "env": {"filename":user+"/"+filename}
                        });
                        worker.on("message", async data => {
                            res.status(200).send(data);
                            worker.terminate();
                        });
                        worker.on("error", async data => {
                            res.status(200).send(data);
                            worker.terminate();
                        });
                    }
                })
            }
        })
    } catch (err) {
        res.status(500).send(err)
    }
})

app.post("/run", async (req, res) => {
    try {
        let code = req.body;
        let beingNaughty = "";
        if(code.indexOf("java.io.") != -1){
            beingNaughty = "Please do not use any java.io packages in your projects!\nThis is for security reasons :)";
        }else if(code.indexOf("java.net.") != -1){
            beingNaughty = "Please do not use any java.net packages in your projects!\nThis is for security reasons :)";
        }
        else if(code.indexOf("java.nio.") != -1){
            beingNaughty = "Please do not use any java.nio packages in your projects!\nThis is for security reasons :)";
        }
        else if(code.indexOf("java.awt.") != -1){
            beingNaughty = "Please do not use any java.awt packages in your projects!";
        }
        else if(code.indexOf("java.sql.") != -1){
            beingNaughty = "Please do not use any java.sql packages in your projects!";
        }
        else if(code.indexOf("java.util.zip") != -1){
            beingNaughty = "Please do not use the java.util.zip package in your projects!\nThis is for security reasons :)";
        }
        else if(code.indexOf("java.util.*") != -1){
            beingNaughty = "Please import java.util packages individually!\nSome packages pose a security risk :)";
        }
        else if(code.indexOf("java.net.") != -1){
            beingNaughty = "Please do not use any java.net packages in your projects!\nThis is for security reasons :)";
        }
        else if(code.indexOf("javax.") != -1){
            beingNaughty = "Please do not use any javax packages in your projects!\nThis is for security reasons :)";
        }else if(code.indexOf("org.omg.") != -1 || code.indexOf("org.ietf.") != -1 || code.indexOf("org.w3c.") != -1 || code.indexOf("org.xml.") != -1){
            beingNaughty = "What are you even importing these packages for? Don't please. :)";
        }
        if(beingNaughty == ""){
        fs.readFile("users.json", async (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0]
                let filename = code.split("{")[0].trim().split(" ");
                filename = filename[filename.length - 1];
                fs.writeFile(`./Users/${user}/${filename}.java`, code, async (err) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        let worker = new Worker("./runJava.js", {
                            "env": {"filename":user+"/"+filename}
                        });
                        worker.on("message", async data => {
                            res.status(200).send(data);
                            worker.terminate();
                        });
                        worker.on("error", async data => {
                            res.status(200).send(data);
                            worker.terminate();
                        });
                        if(await checkTime(worker)){
                            res.status(200).send("Infinite loop detected! Please check your code!\nOr your code is taking too long to run...");
                        }
                    }
                })
            }
        })
    }else{
        res.status(200).send(beingNaughty)
    }
    } catch (err) {
        res.status(500).send(err)
    }
});

app.post("/login", async (req, res) => {
    try {
        let key = req.body;
        fs.readFile("users.json", (err, users) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let x = Object.keys(JSON.parse("" + users));
                if (x.indexOf(key) != -1) {
                    res.sendStatus(200);
                }
                else {
                    res.sendStatus(401);
                }
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
})

app.post("/register", async (req, res) => {
    try {
        const data = req.body.split(",");
        const email = data[0];
        const key = btoa(data[1] + ":" + data[2]);
        if (allowedUsers.indexOf(email.split("@")[0]) == -1) {
            res.status(500).send("You are not allowed to use this service!\nIf you believe you should be contact your teacher!")
        } else {
            fs.readFile("users.json", (err, data) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    data = JSON.parse("" + data);
                    keys = Object.keys(data);

                    let funny = false;

                    for (i in keys) {
                        test = keys[i];
                        if (data[test] == email) {
                            funny = true;
                            break;
                        }
                    }

                    if (!funny) {
                        data[key] = email;
                        let dataStr = JSON.stringify(data);
                        fs.writeFile("users.json", dataStr, err => {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                fs.mkdir("Users/" + email.split("@")[0], { recursive: true }, err => {
                                    if (err) {
                                        res.status(500).send(err);
                                    }
                                });
                                res.sendStatus(200);
                            }
                        })
                    } else {
                        res.statusMessage = "You already have an account! See your teacher for your password";
                        res.status(400).send("You already have an account! See your teacher for your password");
                    }
                }
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/readfile", (req, res) => {
    try {
        let filename = req.query.name;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.readFile(`Users/${user}/${filename}.java`, (err, result) => {
                    if (err) {
                        fs.writeFile(`Users/${user}/${filename}.java`, [`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n'), (err) => {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                res.status(200).send([`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n'))
                            }
                        })
                    }
                    else {
                        res.status(200).send("" + result);
                    }
                })
            }
        })
    } catch (err) {
        res.status(500).send(err);
    }
})

app.post("/makefile", (req, res) => {
    try {
        let filename = req.query.name;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.writeFile(`Users/${user}/${filename}.java`, [`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n'), (err) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        res.sendStatus(200)
                    }
                })
            }
        })
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/filelist", (req, res) => {
    try {
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.readdir(`Users/${user}/`, (err, files) => {
                    result = "";
                    files.forEach(file => {
                        let temp = file.split(".");
                        if (temp[temp.length - 1] == "java") {
                            result += file + ",";
                        }
                    });
                    res.status(200).send(result.substring(0, result.length - 1));
                });
            }
        })
    } catch (err) {
        res.status(500).send(err);
    }
})

server.listen(80);
console.log("Now Listening");