const socket = io();
const userVid = document.querySelector("#vd1");
const roomid = params.get("room");
let username;
const chatPage = document.querySelector('.chatbar');
const sendBTN = document.querySelector('.sendbtn');
const msgbx = document.querySelector('.chat-userinput');
const vidBOX = document.querySelector('#vc-box');
const boxFORname = document.querySelector('#boxforname')
const continueBtn = document.querySelector('.continue-in-box');
const nameArea = document.querySelector('#area-for-name');
const videoBtn = document.querySelector('.novideo');
const audioBtn = document.querySelector('.audio');
const endMeet = document.querySelector('.endmeet');
// const screenShareBtn = document.querySelector('.sharescreen');
const doodleboardBtn = document.querySelector('.board-icon')

alert("jjvv");


//doodleboard js start
const doodleboardCont = document.querySelector('.doodleboard-cont');
const canvas = document.querySelector("#doodleboard");
const ctx = canvas.getContext('2d');

let boardvis = false;

doodleboardCont.style.visibility = 'hidden';

let isDrawing = 0;
let x = 0;
let y = 0;
let color = "black";
let drawsize = 3;
let colorRemote = "black";
let drawsizeRemote = 3;

function fitToContainer(canvas) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

fitToContainer(canvas);

//getCanvas call is under join room call
socket.on('getCanvas', url => {
    let img = new Image();
    img.onload = start;
    img.src = url;

    function start() {
        ctx.drawImage(img, 0, 0);
    }

    console.log('got canvas', url)
})

function colorit(newcolor) {
    color = newcolor;
    drawsize = 3;
}

function eraseit() {
    color = "white";
    drawsize = 10;
}

//might remove this
function reportWindowSize() {
    fitToContainer(canvas);
}

window.onresize = reportWindowSize;
//

function clrbrd() {
    if (window.confirm('Are you sure you want to clear board? This cannot be undone')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('store canvas', canvas.toDataURL());
        socket.emit('clrbrd');
    }
    else return;
}

socket.on('clrbrd', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})

function draw(newx, newy, oldx, oldy) {
    ctx.strokeStyle = color;
    ctx.lineWidth = drawsize;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

    socket.emit('store canvas', canvas.toDataURL());

}

function drawRemote(newx, newy, oldx, oldy) {
    ctx.strokeStyle = colorRemote;
    ctx.lineWidth = drawsizeRemote;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

}

canvas.addEventListener('mousedown', e => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = 1;
})

canvas.addEventListener('mousemove', e => {
    if (isDrawing) {
        draw(e.offsetX, e.offsetY, x, y);
        socket.emit('draw', e.offsetX, e.offsetY, x, y, color, drawsize);
        x = e.offsetX;
        y = e.offsetY;
    }
})

window.addEventListener('mouseup', e => {
    if (isDrawing) {
        isDrawing = 0;
    }
})

socket.on('draw', (newX, newY, prevX, prevY, color, size) => {
    colorRemote = color;
    drawsizeRemote = size;
    drawRemote(newX, newY, prevX, prevY);
})

//doodleboard js end




let videoAllowed = 1;
let audioAllowed = 1;

let micInfo = {};
let videoInfo = {};

let videoTrackReceived = {};

let mymuteicon = document.querySelector("#mymuteicon");
mymuteicon.style.visibility = 'hidden';

let shutmyvid = document.querySelector("#shutmyvid");
shutmyvid.style.visibility = 'hidden';

const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] }

const mediaConstraints = { video: true, audio: true };

let connections = {};
let cName = {};
let audioTrackSent = {};
let videoTrackSent = {};

let mystream, mysharescreen;

document.querySelector('.joinroomcode').innerHTML = `${roomid}`

function CopyClassText() {

    var textToCopy = document.querySelector('.joinroomcode');
    var currentRange;
    if (document.getSelection().rangeCount > 0) {
        currentRange = document.getSelection().getRangeAt(0);
        window.getSelection().removeRange(currentRange);
    }
    else {
        currentRange = false;
    }

    var CopyRange = document.createRange();
    CopyRange.selectNode(textToCopy);
    window.getSelection().addRange(CopyRange);
    document.execCommand("copy");

    window.getSelection().removeRange(CopyRange);

    if (currentRange) {
        window.getSelection().addRange(currentRange);
    }

    document.querySelector(".copycode-button").textContent = "Copied!"
    setTimeout(()=>{
        document.querySelector(".copycode-button").textContent = "Copy invite code";
    }, 5000);
}

