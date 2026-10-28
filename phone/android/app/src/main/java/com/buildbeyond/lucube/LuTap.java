package com.buildbeyond.lucube;

import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.audio.TeeAudioProcessor;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Listens to the sound on its way out of the player (a copy: nothing is changed) and gives the visualiser the same
 * frequency picture a browser's Web Audio analyser gives on the PC: 1024-point FFT, Blackman window, smoothing .45,
 * 512 bins as bytes on a -100..-30 dB scale. No microphone, no permission.
 */
@UnstableApi
final class LuTap implements TeeAudioProcessor.AudioBufferSink {
    static final LuTap INSTANCE = new LuTap();
    static final int N = 1024;
    private final float[] ring = new float[N];
    private int pos = 0, sr = 44100, ch = 2, enc = C.ENCODING_PCM_16BIT;
    private final float[] smooth = new float[N / 2];
    private final double[] re = new double[N], im = new double[N], win = new double[N];

    private LuTap() {
        for (int i = 0; i < N; i++) { double a = 2 * Math.PI * i / (N - 1); win[i] = 0.42 - 0.5 * Math.cos(a) + 0.08 * Math.cos(2 * a); }
    }

    @Override public synchronized void flush(int sampleRateHz, int channelCount, int encoding) { sr = sampleRateHz; ch = Math.max(1, channelCount); enc = encoding; }

    @Override public synchronized void handleBuffer(ByteBuffer buffer) {
        ByteBuffer d = buffer.duplicate().order(ByteOrder.nativeOrder());
        if (enc == C.ENCODING_PCM_16BIT) {
            int frames = d.remaining() / (2 * ch);
            for (int f = 0; f < frames; f++) { float s = 0; for (int c = 0; c < ch; c++) s += d.getShort() / 32768f; ring[pos] = s / ch; pos = (pos + 1) % N; }
        } else if (enc == C.ENCODING_PCM_FLOAT) {
            int frames = d.remaining() / (4 * ch);
            for (int f = 0; f < frames; f++) { float s = 0; for (int c = 0; c < ch; c++) s += d.getFloat(); ring[pos] = s / ch; pos = (pos + 1) % N; }
        }
    }

    synchronized int sampleRate() { return sr; }

    /** the newest 1024 samples as 512 frequency bytes */
    synchronized byte[] spectrum() {
        for (int i = 0; i < N; i++) { re[i] = ring[(pos + i) % N] * win[i]; im[i] = 0; }
        fft(re, im);
        byte[] out = new byte[N / 2];
        for (int k = 0; k < N / 2; k++) {
            double m = Math.hypot(re[k], im[k]) / N;
            smooth[k] = (float) (0.45 * smooth[k] + 0.55 * m);
            double db = 20 * Math.log10(Math.max(1e-12, smooth[k]));
            int v = (int) Math.round((db + 100) / 70 * 255);
            out[k] = (byte) Math.max(0, Math.min(255, v));
        }
        return out;
    }

    private static void fft(double[] re, double[] im) {
        int n = re.length;
        for (int i = 1, j = 0; i < n; i++) {
            int bit = n >> 1;
            for (; (j & bit) != 0; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) { double t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
        }
        for (int len = 2; len <= n; len <<= 1) {
            double ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
            for (int i = 0; i < n; i += len) {
                double cr = 1, ci = 0;
                for (int k = 0; k < len / 2; k++) {
                    int a = i + k, b = a + len / 2;
                    double xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
                    re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
                    double t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
                }
            }
        }
    }
}
