const sendRunRequest = async () => {
    const response = await fetch("./run", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": document.cookie.split("key=")[1]
        },
        body: editor.getValue()
    })
    document.getElementById("console").innerText= await response.text()
    readFiles();
}

const getFile = async (filename) => {
    const response = await fetch("./readfile?name="+filename, {
        method: 'GET',
        headers: {
            "Authorization": document.cookie.split("key=")[1]
        },
    });
    editor.getModel().setValue(await response.text());
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
    list.innerText="";
    for(i in files){
        let temp = document.createElement("a");
        temp.innerText = files[i];
        temp.setAttribute("onclick", `getFile("${files[i].split(".")[0]}")`);
        list.appendChild(temp);
        temp = document.createElement("br");
        list.appendChild(temp);
    }
}

const makeFile = async () => {
    prompt("Enter file name")
}