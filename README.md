This repository contains a copy of Paul Adenot's ringbuffer.js, with a modified example of his audioworket-to-worker example, that records from live input either as a .wav buffer or as a float32 PCM buffer, sends regularly updates of the buffer being recorded, draws an updated waveform in a canvas during recording. When the stop button is pressed, the final waveform is drawn and the recorded audio buffer played (with looping enabled).

Another folder contains Paul Adenot's output latency estimator that we use to manually compensate the latency.

We measured the round-trip latency using a Y zoom hardware recorder. One mic at source (i.e on a guitar body), another one in front of the speakers. The guitar is plugged into a sound card and processed through a chain of plugins. We do make some hits on the guitar body, record on left channel microphone the peaks, and do the same with the microphone from right channel. We then compare the waveforms from left and right channel using audacity to get an estimation of the round-trip latency. On a Mac OS + Focusrite gen3 audio card, we measured 19-23ms on both chrome and FF, using a 128 sample audio buffer.

So round-trip latency = input latency + output latency

Input latency = usb/audio driver/os stuff + audio buffer latency
audio buffer latency is audio buffer size / sample rate, so 128/44100 = 0,002902494331066 s so about 3ms. It is also returned by the audio context baseLatency property with Chrome, while FF returns 0!

Output Latency is the time between the sound starts to be processed until it reaches the speakers. It can be measured# WAlatencyCompensation
