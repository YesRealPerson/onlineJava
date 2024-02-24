let fetching = false;
let running = false;
let currentFile = "";
let ws = null;
const consoleElement = document.getElementById("console")

function convertToString(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
      result += String.fromCharCode(parseInt(array[i]));
    }
    return result;
  }

const updateHash = async () => {
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        const response = await fetch("./updateHash?name=" + currentFile, {
            method: 'POST',
            headers: {
                "Authorization": auth
            },
            body: editor.getValue()
        })
        return response.status;
    } else {
        console.error("No authorization key!");
    }
}

const sendRunRequest = async () => {
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        if (!running) {
            makeNotification("Sent run request!", 1500);
            running = true;
            consoleElement.innerText = "Running!"
            const response = await fetch("./run", {
                method: 'POST',
                headers: {
                    "Authorization": document.cookie.split("key=")[1]
                },
                body: editor.getValue()
            })
            consoleElement.innerText = await response.text()
            readFiles();
            running = false;
            updateHash();
        } else {
            makeNotification("Already running, please wait!", 1500);
        }
    } else {
        console.error("No authorization key!");
    }
}
const sendCompileRequest = async (silent) => {
    if (silent == undefined) { // Checking if its undefined or something else for some reason.
        silent = false;
    }
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        if (!silent) {
            makeNotification("Sent compile request!", 1500);
            consoleElement.innerText = "Compiling!";
        }
        const response = await fetch("./compile", {
            method: 'POST',
            headers: {
                "Authorization": document.cookie.split("key=")[1]
            },
            body: editor.getValue()
        })
        if (!silent) {
            document.getElementById("console").innerText = await response.text()
        }
        readFiles();
        updateHash();
    } else {
        console.error("No authorization key!");
    }
}

const getFile = async (filename) => {
    if(ws != null){
        ws.close();
    }
    ws = new WebSocket("wss://"+location.host);
    let key = document.cookie.split("key=")[1];
    checkLogin(key, "./loginSite");
    
    ws.onmessage = async message => {
        // Types
        // 0: Command
        // 1: Response
        message = JSON.parse(message.data);
        if (message.type == 0) {
            let command = message.data;
            
            // Server is asking for authentication
            if (command == "SEND_AUTH") {
                let response = {
                    type: 1,
                    data: key,
                    command: "SEND_AUTH"
                };
                ws.send(JSON.stringify(response));
            }
    
            // Server says login is good
            else if (command == "LOGIN_OK") {
                // Get current file
                ws.send(JSON.stringify({type: 0, data: "GET_FILE", file: filename}));
            }
    
            // Server says login is bad
            else if (command == "LOGIN_BAD"){
                alert("Your account has not been configured properly!");
            }

            // Server is passing live update
            else if (command == "UPDATE_FILE"){
                let oldPos = editor.getPosition();
                editor.setValue(message.text);
                editor.setPosition(oldPos);
            }
        }
        else if (message.type == 1) {
            let command = message.command;
    
            // Getting file content back
            if(command = "GET_FILE"){
                if(message.data == "ERROR"){
                    if(filename != "Main"){
                        alert("There has been an error, please see an admin.");
                    }else{
                        await fetch("./makefile?name=" + "Main", {
                            method: 'POST',
                            headers: {
                                "Authorization": document.cookie.split("key=")[1]
                            },
                        });
                        getFile("Main");
                    }
                }else{
                    currentFile = filename;
                    editor.setValue(convertToString(message.data.data));
                }
            }
        } else {
            console.error("Unknown Message Recieved\n" + message);
        }
    }
}

const fastUpdate = async (operation) => {
    if(ws != null){
        operation["type"] = 0;
        operation["data"] = "UPDATE";
        ws.send(JSON.stringify(operation));
    }
}

const readFiles = async () => {
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        const response = await fetch("./filelist", {
            method: 'GET',
            headers: {
                "Authorization": document.cookie.split("key=")[1]
            },
        })
        let files = await response.text();
        files = files.split(",");
        let list = document.getElementById("list");
        list.innerText = "";
        for (i in files) {
            let temp = document.createElement("a");
            temp.innerText = files[i];
            temp.setAttribute("onclick", `getFile("${files[i].split(".")[0]}")`);
            list.appendChild(temp);
            temp = document.createElement("br");
            list.appendChild(temp);
        }
    } else {
        console.error("No authorization key!");
    }
}

const deleteRequest = async () => {
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        if (currentFile != "Main" && confirm(`Are you sure you want to delete ${currentFile}?`)) {
            makeNotification(`Deleting ${currentFile}!`, 1500);
            const response = await fetch("./deleteFile?name=" + currentFile, {
                method: 'POST',
                headers: {
                    "Authorization": document.cookie.split("key=")[1]
                },
            });
            let text = await response.text();
            makeNotification(text, 1500);
            getFile("Main");
            readFiles();
        } else {
            if(currentFile == "Main"){
                makeNotification("You cannot delete 'Main'!", 1500);
            }
        }
    } else {
        console.error("No authorization key!");
    }
}