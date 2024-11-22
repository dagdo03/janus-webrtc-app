<template>
    <div class="janus-demo">
        <h1>Janus WebRTC Demo - Multistream</h1>

        <!-- Join Screen -->
        <div v-if="!joined" class="join-screen">
            <input v-model="username" type="text" placeholder="Enter your name" class="username-input" />
            <div class="join-buttons">
                <button @click="joinRoom('publisher')" class="join-button">Join</button>
            </div>
        </div>

        <!-- Video Screen -->
        <div v-else class="video-screen">
            <div id="localParticipant" class="participant" v-if="isPublisher">
                <video ref="localVideo" autoplay muted playsinline class="local-video"></video>
            </div>
            <div class="remote-participants">
                <div v-for="(participant, index) in remoteParticipants" :key="participant.id" class="participant">
                    <video :ref="'remoteVideo' + participant.id" autoplay playsinline class="remote-video"></video>
                    <p>{{ participant.display }}</p>
                </div>
            </div>
            <div class="controls">
                <button v-if="isPublisher" @click="toggleMute" class="control-button">
                    {{ isMuted ? 'Unmute' : 'Mute' }}
                </button>
                <button v-if="isPublisher" @click="toggleVideo" class="control-button">
                    {{ isVideoOff ? 'Video On' : 'Video Off' }}
                </button>
                <button @click="leaveRoom" class="control-button">Leave Room</button>
            </div>
        </div>
    </div>
</template>

<script>
import Janus from 'janus-gateway';
import adapter from 'webrtc-adapter';

