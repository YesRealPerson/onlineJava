const select = document.getElementById('userSelect');
const auth = document.cookie.split("key=")[1];
let currentFile = "";
let running = false;
let user = "";
let lastCode = "";
const index = document.getElementById("historyIndex");
let history = {};
let timings = [];
const timer = document.getElementById("time");

const getUsers = async () => {
    if (auth != undefined && auth != "") {
        const response = await fetch("./users", {
            method: 'GET',
            headers: {
                "Authorization": auth
            },
        })
        let users = await response.text();
        users = users.split(",");
        for (i in users) {
            let user = users[i];
            let temp = document.createElement("option");
            temp.value = user;
            temp.innerText = user;
            select.appendChild(temp);
        }
        setup();
    } else {
        console.error("No authorization key!");
    }
}

const readFiles = async () => {
    if(user != ""){
    let response = await fetch(`./filelistAdmin?user=${user}`, {
        method: "GET",
        headers: {
            Authorization: auth
        }
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
}
}

const setup = async () => {
    if(user == "undefined"){
        select.firstElementChild.remove();
    }
    user = select.value;
    if (user != "undefined") {
        try {
            await readFiles();
            currentFile = "";
            await getFile("Main");
        } catch (err) {
            console.log(err);
        }
    }
}

const getFile = async (filename) => {
    if (currentFile != filename && user != "") {
        makeNotification(`Fetching ${filename}!`, 1500);
        let response = await fetch(`./readfileAdmin?user=${user}&name=${filename}&extension=.java`, {
            method: 'GET',
            headers: {
                "Authorization": auth
            },
        });
        if (response.status == 200) {
            await getJSON(filename);
            editor.getModel().setValue(await response.text());
            currentFile = filename;
        } else {
            console.error(await response.text())
        }
    }
    else {
        makeNotification("This file is already loaded!", 1500);
    }
}

const getJSON = async (filename) => {
    if (currentFile != filename && user != "") {
        makeNotification(`Fetching ${filename} (JSON)!`, 1500);
        let response = await fetch(`./readfileAdmin?user=${user}&name=${filename}&extension=.json`, {
            method: 'GET',
            headers: {
                "Authorization": auth
            },
        });
        if (response.status == 200) {
            let log = JSON.parse(await response.text());
            lastCode = log.lastCode;
            timings = log.majorChangesTime;
            document.getElementById("changes").innerHTML = log.history.length;
            let majorChanges = log.majorChanges;
            history = majorChanges;
            let majorChangesL = majorChanges.length;
            document.getElementById("changesMajor").innerHTML = majorChangesL;
            index.max = majorChangesL-1;
            index.value = majorChangesL-1;
            timer.innerHTML = new Date(timings[majorChangesL-1]);
        } else {
            console.error(await response.text())
        }
    }
    else {
        makeNotification("This file is already loaded!", 1500);
    }
}

const sendRunRequest = async () => {
    let funny = editor.getValue();
    if (!running && currentFile != "" && user != "") {
        makeNotification("Sent run request!", 1500);
        running = true;
        const response = await fetch(`./runAdmin?user=${user}&name=${currentFile}`, {
            method: 'POST',
            headers: {
                "Authorization": auth
            },
            body: funny
        })
        document.getElementById("console").innerText = await response.text()
        editor.getModel().setValue(lastCode);
        running = false;
        sendCompileRequest();
        editor.getModel().setValue(funny);
        readFiles();
    } else {
        makeNotification("Already running, please wait!", 1500);
    }
}

const sendCompileRequest = async () => {
    if (!running && currentFile != "" && user != "") {
        running = true;
        const response = await fetch(`./compileAdmin?user=${user}&name=${currentFile}`, {
            method: 'POST',
            headers: {
                "Authorization": auth
            },
            body: editor.getValue()
        })
        readFiles();
        running = false;
    }
}

const createChange = async () => {
    editor.getModel().setValue(history[index.value]);
    timer.innerHTML = new Date(timings[index.value]);
}

select.addEventListener("change", setup);
index.oninput = createChange;