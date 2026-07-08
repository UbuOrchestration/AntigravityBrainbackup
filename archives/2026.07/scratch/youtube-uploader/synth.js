const fs = require('fs');
const path = require('path');

// WAV header creator
function createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample) {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;
  
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

// Epic Trance Chords (F# Minor)
const CHORDS_TRANCE = [
  { root: 92.50, voices: [185.00, 220.00, 277.18, 329.63], melodyScale: [185.00, 220.00, 277.18, 329.63, 415.30] },
  { root: 73.42, voices: [146.83, 185.00, 220.00, 277.18], melodyScale: [146.83, 185.00, 220.00, 277.18, 370.00] },
  { root: 110.00, voices: [220.00, 277.18, 329.63, 415.30], melodyScale: [220.00, 277.18, 329.63, 415.30, 554.37] },
  { root: 82.41, voices: [164.81, 207.65, 246.94, 293.66], melodyScale: [164.81, 246.94, 293.66, 329.63, 493.88] }
];

// Liquid DnB Chords (E Minor)
const CHORDS_DNB = [
  { root: 82.41, voices: [164.81, 196.00, 246.94, 293.66, 369.99], melodyScale: [329.63, 392.00, 493.88, 587.33, 739.99] },
  { root: 65.41, voices: [130.81, 196.00, 246.94, 293.66, 329.63], melodyScale: [261.63, 329.63, 392.00, 493.88, 523.25] },
  { root: 55.00, voices: [220.00, 261.63, 329.63, 392.00, 493.88], melodyScale: [220.00, 261.63, 329.63, 392.00, 440.00] },
  { root: 61.74, voices: [123.47, 174.61, 220.00, 293.66, 369.99], melodyScale: [246.94, 293.66, 369.99, 440.00, 493.88] }
];

// Vaporwave Chords (Detuned 80s Jazz Chords - G Major / E Minor)
const CHORDS_VAPOR = [
  { root: 98.00, voices: [196.00, 246.94, 293.66, 329.63, 392.00], melodyScale: [392.00, 440.00, 493.88, 587.33, 659.25] }, // Gmaj9
  { root: 82.41, voices: [164.81, 220.00, 261.63, 293.66, 329.63], melodyScale: [329.63, 392.00, 440.00, 493.88, 587.33] }, // Em9
  { root: 87.31, voices: [174.61, 220.00, 261.63, 293.66, 349.23], melodyScale: [349.23, 392.00, 440.00, 523.25, 587.33] }  // Fmaj9
];

// Synthwave / Outrun Chords (Driving minor pads)
const CHORDS_SYNTHWAVE = [
  { root: 110.00, voices: [220.00, 261.63, 329.63, 392.00], melodyScale: [440.00, 523.25, 587.33, 659.25, 783.99] }, // Am7
  { root: 87.31, voices: [174.61, 220.00, 261.63, 329.63], melodyScale: [349.23, 440.00, 523.25, 587.33, 659.25] }, // Fmaj7
  { root: 98.00, voices: [196.00, 246.94, 293.66, 392.00], melodyScale: [392.00, 493.88, 587.33, 783.99, 880.00] }  // G7
];

// Cozy Lofi Chords
const CHORDS_LOFI = [
  { root: 65.41, voices: [130.81, 155.56, 196.00, 233.08, 293.66], melodyScale: [261.63, 311.13, 392.00, 466.16, 523.25] }, // Cm7
  { root: 103.83, voices: [103.83, 130.81, 155.56, 196.00, 261.63], melodyScale: [207.65, 261.63, 311.13, 392.00, 523.25] }, // Abmaj7
  { root: 87.31, voices: [87.31, 207.65, 130.81, 155.56, 196.00], melodyScale: [174.61, 207.65, 261.63, 311.13, 392.00] }  // Fm9
];

function generateLofiTrack(outputPath, durationSeconds = 120, bpm = 75, mood = 'cozy', gains = {}) {
  const isTrance = (mood === 'trance');
  const isDnB = (mood === 'liquiddnb');
  const isVapor = (mood === 'vaporwave');
  const isOutrun = (mood === 'synthwave');
  
  // Set defaults or uncap user's custom BPM
  const parsedBPM = parseFloat(bpm);
  const activeBPM = isNaN(parsedBPM) || parsedBPM <= 0 ? (isVapor ? 64 : (isOutrun ? 115 : (isDnB ? 168 : (isTrance ? 136 : 72)))) : parsedBPM;
  
  const chords = isDnB ? CHORDS_DNB : (isTrance ? CHORDS_TRANCE : (isVapor ? CHORDS_VAPOR : (isOutrun ? CHORDS_SYNTHWAVE : CHORDS_LOFI)));
  
  // Extract gains from mixer
  const padGain = gains.pad !== undefined ? parseFloat(gains.pad) : 1.0;
  const melodyGain = gains.melody !== undefined ? parseFloat(gains.melody) : 1.0;
  const bassGain = gains.bass !== undefined ? parseFloat(gains.bass) : 1.0;
  const drumGain = gains.drum !== undefined ? parseFloat(gains.drum) : 1.0;
  const ambianceGain = gains.ambiance !== undefined ? parseFloat(gains.ambiance) : 1.0;
  
  console.log(`Synth: duration=${durationSeconds}s, BPM=${activeBPM}, mood=${mood}, pads=${padGain}, mel=${melodyGain}, bass=${bassGain}, drum=${drumGain}, amb=${ambianceGain}`);
  
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  
  const header = createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample);
  
  const beatLen = (60 / activeBPM) * sampleRate; // Samples per beat
  const chordLen = beatLen * (isTrance || isDnB || isOutrun ? 16 : 8);
  
  const buffer = Buffer.alloc(numSamples * 4); // 16-bit stereo PCM
  
  // Delay lines relative to BPM
  const delayTimeL = Math.floor(beatLen * 0.75); // Dotted 8th note delay
  const delayTimeR = Math.floor(beatLen * 0.50); // 8th note delay
  const delayBufferL = new Float32Array(delayTimeL);
  const delayBufferR = new Float32Array(delayTimeR);
  let delayIdxL = 0;
  let delayIdxR = 0;
  const delayFeedback = isTrance ? 0.65 : (isDnB || isOutrun ? 0.55 : 0.45);
  
  // Low-pass filter state
  let lpL = 0, lpR = 0;
  const filterAlpha = isTrance ? 0.38 : (isDnB || isOutrun ? 0.34 : (isVapor ? 0.16 : 0.12));
  
  // Vinyl crackle (Lofi/Vaporwave)
  let crackleAmp = 0;
  
  // Melody generator timing
  let lastMelodyTrigger = 0;
  let melodyNoteFreq = 0;
  let melodyDuration = 0;
  let melodyEnv = 0;
  
  // Rain ambiance filter state
  let rainLp = 0;
  
  // Drum triggers
  let kickTime = -1;
  let kickPhase = 0;
  let snareTime = -1;
  let hatTime = -1;
  
  // Step Sequencer accumulator
  const subBeatLen = beatLen / (isDnB ? 4 : (isOutrun || isTrance ? 2 : 1)); // 16th notes for DnB, 8th notes for Trance/Outrun
  let nextStepSample = 0;
  let sequencerStep = 0;
  
  for (let s = 0; s < numSamples; s++) {
    const chordIndex = Math.floor(s / chordLen) % chords.length;
    const chord = chords[chordIndex];
    
    // Crossfade envelope between chords
    const chordAge = s % chordLen;
    const attackLen = sampleRate * (isTrance || isDnB || isOutrun ? 1.0 : 1.5);
    const releaseLen = sampleRate * (isTrance || isDnB || isOutrun ? 1.0 : 1.5);
    let chordVolume = 1.0;
    if (chordAge < attackLen) {
      chordVolume = chordAge / attackLen;
    } else if (chordAge > chordLen - releaseLen) {
      chordVolume = (chordLen - chordAge) / releaseLen;
    }
    
    // Step sequencer tick
    let triggerStep = false;
    if (s >= Math.floor(nextStepSample)) {
      triggerStep = true;
      nextStepSample += subBeatLen;
      sequencerStep = (sequencerStep + 1) % 16;
    }
    
    // RHYTHMIC DRUMS
    let drumSample = 0;
    
    if (isDnB) {
      if (triggerStep) {
        if (sequencerStep === 0 || sequencerStep === 6 || sequencerStep === 10 || sequencerStep === 14) {
          kickTime = 0;
          kickPhase = 0;
        }
        if (sequencerStep === 4 || sequencerStep === 12) {
          snareTime = 0;
        }
        if (sequencerStep === 2 || sequencerStep === 8 || sequencerStep === 10 || sequencerStep === 15) {
          hatTime = 0;
        }
      }
      
      if (kickTime >= 0) {
        const sweepSpeed = 110 + (activeBPM > 150 ? (activeBPM - 150) * 0.5 : 0);
        const f = 45 + 120 * Math.exp(-kickTime * sweepSpeed);
        kickPhase += 2 * Math.PI * f / sampleRate;
        const kickDecay = 18 + (activeBPM > 150 ? (activeBPM - 150) * 0.1 : 0);
        drumSample += Math.sin(kickPhase) * Math.exp(-kickTime * kickDecay) * 0.40;
        kickTime += 1 / sampleRate;
        if (kickTime > 0.25) kickTime = -1;
      }
      if (snareTime >= 0) {
        const snareDecay = 35 + (activeBPM > 150 ? (activeBPM - 150) * 0.15 : 0);
        const snareNoise = (Math.random() * 2 - 1) * Math.exp(-snareTime * snareDecay) * 0.35;
        const snarePunch = Math.sin(2 * Math.PI * 180 * snareTime) * Math.exp(-snareTime * 50) * 0.15;
        drumSample += (snareNoise + snarePunch);
        snareTime += 1 / sampleRate;
        if (snareTime > 0.22) snareTime = -1;
      }
      if (hatTime >= 0) {
        drumSample += (Math.random() * 2 - 1) * Math.exp(-hatTime * 120) * 0.12;
        hatTime += 1 / sampleRate;
        if (hatTime > 0.06) hatTime = -1;
      }
      drumSample *= drumGain;
      
    } else if (isTrance || isOutrun) {
      // 4/4 Kick & Offbeat snare/clap
      if (triggerStep) {
        if (sequencerStep === 0 || sequencerStep === 4 || sequencerStep === 8 || sequencerStep === 12) {
          kickTime = 0;
          kickPhase = 0;
        }
        if (sequencerStep === 4 || sequencerStep === 12) {
          snareTime = 0; // snare on 2 and 4
        }
        if (sequencerStep % 2 === 1) {
          hatTime = 0; // hats on offbeats
        }
      }
      
      if (kickTime >= 0) {
        const f = 48 + 112 * Math.exp(-kickTime * 85);
        kickPhase += 2 * Math.PI * f / sampleRate;
        drumSample += Math.sin(kickPhase) * Math.exp(-kickTime * 14) * 0.42;
        kickTime += 1 / sampleRate;
        if (kickTime > 0.35) kickTime = -1;
      }
      if (snareTime >= 0) {
        // Gated Reverb style Snare for Synthwave/Trance
        const noise = (Math.random() * 2 - 1) * Math.exp(-snareTime * (isOutrun ? 15 : 28)) * 0.28;
        drumSample += noise;
        snareTime += 1 / sampleRate;
        if (snareTime > 0.3) snareTime = -1;
      }
      if (hatTime >= 0) {
        drumSample += (Math.random() * 2 - 1) * Math.exp(-hatTime * 180) * 0.08;
        hatTime += 1 / sampleRate;
        if (hatTime > 0.05) hatTime = -1;
      }
      drumSample *= drumGain;
    } else if (isVapor) {
      // Slow, heavy lo-fi beats (kick on 1, snare on 3)
      if (triggerStep) {
        if (sequencerStep === 0 || sequencerStep === 8) {
          kickTime = 0;
          kickPhase = 0;
        }
        if (sequencerStep === 4 || sequencerStep === 12) {
          snareTime = 0;
        }
      }
      if (kickTime >= 0) {
        const f = 40 + 90 * Math.exp(-kickTime * 50);
        kickPhase += 2 * Math.PI * f / sampleRate;
        drumSample += Math.sin(kickPhase) * Math.exp(-kickTime * 10) * 0.45;
        kickTime += 1 / sampleRate;
        if (kickTime > 0.4) kickTime = -1;
      }
      if (snareTime >= 0) {
        const noise = (Math.random() * 2 - 1) * Math.exp(-snareTime * 18) * 0.25;
        drumSample += noise;
        snareTime += 1 / sampleRate;
        if (snareTime > 0.3) snareTime = -1;
      }
      drumSample *= drumGain;
    }
    
    // SYNTH PADS (with tape warble vibrato for Vaporwave)
    let padSample = 0;
    
    // Slow tape warble modulation (Vaporwave Vibrato LFO)
    let warpMod = 1.0;
    if (isVapor) {
      warpMod = 1.0 + 0.0055 * Math.sin(2 * Math.PI * 5.8 * (s / sampleRate));
    }
    
    if (isTrance || isDnB || isOutrun || isVapor) {
      const sweepFrequency = (activeBPM / 60) * 0.02;
      const sweepAlpha = 0.18 + 0.16 * Math.sin(2 * Math.PI * sweepFrequency * (s / sampleRate));
      
      for (let i = 0; i < chord.voices.length; i++) {
        const freq = chord.voices[i] * warpMod;
        const p1 = 2 * Math.PI * (freq * 0.996) * (s / sampleRate);
        const p2 = 2 * Math.PI * freq * (s / sampleRate);
        const p3 = 2 * Math.PI * (freq * 1.004) * (s / sampleRate);
        
        const saw1 = ((p1 / Math.PI) % 2) - 1;
        const saw2 = ((p2 / Math.PI) % 2) - 1;
        const saw3 = ((p3 / Math.PI) % 2) - 1;
        
        padSample += (saw1 + saw2 + saw3) * 0.33;
      }
      padSample = (padSample / chord.voices.length) * (isVapor ? 0.22 : 0.18) * chordVolume * padGain;
    } else {
      // Soft cozy Lofi Pads
      for (let i = 0; i < chord.voices.length; i++) {
        const freq = chord.voices[i];
        const phase1 = 2 * Math.PI * freq * (s / sampleRate);
        const phase2 = 2 * Math.PI * (freq * 1.006) * (s / sampleRate);
        const osc1 = Math.sin(phase1);
        const osc2 = (2 / Math.PI) * Math.asin(Math.sin(phase2)); // Triangle
        padSample += (osc1 * 0.6 + osc2 * 0.4);
      }
      padSample = (padSample / chord.voices.length) * 0.28 * chordVolume * padGain;
    }
    
    // BASSLINE (Octave-jumping for Outrun vs Reese for DnB vs Sub for Lofi/Vapor)
    let bassSample = 0;
    if (isDnB) {
      const bassPhase1 = 2 * Math.PI * (chord.root * 0.994) * (s / sampleRate);
      const bassPhase2 = 2 * Math.PI * (chord.root * 1.006) * (s / sampleRate);
      const saw1 = ((bassPhase1 / Math.PI) % 2) - 1;
      const saw2 = ((bassPhase2 / Math.PI) % 2) - 1;
      
      const wobbleSpeed = (activeBPM / 60) * 0.15;
      const wobble = 0.07 + 0.05 * Math.sin(2 * Math.PI * wobbleSpeed * (s / sampleRate));
      const reeseOut = (saw1 * 0.5 + saw2 * 0.5);
      
      bassSample = reeseOut * wobble * 0.26 * chordVolume * bassGain;
    } else if (isOutrun) {
      // Synthwave Driving 8th Bass (jumping octaves)
      const octBeatLen = beatLen / 2; // 8th note
      const octStep = Math.floor(s / octBeatLen) % 2;
      const rootFreq = octStep === 0 ? chord.root : chord.root * 2.0;
      const bassPhase = 2 * Math.PI * rootFreq * (s / sampleRate);
      const bassSaw = ((bassPhase / Math.PI) % 2) - 1;
      
      const bassDecay = Math.exp(-(s % octBeatLen) / (octBeatLen * 0.85));
      bassSample = bassSaw * bassDecay * 0.22 * chordVolume * bassGain;
    } else if (isTrance) {
      // Rolling 16th Bass
      const rollingSubBeatLen = beatLen / 4;
      const rollingStep = Math.floor(s / rollingSubBeatLen) % 4;
      if (rollingStep > 0) {
        const stepAge = s % rollingSubBeatLen;
        const bassPhase = 2 * Math.PI * chord.root * (s / sampleRate);
        const bassSaw = ((bassPhase / Math.PI) % 2) - 1;
        const bassDecay = Math.exp(-stepAge / (rollingSubBeatLen * 0.7));
        bassSample = bassSaw * bassDecay * 0.24 * chordVolume * bassGain;
      }
    } else {
      // Sub Bass (Lofi and Vaporwave)
      const bassPhase = 2 * Math.PI * chord.root * warpMod * (s / sampleRate);
      bassSample = Math.sin(bassPhase) * 0.25 * chordVolume * bassGain;
    }
    
    // MELODY
    const melodyInterval = isDnB ? (beatLen / 2) : (isTrance || isOutrun ? (beatLen / 2) : (beatLen * 2));
    if (s - lastMelodyTrigger > melodyInterval) {
      lastMelodyTrigger = s;
      
      if (isDnB || isTrance || isOutrun) {
        const notes = chord.melodyScale;
        const beatIndex = Math.floor(s / melodyInterval) % 8;
        melodyNoteFreq = notes[beatIndex % notes.length];
        melodyDuration = melodyInterval * 1.5;
        melodyEnv = 1.0;
      } else {
        if (Math.random() < 0.65) {
          const notes = chord.melodyScale;
          melodyNoteFreq = notes[Math.floor(Math.random() * notes.length)];
          melodyDuration = sampleRate * (1.0 + Math.random() * 2.0);
          melodyEnv = 1.0;
        } else {
          melodyNoteFreq = 0;
        }
      }
    }
    
    let melodySample = 0;
    if (melodyNoteFreq > 0 && melodyEnv > 0) {
      const melPhase = 2 * Math.PI * (melodyNoteFreq * warpMod) * (s / sampleRate);
      if (isDnB || isVapor) {
        // Rhodes bell pluck (FM-like)
        melodySample = (Math.sin(melPhase) + 0.35 * Math.sin(melPhase * 3.0)) * 0.12 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      } else if (isTrance || isOutrun) {
        // Plucky lead saw
        const saw = ((melPhase / Math.PI) % 2) - 1;
        melodySample = (saw * 0.4 + Math.sin(melPhase) * 0.6) * 0.09 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      } else {
        // Muted bell
        melodySample = (Math.sin(melPhase) + 0.2 * Math.sin(melPhase * 2)) * 0.12 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      }
    }
    
    // Stereo Delay mix
    const delayedL = delayBufferL[delayIdxL];
    const delayedR = delayBufferR[delayIdxR];
    
    delayBufferL[delayIdxL] = melodySample + delayedR * delayFeedback;
    delayBufferR[delayIdxR] = melodySample + delayedL * delayFeedback;
    
    delayIdxL = (delayIdxL + 1) % delayTimeL;
    delayIdxR = (delayIdxR + 1) % delayTimeR;
    
    const melOutL = melodySample + delayedL * 0.55;
    const melOutR = melodySample + delayedR * 0.55;
    
    // AMBIANCE
    let ambianceL = 0, ambianceR = 0;
    if (isTrance || isDnB || isOutrun) {
      // Noise sweeps
      const noise = Math.random() * 2 - 1;
      const sweepHz = isDnB ? 0.035 : 0.02;
      const sweepVol = 0.012 * (0.5 + 0.5 * Math.sin(2 * Math.PI * sweepHz * (s / sampleRate)));
      ambianceL = noise * sweepVol * ambianceGain;
      ambianceR = noise * sweepVol * ambianceGain;
    } else {
      // Lofi rain and vinyl crackles
      const whiteNoise = Math.random() * 2.0 - 1.0;
      const rainSweep = 0.04 + 0.02 * Math.sin(2 * Math.PI * 0.04 * (s / sampleRate));
      rainLp = rainLp + (whiteNoise - rainLp) * rainSweep;
      const rainAmbiance = rainLp * 0.055;
      
      if (Math.random() < 0.00035 && crackleAmp === 0) {
        crackleAmp = 0.45 + Math.random() * 0.4;
      }
      let vinylPop = 0;
      if (crackleAmp > 0) {
        vinylPop = (Math.random() * 2.0 - 1.0) * crackleAmp;
        crackleAmp *= 0.95;
        if (crackleAmp < 0.001) crackleAmp = 0;
      }
      const vinylAmbiance = (whiteNoise * 0.015) + (vinylPop * 0.08);
      ambianceL = (rainAmbiance + vinylAmbiance) * ambianceGain;
      ambianceR = (rainAmbiance + vinylAmbiance) * ambianceGain;
    }
    
    // SIDECHAIN COMPRESSION
    let sidechain = 1.0;
    if (isTrance && kickTime >= 0) {
      const duckSpeed = 18 + (activeBPM > 130 ? (activeBPM - 130) * 0.06 : 0);
      sidechain = 0.28 + 0.72 * (1.0 - Math.exp(-kickTime * duckSpeed));
    } else if (isDnB && kickTime >= 0) {
      const duckSpeed = 22 + (activeBPM > 150 ? (activeBPM - 150) * 0.08 : 0);
      sidechain = 0.45 + 0.55 * (1.0 - Math.exp(-kickTime * duckSpeed));
    } else if (isOutrun && kickTime >= 0) {
      // Heavy compression pump for Synthwave/Outrun
      sidechain = 0.20 + 0.80 * (1.0 - Math.exp(-kickTime * 20));
    }
    
    // Master Mix
    let mixL = (padSample + melOutL + bassSample) * sidechain + drumSample + ambianceL;
    let mixR = (padSample + melOutR + bassSample) * sidechain + drumSample + ambianceR;
    
    // Lowpass Master filter
    lpL = lpL + (mixL - lpL) * filterAlpha;
    lpR = lpR + (mixR - lpR) * filterAlpha;
    
    // Hard clipping protection
    let outL = Math.max(-1.0, Math.min(1.0, lpL));
    let outR = Math.max(-1.0, Math.min(1.0, lpR));
    
    const sampleIntL = Math.floor(outL * 32767);
    const sampleIntR = Math.floor(outR * 32767);
    
    const offset = s * 4;
    buffer.writeInt16LE(sampleIntL, offset);
    buffer.writeInt16LE(sampleIntR, offset + 2);
  }
  
  // Write output
  const fd = fs.openSync(outputPath, 'w');
  fs.writeSync(fd, header, 0, header.length);
  fs.writeSync(fd, buffer, 0, buffer.length);
  fs.closeSync(fd);
  console.log(`Synthesis complete. Saved to ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
}

// CLI Executor
if (require.main === module) {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const duration = isTest ? 15 : 120;
  const outPath = isTest ? path.join(__dirname, 'test_output.wav') : path.join(__dirname, 'output.wav');
  
  generateLofiTrack(outPath, duration, 72, 'cozy');
}

module.exports = { generateLofiTrack };
