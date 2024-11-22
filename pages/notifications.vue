<template>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <!-- Sidebar -->
  <aside class="sidebar">
    <h2 class="sidebar-title">Menu</h2>
    <ul class="sidebar-menu">
      <li class="sidebar-item">
        <a href="/home" class="sidebar-link">
          <i class="fas fa-home"></i> Home
        </a>
      </li>
      <li class="sidebar-item">
        <a href="/notifications" class="sidebar-link">
          <i class="fas fa-bell"></i> Notification
        </a>
      </li>
      <li class="sidebar-item">
        <a href="/contacts" class="sidebar-link">
          <i class="fas fa-user"></i> Contacts
        </a>
      </li>
    </ul>
    <div class="sidebar-footer">
      <button @click="logout()" class="sidebar-logout-button">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <div class="main-content">
    <div v-if="!joined" class="container">
      <div class="fixed-header">
        <h1 class="title">Notifications</h1>
        <p class="subtitle">
          Hello {{ userName }}, you have some notifications due.
        </p>
      </div>

      <div id="app">
        <ul class="message-list">
          <li v-for="(message, index) in messages" :key="message.id" class="message-item" :class="{ 'read-message': message.read }">
            {{ message.message }} at {{ message.created_at }}
            <button class="call-button" @click="joinRoom('publisher', message.room_id)">Join</button>
          </li>
        </ul>
      </div>
    </div>
    <div v-else>
      <div class="controls">
        <button v-if="isPublisher" @click="toggleMute" class="control-button">
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>
        <button v-if="isPublisher" @click="toggleVideo" class="control-button">
          {{ isVideoOff ? 'Video On' : 'Video Off' }}
        </button>
        <button @click="leaveRoom" class="control-button">Leave Room</button>
      </div>
      <div class="wrapper">
        <div id="localParticipant" class="participant" v-if="isPublisher">
          <video ref="localVideo" autoplay muted playsinline class="local-video"></video>
        </div>
        <div class="remote-participants">
          <div v-for="(participant, index) in remoteParticipants" :key="participant.id" class="participant">
            <video :ref="'remoteVideo' + participant.id" autoplay playsinline class="remote-video"></video>
            <p>{{ participant.display }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import Pusher from 'pusher-js';
import Janus from 'janus-gateway';
import adapter from 'webrtc-adapter';
import { useRouter } from 'vue-router';
import { useAuthStore } from '~/store/auth';
const router = useRouter()
export default defineComponent({
    data() {
        return {
            username: null,
            feedId: null,
            joined: false,
            localStream: null,
            janusConnection: null,
            janusPlugin: null,
            myRoom: null,
            remoteParticipants: [],
            isMuted: false,
            isVideoOff: false,
            isPublisher: false,
            opaqueId: `videoroom - ${ Janus.randomString(12) }`,
    };
    },
  setup() {
    const messages = ref([]);
    const userId = ref(null);
    const userName = ref(null);
    const fetchHelper = async () => {
      try {
        // Fetch notifications
        const responseNotification = await $fetch('/api/getMyNotification');
        messages.value = responseNotification.data;
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    const fetchUserId = async () => {
      try {
        // Fetch user data
        const responseUserData = await $fetch('/api/getUserData');
        userId.value = responseUserData.data.id;
        userName.value = responseUserData.data.name;
      } catch (error) {
        console.error("Error fetching userId and userName:", error);
      }
    };
    onMounted(async () => {
      await fetchUserId();

      // Set up Pusher
      Pusher.logToConsole = true;
      const pusher = new Pusher('2459f4787fcfcb1af769', {
        cluster: 'ap1',
      });

      // Subscribe to the user's notification channel
      const channel = pusher.subscribe(`notifications.${userId.value}`);
      channel.bind(`notifications.created`, () => {
        fetchHelper();
      });

      // Fetch initial data
      await fetchHelper();
    });

    return {
      messages,
      userId,
      userName,
    };
  },
    computed: {
      userStore() {
        return useAuthStore();
      }
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
      async joinRoom(role, room) {
        if (this.username === '') {
            alert('Please enter a username');
            return;
        }
        this.myRoom = room;
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
        this.janusConnection?.attach({
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
      this.username = this.userName;
        console.log(this.username);
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
     async logout() {
      try{
      const data = await $fetch('/api/logout');
      user.value = null;
      userStore.setUser(null);
      router.push('/')
    }catch(error){
      console.error("Error fetching data ", error);
    }
},
  },
});
</script>
<style scoped>
/* General Container and Layout */
.container {
  max-width: 50rem;
  margin: 0 auto;
  padding: 1.5rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.main-content {
  margin-left: 220px;
  padding: 16px;
}

/* Fixed Header */
.fixed-header {
  position: sticky;
  top: 0;
  background-color: #fff;
  padding: 1rem;
  z-index: 10;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  font-size: 2rem;
  font-weight: 300;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.subtitle {
  color: #4b5563;
  margin-bottom: 1rem;
}

/* Message List */
.message-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.message-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: white;
  border: 1px solid #f3f4f6;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.read-message {
  background-color: #f0f0f0;
  color: #6c757d;
}

/* Buttons */
.call-button, .control-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
  margin-right: 5px;
}

.control-button {
  background-color: #007bff;
}

.control-button:hover, .call-button:hover {
  background-color: #0056b3;
}

/* Sidebar */
.sidebar {
  width: 200px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  background-color: #f8f9fa;
  padding: 1rem;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.sidebar-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.sidebar-menu {
  list-style-type: none;
  padding: 0;
}

.sidebar-item {
  margin: 0.5rem 0;
}

.sidebar-link {
  text-decoration: none;
  color: #000;
  display: flex;
  align-items: center;
}

.sidebar-link i {
  margin-right: 8px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #ccc;
}

.sidebar-logout-button {
  background: none;
  border: none;
  color: #333;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-logout-button:hover {
  color: #d9534f;
}

/* Video and Participant Styles */
.remote-participants, #localParticipant {
  display: flex;
  justify-content: center;
  align-items: center;
}

.participant {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #ffffff;
  border-radius: 10px;
  padding: 10px;
  margin: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}

.remote-video, .local-video {
  width: 100%;
  height: auto;
  border-radius: 10px;
  background-color: #000;
  object-fit: contain;
}

/* Responsive Adjustments */
@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
  }
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
  }
}

@media (max-width: 600px) {
  .remote-participants {
    flex-direction: column;
  }

  .control-button {
    font-size: 14px;
    padding: 8px 16px;
  }
}
</style>
