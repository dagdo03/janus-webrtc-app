<template>
    <div>
        <h1>Janus WebRTC Demo</h1>
        <div>
            <video ref="localVideo" autoplay muted></video>
            <video ref="remoteVideo" autoplay></video>
        </div>
        <button @click="start">Start</button>
        <button @click="call">Call</button>
        <button @click="hangup">Hang Up</button>
    </div>
</template>

<script>
import Janus from 'janus-gateway';

export default {
    data() {
        return {
            localStream: null,
            remoteStream: null,
            janusConnection: null,
            janusPlugin: null,
        };
    },
    methods: {
        async start() {
            try {
                // Get the user's local media stream
                this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                // Set the local video stream to the video element
                this.$refs.localVideo.srcObject = this.localStream;

                // Initialize Janus WebRTC connection
                this.initializeJanus();
            } catch (error) {
                console.error("Error accessing media devices.", error);
            }
        },

        initializeJanus() {
            Janus.init({
                debug: "all",
                callback: () => {
                    this.janusConnection = new Janus({
                        server: 'ws://192.168.1.27:8188/',  // Replace with your Janus server URL
                        success: () => {
                            this.janusConnection.attach({
                                plugin: "janus.plugin.videoroom",
                                success: (pluginHandle) => {
                                    this.janusPlugin = pluginHandle;
                                    console.log("Janus plugin attached", this.janusPlugin);
                                    // You can add more plugin-related logic here
                                },
                                error: (error) => {
                                    console.error("Error attaching plugin", error);
                                },
                            });
                        },
                        error: (error) => {
                            console.error("Error connecting to Janus", error);
                        },
                    });
                },
            });
        },

        call() {
            console.log("Starting the call...");
            // Implement the logic to start a WebRTC call using Janus
            // For example, create an offer, send it to Janus, and attach streams
            if (this.janusPlugin) {
                this.janusPlugin.createOffer({
                    media: { video: true, audio: true },
                    success: (jsep) => {
                        this.janusPlugin.send({
                            message: {
                                request: "join",
                                room: 1234,  // Replace with your room ID
                                ptype: "publisher",
                                display: "User"
                            },
                            jsep: jsep,
                        });
                    },
                    error: (error) => {
                        console.error("Error creating offer", error);
                    }
                });
            }
        },

        hangup() {
            console.log("Hanging up the call...");
            // Implement the logic to hang up the call
            if (this.janusPlugin) {
                this.janusPlugin.hangup();
            }
        }
    },
    mounted() {
        // Access the DOM elements (localVideo and remoteVideo) using refs
        this.$refs.localVideo.srcObject = this.localStream;
        this.$refs.remoteVideo.srcObject = this.remoteStream;
    }
};
</script>

<style scoped>
video {
    width: 300px;
    height: 200px;
}
</style>
