// plugins/janus.js
import Janus from 'janus-gateway';
import adapter from 'webrtc-adapter';

export default defineNuxtPlugin(() => {
  let janus = null;
  let videoroom = null;

  const initJanus = async (serverUrl, opaqueId) => {
    return new Promise((resolve, reject) => {
      Janus.init({
        debug: "all",
        dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
        callback: () => {
          janus = new Janus({
            server: serverUrl,
            success: () => {
              janus.attach({
                plugin: "janus.plugin.videoroom",
                opaqueId: opaqueId,
                success: (pluginHandle) => {
                  videoroom = pluginHandle;
                  console.log("Plugin attached! Handle ID: ", videoroom.getId());
                  resolve(videoroom);  // Resolve promise after success
                },
                error: (error) => {
                  console.error("Error attaching plugin: ", error);
                  reject(error);  // Reject on error
                }
              });
            },
            error: (error) => {
              console.error("Janus error: ", error);
              reject(error);  // Reject on error
            }
          });
        }
      });
    });
  };

  const createRoom = (roomId, successCallback, errorCallback) => {
    if (videoroom) {
      videoroom.send({
        message: {
          request: "create",
          room: roomId,
          publishers: 6
        },
        success: successCallback,
        error: errorCallback
      });
    } else {
      console.error('Janus is not initialized.');
    }
  };

  const joinRoom = (roomId, privateId, displayName, successCallback, errorCallback) => {
    if (videoroom) {
      videoroom.send({
        message: {
          request: "join",
          room: roomId,
          ptype: "publisher",
          display: displayName,
          id: privateId
        },
        success: successCallback,
        error: errorCallback
      });
    } else {
      console.error('Janus is not initialized.');
    }
  };

  return {
    provide: {
      janus: {
        janus: Janus,
        init: initJanus,
        createRoom: createRoom,
        joinRoom: joinRoom
      }
    }
  };
});
