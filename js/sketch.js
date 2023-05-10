let nxDial, nxButton;
let connectButton;
let port;
let writer, reader;
let sliderBlue;
let red, green, blue;
let joySwitch;
let sensorData = {};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let activationState = { active: false };

function setup() {
  createCanvas(750,500);
  
  // background(250);
  // background(350, 270, 110);
  background(150, 130, 320);
  

  strokeWeight(10);
  colors = ['yellow','red', 'orange', 'brown', 'black', 'white', 'green', 'blue','cyan', 'magenta'];
  selectedColorIndex = 0;
  palette_cell_size = 45;
  
  // nxDial = Nexus.Add.Dial('#nxUI', {
  //   'size': [100, 100]
  // });

  synthA.volume.value = -5;
  synthB.volume.value = -5;
  synth.volume.value = -2;
  dSynth.volume.value = -5;


  nxButton = Nexus.Add.Button('#nxUI');
  nxButton.on('change', () => {
    Tone.start();
    chord.start('0:0');
    pattern.start(0);
    Tone.Transport.start();
  })

  if ("serial" in navigator) {
    // The Web Serial API is supported
    connectButton = createButton("connect");
    connectButton.position(110, 10);
    connectButton.mousePressed(connect);

    
    sliderBlue = createSlider(0, 255, 127);
    //sliderBlue.position(0, 0);
    sliderBlue.style("width", "200px");

  }

}

function draw() {

  text('Press the Button to start the sounds and music!', 0, 480);
  text('Press the c key to draw with a circle, or press s to draw with a square.', 350, 480);

  noStroke();
  for(i = 0; i < colors.length; i++){
    push();
    fill(colors[i]);
    square(0, i * palette_cell_size, palette_cell_size);
    pop();
  }
  stroke(colors[selectedColorIndex]);

  if (mouseIsPressed === true){
    if ((mouseX >= 0 && mouseX < palette_cell_size) && (mouseY >= 0 && mouseY < palette_cell_size * colors.length))
    {
    selectedColorIndex = floor(mouseY / palette_cell_size);
    stroke(colors[selectedColorIndex]);
    }
  }
  else {
    x = mouseX;
    y = mouseY;
    drawing = true;
  }

  if (reader) {
    serialRead();
  }
 
  if (writer) {
    writer.write(encoder.encode(red + "," + green + "," + blue + "," +joySwitch + "\n"))
    writer.write(new Uint8Array([ sliderBlue.value() ]));
  }

  
 joySwitch = sensorData.Switch;
 red = sensorData.Xaxis;
 green = sensorData.Yaxis;
 blue = sliderBlue.value();

 keyTyped();

}

function serialWrite(jsonObject) {
  if (writer) {
    writer.write(encoder.encode(JSON.stringify(jsonObject)+"\n"));
  }
}

async function serialRead() { 
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
    console.log(value);
    sensorData = JSON.parse(value);
  }
 }

 async function connect() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
 
  writer = port.writable.getWriter();
 
  reader = port.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream(new LineBreakTransformer()))
    .getReader();
 }
 
 
 class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.chunks = "";
  }
 
  transform(chunk, controller) {
    // Append new chunks to existing chunks.
    this.chunks += chunk;
    // For each line breaks in chunks, send the parsed lines out.
    const lines = this.chunks.split("\n");
    this.chunks = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }
 
  flush(controller) {
    // When the stream is closed, flush any remaining chunks out.
    controller.enqueue(this.chunks);
  }
 }

let synth = new Tone.PolySynth().toDestination();
let dSynth = new Tone.PolySynth().toDestination();

let pattern = new Tone.Pattern(function (time, note) {
  synth.triggerAttackRelease(note, 0.25, time);
}, ['C4', ['F4', 'B3'], ['E4', 'G4'], 'C4', ['A4','F4'], 'C4']);

const melody = new Tone.Sequence((time, note) => {
	synth.triggerAttackRelease(note, 0.1, time);
}, ['F5', null, 'E5', 'C5', 'E5', 'C5', null, 'E5', 'G4', 'F5', null]).start("0:0");

let chords = [
  {"time": "0:0", "note": ["C4", 'E3', "G4"]},
  {"time": "0:2", "note": ["E4", 'C3', "G4"]},
  {"time": "0:3", "note": ["G4", 'A4', "C4"]},
  {"time": "1:1", "note": ["A4", 'G3', "F4"]},
  {"time": "1:2", "note": ["G4", 'E3', "A4"]},
  {"time": "1:3", "note": ["C4", 'A4', "E4"]}
]

let chord = new Tone.Part((time, notes)=>{
  dSynth.triggerAttackRelease(notes.note, '2n', time)
}, chords);

chord.loop = 8;
chord.loopEnd = '2m';


const synthA = new Tone.FMSynth().toDestination();
const synthB = new Tone.AMSynth().toDestination();

const loopA = new Tone.Loop(time => {
	synthA.triggerAttackRelease("C2", "8n", time);
}, "4n").start(0);

const loopB = new Tone.Loop(time => {
	synthB.triggerAttackRelease("C4", "8n", time);
}, "4n").start("8n");

let initTone = true;
let pitch = 190;

let osc = new Tone.AMOscillator(pitch, 'sine', 'sine').start()
let gain = new Tone.Gain().toDestination();
let pan = new Tone.Panner().connect(gain);
let ampEnv = new Tone.AmplitudeEnvelope({
  "pitchDecay"  : 0.001 ,
	"octaves"  : 0.1 ,
	"oscillator"  : {
		"type"  : "sine"
}  ,
	"envelope"  : {
		"attack"  : 0.01 ,
		"decay"  : 0.01 ,
		"sustain"  : 0.0 ,
		"release"  : 0.0 ,
		"attackCurve"  : "linear"
	}
}).connect(pan);
osc.connect(ampEnv);

const reverb = new Tone.JCReverb(0.4);
drum.connect(reverb);

let noise = new Tone.Noise('white').start();
let noiseEnv = new Tone.AmplitudeEnvelope({
  attack: 0.1,
  decay: 0.2,
  sustain: 1.0,
  release: 0.8
}).connect(gain);


function keyTyped() {
  if (key === 's'){
    push();
    noFill();
    square(map(red, 0, 255, 0, width), map(green, 0, 255, 0, height), 10);
    pop();
  }
  else if (key === 'c'){
    push();
    noFill();
    circle(map(red, 0, 255, 0, width), map(green, 0, 255, 0, height), 10);
    pop();
  }
}

function mouseMoved() {
  red = round(map(mouseX,0,width,0,255));
  green = round(map(mouseY,0,height,0,255));
  blue = slider.value();
}
  
 function mouseDragged(drawing){
  if(drawing) {
    line(x, y, mouseX, mouseY);
    x = mouseX;
    y = mouseY;

    console.log('dragged');
    
    ampEnv.triggerAttackRelease('9n');
    osc.frequency.setValueAtTime(pitch);
    ampEnv.triggerAttackRelease('9n');
  }
}

function mousePressed() {
  console.log('pressed');
  if(mousePressed) {
  ampEnv.triggerAttackRelease('3n');
  osc.frequency.setValueAtTime(pitch+230);
  ampEnv.triggerAttackRelease('3n');
  }
}