continueBtn.addEventListener('click', () => {
    if (nameArea.value == '') return;
    username = nameArea.value;
    boxFORname.style.visibility = 'hidden';
    document.querySelector("#name2").innerHTML = `${username} (You)`;
    socket.emit("join room", roomid, username);

})

nameArea.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        continueBtn.click();
    }
});

socket.on('user count', count => {
    if (count > 1) {
        vidBOX.className = 'vdobox';
    }
    else {
        vidBOX.className = 'vdobox-single';
    }
})

let peerConnection;

function handleGetUserMediaError(e) {
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

}

function reportError(e) {
    console.log(e);
    return;
}

function startCall() {

    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            userVid.srcObject = localStream;
            userVid.muted = true;

            localStream.getTracks().forEach(track => {
                for (let key in connections) {
                    connections[key].addTrack(track, localStream);
                    if (track.kind === 'audio')
                        audioTrackSent[key] = track;
                    else
                        videoTrackSent[key] = track;
                }
            })

        })
        .catch(handleGetUserMediaError);

}

function handleVideoOffer(offer, sid, cname, micinf, vidinf) {

    cName[sid] = cname;
    console.log('video offered recevied');
    micInfo[sid] = micinf;
    videoInfo[sid] = vidinf;
    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
            console.log('icecandidate fired');
            socket.emit('new icecandidate', event.candidate, sid);
        }
    };

    connections[sid].ontrack = function (event) {

        if (!document.getElementById(sid)) {
            console.log('track event fired')
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let muteIcon = document.createElement('div');
            let videoOff = document.createElement('div');
            videoOff.classList.add('shutvid');
            muteIcon.classList.add('mutebtn');
            name.classList.add('name1');
            name.innerHTML = `${cName[sid]}`;
            vidCont.id = sid;
            muteIcon.id = `mute${sid}`;
            videoOff.id = `vidoff${sid}`;
            muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
            videoOff.innerHTML = 'Video Off'
            vidCont.classList.add('show-videobox');
            newvideo.classList.add('show-videoframe');
            newvideo.autoplay = true;
            newvideo.playsinline = true;
            newvideo.id = `video${sid}`;
            newvideo.srcObject = event.streams[0];

            if (micInfo[sid] == 'on')
                muteIcon.style.visibility = 'hidden';
            else
                muteIcon.style.visibility = 'visible';

            if (videoInfo[sid] == 'on')
                videoOff.style.visibility = 'hidden';
            else
                videoOff.style.visibility = 'visible';

            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(muteIcon);
            vidCont.appendChild(videoOff);

            vidBOX.appendChild(vidCont);

        }

    };

    connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
            document.getElementById(sid).remove();
            console.log('removed a track');
        }
    };

    connections[sid].onnegotiationneeded = function () {

        connections[sid].createOffer()
            .then(function (offer) {
                return connections[sid].setLocalDescription(offer);
            })
            .then(function () {

                socket.emit('video-offer', connections[sid].localDescription, sid);

            })
            .catch(reportError);
    };

    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
        .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
        .then((localStream) => {

            localStream.getTracks().forEach(track => {
                connections[sid].addTrack(track, localStream);
                console.log('added local stream to peer')
                if (track.kind === 'audio') {
                    audioTrackSent[sid] = track;
                    if (!audioAllowed)
                        audioTrackSent[sid].enabled = false;
                }
                else {
                    videoTrackSent[sid] = track;
                    if (!videoAllowed)
                        videoTrackSent[sid].enabled = false
                }
            })

        })
        .then(() => {
            return connections[sid].createAnswer();
        })
        .then(answer => {
            return connections[sid].setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('video-answer', connections[sid].localDescription, sid);
        })
        .catch(handleGetUserMediaError);

}

