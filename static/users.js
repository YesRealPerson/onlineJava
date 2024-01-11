const login = async () => {
    let encoded = document.getElementById("name").value + ":" + document.getElementById("password").value
    encoded = btoa(encoded);
    console.log(encoded);
    let response = await fetch("./login", {
        method: "POST",
        body: encoded
    })
    if(response.status == 200){
        document.cookie = "key="+encoded;
        window.location = "./editor";
    }else{
        document.getElementById("error").innerText = "Invalid username/password!"
    }
}
const registerWindow = async () => {
    window.location = "./registerSite";
}
const loginWindow = async () => {
    window.location = "./loginSite";
}
const checkLogin = async (encoded, location) => {
    let response = await fetch("./login", {
        method: "POST",
        body: encoded
    })
    if(response.status != 200){
        window.location = location;
    }
}

const register = async () => {
    let data = document.getElementById("email").value+","+document.getElementById("name").value + "," + document.getElementById("password").value
    let response = await fetch("./register", {
        method: "POST",
        body: data
    })
    if(response.status == 200){
        window.location = "./loginSite"
    }else{
        document.getElementById("error").innerText = await response.text();
    }
}