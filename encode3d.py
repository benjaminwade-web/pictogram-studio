#!/usr/bin/env python3
# join rendered frames and soundtrack.wav into <slug>_9x16.mp4.  usage: encode3d.py videos/<slug>
import subprocess, sys, os
D = sys.argv[1].rstrip('/'); slug = os.path.basename(os.path.abspath(D)); snd = os.path.join(D, 'soundtrack.wav')
args = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-i', os.path.join(D, 'frames', '%05d.jpg')]
if os.path.exists(snd): args += ['-i', snd, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest']
args += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-maxrate', '9M', '-bufsize', '18M', '-movflags', '+faststart', os.path.join(D, slug + '_9x16.mp4')]
subprocess.check_call(args); print('wrote', slug + '_9x16.mp4')
