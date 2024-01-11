const makeNotification = async (message) => {
    let notification = document.createElement("div");
    notification.innerText = message;
    notification.className = "message";
    notification.style.opacity = 0;
    document.getElementById("messageBox").appendChild(notification);
    for(let opacity = 0; opacity < 1; opacity = opacity + 0.1){
        notification.style.opacity = opacity;    
        await new Promise(r => setTimeout(r, 10));
    }
    await new Promise(r => setTimeout(r, 1500));
    for(let opacity = 1; opacity > 0; opacity = opacity - 0.1){
        notification.style.opacity = opacity;    
        await new Promise(r => setTimeout(r, 10));
    }
    await new Promise(r => setTimeout(r, 10));
    notification.remove();
}