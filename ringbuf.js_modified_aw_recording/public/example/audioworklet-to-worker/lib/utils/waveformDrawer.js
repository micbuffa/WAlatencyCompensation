class WaveformDrawer {
    decodedAudioBuffer;
    peaks;
    canvas;
    displayWidth;
    displayHeight;
    sampleStep = 10;
    color = 'black';
    //test

    constructor(decodedAudioBuffer, canvas, color) {
        this.decodedAudioBuffer = decodedAudioBuffer;
        this.canvas = canvas;
        this.displayWidth = canvas.width;
        this.displayHeight = canvas.height;
        this.color = color;
        //this.sampleStep = sampleStep;

        // Initialize the peaks array from the decoded audio buffer and canvas size
        this.getPeaks();
    }

    max(values) {
        let max = -Infinity;
        for (let i = 0, len = values.length; i < len; i++) {
            let val = values[i];
            if (val > max) { max = val; }
        }
        return max;
    }
    // Fist parameter : where to start vertically in the canvas (useful when we draw several
    // waveforms in a single canvas)
    // Second parameter = height of the sample
    drawWave(startY, height) {
        let ctx = this.canvas.getContext('2d');

        ctx.save();
        ctx.translate(0, startY);

        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;

        const width = this.displayWidth;
        const coef = height / (2 * this.max(this.peaks));
        const halfH = height / 2;

        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(width, halfH);
        console.log("drawing from 0, " + halfH + " to " + width + ", " + halfH);
        ctx.stroke();


        ctx.beginPath();
        ctx.moveTo(0, halfH);

        for (let i = 0; i < width; i++) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.lineTo(i, halfH + h);
        }
        ctx.lineTo(width, halfH);

        ctx.moveTo(0, halfH);

        for (let i = 0; i < width; i++) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.lineTo(i, halfH - h);
        }

        ctx.lineTo(width, halfH);
        ctx.fill();

        ctx.restore();
    }

    clear() {
        ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
    }

    // Builds an array of peaks for drawing
    // Need the decoded buffer
    // Note that we go first through all the sample data and then
    // compute the value for a given column in the canvas, not the reverse
    // A sampleStep value is used in order not to look each indivudal sample
    // value as they are about 15 millions of samples in a 3mn song !
    getPeaks() {
        let buffer = this.decodedAudioBuffer;
        const sampleSize = Math.ceil(buffer.length / this.displayWidth);

        //console.log("sample size = " + buffer.length);

        this.sampleStep = this.sampleStep || ~~(sampleSize / 10);

        const channels = buffer.numberOfChannels;
        // The result is an array of size equal to the displayWidth
        this.peaks = new Float32Array(this.displayWidth);

        // For each channel
        for (let c = 0; c < channels; c++) {
            let chan = buffer.getChannelData(c);

            for (let i = 0; i < this.displayWidth; i++) {
                const start = ~~(i * sampleSize);
                const end = start + sampleSize;
                let peak = 0;
                for (var j = start; j < end; j += this.sampleStep) {
                    let value = chan[j];
                    if (value > peak) {
                        peak = value;
                    } else if (-value > peak) {
                        peak = -value;
                    }
                }
                if (c > 1) {
                    this.peaks[i] += peak / channels;
                } else {
                    this.peaks[i] = peak / channels;
                }
            }
        }
    }
}