function handleNewIceCandidate(candidate, sid) {
    console.log('new candidate recieved')
    var newcandidate = new RTCIceCandidate(candidate);

    connections[sid].addIceCandidate(newcandidate)
        .catch(reportError);
}

function handleVideoAnswer(answer, sid) {
    console.log('answered the offer')
    const ans = new RTCSessionDescription(answer);
    connections[sid].setRemoteDescription(ans);
}

socket.on('video-offer', handleVideoOffer);

socket.on('new icecandidate', handleNewIceCandidate);

socket.on('video-answer', handleVideoAnswer);

socket.on('join room', async (conc, cnames, micinfo, videoinfo) => {
    socket.emit('getCanvas');
    if (cnames)
        cName = cnames;

    if (micinfo)
        micInfo = micinfo;

    if (videoinfo)
        videoInfo = videoinfo;

    console.log(cName);
    if (conc) {
        await conc.forEach(sid => {
            connections[sid] = new RTCPeerConnection(configuration);

            connections[sid].onicecandidate = function (event) {
                if (event.candidate) {
                    console.log('icecandidate fired');
                    socket.emit('new icecandidate', event.candidate, sid);
                }
            };

            connections[sid].ontrack = function (event) {

                if (!document.getElementById(sid)) {
                    console.log('track event fired')
                    let vidCont = document.createElement('div');
                    let newvideo = document.createElement('video');
                    let name = document.createElement('div');
                    let muteIcon = document.createElement('div');
                    let videoOff = document.createElement('div');
                    videoOff.classList.add('shutvid');
                    muteIcon.classList.add('mutebtn');
                    name.classList.add('name1');
                    name.innerHTML = `${cName[sid]}`;
                    vidCont.id = sid;
                    muteIcon.id = `mute${sid}`;
                    videoOff.id = `vidoff${sid}`;
                    muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
                    videoOff.innerHTML = 'Video Off'
                    vidCont.classList.add('show-videobox');
                    newvideo.classList.add('show-videoframe');
                    newvideo.autoplay = true;
                    newvideo.playsinline = true;
                    newvideo.id = `video${sid}`;
                    newvideo.srcObject = event.streams[0];

                    if (micInfo[sid] == 'on')
                        muteIcon.style.visibility = 'hidden';
                    else
                        muteIcon.style.visibility = 'visible';

                    if (videoInfo[sid] == 'on')
                        videoOff.style.visibility = 'hidden';
                    else
                        videoOff.style.visibility = 'visible';

                    vidCont.appendChild(newvideo);
                    vidCont.appendChild(name);
                    vidCont.appendChild(muteIcon);
                    vidCont.appendChild(videoOff);

                    vidBOX.appendChild(vidCont);

                }

            };

            connections[sid].onremovetrack = function (event) {
                if (document.getElementById(sid)) {
                    document.getElementById(sid).remove();
                }
            }

            connections[sid].onnegotiationneeded = function () {

                connections[sid].createOffer()
                    .then(function (offer) {
                        return connections[sid].setLocalDescription(offer);
                    })
                    .then(function () {

                        socket.emit('video-offer', connections[sid].localDescription, sid);

                    })
                    .catch(reportError);
            };

        });

        console.log('added all sockets to connections');
        startCall();

    }
    else {
        console.log('waiting for someone to join');
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localStream => {
                userVid.srcObject = localStream;
                userVid.muted = true;
                mystream = localStream;
            })
            .catch(handleGetUserMediaError);
    }
})

socket.on('remove peer', sid => {
    if (document.getElementById(sid)) {
        document.getElementById(sid).remove();
    }

    delete connections[sid];
})

sendBTN.addEventListener('click', () => {
    const msg = msgbx.value;
    msgbx.value = '';
    socket.emit('message', msg, username, roomid);
})

msgbx.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendBTN.click();
    }
});

socket.on('message', (msg, sendername, time) => {
    chatPage.scrollTop = chatPage.scrollHeight;
    chatPage.innerHTML += `<div class="message">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${msg}
    </div>
</div>`
});

