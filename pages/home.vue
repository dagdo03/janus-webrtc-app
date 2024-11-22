<template>
    <!-- Include Font Awesome in your index.html or main layout file -->
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

  <!-- Sidebar Footer with Logout Button -->
  <div class="sidebar-footer">
    <button @click="logout()" class="sidebar-logout-button">
      <i class="fas fa-sign-out-alt"></i> Logout
    </button>
  </div>
</aside>


  <div class="main-content">
    <div v-if="!joined" class="container mx-auto p-4 light-theme">
      <h1 class="text-2xl font-bold mb-4">Available Rooms</h1>
      <!-- <button @click="createRoom" class="create-room-button">
        Create New Room
      </button> -->
      <div v-if="error" class="text-red-500">
        Error loading rooms: {{ error }}
      </div>
      <div v-else-if="loading" class="text-gray-500">
        Loading rooms...
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="room in rooms"
          :key="room.room"
          class="room-card p-4 border rounded shadow-md cursor-pointer"
          @click="joinRoom('publisher', room.room)"
        >
          <h2 class="text-xl font-semibold">{{ room.description }}</h2>
          <p class="text-gray-600">Max Participants: {{ room.max_publishers }}</p>
        </div>
      </div>
    </div>
    
    <div  v-else class="video-screen">
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


<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/store/auth';
import { useRouter } from 'vue-router';
definePageMeta({
  middleware: 'auth'
})

const user = ref(null);
const loading = ref(true);
const error = ref(null);
const rooms = ref([]);
const userStore = useAuthStore()
const router = useRouter()
const fetchRooms = async () => {
  try {
    const response = await $fetch('/api/getListRoom');
    console.log('API response:', response);  // Debug log

    if (response && response.response?.plugindata?.data?.list) {
      rooms.value = response.response.plugindata.data.list;
    } else {
      console.error('Unexpected response structure:', response);
      error.value = 'Unexpected response structure';
    }
  } catch (err) {
    console.error('Error fetching rooms:', err);
    error.value = err.message || 'Error fetching rooms';
  } finally {
    loading.value = false;
  }
};


const fetchUserData = async () => {
  try{
  const data = await $fetch('/api/getUserData');
  user.value = data.data; 
  userStore.setUser(data.data.name);
  console.log(userStore.getUser());
  console.log(user.value) // Log to verify the user ref is updated
  }catch(error){
    console.error("Error fetching data ", error)
  }
};

const logout = async () => {
  try{
    const data = await $fetch('/api/logout');
    user.value = null;
    userStore.setUser(null);
    router.push('/')
  }catch(error){
    console.error("Error fetching data ", error);
  }
}

onMounted(() => {
  fetchRooms();
  fetchUserData();
});
</script>
<script>
import Janus from 'janus-gateway';
import adapter from 'webrtc-adapter';
import { useRouter } from 'vue-router';
const router = useRouter()
export default {
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
        console.log(this.username);
        this.username = this.userStore.getUser()
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
    createRoom() {
      this.router.push('/newRoom');
    }
},
};
</script>
<style scoped>
.container {
  max-width: 1200px;
}
.create-room-button {
  position: absolute;
  top: 16px; /* Space from the top */
  right: 16px; /* Space from the right */
  background-color: #007bff; /* Blue background */
  color: white; /* White text */
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.create-room-button:hover {
  background-color: #0056b3; /* Darker blue on hover */
}
.room-card {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0; /* Light gray border */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s; /* Animation */
  cursor: pointer;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); /* Enhanced shadow on hover */
}

.room-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748; /* Darker text color */
  margin-bottom: 0.5rem;
}

.room-info {
  font-size: 0.875rem;
  color: #4a5568; /* Medium gray */
}

/* Video Screen Styles */
.video-screen {
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;
  width: 98%;
  height: 100%;
  border-radius: 10px;
  max-height: 100%;
  background-color: #f0f0f0;
  padding: 10px;
  gap: 10px;
}

.remote-participants,
#localParticipant {
  display: flex;
  justify-content: center;
  align-items: center;
  width: auto;
  height: auto;
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
  max-height: auto; /* Ensure the participant video doesn't exceed the available height */
}

.remote-video, .local-video {
  width: auto;
  height: auto;
  border-radius: 10px;
  background-color: #000;
  object-fit: contain; /* Show entire video without cropping */
}

.controls {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.control-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.control-button:hover {
  background-color: #0056b3;
}

.control-button:focus {
  outline: none;
}

.control-button:active {
  background-color: #004085;
}

/* Responsive layout for participant videos */
@media (max-width: 1024px) {
  .remote-participants, #localParticipant {
    height: auto;
  }
}

@media (max-width: 600px) {
  .remote-participants {
    flex-direction: column; /* Stack vertically for small screens */
  }

  .control-button {
    font-size: 14px;
    padding: 8px 16px;
  }
}

/* Prevent dark mode by applying a light theme explicitly */
.light-theme {
  background-color: white !important;
  color: black !important;
}

/* Ensure nested elements also have the light theme */
.light-theme .card {
  background-color: #f7fafc !important;
  color: black !important;
}

.light-theme h1, 
.light-theme h2, 
.light-theme p {
  color: black !important;
}

/* Sidebar Styles */
.sidebar {
  width: 200px; /* Adjust width as needed */
  position: fixed; /* Keep sidebar fixed */
  left: 0; /* Align to left */
  top: 0; /* Align to top */
  height: 100%; /* Full height */
  background-color: #f8f9fa; /* Light background */
  padding: 1rem; /* Padding */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1); /* Shadow for depth */
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

.sidebar-item a {
  text-decoration: none;
  color: #000000; /* Link color */
}

.sidebar-item a:hover {
  text-decoration: underline; /* Underline on hover */
}

/* Main content area */
.main-content {
  margin-left: 250px; /* Shift content to the right */
  padding: 16px; /* Add some padding */
}

.sidebar-link {
  text-decoration: none;
  color: black; /* Black text color */
  display: flex;
  align-items: center; /* Center items vertically */
}

.sidebar-link i {
  margin-right: 8px; /* Space between icon and text */
}

/* Add styles for icon hover effects */
.sidebar-link:hover {
  color: #007bff; /* Optional: Change color on hover */
}
.sidebar-footer {
  margin-top: auto;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #ccc; /* Optional: separates the footer visually */
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
  color: #d9534f; /* Optional: hover effect for logout button */
}
</style>
