var audioBufferNode, panner, mic;

async function setupWorker(sab, sampleRate) {
  await URLFromFiles(['js/wav-writer.js', 'lib/ringbuffer/index.js']).then((e) => {
    // The Web Worker can receive two commands: 
    // - on "init", it starts periodically reading from the queue and
    //  accumulating audio data.
    // - on "stop", it takes all this accumulated audio data, converts to PCM16
    // instead of float32 and turns the stream into a WAV file, sending it back
    // to the main thread to offer it as download.
    worker = new Worker(e);
    worker.postMessage({
      command: "init",
      sab: sab,
      channelCount: 2,
      sampleRate: sampleRate
    });

    worker.onmessage = async function (e) {
      switch (e.data.command) {
        case "downloadWavFile": {
          var a = document.createElement('a');
          a.style.display = 'none';
          document.body.appendChild(a);
          const blob = new Blob([e.data.wav], {
            type: 'audio/wav'
          });
          a.href = URL.createObjectURL(blob);
          a.download = `audio-${(new Date()).toISOString().replace(/[^0-9]/g, "")}.wav`;
          a.click();

          // disconnect microphone
          mic.disconnect(panner);
          mic.disconnect(ac.destination);

          // use decodeaudiodata on the wav buffer
          const audioBuffer = await ac.decodeAudioData(e.data.wav);
          audioBufferNode.buffer = audioBuffer;
          audioBufferNode.loop = true;
          // enable play buffer button
          playRecordedData.disabled = false;
          break;
        }
        case "audioBufferCurrentUpdated": {
          // Create an audio buffer from the PCM data.
          // convert e.data into a Float32Array
          const pcm = new Float32Array(e.data.buffer);
          // Create an AudioBuffer from the PCM data.
          const audioBuffer = new AudioBuffer({
            length: pcm.length / 2,
            sampleRate: sampleRate,
            numberOfChannels: 2
          });
          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.getChannelData(1);
          for (let i = 0; i < pcm.length; i += 2) {
            left[i / 2] = pcm[i];
            right[i / 2] = pcm[i + 1];
          }
          audioBufferNode = ac.createBufferSource();              
          audioBufferNode.buffer = audioBuffer;
          audioBufferNode.loop = true;
          audioBufferNode.connect(ac.destination);

          // draw waveform
          const canvas = document.querySelector("#waveform");
          let drawer = new WaveformDrawer(audioBufferNode.buffer, canvas, "green");
          drawer.drawWave(0, 100);
          break;
        }
        case "audioBufferFinal": {
          // Create an audio buffer from the PCM data.
          // convert e.data into a Float32Array
          const pcm = new Float32Array(e.data.buffer);
          // Create an AudioBuffer from the PCM data.
          const audioBuffer = new AudioBuffer({
            length: pcm.length / 2,
            sampleRate: sampleRate,
            numberOfChannels: 2
          });
          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.getChannelData(1);
          for (let i = 0; i < pcm.length; i += 2) {
            left[i / 2] = pcm[i];
            right[i / 2] = pcm[i + 1];
          }


          // stop mic input
          mic.disconnect(panner);
          mic.disconnect(ac.destination);
          audioBufferNode = ac.createBufferSource();              
          audioBufferNode.buffer = audioBuffer;
          audioBufferNode.loop = true;
          audioBufferNode.connect(ac.destination);
          // enable play buffer button
          playRecordedData.disabled = false;

          // draw waveform
          const canvas = document.querySelector("#waveform");
          let drawer = new WaveformDrawer(audioBufferNode.buffer, canvas, "green");
          drawer.drawWave(0, 100);
          break;
        }
      }
    }
  });
};

async function setupWebAudio(ac, sab) {
  ac.resume();

  // Generate a tone that goes left and right and up and down. Route it to an
  // AudioWorkletProcessor that does the recording, as well as to the output.
  //osc = new OscillatorNode(ac);
  //var fm = new OscillatorNode(ac);
  var gain = new GainNode(ac);
  panner = new StereoPannerNode(ac);
  var panModulation = new OscillatorNode(ac);
  //audioBufferNode = new AudioBufferSourceNode(ac);
  audioBufferNode = ac.createBufferSource();
  mic;


  // Create MediaStreamAudioSourceNode with microphone input
  var recorderWorklet =
    new AudioWorkletNode(ac, "recorder-worklet", {
      processorOptions: sab
    });

  panModulation.frequency.value = 2.0;
  fm.frequency.value = 1.0;
  gain.gain.value = 110;

  // get microphone input stream using the media device api
  // Options for low latency and no echocancellation
  var constraints = {
    audio: {
      echoCancellation: false,
      mozNoiseSuppression: false,
      mozAutoGainControl: false
    }
  };
  let stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Create MediaStreamAudioSourceNode with microphone input
  mic = new MediaStreamAudioSourceNode(ac, {
    mediaStream: stream
  });

  mic.connect(panner).connect(recorderWorklet);
  mic.connect(ac.destination);

  audioBufferNode.connect(ac.destination);

  /*
panModulation.connect(panner.pan);
fm.connect(gain).connect(osc.frequency);
osc.connect(panner).connect(ac.destination);
panner.connect(recorderWorklet);
*/



  //osc.start(0);
  //fm.start(0);
  //panModulation.start(0);
}

// MAIN CODE !
var ac = new AudioContext();
var osc = null;


URLFromFiles(['js/recorder-worklet.js', 'lib/ringbuffer/index.js']).then((e) => {
  if (ac.audioWorklet === undefined) {
    alert("No AudioWorklet, try another browser.");
  } else {
    ac.audioWorklet.addModule(e).then(() => {
      
      playRecordedData.onclick = function () {
        audioBufferNode.start();
      }

      startstop.disabled = false;
      startstop.onclick = async function () {
        if (startstop.innerText == "Start") {
          // One second of stereo Float32 PCM ought to be plentiful.
          var sab = RingBuffer.getStorageForCapacity(ac.sampleRate * 2, Float32Array);

          await setupWorker(sab, ac.sampleRate);
          await setupWebAudio(ac, sab);

          startstop.innerText = "Stop";
        } else {
          worker.postMessage({
            "command": "stopAndSendAsBuffer"
          })
          
         /*
          worker.postMessage({
            "command": "stopAndDownloadAsWavFile"
          }); 
          */
          startstop.innerText = "Start";
        }
      }
    });
  }
});