videoBtn.addEventListener('click', () => {

    if (videoAllowed) {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = false;
        }
        videoBtn.innerHTML = `<i class="fas fa-video-slash"></i>`;
        videoAllowed = 0;
        videoBtn.style.backgroundColor = "#b12c2c";

        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video') {
                    track.enabled = false;
                }
            })
        }

        shutmyvid.style.visibility = 'visible';

        socket.emit('action', 'videooff');
    }
    else {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = true;
        }
        videoBtn.innerHTML = `<i class="fas fa-video"></i>`;
        videoAllowed = 1;
        videoBtn.style.backgroundColor = "#4ECCA3";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video')
                    track.enabled = true;
            })
        }

        shutmyvid.style.visibility = 'hidden';

        socket.emit('action', 'videoon');
    }
})

audioBtn.addEventListener('click', () => {

    if (audioAllowed) {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = false;
        }
        audioBtn.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
        audioAllowed = 0;
        audioBtn.style.backgroundColor = "#b12c2c";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'audio')
                    track.enabled = false;
            })
        }

        mymuteicon.style.visibility = 'visible';

        socket.emit('action', 'mute');
    }
    else {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = true;
        }
        audioBtn.innerHTML = `<i class="fas fa-microphone"></i>`;
        audioAllowed = 1;
        audioBtn.style.backgroundColor = "#4ECCA3";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'audio')
                    track.enabled = true;
            })
        }

        mymuteicon.style.visibility = 'hidden';

        socket.emit('action', 'unmute');
    }
})

