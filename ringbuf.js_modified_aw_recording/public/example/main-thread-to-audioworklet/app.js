const $ = document.querySelectorAll.bind(document);
const log_root = $("#log")[0];

function log(str) {
  log_root.innerHTML += str + "<br>";
}

const ctx = new AudioContext();
ctx.suspend();
let frequency = 440,
  phase = 0.0;
const sine = new Float32Array(128);

URLFromFiles(["processor.js", "../index.js"]).then((e) => {
  if (ctx.audioWorklet === undefined) {
    log("No AudioWorklet.");
  } else {
    ctx.audioWorklet.addModule(e).then(() => {
      // 50ms of buffer, increase in case of glitches
      const sab = exports.RingBuffer.getStorageForCapacity(
        ctx.sampleRate / 20,
        Float32Array
      );
      const rb = new exports.RingBuffer(sab, Float32Array);
      audioWriter = new exports.AudioWriter(rb);

      const sab2 = exports.RingBuffer.getStorageForCapacity(31, Uint8Array);
      const rb2 = new exports.RingBuffer(sab2, Uint8Array);
      paramWriter = new ParameterWriter(rb2);

      const n = new AudioWorkletNode(ctx, "processor", {
        processorOptions: {
          audioQueue: sab,
          paramQueue: sab2,
        },
      });
      n.connect(ctx.destination);

      const freq = $(".freq")[0];
      const label = $(".freqLabel")[0];

      freq.addEventListener("input", (e) => {
        label.innerText = e.target.value;
        frequency = e.target.value;
      });
      const amp = $(".amp")[0];
      const ampLabel = $(".ampLabel")[0];

      amp.addEventListener("input", (e) => {
        ampLabel.innerText = e.target.value;
        if (!paramWriter.enqueue_change(0, e.target.value)) {
          console.error("Couldn't enqueue.");
        }
      });
    });
  }
});

function render() {
  requestAnimationFrame(render);
  if (!window.audioWriter) {
    return;
  }
  // Synthetize a simple sine wave so it's easy to hear glitches, continuously
  // if there is room in the ring buffer.
  while (window.audioWriter.available_write() > 128) {
    for (let i = 0; i < 128; i++) {
      sine[i] = Math.sin(phase);
      phase += (2 * Math.PI * frequency) / ctx.sampleRate;
      if (phase > 2 * Math.PI) {
        phase -= 2 * Math.PI;
      }
    }
    window.audioWriter.enqueue(sine);
  }
}
requestAnimationFrame(render);

const start = $(".start")[0];
start.onclick = function () {
  if (ctx.state === "running") {
    ctx.suspend();
    start.innerText = "Start";
  } else {
    ctx.resume();
    start.innerText = "Stop";
  }
};