export default {
    data() {
        return {
            username: '',
            feedId: null,
            joined: false,
            localStream: null,
            janusConnection: null,
            janusPlugin: null,
            myRoom: 1234,
            remoteParticipants: [],
            isMuted: false,
            isVideoOff: false,
            isPublisher: false,
            opaqueId: `videoroom - ${ Janus.randomString(12) }`,
    };
    },
    watch: {
        // Watch for changes in remoteParticipants
        remoteParticipants: {
            handler(newParticipants) {
                // Loop through each participant and check if their video is off
                newParticipants.forEach((participant) => {
                    this.handleRemoteVideoState(participant.id, participant.isVideoOff);
                });
            },
            deep: true // Ensure we detect changes to properties within objects (like isVideoOff)
        }
    },
methods: {
    async joinRoom(role) {
        if (this.username === '') {
            alert('Please enter a username');
            return;
        }
        this.isPublisher = role === 'publisher';
        this.joined = true;
        this.initializeJanus();
    },
    initializeJanus() {
        Janus.init({
            debug: 'all',
            dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
            callback: () => {
                this.janusConnection = new Janus({
                    server: 'ws://192.168.1.27:8188/', // Replace with your Janus server URL
                    success: () => {
                        this.attachPlugin();
                    },
                    error: (error) => {
                        console.error('Error connecting to Janus', error);
                        alert('Failed to connect to the Janus server');
                    },
                    destroyed: () => {
                        window.location.reload();
                    },
                });
            },
        });
    },
    attachPlugin() {
        this.janusConnection.attach({
            plugin: 'janus.plugin.videoroom',
            opaqueId: this.opaqueId,
            success: (pluginHandle) => {
                this.janusPlugin = pluginHandle;
                this.joinVideoRoom();
            },
            error: (error) => {
                console.error('Error attaching plugin', error);
            },
            consentDialog: (on) => {
                console.log('Consent dialog should be ' + (on ? 'on' : 'off') + ' now');
            },
            mediaState: (medium, on) => {
                console.log('Janus ' + (on ? 'started' : 'stopped') + ' receiving our ' + medium);
            },
            webrtcState: (on) => {
                console.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
            },
            onmessage: (msg, jsep) => {
                this.handleOnMessage(msg, jsep);
            },
            onlocalstream: (stream) => {
                this.localStream = stream;
                this.$refs.localVideo.srcObject = stream;
            },
            onremotestream: (stream) => {
                this.$refs.remoteVideo.srcObject = stream;
                const videoElement = document.getElementById('remotevideo-' + id);
                if (videoElement) {
                    Janus.attachMediaStream(videoElement, stream);
                }
            },
            oncleanup: () => {
                console.log('Got a cleanup notification');
            },
        });
    },
    joinVideoRoom() {
        const register = {
            request: 'join',
            room: this.myRoom,
            ptype: this.isPublisher ? 'publisher' : 'subscriber',
            feed: this.feedId,
            display: this.username,
        };
        this.janusPlugin.send({ message: register });
    },
    handleOnMessage(msg, jsep) {
        console.log('Got a message:', msg);
        const event = msg['videoroom'];
        if (event) {
            if (event === 'joined') {
                this.myId = msg['id'];
                console.log('Successfully joined room ' + msg['room'] + ' with ID ' + this.myId);
                if (this.isPublisher) {
                    this.publishOwnFeed(true);
                }
                if (msg['publishers']) {
                    this.handleRemotePublishers(msg['publishers']);
                }
            } else if (event === 'event') {
                if (msg['publishers']) {
                    this.handleRemotePublishers(msg['publishers']);
                } else if (msg['leaving']) {
                    this.removeRemoteFeed(msg['leaving']);
                } else if (msg['unpublished']) {
                    this.removeRemoteFeed(msg['unpublished']);
                } else if (msg['error']) {
                    alert(msg['error']);
                }
            }
        }

        if (jsep) {
            console.log('Handling SDP as well...', jsep);
            this.janusPlugin.handleRemoteJsep({ jsep });
        }
    },
        async publishOwnFeed(useAudio) {
        const constraints = { audio: useAudio, video: true };
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.$refs.localVideo.srcObject = this.localStream;
            this.janusPlugin.createOffer({
                media: { audioRecv: true, videoRecv: true, audioSend: useAudio, videoSend: true },
                stream: this.localStream,
                success: (jsep) => {
                    const publish = { request: 'publish', audio: useAudio, video: true };
                    this.janusPlugin.send({ message: publish, jsep });
                },
                error: (error) => {
                    console.error('WebRTC error:', error);
                    if (useAudio) {
                        this.publishOwnFeed(false);
                    } else {
                        alert('WebRTC error... ' + error.message);
                    }
                },
            });
        } catch (error) {
            console.error('getUserMedia error:', error);
            alert('getUserMedia error... ' + error.message);
        }
    },
    handleRemotePublishers(publishers) {
        console.log("ini dari handleremote: ", publishers);
        console.log("ini dari handleremote: ", this.remoteParticipants);
        for (const publisher of publishers) {
            const id = publisher['id'];
            this.feedId = id;
            const display = publisher['display'];
            const stream = publisher['stream'];
            console.log("cek stream handle remote", stream, publisher);
            console.log('New publisher:', id, display);
            this.newRemoteFeed(id, display, stream);
            const participant = {
                id : id,
                display: display,
                stream : stream
            };
            this.remoteParticipants.push(participant);
        }
    },
    newRemoteFeed(id, display) {
        console.log("ini dari new remote feed", id);
        let remoteFeed = null;
        this.janusConnection.attach({
            plugin: 'janus.plugin.videoroom',
            opaqueId: 'remoteFeed-' + Janus.randomString(12),
            success: (pluginHandle) => {
                remoteFeed = pluginHandle;
                console.log('Plugin attached! (' + remoteFeed.getPlugin() + ', id=' + remoteFeed.getId() + ')');

                // Attach the remote feed ID properly here
                remoteFeed.rfid = id; // Ensure the remote feed ID is set correctly

                const subscribe = {
                    request: 'join',
                    room: this.myRoom,
                    ptype: 'subscriber',
                    feed: id, // Use the provided feed ID
                };
                remoteFeed.send({ message: subscribe });
            },
            error: (error) => {
                console.error('Error attaching plugin:', error);
                alert('Error attaching plugin... ' + error.message);
            },
            onmessage: (msg, jsep) => {
                const event = msg['videoroom'];
                if (msg['error']) {
                    alert(msg['error']);
                } else if (event && event === 'attached') {
                    console.log('Successfully attached to feed ' + remoteFeed.rfid); // Log the correct feed ID here
                }
                if (jsep) {
                    remoteFeed.createAnswer({
                        jsep: jsep,
                        media: { audioSend: true, videoSend: true },
                        success: (jsep) => {
                            const body = { request: 'start', room: this.myRoom };
                            remoteFeed.send({ message: body, jsep: jsep });
                        },
                        error: (error) => {
                            console.error('WebRTC error:', error);
                            alert('WebRTC error... ' + error.message);
                        },
                    });
                }
            },
            onremotetrack: (track, mid, added, participantId) => {
                if (!added) {
                    console.log('Track removed:', mid);
                    return;
                }
                console.log('New track added:', track, 'MID:', mid);
                // Check if the track is a video or audio track
                if (track.kind === 'video' || track.kind === 'audio') {
                    const videoElements = this.$refs['remoteVideo' + id];
                    let stream = videoElements[0].srcObject || new MediaStream();

                    // Add the track to the MediaStream if it's video or audio
                    stream.addTrack(track);

                    // Attach the updated MediaStream to the video element
                    videoElements[0].srcObject = stream;
                    if (videoElements && videoElements.length > 0) {
                        videoElements[0].srcObject = videoStream;
                    } else {
                        console.error('Remote video element not found for feed ' + id);
                    }

                    // Call handleRemoteVideoState here when the video track is added
                    const participant = this.remoteParticipants.find(p => p.id === participantId);
                    if (participant) {
                        this.handleRemoteVideoState(participantId, participant.isVideoOff);
                    }
                }
            },
            oncleanup: () => {
                console.log('Got a cleanup notification (remote feed ' + id + ')');
                this.removeRemoteFeed(id);
            },
        });
    },
    addRemoteParticipant(id, display, stream) {
        console.log(id);
        this.remoteParticipants.push({ id, display, stream });
        this.$nextTick(() => {
            const videoElement = this.$refs['remoteVideo' + id];
            if (videoElement) {
                videoElement.srcObject = stream;
            }
        });
    },
    removeRemoteFeed(id) {
        this.remoteParticipants = this.remoteParticipants.filter((participant) => participant.id !== id);
    },
    toggleMute() {
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            this.isMuted = !this.isMuted;
            audioTracks[0].enabled = !this.isMuted;

            // Send the mute/unmute signal to Janus
            const muteMessage = { request: 'configure', audio: !this.isMuted };
            this.janusPlugin.send({ message: muteMessage });
        }
    },
    toggleVideo() {
        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            this.isVideoOff = !this.isVideoOff;
            videoTracks[0].enabled = !this.isVideoOff;

            // Send the video on/off signal to Janus
            const videoMessage = { request: 'configure', video: !this.isVideoOff };
            this.janusPlugin.send({ message: videoMessage });

            // Select the video element and apply/remove the black background
            const localVideoElement = this.$refs.localVideo;
            if (this.isVideoOff) {
                localVideoElement.style.backgroundColor = "black";
            } else {
                localVideoElement.style.backgroundColor = "transparent"; // or remove the style
            }
        }
    },
    handleRemoteVideoState(id, isVideoOff) {
        const videoElement = this.$refs['remoteVideo' + id];
        if (videoElement && videoElement.length > 0) {
            // If video is off, apply a black background to the video element
            videoElement[0].style.backgroundColor = isVideoOff ? 'black' : '';
        }
    },
    leaveRoom() {
        if (this.janusPlugin) {
            this.janusPlugin.send({ message: { request: 'leave' } });
            this.janusPlugin.hangup();
        }
        if (this.janusConnection) {
            this.janusConnection.destroy();
        }
        this.resetState();
    },
    resetState() {
        this.joined = false;
        this.isPublisher = false;
        this.localStream = null;
        this.remoteParticipants = [];
        this.janusPlugin = null;
        this.janusConnection = null;
    },
},
};
</script>

<style scoped>
.janus-demo {
    text-align: center;
    font-family: Arial, sans-serif;
}

.join-screen {
    margin-top: 50px;
}

.username-input {
    padding: 10px;
    font-size: 16px;
    width: 200px;
    margin-right: 10px;
}

.join-buttons {
    margin-top: 10px;
}

.join-button {
    padding: 10px 20px;
    font-size: 16px;
    background-color: #4caf50;
    color: white;
    border: none;
    cursor: pointer;
    margin: 5px;
}

.join-button:hover {
    background-color: #45a049;
}

.video-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 20px;
}

.participant {
    margin: 10px;
}

.local-video {
    width: 300px;
    height: 225px;
    border: 1px solid black;
}

.remote-participants {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 20px;
}

.remote-video {
    width: 300px;
    height: 225px;
    border: 1px solid black;
    margin: 10px;
}

.controls {
    margin-top: 20px;
}

.control-button {
    padding: 10px 20px;
    font-size: 16px;
    background-color: #008cba;
    color: white;
    border: none;
    cursor: pointer;
    margin: 5px;
}

.control-button:hover {
    background-color: #007bb5;
}
</style>