socket.on('action', (msg, sid) => {
    if (msg == 'mute') {
        console.log(sid + ' muted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'visible';
        micInfo[sid] = 'off';
    }
    else if (msg == 'unmute') {
        console.log(sid + ' unmuted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'hidden';
        micInfo[sid] = 'on';
    }
    else if (msg == 'videooff') {
        console.log(sid + 'turned video off');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'visible';
        videoInfo[sid] = 'off';
    }
    else if (msg == 'videoon') {
        console.log(sid + 'turned video on');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'hidden';
        videoInfo[sid] = 'on';
    }
})

doodleboardBtn.addEventListener('click', () => {
    if (boardvis) {
        doodleboardCont.style.visibility = 'hidden';
        boardvis = false;
    }
    else {
        doodleboardCont.style.visibility = 'visible';
        boardvis = true;
    }
})

endMeet.addEventListener('click', () => {
    location.href = '/';
})

// share screen
const shareScreenBtn = document.querySelector('.sharescreen')
shareScreenBtn.addEventListener("click", (e) => {
    if (e.target.classList.contains("true")) return;
    e.target.setAttribute("tool_tip", "You are already presenting screen");
    e.target.classList.add("true");
    navigator.mediaDevices
        .getDisplayMedia({
            video: true,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100,
            },
        })
        .then((localStream) => {
            var videoTrack = localStream.getVideoTracks()[0];
            myVideoTrack = mystream.getVideoTracks()[0];
            replaceVideoTrack(mystream, videoTrack);
            for (peer in peers) {
                let sender = peers[peer].peerConnection
                    .getSenders()
                    .find(function (s) {
                        return s.track.kind == videoTrack.kind;
                    });
                sender.replaceTrack(videoTrack);
            }
            const elementsWrapper = document.querySelector(".show-videoframe");
            const stopBtn = document.createElement("button");
            stopBtn.classList.add("video-element");
            stopBtn.classList.add("stop-presenting-button");
            stopBtn.innerHTML = "Stop Sharing";
            elementsWrapper.classList.add("screen-share");
            elementsWrapper.appendChild(stopBtn);
            videoTrack.onended = () => {
                elementsWrapper.classList.remove("screen-share");
                stopBtn.remove();
                stopPresenting(videoTrack);
            };
            stopBtn.onclick = () => {
                videoTrack.stop();
                elementsWrapper.classList.remove("screen-share");
                stopBtn.remove();
                stopPresenting(videoTrack);
            };
        });
});

const stopPresenting = (videoTrack) => {
    shareScreenBtn.classList.remove("true");
    shareScreenBtn.setAttribute("tool_tip", "Present Screen");
    for (peer in peers) {
        let sender = peers[peer].peerConnection.getSenders().find(function (s) {
            return s.track.kind == videoTrack.kind;
        });
        sender.replaceTrack(myVideoTrack);
    }
    replaceVideoTrack(mystream, myVideoTrack);
};

const crossBtnClickEvent = (e) => {
    const videoWrapper = e.target.parentElement;
    if (videoWrapper.classList.contains("zoom-video")) {
        videoWrapper.classList.remove("zoom-video");
        e.target.removeEventListener("click", crossBtnClickEvent);
        e.target.remove();
    }
};

// const vidrecord = document.querySelector('.record')


// const start= async()=>{

// const stream = await navigator.mediaDevices.getDisplayMedia(

// video : {
// mediaSource: "screen",
// },

// )};

// const data =[];

// const mediaRecorder = new MediaRecorder (stream);

// mediaRecorder.ondataavailable = (e) => {

// data.push(e.data);

// };

//     mediaRecorder.start();


// mediaRecorder.onstop= (e) => { document.querySelector(".vc-page").src = URL.createObjectURL(



// new Blob(data, {

// type: data[0].type,

// })

// );

// };

// await navigator.mediaDevices.getDisplay

// mediaSource: "screen";


// vidrecord.addEventListener('click', () => {
//     mediaRecorder.start();
// })


const recordingBtn = document.querySelector(".record");
const chunks = [];
var recorder;
recordingBtn.addEventListener("click", (e) => {
    const currentElement = e.target;
    const indicator = document.querySelector(".indic")

    // recording start
    if (indicator == null) {
        currentElement.setAttribute("tool_tip", "Stop Recording");
        currentElement.classList.add("tooltip-danger");
        currentElement.classList.add("blink");
        const recordingElement = document.createElement("div");
        recordingElement.classList.add("recording-indicator");
        recordingElement.innerHTML = `<div></div>`;
        myVideo.previousSibling.appendChild(recordingElement);
        // recording
        record(myVideoStream);
        recorder.start(1000);
    }
    // recording stop
    else {
        const completeBlob = new Blob(chunks, { type: chunks[0].type });
        var anchor = document.createElement("a");
        document.body.appendChild(anchor);
        anchor.style = "display: none";
        var url = window.URL.createObjectURL(completeBlob);
        anchor.href = url;
        anchor.download = `file.mp4`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        recorder.stop();
        currentElement.setAttribute("tool_tip", "Start Recording");
        currentElement.classList.remove("tooltip-danger");
        currentElement.classList.remove("blink");
        indicator.remove();
        while (chunks.length) {
            chunks.pop();
        }
    }
});

const record = (localStream) => {
    recorder = new MediaRecorder(localStream, {
        mineType: "video/webm;codecs=H264",
    });
    recorder.onstop = (e) => {
        delete recorder;
    };
    recorder.ondataavailable = (e) => {
        chunks.push(e.data);
    };
};


const meetNOW = document.querySelector('.meetnowbtn');
meetNOW.addEventListener('click', () => {
    location.href("public\mainpge.html");
    console.log('done')
})


// // const newChat = document.querySelector('.chat-now')
// newChat.addEventListener('click', () => {
//     function openForm() {
//         document.querySelector('.chat-now').style.display = "block";
//       }
      
//       function closeForm() {
//         document.querySelector('.chat-now').style.display = "none";
//       } 
   

// })

// sendBTN.addEventListener('click', () => {
//     const msg = msgbx.value;
//     msgbx.value = '';
//     socket.emit('message', msg, username, roomid);
// })

// msgbx.addEventListener("keyup", function (event) {
//     if (event.keyCode === 13) {
//         event.preventDefault();
//         sendBTN.click();
//     }
// });

// socket.on('message', (msg, sendername, time) => {
//     chatPage.scrollTop = chatPage.scrollHeight;
//     chatPage.innerHTML += `<div class="message">
//     <div class="info">
//         <div class="username">${sendername}</div>
//         <div class="time">${time}</div>
//     </div>
//     <div class="content">
//         ${msg}
//     </div>
// </div>`
// });

