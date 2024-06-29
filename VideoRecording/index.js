const record = document.querySelector(".record");
const stop = document.querySelector(".stop");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");

stop.disabled = true;

const log = (msg) => console.log(msg);

let audioCtx;
const canvasCtx = canvas.getContext("2d");

let mediaRecorder;
let chunks = [];
let stream;
let recordingAnimationId;

const audioRecordSuccess = (audioStream) => {
  log(audioStream);
  stream = audioStream;
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.onstop = (e) => {
    const clipName = prompt("Enter a name for your sound clip?", "My unnamed clip");

    const clipContainer = document.createElement("article");
    const clipLabel = document.createElement("p");
    const audio = document.createElement("audio");
    const deleteButton = document.createElement("button");

    clipContainer.classList.add("clip");
    audio.setAttribute("controls", "");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete";

    clipLabel.textContent = clipName === null ? "My unnamed clip" : clipName;

    clipContainer.append(audio, clipLabel, deleteButton);
    soundClips.appendChild(clipContainer);

    audio.controls = true;
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
    chunks = [];
    const audioURL = window.URL.createObjectURL(blob);
    audio.src = audioURL;

    deleteButton.onclick = (e) => e.target.closest(".clip").remove();

    clipLabel.onclick = () => {
      const existingName = clipLabel.textContent;
      const newClipName = prompt("Enter a new name for your sound clip?");
      clipLabel.textContent = newClipName === null ? existingName : newClipName;
    };

    stopRecordingAnimation();
    stream.getTracks().forEach(track => track.stop()); // Stop all tracks to reset permissions
  };

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  visualize(stream); // Call the visualize function here

  mediaRecorder.start();
  record.style.background = "red";
  stop.disabled = false;
  record.disabled = true;
};

const audioRecordError = (err) => log(err);

record.onclick = () => {
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(audioRecordSuccess)
      .catch(audioRecordError);
  }
};

stop.onclick = () => {
  mediaRecorder.stop();
  record.style.background = "";
  stop.disabled = true;
  record.disabled = false;
};

function visualize(stream) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  const highPassFilter = audioCtx.createBiquadFilter();

  // Set up the high-pass filter
  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = 1000; // Adjust the frequency as needed

  source.connect(highPassFilter);
  highPassFilter.connect(analyser);

  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    recordingAnimationId = requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    const barWidth = (WIDTH / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];

      canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
      canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }
  }

  draw();
}

function stopRecordingAnimation() {
  cancelAnimationFrame(recordingAnimationId);
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

window.onresize = () => {
  canvas.width = mainSection.offsetWidth;
};

window.onresize();
