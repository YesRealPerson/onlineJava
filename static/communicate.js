let running = false;
let currentFile = "";
const updateHash = async () => {
    const response = await fetch("./updateHash?name="+currentFile, {
        method: 'POST',
        headers: {
            "Authorization": document.cookie.split("key=")[1]
        },
        body: editor.getValue()
    })
    console.log(await response.text());
}
const sendRunRequest = async () => {
    if (!running) {
        makeNotification("Sent run request!", 1500);
        running = true;
        const response = await fetch("./run", {
            method: 'POST',
            headers: {
                "Authorization": document.cookie.split("key=")[1]
            },
            body: editor.getValue()
        })
        document.getElementById("console").innerText = await response.text()
        readFiles();
        running = false;
        updateHash();
    } else {
        makeNotification("Already running, please wait!", 1500);
    }
}
const sendCompileRequest = async () => {
    makeNotification("Sent compile request!", 1500);
    const response = await fetch("./compile", {
        method: 'POST',
        headers: {
            "Authorization": document.cookie.split("key=")[1]
        },
        body: editor.getValue()
    })
    document.getElementById("console").innerText = await response.text()
    readFiles();
    updateHash();
}

const getFile = async (filename) => {
    if (currentFile != filename) {
        makeNotification(`Fetching ${filename}!`, 1500);
        let response = await fetch("./readfile?name=" + filename, {
            method: 'GET',
            headers: {
                "Authorization": document.cookie.split("key=")[1]
            },
        });
        if(response.status==200){
            editor.getModel().setValue(await response.text());
            currentFile = filename;
        }else{
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
    }
    else {
        makeNotification("This file is already loaded!", 1500);
    }
}

const readFiles = async () => {
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
}

const deleteRequest = async () => {
    if(currentFile != "Main" && confirm(`Are you sure you want to delete ${currentFile}?`)){
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
    }else{
        makeNotification("You cannot delete 'Main'!", 1500);
    }
}