let fetching = false;
let running = false;
let currentFile = "";
const consoleElement = document.getElementById("console")

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
        console.log(await response.text());
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
    if(silent == undefined){ // Checking if its undefined or something else for some reason.
        silent = false;
    }
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        if(!silent){
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
        if(!silent){
            document.getElementById("console").innerText = await response.text()
        }
        readFiles();
        updateHash();
    } else {
        console.error("No authorization key!");
    }
}

const getFile = async (filename) => {
    if(!fetching){
    let auth = document.cookie.split("key=")[1];
    if (auth != undefined && auth != "") {
        if (currentFile != filename) {
            fetching = true;
            makeNotification(`Fetching ${filename}!`, 1500);
            await sendCompileRequest(true);
            let response = await fetch("./readfile?name=" + filename, {
                method: 'GET',
                headers: {
                    "Authorization": document.cookie.split("key=")[1]
                },
            });
            if (response.status == 200) {
                editor.getModel().setValue(await response.text());
                currentFile = filename;
            } else {
                await fetch("./makefile?name=" + "Main", {
                    method: 'POST',
                    headers: {
                        "Authorization": document.cookie.split("key=")[1]
                    },
                });
                response = await fetch("./readfile?name=" + "Main", {
                    method: 'GET',
                    headers: {
                        "Authorization": document.cookie.split("key=")[1]
                    },
                });
                editor.getModel().setValue(await response.text());
                currentFile = "Main";
                readFiles();
            }
            fetching = false;
        }
        else {
            makeNotification("This file is already loaded!", 1500);
        }
    } else {
        console.error("No authorization key!");
    }
}else{
    makeNotification("Please wait!", 1500);
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
            makeNotification("You cannot delete 'Main'!", 1500);
        }
    } else {
        console.error("No authorization key!");
    }
}